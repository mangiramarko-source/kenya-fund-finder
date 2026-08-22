import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { authorizePrivilegedRequest } from "../_shared/privileged-auth.ts";
import { getSupabasePublishableKey, getSupabaseSecretKey } from "../_shared/supabase-keys.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authorization = await authorizePrivilegedRequest(req, {
    namedSecretKeysJson: Deno.env.get("SUPABASE_SECRET_KEYS"),
    secretName: "automations",
    verifyUser: async (accessToken) => {
      const userClient = createClient(supabaseUrl, getSupabasePublishableKey(), {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await userClient.auth.getUser(accessToken);
      return error ? null : data.user?.id ?? null;
    },
    isAdmin: async (userId) => {
      const adminClient = createClient(supabaseUrl, getSupabaseSecretKey(), {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      return Boolean(data);
    },
  });

  if (!authorization.ok) {
    return new Response(
      JSON.stringify({ error: authorization.status === 401 ? "Unauthorized" : "Forbidden" }),
      {
        status: authorization.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const supabase = createClient(
      supabaseUrl,
      getSupabaseSecretKey(),
    );

    // Fetch all portfolio items
    const { data: portfolios, error: pErr } = await supabase
      .from("mock_portfolios")
      .select("id, asset_type, asset_name, ticker");

    if (pErr) throw pErr;
    if (!portfolios || portfolios.length === 0) {
      return new Response(
        JSON.stringify({ updated: 0, message: "No portfolio items" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch live prices from all source tables in parallel
    const [fundsRes, stocksRes, commoditiesRes, fxRes] = await Promise.all([
      supabase.from("funds").select("id, slug, name, annual_yield, daily_yield"),
      supabase.from("stocks").select("id, symbol, name, price").eq("is_active", true),
      supabase.from("commodities").select("id, symbol, name, price").eq("is_active", true),
      supabase.from("exchange_rates").select("id, currency_code, currency_name, rate").eq("is_active", true),
    ]);

    // Build lookup maps: ticker/name → price/yield
    const priceLookup = new Map<string, { price: number; yld?: number }>();

    for (const f of fundsRes.data || []) {
      if (f.slug) priceLookup.set(f.slug.toLowerCase(), { price: 1, yld: Number(f.annual_yield) || 0 });
      if (f.name) priceLookup.set(f.name.toLowerCase(), { price: 1, yld: Number(f.annual_yield) || 0 });
    }
    for (const s of stocksRes.data || []) {
      if (s.symbol) priceLookup.set(s.symbol.toLowerCase(), { price: Number(s.price) || 0 });
      if (s.name) priceLookup.set(s.name.toLowerCase(), { price: Number(s.price) || 0 });
    }
    for (const c of commoditiesRes.data || []) {
      if (c.symbol) priceLookup.set(c.symbol.toLowerCase(), { price: Number(c.price) || 0 });
      if (c.name) priceLookup.set(c.name.toLowerCase(), { price: Number(c.price) || 0 });
    }
    for (const r of fxRes.data || []) {
      const fxTicker = `kes/${r.currency_code || ""}`.toLowerCase();
      priceLookup.set(fxTicker, { price: Number(r.rate) || 0 });
      const fxName = `kes / ${r.currency_code || ""}`.toLowerCase();
      priceLookup.set(fxName, { price: Number(r.rate) || 0 });
    }

    // Update each portfolio item with its live price
    let updated = 0;
    for (const item of portfolios) {
      const live =
        priceLookup.get(item.ticker?.toLowerCase() || "") ||
        priceLookup.get(item.asset_name?.toLowerCase() || "");

      if (!live) continue;

      const updatePayload: Record<string, number> = {};

      if (item.asset_type === "mmf") {
        // For MMFs update yield only
        if (live.yld !== undefined) updatePayload.current_yield = live.yld;
      } else {
        // For stocks, commodities, fx, fixed_income — update current_price
        if (live.price > 0) updatePayload.current_price = live.price;
      }

      if (Object.keys(updatePayload).length === 0) continue;

      const { error } = await supabase
        .from("mock_portfolios")
        .update(updatePayload)
        .eq("id", item.id);

      if (!error) updated++;
    }

    return new Response(
      JSON.stringify({ updated, total: portfolios.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sync-portfolio-prices error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
