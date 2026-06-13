import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseJwtClaims(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : "";
  const claims = parseJwtClaims(token);
  if (claims?.role !== "service_role") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: alerts, error: alertsError } = await supabase
      .from("price_alerts")
      .select("*")
      .eq("is_active", true)
      .eq("is_triggered", false);

    if (alertsError) throw alertsError;
    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ checked: 0, triggered: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by asset_type
    const stockAlerts = alerts.filter((a: any) => a.asset_type === "stock");
    const currencyAlerts = alerts.filter((a: any) => a.asset_type === "currency");
    const commodityAlerts = alerts.filter((a: any) => a.asset_type === "commodity");
    const fundAlerts = alerts.filter((a: any) => a.asset_type === "fund");
    const newFundAlerts = alerts.filter((a: any) => a.asset_type === "new_fund");

    const priceMap: Record<string, number> = {};

    const stockIds = [...new Set(stockAlerts.map((a: any) => a.asset_id))];
    const currencyIds = [...new Set(currencyAlerts.map((a: any) => a.asset_id))];
    const commodityIds = [...new Set(commodityAlerts.map((a: any) => a.asset_id))];
    const fundIds = [...new Set(fundAlerts.map((a: any) => a.asset_id))];

    if (stockIds.length) {
      const { data } = await supabase.from("stocks").select("id, price").in("id", stockIds);
      (data || []).forEach((s: any) => { priceMap[s.id] = Number(s.price); });
    }
    if (currencyIds.length) {
      const { data } = await supabase.from("exchange_rates").select("id, rate").in("id", currencyIds);
      (data || []).forEach((r: any) => { priceMap[r.id] = Number(r.rate); });
    }
    if (commodityIds.length) {
      const { data } = await supabase.from("commodities").select("id, price").in("id", commodityIds);
      (data || []).forEach((c: any) => { priceMap[c.id] = Number(c.price); });
    }
    if (fundIds.length) {
      const { data } = await supabase.from("funds").select("id, annual_yield").in("id", fundIds);
      (data || []).forEach((f: any) => { priceMap[f.id] = Number(f.annual_yield); });
    }

    let triggered = 0;
    const triggeredUserIds = new Set<string>();

    for (const alert of alerts) {
      if (alert.asset_type === "new_fund") continue; // handled below

      const currentPrice = priceMap[alert.asset_id];
      if (currentPrice == null) continue;

      const cond = alert.condition as string;
      const threshold = Number(alert.target_price);
      const baseline = alert.baseline_price != null ? Number(alert.baseline_price) : null;

      let shouldTrigger = false;
      let messageDetail = "";

      if (cond === "above") {
        shouldTrigger = currentPrice >= threshold;
        messageDetail = `${currentPrice.toLocaleString()} ≥ ${threshold.toLocaleString()}`;
      } else if (cond === "below") {
        shouldTrigger = currentPrice <= threshold;
        messageDetail = `${currentPrice.toLocaleString()} ≤ ${threshold.toLocaleString()}`;
      } else if (baseline != null && baseline !== 0) {
        // change_* — % delta vs baseline
        const deltaPct = ((currentPrice - baseline) / baseline) * 100;
        if (cond === "change_up") shouldTrigger = deltaPct >= threshold;
        else if (cond === "change_down") shouldTrigger = deltaPct <= -threshold;
        else if (cond === "change_any") shouldTrigger = Math.abs(deltaPct) >= threshold;
        messageDetail = `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(2)}% vs baseline ${baseline.toLocaleString()}`;
      }

      if (!shouldTrigger) continue;

      await supabase.from("price_alerts").update({
        is_triggered: true,
        triggered_at: new Date().toISOString(),
        triggered_price: currentPrice,
      }).eq("id", alert.id);

      const unitLabel = alert.asset_type === "fund" ? "%" : "";
      const isChange = cond.startsWith("change_");
      const title = isChange
        ? `Yield data changed: ${alert.asset_name}`
        : `Data update: ${alert.asset_name}`;
      const body = isChange
        ? `${alert.asset_name} yield data changed. ${messageDetail}. Current value: ${currentPrice}${unitLabel}.`
        : `${alert.asset_name} reached your threshold. ${messageDetail}.`;

      if (alert.notify_inapp !== false) {
        await supabase.from("notifications").insert({
          user_id: alert.user_id,
          title,
          message: `${body} Data update only — not financial advice.`,
          type: "price_alert",
          metadata: {
            alert_id: alert.id,
            asset_type: alert.asset_type,
            asset_id: alert.asset_id,
            condition: cond,
            target_price: alert.target_price,
            triggered_price: currentPrice,
          },
        });
      }
      if (alert.notify_email !== false) triggeredUserIds.add(alert.user_id);
      triggered++;
    }

    // ─── New-fund alerts ───
    if (newFundAlerts.length) {
      for (const alert of newFundAlerts) {
        const since = alert.triggered_at ? new Date(alert.triggered_at) : new Date(alert.created_at);
        const { data: newFunds } = await supabase
          .from("funds")
          .select("id, name")
          .eq("is_published", true)
          .gt("created_at", since.toISOString())
          .limit(20);
        if (!newFunds || newFunds.length === 0) continue;

        await supabase.from("price_alerts").update({
          triggered_at: new Date().toISOString(),
        }).eq("id", alert.id);

        const list = newFunds.map((f: any) => f.name).slice(0, 5).join(", ");
        if (alert.notify_inapp !== false) {
          await supabase.from("notifications").insert({
            user_id: alert.user_id,
            title: `${newFunds.length} new fund${newFunds.length === 1 ? "" : "s"} added`,
            message: `New fund data is available: ${list}${newFunds.length > 5 ? "…" : ""}. Data update only — not financial advice.`,
            type: "new_fund",
            metadata: { fund_ids: newFunds.map((f: any) => f.id) },
          });
        }
        if (alert.notify_email !== false) triggeredUserIds.add(alert.user_id);
        triggered++;
      }
    }

    // Send instant email alerts to users who have instant_alerts enabled
    if (triggeredUserIds.size > 0) {
      const { data: prefs } = await supabase
        .from("email_preferences")
        .select("user_id")
        .eq("instant_alerts", true)
        .in("user_id", [...triggeredUserIds]);

      const eligibleUserIds = (prefs || []).map((p: any) => p.user_id);

      for (const userId of eligibleUserIds) {
        try {
          await supabase.functions.invoke("send-market-update", { body: { user_id: userId } });
        } catch (err) {
          console.error(`Failed to send instant email to ${userId}:`, err);
        }
      }
    }

    return new Response(
      JSON.stringify({ checked: alerts.length, triggered, emailed: triggeredUserIds.size }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("check-price-alerts error", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
