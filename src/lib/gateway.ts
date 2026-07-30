// Thin client for the public-data gateway edge function.
// Use this for unauthenticated reads of market data (funds, stocks, rates,
// commodities, news, history). It enforces pagination and rate limits server-side.
//
// The gateway is the long-term replacement for direct PostgREST reads against
// the *_public views. Existing direct reads still work, but new code should
// prefer the gateway so we can throttle and monitor scrapers in one place.

import { normalizeSupabaseUrl } from "@/lib/supabase-url";

// Use VITE_SUPABASE_URL as the source of truth. Published builds may omit both
// VITE_SUPABASE_URL and VITE_SUPABASE_PROJECT_ID, so keep a public, generated
// project URL fallback instead of ever producing https://undefined.supabase.co.
const envSupabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const envProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
const SUPABASE_URL =
  envSupabaseUrl && envSupabaseUrl !== "undefined"
    ? envSupabaseUrl
    : envProjectId && envProjectId !== "undefined"
      ? `https://${envProjectId}.supabase.co`
      : "https://qrmthciurngpzpjhevdj.supabase.co";
const BASE = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/public-data`;
const ANON_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFybXRoY2l1cm5ncHpwamhldmRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzQ1ODksImV4cCI6MjA4Nzg1MDU4OX0.WeQLthaDLzYdmSjY_tt4_ZClx68aXQe3EOjn314yygs";

export type GatewayResource =
  | "funds"
  | "stocks"
  | "rates"
  | "commodities"
  | "news"
  | "stock-history"
  | "rate-history"
  | "commodity-history"
  | "fund-snapshots"
  | "stock-history-bulk";

export interface GatewayQuery {
  select?: string[];
  order?: string; // e.g. "annual_yield.desc"
  limit?: number;
  offset?: number;
  /** History resources only: parent UUID */
  id?: string;
  /** History / bulk-recent resources only: lookback window in days (max 90) */
  days?: number;
  /** Whitelisted equality filters for list resources (e.g. { slug: "foo" }) */
  filters?: Record<string, string>;
}

export interface GatewayResponse<T> {
  resource: string;
  count: number;
  limit: number;
  offset: number;
  data: T[];
}

export class GatewayError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function fetchPublicData<T = Record<string, unknown>>(
  resource: GatewayResource,
  query: GatewayQuery = {},
): Promise<GatewayResponse<T>> {
  const params = new URLSearchParams();
  if (query.select?.length) params.set("select", query.select.join(","));
  if (query.order) params.set("order", query.order);
  if (query.limit != null) params.set("limit", String(query.limit));
  if (query.offset != null) params.set("offset", String(query.offset));
  if (query.id) params.set("id", query.id);
  if (query.days != null) params.set("days", String(query.days));
  if (query.filters) {
    for (const [k, v] of Object.entries(query.filters)) {
      if (v != null && v !== "") params.set(k, v);
    }
  }

  const url = `${BASE}/${resource}${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  });

  if (!res.ok) {
    let msg = `Gateway request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch { /* ignore */ }
    throw new GatewayError(res.status, msg);
  }
  return res.json();
}
