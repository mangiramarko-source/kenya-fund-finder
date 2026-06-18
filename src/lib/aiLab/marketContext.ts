// Live market context for the AI Scenario Assistant.
// Pulls a small, cacheable snapshot from the public-data gateway so scenarios
// can substitute "current average yield" / "today's NSE move" with real numbers.

import { useEffect, useState } from "react";
import { fetchPublicData } from "@/lib/gateway";

export interface MarketContext {
  fundCount: number;
  avgAnnualYieldPct: number | null;
  topAnnualYieldPct: number | null;
  lowAnnualYieldPct: number | null;
  sampleStockSymbol: string | null;
  sampleStockPrice: number | null;
  sampleStockChangePct: number | null;
  fetchedAt: string;
}

interface FundRow {
  annual_yield: number | string | null;
  fund_type: string | null;
}

interface StockRow {
  symbol: string | null;
  price: number | string | null;
  change_percent: number | string | null;
}

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : null;
};

export async function fetchMarketContext(): Promise<MarketContext> {
  const [funds, stocks] = await Promise.all([
    fetchPublicData<FundRow>("funds", {
      select: ["annual_yield", "fund_type"],
      order: "annual_yield.desc",
      limit: 100,
    }),
    fetchPublicData<StockRow>("stocks", {
      select: ["symbol", "price", "change_percent"],
      order: "change_percent.desc",
      limit: 1,
    }),
  ]);

  const mmf = funds.data
    .filter((f) => (f.fund_type ?? "money_market") === "money_market")
    .map((f) => num(f.annual_yield))
    .filter((n): n is number => n != null && n > 0 && n < 100);

  const avg = mmf.length ? mmf.reduce((a, b) => a + b, 0) / mmf.length : null;
  const top = mmf.length ? Math.max(...mmf) : null;
  const low = mmf.length ? Math.min(...mmf) : null;

  const s = stocks.data[0];
  return {
    fundCount: mmf.length,
    avgAnnualYieldPct: avg != null ? Math.round(avg * 100) / 100 : null,
    topAnnualYieldPct: top,
    lowAnnualYieldPct: low,
    sampleStockSymbol: s?.symbol ?? null,
    sampleStockPrice: s ? num(s.price) : null,
    sampleStockChangePct: s ? num(s.change_percent) : null,
    fetchedAt: new Date().toISOString(),
  };
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
