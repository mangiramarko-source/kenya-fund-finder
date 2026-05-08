// External read-only API for syndicating public market data to other apps.
// Auth: Bearer <api_key> (sha-256 hashed in DB). Per-key rate limit (req/min).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function checkRate(apiKeyId: string, perMinute: number): Promise<boolean> {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await admin
    .from("api_key_usage")
    .select("id", { count: "exact", head: true })
    .eq("api_key_id", apiKeyId)
    .gte("created_at", since);
  return (count ?? 0) < perMinute;
}

async function logUsage(apiKeyId: string, endpoint: string, status: number, ipHash: string | null) {
  await admin.from("api_key_usage").insert({
    api_key_id: apiKeyId,
    endpoint,
    status_code: status,
    ip_hash: ipHash,
  });
  await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", apiKeyId);
}

async function fetchAll<T>(table: string, columns: string, filter?: { col: string; val: any }) {
  let query = admin.from(table).select(columns);
  if (filter) query = query.eq(filter.col, filter.val);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as T[];
}

async function handleResource(resource: string): Promise<unknown> {
  switch (resource) {
    case "funds":
      return await fetchAll("funds", "*", { col: "is_published", val: true });
    case "fund-snapshots":
      return await fetchAll("fund_yield_snapshots", "*");
    case "fund-historical-yields":
      return await fetchAll("fund_historical_yields", "*");
    case "stocks":
      return await fetchAll("stocks", "*", { col: "is_active", val: true });
    case "stock-history":
      return await fetchAll("stock_price_history", "*");
    case "rates":
      return await fetchAll("exchange_rates", "*", { col: "is_active", val: true });
    case "rate-history":
      return await fetchAll("exchange_rate_history", "*");
    case "commodities":
      return await fetchAll("commodities", "*", { col: "is_active", val: true });
    case "commodity-history":
      return await fetchAll("commodity_price_history", "*");
    case "news":
      return await fetchAll("news_articles", "*", { col: "status", val: "published" });
    case "testimonials":
      return await fetchAll("testimonials", "*", { col: "is_active", val: true });
    case "export": {
      const [
        funds, fundSnapshots, fundHistoricalYields,
        stocks, stockHistory,
        rates, rateHistory,
        commodities, commodityHistory,
        news, testimonials,
      ] = await Promise.all([
        handleResource("funds"), handleResource("fund-snapshots"), handleResource("fund-historical-yields"),
        handleResource("stocks"), handleResource("stock-history"),
        handleResource("rates"), handleResource("rate-history"),
        handleResource("commodities"), handleResource("commodity-history"),
        handleResource("news"), handleResource("testimonials"),
      ]);
      return {
        generated_at: new Date().toISOString(),
        funds, fund_snapshots: fundSnapshots, fund_historical_yields: fundHistoricalYields,
        stocks, stock_history: stockHistory,
        rates, rate_history: rateHistory,
        commodities, commodity_history: commodityHistory,
        news, testimonials,
      };
    }
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  // Path: /external-api/<resource>
  const parts = url.pathname.split("/").filter(Boolean);
  const resource = parts[parts.length - 1] || "";

  if (resource === "external-api" || resource === "") {
    return json({
      name: "Kenya Fund Finder External API",
      version: "1.0",
      auth: "Send header: Authorization: Bearer <YOUR_API_KEY>",
      endpoints: [
        "/funds", "/fund-snapshots", "/fund-historical-yields",
        "/stocks", "/stock-history",
        "/rates", "/rate-history",
        "/commodities", "/commodity-history",
        "/news", "/testimonials",
        "/export (everything in one payload)",
      ],
    });
  }

  // Auth
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return json({ error: "Missing Bearer token" }, 401);
  const presented = m[1].trim();
  const hash = await sha256Hex(presented);

  const { data: keyRow, error: keyErr } = await admin
    .rpc("verify_api_key", { _key_hash: hash })
    .maybeSingle();

  if (keyErr || !keyRow) return json({ error: "Invalid or revoked API key" }, 401);

  // Rate limit
  const allowed = await checkRate(keyRow.id, keyRow.rate_limit_per_minute);
  const ipHash = await sha256Hex((req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown");

  if (!allowed) {
    await logUsage(keyRow.id, resource, 429, ipHash);
    return json({ error: "Rate limit exceeded", limit_per_minute: keyRow.rate_limit_per_minute }, 429);
  }

  try {
    const data = await handleResource(resource);
    if (data === null) {
      await logUsage(keyRow.id, resource, 404, ipHash);
      return json({ error: `Unknown resource: ${resource}` }, 404);
    }
    await logUsage(keyRow.id, resource, 200, ipHash);
    return json({ resource, count: Array.isArray(data) ? data.length : undefined, data });
  } catch (e) {
    console.error("external-api error", e);
    await logUsage(keyRow.id, resource, 500, ipHash);
    return json({ error: (e as Error).message }, 500);
  }
});
