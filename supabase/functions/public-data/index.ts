// Public read-only gateway for market data.
// - Enforces per-IP rate limits (uses public.check_rate_limit)
// - Caps pagination
// - Restricts history queries (must filter by id; bounded date window)
// - Returns a small, fixed set of resources only (no arbitrary select=*)
//
// This function is intentionally permissive about CORS and does not require auth.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// --- Limits -----------------------------------------------------------------
const RATE_WINDOW_SECONDS = 60;
const RATE_MAX_REQUESTS = 60; // 60 req / IP / minute
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const MAX_HISTORY_DAYS = 90;

// --- Resource registry ------------------------------------------------------
type ResourceKind = "list" | "history";

interface ResourceDef {
  kind: ResourceKind;
  /** PostgREST view to read from (only _public views are exposed) */
  view: string;
  /** Whitelisted columns clients may request (subset of the view) */
  columns: string[];
  /** Whitelisted columns the client may order by */
  orderable: string[];
  /** Default order column */
  defaultOrder: string;
  /** For history resources: the column holding the parent id (must be filtered) */
  parentIdColumn?: string;
  /** Cache-control max-age in seconds */
  cacheSeconds: number;
}

const RESOURCES: Record<string, ResourceDef> = {
  funds: {
    kind: "list",
    view: "funds_public",
    columns: [
      "id", "slug", "name", "manager", "cma_licensed",
      "annual_yield", "daily_yield", "seven_day_yield", "thirty_day_yield",
      "fund_type", "minimum_investment", "management_fee", "withdrawal_time",
      "description", "website", "fact_sheet_date", "yield_unit",
      "is_published", "updated_at",
    ],
    orderable: ["annual_yield", "daily_yield", "name", "updated_at"],
    defaultOrder: "annual_yield.desc",
    cacheSeconds: 300,
  },
  stocks: {
    kind: "list",
    view: "stocks_public",
    columns: [
      "id", "symbol", "name", "sector", "price", "previous_price",
      "day_change", "day_change_percent", "volume", "market_cap",
      "pe_ratio", "dividend_yield", "year_high", "year_low",
      "sort_order", "updated_at",
    ],
    orderable: ["sort_order", "symbol", "price", "day_change_percent", "updated_at"],
    defaultOrder: "sort_order.asc",
    cacheSeconds: 60,
  },
  rates: {
    kind: "list",
    view: "exchange_rates_public",
    columns: [
      "id", "currency_code", "currency_name", "rate", "previous_rate",
      "sort_order", "updated_at",
    ],
    orderable: ["sort_order", "currency_code", "rate", "updated_at"],
    defaultOrder: "sort_order.asc",
    cacheSeconds: 60,
  },
  commodities: {
    kind: "list",
    view: "commodities_public",
    columns: [
      "id", "name", "symbol", "price", "previous_price", "unit",
      "sort_order", "updated_at",
    ],
    orderable: ["sort_order", "symbol", "price", "updated_at"],
    defaultOrder: "sort_order.asc",
    cacheSeconds: 60,
  },
  news: {
    kind: "list",
    view: "news_articles_public",
    columns: [
      "id", "title", "summary", "source", "date_published", "url",
      "category", "read_time", "is_featured", "status", "image_url",
    ],
    orderable: ["date_published", "is_featured"],
    defaultOrder: "date_published.desc",
    cacheSeconds: 120,
  },
  // History resources: require ?id=<uuid>, capped at MAX_HISTORY_DAYS days.
  "stock-history": {
    kind: "history",
    view: "stock_price_history_public",
    columns: ["id", "stock_id", "snapshot_date", "price", "symbol"],
    orderable: ["snapshot_date"],
    defaultOrder: "snapshot_date.asc",
    parentIdColumn: "stock_id",
    cacheSeconds: 600,
  },
  "rate-history": {
    kind: "history",
    view: "exchange_rate_history_public",
    columns: ["id", "exchange_rate_id", "snapshot_date", "rate", "currency_code"],
    orderable: ["snapshot_date"],
    defaultOrder: "snapshot_date.asc",
    parentIdColumn: "exchange_rate_id",
    cacheSeconds: 600,
  },
  "commodity-history": {
    kind: "history",
    view: "commodity_price_history_public",
    columns: ["id", "commodity_id", "snapshot_date", "price", "symbol"],
    orderable: ["snapshot_date"],
    defaultOrder: "snapshot_date.asc",
    parentIdColumn: "commodity_id",
    cacheSeconds: 600,
  },
};

// --- Helpers ----------------------------------------------------------------
function json(body: unknown, status: number, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "0.0.0.0";
}

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`gw:${ip}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseOrder(raw: string | null, def: string, allowed: string[]): { col: string; asc: boolean } {
  const value = raw && raw.includes(".") ? raw : def;
  const [col, dir] = value.split(".");
  if (!allowed.includes(col)) {
    return parseOrder(null, def, allowed);
  }
  return { col, asc: (dir || "asc").toLowerCase() !== "desc" };
}

function parseColumns(raw: string | null, allowed: string[]): string[] {
  if (!raw) return allowed;
  const requested = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const safe = requested.filter((c) => allowed.includes(c));
  return safe.length > 0 ? safe : allowed;
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = raw ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// --- Handler ----------------------------------------------------------------
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const url = new URL(req.url);
  // Path is /public-data/<resource>
  const segments = url.pathname.split("/").filter(Boolean);
  const resourceKey = segments[segments.length - 1];
  const resource = RESOURCES[resourceKey];

  if (!resource) {
    return json({ error: "Unknown resource", allowed: Object.keys(RESOURCES) }, 404);
  }

  // Rate limit per hashed IP
  try {
    const ipHash = await hashIp(clientIp(req));
    const { data: allowed, error: rlErr } = await supabase.rpc("check_rate_limit", {
      p_ip_hash: ipHash,
      p_window_seconds: RATE_WINDOW_SECONDS,
      p_max_requests: RATE_MAX_REQUESTS,
    });
    if (rlErr) {
      console.error("rate_limit_error", rlErr);
    } else if (allowed === false) {
      return json(
        { error: "Rate limit exceeded. Please slow down." },
        429,
        { "Retry-After": String(RATE_WINDOW_SECONDS) },
      );
    }
  } catch (e) {
    console.error("rate_limit_exception", e);
    // fail-open: don't block if RPC fails transiently
  }

  // Build query
  const limit = clampInt(url.searchParams.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = clampInt(url.searchParams.get("offset"), 0, 0, 10_000);
  const columns = parseColumns(url.searchParams.get("select"), resource.columns);
  const order = parseOrder(url.searchParams.get("order"), resource.defaultOrder, resource.orderable);

  let query = supabase
    .from(resource.view)
    .select(columns.join(","), { count: "exact" })
    .order(order.col, { ascending: order.asc })
    .range(offset, offset + limit - 1);

  if (resource.kind === "history") {
    const parentId = url.searchParams.get("id");
    if (!parentId || !UUID_RE.test(parentId)) {
      return json(
        { error: `History resource requires ?id=<uuid> on column ${resource.parentIdColumn}` },
        400,
      );
    }
    const days = clampInt(url.searchParams.get("days"), MAX_HISTORY_DAYS, 1, MAX_HISTORY_DAYS);
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    query = query
      .eq(resource.parentIdColumn!, parentId)
      .gte("snapshot_date", sinceStr);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error("query_error", resourceKey, error);
    return json({ error: "Query failed" }, 500);
  }

  return json(
    {
      resource: resourceKey,
      count: count ?? data?.length ?? 0,
      limit,
      offset,
      data: data ?? [],
    },
    200,
    {
      "Cache-Control": `public, max-age=${resource.cacheSeconds}`,
      "X-RateLimit-Limit": String(RATE_MAX_REQUESTS),
      "X-RateLimit-Window": String(RATE_WINDOW_SECONDS),
    },
  );
});
