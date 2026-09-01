import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { authorizePrivilegedRequest } from "../_shared/privileged-auth.ts";
import { getSupabaseSecretKey } from "../_shared/supabase-keys.ts";

const headers = { "Content-Type": "application/json" };

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
    const { data: alerts, error: alertsError } = await supabase
      .from("price_alerts")
      .select("id,user_id,asset_type,asset_id")
      .eq("is_active", true)
      .eq("is_triggered", false)
      .is("triggered_at", null);
    if (alertsError) throw alertsError;
    if (!alerts?.length) return new Response(JSON.stringify({ checked: 0, triggered: 0 }), { headers });

    const idsFor = (assetType: string) => [...new Set(alerts.filter((alert) => alert.asset_type === assetType).map((alert) => alert.asset_id).filter(Boolean))];
    const [stocksResult, fundsResult, ratesResult, commoditiesResult] = await Promise.all([
      supabase.from("stocks").select("id,name,price,updated_at").in("id", idsFor("stock")).eq("is_active", true),
      supabase.from("funds").select("id,name,annual_yield,updated_at").in("id", idsFor("fund")).eq("is_published", true),
      supabase.from("exchange_rates").select("id,currency_code,rate,updated_at").in("id", idsFor("currency")).eq("is_active", true),
      supabase.from("commodities").select("id,name,price,unit,updated_at").in("id", idsFor("commodity")).eq("is_active", true),
    ]);
    for (const result of [stocksResult, fundsResult, ratesResult, commoditiesResult]) if (result.error) throw result.error;
    const quotes = new Map<string, { value: number; observedAt: string | null }>();
    for (const stock of stocksResult.data ?? []) quotes.set(`stock:${stock.id}`, { value: Number(stock.price), observedAt: stock.updated_at });
    for (const fund of fundsResult.data ?? []) quotes.set(`fund:${fund.id}`, { value: Number(fund.annual_yield), observedAt: fund.updated_at });
    for (const rate of ratesResult.data ?? []) quotes.set(`currency:${rate.id}`, { value: Number(rate.rate), observedAt: rate.updated_at });
    for (const commodity of commoditiesResult.data ?? []) quotes.set(`commodity:${commodity.id}`, { value: Number(commodity.price), observedAt: commodity.updated_at });
    const observedAt = new Date().toISOString();
    const emailEligibility = new Map<string, boolean>();
    let triggered = 0;

    for (const alert of alerts) {
      const quote = quotes.get(`${alert.asset_type}:${alert.asset_id}`);
      const price = quote?.value;
      if (!quote || !quote.observedAt || typeof price !== "number" || !Number.isFinite(price) || price <= 0) continue;
      let emailAllowed = emailEligibility.get(alert.user_id);
      if (emailAllowed === undefined) {
        const { data: userResult } = await supabase.auth.admin.getUserById(alert.user_id);
        const email = userResult.user?.email?.trim().toLowerCase();
        if (!email) {
          emailAllowed = false;
        } else {
          const { data: suppression } = await supabase
            .from("communication_suppressions")
            .select("id")
            .eq("email_normalized", email)
            .is("lifted_at", null)
            .in("scope", ["all_email", "price_alert"])
            .limit(1);
          emailAllowed = (suppression?.length ?? 0) === 0;
        }
        emailEligibility.set(alert.user_id, emailAllowed);
      }
      const { data, error } = await supabase.rpc("claim_price_alert_event", {
        p_alert_id: alert.id,
        p_triggered_price: price,
        p_source_observed_at: quote.observedAt ?? observedAt,
        p_email_allowed: emailAllowed,
      });
      if (error) {
        console.error("Unable to claim alert", { alert_id: alert.id, error });
        continue;
      }
      if (data?.length) triggered += 1;
    }

    return new Response(JSON.stringify({ checked: alerts.length, triggered }), { headers });
  } catch (error) {
    console.error("check-price-alerts failed", error);
    return new Response(JSON.stringify({ error: "Alert evaluation failed" }), { status: 500, headers });
  }
});
