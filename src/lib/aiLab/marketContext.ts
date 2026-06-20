// Live market context for the AI Scenario Assistant.
// Pulls a small, cacheable snapshot from the public-data gateway so scenarios
// can substitute "current average yield" / "today's NSE move" with real numbers
// and provide a roster of assets that the Compare scenario can look up.

import { useEffect, useState } from "react";
import { fetchPublicData } from "@/lib/gateway";

export type AssetKind = "stock" | "fund" | "commodity" | "fx";

export interface ComparableAsset {
  kind: AssetKind;
  /** Underlying row id used for fetching per-asset history (when available). */
  id?: string;
  /** Display name, e.g. "Safaricom" or "US Dollar" */
  name: string;
  /** Short ticker / code, e.g. "SCOM", "USD", "GOLD" */
  symbol: string;
  /** Primary numeric value used for the compare table */
  value: number;
  /** Unit / label that describes `value` */
  valueLabel: string;
  /** Percentage change over the most recent comparable period (where known) */
  changePct: number | null;
  /** Optional extra metrics rendered in the compare table */
  extras?: Array<{ label: string; value: string }>;
  /** Lowercase tokens used by the lookup helper */
  aliases: string[];
}

export interface MarketContext {
  fundCount: number;
  avgAnnualYieldPct: number | null;
  topAnnualYieldPct: number | null;
  lowAnnualYieldPct: number | null;
  sampleStockSymbol: string | null;
  sampleStockPrice: number | null;
  sampleStockChangePct: number | null;
  assets: ComparableAsset[];
  fetchedAt: string;
}

interface FundRow {
  id: string | null;
  name: string | null;
  annual_yield: number | string | null;
  fund_type: string | null;
  manager: string | null;
}

interface StockRow {
  id: string | null;
  symbol: string | null;
  name: string | null;
  sector: string | null;
  price: number | string | null;
  day_change_percent: number | string | null;
}

interface CommodityRow {
  id: string | null;
  symbol: string | null;
  name: string | null;
  price: number | string | null;
  previous_price: number | string | null;
  unit: string | null;
}

interface RateRow {
  id: string | null;
  currency_code: string | null;
  currency_name: string | null;
  rate: number | string | null;
  previous_rate: number | string | null;
}

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : null;
};

const pctChange = (curr: number | null, prev: number | null): number | null => {
  if (curr == null || prev == null || prev === 0) return null;
  return Math.round(((curr - prev) / prev) * 10000) / 100;
};

const tokenize = (...parts: Array<string | null | undefined>): string[] => {
  const out = new Set<string>();
  for (const p of parts) {
    if (!p) continue;
    const lower = p.toLowerCase().trim();
    if (lower) {
      out.add(lower);
      for (const w of lower.split(/[^a-z0-9]+/).filter((w) => w.length >= 3)) out.add(w);
    }
  }
  return [...out];
};

export async function fetchMarketContext(): Promise<MarketContext> {
  const [funds, stocks, commodities, rates] = await Promise.all([
    fetchPublicData<FundRow>("funds", {
      select: ["id", "name", "annual_yield", "fund_type", "manager"],
      order: "annual_yield.desc",
      limit: 100,
    }),
    fetchPublicData<StockRow>("stocks", {
      select: ["id", "symbol", "name", "sector", "price", "day_change_percent"],
      order: "sort_order.asc",
      limit: 80,
    }),
    fetchPublicData<CommodityRow>("commodities", {
      select: ["id", "symbol", "name", "price", "previous_price", "unit"],
      order: "sort_order.asc",
      limit: 40,
    }),
    fetchPublicData<RateRow>("rates", {
      select: ["id", "currency_code", "currency_name", "rate", "previous_rate"],
      order: "sort_order.asc",
      limit: 40,
    }),
  ]);

  const mmf = funds.data
    .filter((f) => (f.fund_type ?? "money_market") === "money_market")
    .map((f) => num(f.annual_yield))
    .filter((n): n is number => n != null && n > 0 && n < 100);

  const avg = mmf.length ? mmf.reduce((a, b) => a + b, 0) / mmf.length : null;
  const top = mmf.length ? Math.max(...mmf) : null;
  const low = mmf.length ? Math.min(...mmf) : null;

  const assets: ComparableAsset[] = [];

  for (const f of funds.data) {
    const y = num(f.annual_yield);
    if (!f.name || y == null) continue;
    const fundType = (f.fund_type ?? "money_market").replace(/_/g, " ");
    const aliasParts = [f.name, f.manager, fundType];
    if ((f.fund_type ?? "money_market") === "money_market") {
      aliasParts.push("mmf", "money market", "money market fund");
    }
    assets.push({
      kind: "fund",
      id: f.id ?? undefined,
      name: f.name,
      symbol: f.name,
      value: y,
      valueLabel: "Annual yield (%)",
      changePct: null,
      extras: [
        { label: "Fund type", value: fundType },
        ...(f.manager ? [{ label: "Manager", value: f.manager }] : []),
      ],
      aliases: tokenize(...aliasParts),
    });
  }

  for (const s of stocks.data) {
    const p = num(s.price);
    if (!s.symbol || p == null) continue;
    assets.push({
      kind: "stock",
      id: s.id ?? undefined,
      name: s.name ?? s.symbol,
      symbol: s.symbol,
      value: p,
      valueLabel: "Price (KES)",
      changePct: num(s.day_change_percent),
      extras: s.sector ? [{ label: "Sector", value: s.sector }] : undefined,
      aliases: tokenize(s.symbol, s.name, s.sector, s.symbol === "SCOM" ? "safaricom" : null),
    });
  }

  for (const c of commodities.data) {
    const p = num(c.price);
    if (!c.symbol || p == null) continue;
    assets.push({
      kind: "commodity",
      id: c.id ?? undefined,
      name: c.name ?? c.symbol,
      symbol: c.symbol,
      value: p,
      valueLabel: c.unit ? `Price (${c.unit})` : "Price",
      changePct: pctChange(p, num(c.previous_price)),
      aliases: tokenize(c.symbol, c.name),
    });
  }

  for (const r of rates.data) {
    const rate = num(r.rate);
    if (!r.currency_code || rate == null) continue;
    assets.push({
      kind: "fx",
      id: r.id ?? undefined,
      name: r.currency_name ?? r.currency_code,
      symbol: r.currency_code,
      value: rate,
      valueLabel: "KES per 1 unit",
      changePct: pctChange(rate, num(r.previous_rate)),
      aliases: tokenize(r.currency_code, r.currency_name),
    });
  }

  const s = stocks.data[0];
  return {
    fundCount: mmf.length,
    avgAnnualYieldPct: avg != null ? Math.round(avg * 100) / 100 : null,
    topAnnualYieldPct: top,
    lowAnnualYieldPct: low,
    sampleStockSymbol: s?.symbol ?? null,
    sampleStockPrice: s ? num(s.price) : null,
    sampleStockChangePct: s ? num(s.day_change_percent) : null,
    assets,
    fetchedAt: new Date().toISOString(),
  };
}

/** Fuzzy lookup of an asset by user-supplied token (symbol / name fragment). */
export function findAsset(query: string, assets: ComparableAsset[]): ComparableAsset | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  // Exact symbol match wins
  const exact = assets.find((a) => a.symbol.toLowerCase() === q);
  if (exact) return exact;
  // Then exact name
  const nameExact = assets.find((a) => a.name.toLowerCase() === q);
  if (nameExact) return nameExact;
  // Alias contains
  const aliasHit = assets.find((a) => a.aliases.some((t) => t === q));
  if (aliasHit) return aliasHit;
  // Substring on name
  const sub = assets.find(
    (a) => a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q),
  );
  return sub ?? null;
}

export function useMarketContext() {
  const [data, setData] = useState<MarketContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchMarketContext()
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e?.message ?? "Failed to load market context"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, error, loading };
}

/** Detect prompts that reference live market values rather than explicit numbers. */
const AVG_YIELD_RE = /\b(average|avg|current|today'?s?|live)\b.*\b(yield|mmf|money market|rate)\b/i;
const TOP_YIELD_RE = /\b(top|highest|best performing|max(?:imum)?)\b.*\b(yield|mmf)\b/i;

export function applyLiveContext(prompt: string, ctx: MarketContext | null): {
  prompt: string;
  substituted: boolean;
  note?: string;
} {
  if (!ctx) return { prompt, substituted: false };

  if (TOP_YIELD_RE.test(prompt) && ctx.topAnnualYieldPct != null && !/\d+\s*%/.test(prompt)) {
    return {
      prompt: `${prompt} (using current top MMF yield ${ctx.topAnnualYieldPct}%)`.replace(
        /\b(top|highest|best performing|max(?:imum)?)\s+(yield|mmf)\b/i,
        `${ctx.topAnnualYieldPct}% yield`,
      ),
      substituted: true,
      note: `Substituted current top MMF yield: ${ctx.topAnnualYieldPct}%`,
    };
  }

  if (AVG_YIELD_RE.test(prompt) && ctx.avgAnnualYieldPct != null && !/\d+\s*%/.test(prompt)) {
    return {
      prompt: prompt.replace(
        /\b(average|avg|current|today'?s?|live)\s+(yield|mmf|money market|rate)\b/i,
        `${ctx.avgAnnualYieldPct}% yield`,
      ),
      substituted: true,
      note: `Substituted current average MMF yield: ${ctx.avgAnnualYieldPct}% (across ${ctx.fundCount} funds)`,
    };
  }

  return { prompt, substituted: false };
}
