// Thin client for the public-data gateway edge function.
// Use this for unauthenticated reads of market data (funds, stocks, rates,
// commodities, news, history). It enforces pagination and rate limits server-side.
//
// The gateway is the long-term replacement for direct PostgREST reads against
// the *_public views. Existing direct reads still work, but new code should
// prefer the gateway so we can throttle and monitor scrapers in one place.

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
const BASE = `https://${PROJECT_ID}.supabase.co/functions/v1/public-data`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export type GatewayResource =
  | "funds"
  | "stocks"
  | "rates"
  | "commodities"
  | "news"
  | "stock-history"
  | "rate-history"
  | "commodity-history";

export interface GatewayQuery {
  select?: string[];
  order?: string; // e.g. "annual_yield.desc"
  limit?: number;
  offset?: number;
  /** History resources only: parent UUID */
  id?: string;
  /** History resources only: lookback window in days (max 90) */
  days?: number;
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
