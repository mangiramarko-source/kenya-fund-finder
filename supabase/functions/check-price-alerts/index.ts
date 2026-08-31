import { createClient } from "../_shared/supabase-client.ts";
import { localDateInNairobi } from "../_shared/market-overview.ts";
import { authorizePrivilegedRequest } from "../_shared/privileged-auth.ts";
import { getSupabaseSecretKey } from "../_shared/supabase-keys.ts";
import { dispatchPriceAlertPushes } from "../_shared/push-notifications.ts";

const headers = { "Content-Type": "application/json" };

// Price-alert automation remains unscheduled. Each invocation evaluates the
// latest fresh stock, FX, and commodity observations before claiming alerts.
Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers });
  const supabase = createClient(supabaseUrl, getSupabaseSecretKey(), { auth: { persistSession: false, autoRefreshToken: false } });
  const authorization = await authorizePrivilegedRequest(request, {
    namedSecretKeysJson: Deno.env.get("SUPABASE_SECRET_KEYS"),
    secretName: "automations",
    verifyUser: async (token) => (await supabase.auth.getUser(token)).data.user?.id ?? null,
    isAdmin: async (userId) => Boolean((await supabase.from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle()).data),
  });
  if (!authorization.ok) return new Response(JSON.stringify({ error: "Forbidden" }), { status: authorization.status, headers });

  try {
    const { data: alerts, error: alertsError } = await supabase.from("price_alerts")
      .select("id,user_id,stock_id,asset_type,asset_id,asset_name,price_unit,condition,target_price").eq("is_active", true).eq("is_triggered", false).is("triggered_at", null);
    if (alertsError) throw alertsError;
    if (!alerts?.length) return new Response(JSON.stringify({ checked: 0, triggered: 0 }), { headers });

    const stockIds = [...new Set(alerts.filter((alert) => alert.asset_type === "stock").map((alert) => alert.stock_id ?? alert.asset_id).filter(Boolean))];
    const currencyIds = [...new Set(alerts.filter((alert) => alert.asset_type === "currency").map((alert) => alert.asset_id).filter(Boolean))];
    const commodityIds = [...new Set(alerts.filter((alert) => alert.asset_type === "commodity").map((alert) => alert.asset_id).filter(Boolean))];
    const [stocksResult, currenciesResult, commoditiesResult] = await Promise.all([
      stockIds.length ? supabase.from("stocks").select("id,name,price,updated_at").in("id", stockIds).eq("is_active", true) : Promise.resolve({ data: [], error: null }),
      currencyIds.length ? supabase.from("exchange_rates").select("id,currency_code,rate,updated_at").in("id", currencyIds).eq("is_active", true) : Promise.resolve({ data: [], error: null }),
      commodityIds.length ? supabase.from("commodities").select("id,name,price,updated_at").in("id", commodityIds).eq("is_active", true) : Promise.resolve({ data: [], error: null }),
    ]);
    if (stocksResult.error || currenciesResult.error || commoditiesResult.error) throw stocksResult.error ?? currenciesResult.error ?? commoditiesResult.error;
    const prices = new Map<string, { name: string; price: number; updated_at: string | null }>();
    for (const stock of stocksResult.data ?? []) prices.set(`stock:${stock.id}`, { name: stock.name, price: Number(stock.price), updated_at: stock.updated_at });
    for (const currency of currenciesResult.data ?? []) prices.set(`currency:${currency.id}`, { name: `${currency.currency_code}/KES`, price: Number(currency.rate), updated_at: currency.updated_at });
    for (const commodity of commoditiesResult.data ?? []) prices.set(`commodity:${commodity.id}`, { name: commodity.name, price: Number(commodity.price), updated_at: commodity.updated_at });
    const observedAt = new Date().toISOString();
    const marketDate = localDateInNairobi(observedAt);
    const emailEligibility = new Map<string, boolean>();
    let triggered = 0;

    for (const alert of alerts) {
      const assetId = alert.asset_type === "stock" ? alert.stock_id ?? alert.asset_id : alert.asset_id;
      const asset = prices.get(`${alert.asset_type}:${assetId}`);
      const price = Number(asset?.price);
      if (!asset || !asset.updated_at || localDateInNairobi(asset.updated_at) !== marketDate || !Number.isFinite(price) || price <= 0) continue;
      let emailAllowed = emailEligibility.get(alert.user_id);
      if (emailAllowed === undefined) {
        const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(alert.user_id);
        const email = userError ? "" : userResult.user?.email?.trim().toLowerCase() ?? "";
        if (!email) {
          emailAllowed = false;
        } else {
          const { data: suppression, error: suppressionError } = await supabase.from("communication_suppressions")
            .select("id").eq("email_normalized", email).is("lifted_at", null)
            .in("scope", ["all_email", "price_alert"]).limit(1);
          emailAllowed = !suppressionError && (suppression?.length ?? 0) === 0;
        }
        emailEligibility.set(alert.user_id, emailAllowed);
      }
      const { data, error } = await supabase.rpc("claim_price_alert_event", {
        p_alert_id: alert.id,
        p_triggered_price: price,
        p_source_observed_at: asset.updated_at ?? observedAt,
        p_email_allowed: emailAllowed,
      });
      if (error) {
        console.error("Unable to claim alert", { alert_id: alert.id, error });
        continue;
      }
      if (data?.length) {
        triggered += 1;
        const eventKey = `price_alert:${alert.id}:trigger:${data[0].trigger_count}`;
        const assetName = asset.name?.trim() || alert.asset_name;
        let pushNotification = {
          event_key: eventKey,
          notification_id: null as string | null,
          user_id: data[0].user_id,
          title: `Price alert: ${assetName}`,
          message: `${assetName} is now ${alert.price_unit || "KES"} ${price.toFixed(2)}, meeting your ${alert.condition} ${alert.price_unit || "KES"} ${Number(alert.target_price).toFixed(2)} alert. Data update only — not financial advice.`,
          type: "price_alert",
        };
        if (data[0].notification_created) {
          const { data: notification } = await supabase.from("notifications")
            .select("id,user_id,title,message,type").eq("event_key", eventKey).maybeSingle();
          if (notification) pushNotification = { ...notification, notification_id: notification.id, event_key: eventKey };
        }
        await dispatchPriceAlertPushes(supabase, pushNotification);
      }
    }
    return new Response(JSON.stringify({ checked: alerts.length, triggered }), { headers });
  } catch (error) {
    console.error("check-price-alerts failed", error);
    return new Response(JSON.stringify({ error: "Alert evaluation failed" }), { status: 500, headers });
  }
});
