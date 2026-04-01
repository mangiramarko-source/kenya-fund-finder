import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const stockAlerts = alerts.filter((a: any) => a.asset_type === "stock");
    const currencyAlerts = alerts.filter((a: any) => a.asset_type === "currency");
    const commodityAlerts = alerts.filter((a: any) => a.asset_type === "commodity");
    const fundAlerts = alerts.filter((a: any) => a.asset_type === "fund");

    const stockIds = [...new Set(stockAlerts.map((a: any) => a.asset_id))];
    const currencyIds = [...new Set(currencyAlerts.map((a: any) => a.asset_id))];
    const commodityIds = [...new Set(commodityAlerts.map((a: any) => a.asset_id))];
    const fundIds = [...new Set(fundAlerts.map((a: any) => a.asset_id))];

    const priceMap: Record<string, number> = {};

    if (stockIds.length > 0) {
      const { data } = await supabase.from("stocks").select("id, price").in("id", stockIds);
      (data || []).forEach((s: any) => { priceMap[s.id] = Number(s.price); });
    }
    if (currencyIds.length > 0) {
      const { data } = await supabase.from("exchange_rates").select("id, rate").in("id", currencyIds);
      (data || []).forEach((r: any) => { priceMap[r.id] = Number(r.rate); });
    }
    if (commodityIds.length > 0) {
      const { data } = await supabase.from("commodities").select("id, price").in("id", commodityIds);
      (data || []).forEach((c: any) => { priceMap[c.id] = Number(c.price); });
    }
    if (fundIds.length > 0) {
      const { data } = await supabase.from("funds").select("id, annual_yield").in("id", fundIds);
      (data || []).forEach((f: any) => { priceMap[f.id] = Number(f.annual_yield); });
    }

    let triggered = 0;

    for (const alert of alerts) {
      const currentPrice = priceMap[alert.asset_id];
      if (currentPrice == null) continue;

      const shouldTrigger =
        (alert.condition === "above" && currentPrice >= alert.target_price) ||
        (alert.condition === "below" && currentPrice <= alert.target_price);

      if (shouldTrigger) {
        await supabase
          .from("price_alerts")
          .update({
            is_triggered: true,
            triggered_at: new Date().toISOString(),
            triggered_price: currentPrice,
          })
          .eq("id", alert.id);

        const unitLabel = alert.asset_type === "fund" ? "%" : "";
        await supabase.from("notifications").insert({
          user_id: alert.user_id,
          title: `Price Alert: ${alert.asset_name}`,
          message: `${alert.asset_name} has gone ${alert.condition} your target of ${alert.target_price.toLocaleString()}${unitLabel}. Current ${alert.asset_type === "fund" ? "yield" : "price"}: ${currentPrice.toLocaleString()}${unitLabel}.`,
          type: "price_alert",
          metadata: {
            alert_id: alert.id,
            asset_type: alert.asset_type,
            asset_id: alert.asset_id,
            target_price: alert.target_price,
            triggered_price: currentPrice,
          },
        });

        triggered++;
      }
    }

    return new Response(
      JSON.stringify({ checked: alerts.length, triggered }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
