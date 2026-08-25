// Thin client for the public-data gateway edge function.
// Use this for unauthenticated reads of market data (funds, stocks, rates,
// commodities, news, history). It enforces pagination and rate limits server-side.

import { getValidatedSupabaseConfig } from "@/lib/supabase-config";

const { supabaseUrl, supabasePublishableKey } = getValidatedSupabaseConfig();
const BASE = `${supabaseUrl}/functions/v1/public-data`;
const ANON_KEY = supabasePublishableKey;

export type GatewayResource =
  | "funds"
  | "stocks"
  | "rates"
  | "commodities"
  | "news"
  | "stock-history"
  | "rate-history"
  | "commodity-history"
  | "stock-disclosures"
  | "stock-actions"
  | "fund-snapshots"
  | "stock-history-bulk";

export interface GatewayQuery {
  select?: string[];
  order?: string; // e.g. "annual_yield.desc"
  limit?: number;
  offset?: number;
  /** History resources only: parent UUID */
  id?: string;
  /** History resources support up to 7,305 days; bulk-recent remains server-capped. */
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

const isRetryableStatus = (status: number) => status === 408 || status === 425 || status === 429 || status >= 500;

const wait = (milliseconds: number) => new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));

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
  const delays = [250, 700];
  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
      });

      if (res.ok) return res.json();

      let msg = `Gateway request failed (${res.status})`;
      try {
        const body = await res.json();
        if (body?.error) msg = body.error;
      } catch { /* ignore */ }

      const error = new GatewayError(res.status, msg);
      if (!isRetryableStatus(res.status) || attempt === delays.length) throw error;
    } catch (error) {
      if (error instanceof GatewayError && !isRetryableStatus(error.status)) throw error;
      if (attempt === delays.length) throw error;
    }

    await wait(delays[attempt]);
  }

  throw new Error("Gateway request failed");
}
