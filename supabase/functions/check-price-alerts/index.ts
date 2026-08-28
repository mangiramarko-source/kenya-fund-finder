import { createClient } from "../_shared/supabase-client.ts";
import { localDateInNairobi } from "../_shared/market-overview.ts";
import { authorizePrivilegedRequest } from "../_shared/privileged-auth.ts";
import { getSupabaseSecretKey } from "../_shared/supabase-keys.ts";
import { dispatchPriceAlertPushes } from "../_shared/push-notifications.ts";

const headers = { "Content-Type": "application/json" };

// Price-alert automation remains unscheduled. This reconciles the safer
// deployed stock-only evaluator and makes email eligibility fail closed for any
// separately authorized manual invocation.
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
      .select("id,user_id,stock_id,asset_id,asset_name,condition,target_price").eq("is_active", true).eq("is_triggered", false).is("triggered_at", null);
    if (alertsError) throw alertsError;
    if (!alerts?.length) return new Response(JSON.stringify({ checked: 0, triggered: 0 }), { headers });

    const stockIds = [...new Set(alerts.map((alert) => alert.stock_id ?? alert.asset_id).filter(Boolean))];
    const { data: stocks, error: stocksError } = await supabase.from("stocks")
      .select("id,name,price,updated_at,is_active").in("id", stockIds).eq("is_active", true);
    if (stocksError) throw stocksError;
    const prices = new Map((stocks ?? []).map((stock) => [stock.id, stock]));
    const observedAt = new Date().toISOString();
    const marketDate = localDateInNairobi(observedAt);
    const emailEligibility = new Map<string, boolean>();
    let triggered = 0;

    for (const alert of alerts) {
      const stock = prices.get(alert.stock_id ?? alert.asset_id);
      const price = Number(stock?.price);
      if (!stock || !stock.updated_at || localDateInNairobi(stock.updated_at) !== marketDate || !Number.isFinite(price) || price <= 0) continue;
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
        p_source_observed_at: stock.updated_at ?? observedAt,
        p_email_allowed: emailAllowed,
      });
      if (error) {
        console.error("Unable to claim alert", { alert_id: alert.id, error });
        continue;
      }
      if (data?.length) {
        triggered += 1;
        const eventKey = `price_alert:${alert.id}:trigger:${data[0].trigger_count}`;
        const stockName = stock.name?.trim() || alert.asset_name;
        let pushNotification = {
          event_key: eventKey,
          notification_id: null as string | null,
          user_id: data[0].user_id,
          title: `Price alert: ${stockName}`,
          message: `${stockName} is now KES ${price.toFixed(2)}, meeting your ${alert.condition} KES ${Number(alert.target_price).toFixed(2)} alert. Data update only — not financial advice.`,
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
