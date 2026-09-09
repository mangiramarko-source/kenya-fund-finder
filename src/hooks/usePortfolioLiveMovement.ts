import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PortfolioItem } from "@/hooks/usePortfolio";
import { getCurrentValue } from "@/hooks/usePortfolio";
import { buildNameIndex, resolveAsset } from "@/lib/assetMatch";

export type PortfolioLiveMovement = {
  openingValue: number;
  closingValue: number;
  change: number;
  percentChange: number;
  movers: Array<{ assetName: string; change: number }>;
  observedAt: string;
  comparedHoldings: number;
};

type QuoteRecord = { id: string; name: string; ticker?: string | null };
type Observation = { asset_type: "stock" | "fx" | "commodity"; asset_id: string; value: number; observed_at: string };

const DAY = 24 * 60 * 60 * 1000;

export function calculatePortfolioLiveMovement(
  items: PortfolioItem[],
  resolvedIds: Map<string, string>,
  observations: Observation[],
  now = new Date(),
): PortfolioLiveMovement | null {
  const baselineCutoff = new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString();
  const windowStart = new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString();
  const observationsByAsset = new Map<string, Observation[]>();
  const latestByAsset = new Map<string, Observation>();
  for (const observation of observations) {
    const key = `${observation.asset_type}:${observation.asset_id}`;
    const latest = latestByAsset.get(key);
    if (!latest || observation.observed_at > latest.observed_at) latestByAsset.set(key, observation);
    if (observation.observed_at < windowStart || observation.observed_at > baselineCutoff) continue;
    observationsByAsset.set(key, [...(observationsByAsset.get(key) ?? []), observation]);
  }

  const comparable = items.flatMap((item) => {
    if (item.asset_type !== "stock" && item.asset_type !== "fx" && item.asset_type !== "commodity") return [];
    const id = resolvedIds.get(item.id);
    if (!id) return [];
    // A changed or newly-created holding did not exist with this quantity at the baseline.
    const changedAt = Math.max(Date.parse(item.created_at), Date.parse(item.updated_at));
    if (Number.isFinite(changedAt) && changedAt > now.getTime() - DAY) return [];
    const type = item.asset_type === "fx" ? "fx" : item.asset_type;
    const prior = (observationsByAsset.get(`${type}:${id}`) ?? [])
      .sort((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at))[0];
    const current = getCurrentValue(item);
    if (!prior || !Number.isFinite(current) || current < 0) return [];
    const openingValue = item.units * Number(prior.value);
    return Number.isFinite(openingValue) ? [{
      assetName: item.asset_name,
      openingValue,
      closingValue: current,
      change: current - openingValue,
      observedAt: latestByAsset.get(`${type}:${id}`)?.observed_at ?? prior.observed_at,
    }] : [];
  });
  if (!comparable.length) return null;
  const openingValue = comparable.reduce((sum, item) => sum + item.openingValue, 0);
  const closingValue = comparable.reduce((sum, item) => sum + item.closingValue, 0);
  const change = closingValue - openingValue;
  return {
    openingValue,
    closingValue,
    change,
    percentChange: openingValue > 0 ? (change / openingValue) * 100 : 0,
    movers: [...comparable].sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 2)
      .map(({ assetName, change: moverChange }) => ({ assetName, change: moverChange })),
    observedAt: comparable.reduce((latest, item) => item.observedAt > latest ? item.observedAt : latest, comparable[0].observedAt),
    comparedHoldings: comparable.length,
  };
}

export function usePortfolioLiveMovement(items: PortfolioItem[]) {
  const [movement, setMovement] = useState<PortfolioLiveMovement | null>(null);
  const [loading, setLoading] = useState(false);
  const marketItems = useMemo(() => items.filter((item) => item.asset_type === "stock" || item.asset_type === "fx" || item.asset_type === "commodity"), [items]);
  const marketItemsSignature = marketItems.map((item) => [item.id, item.asset_type, item.asset_id, item.ticker, item.asset_name, item.units, item.current_price, item.created_at, item.updated_at].join(":" )).join("|");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!marketItems.length) { setMovement(null); setLoading(false); return; }
      setLoading(true);
      const [stocks, rates, commodities] = await Promise.all([
        supabase.from("stocks_public").select("id,name,symbol").eq("is_active", true),
        supabase.from("exchange_rates_public").select("id,currency_code,currency_name").eq("is_active", true),
        supabase.from("commodities_public").select("id,name,symbol").eq("is_active", true),
      ]);
      const recordsByType: Record<"stock" | "fx" | "commodity", QuoteRecord[]> = {
        stock: (stocks.data ?? []).map((row: any) => ({ id: row.id, name: row.name, ticker: row.symbol })),
        fx: (rates.data ?? []).map((row: any) => ({ id: row.id, name: `KES / ${row.currency_code}`, ticker: `KES/${row.currency_code}` })),
        commodity: (commodities.data ?? []).map((row: any) => ({ id: row.id, name: row.name, ticker: row.symbol })),
      };
      const ids = new Map<string, string>();
      for (const item of marketItems) {
        const type = item.asset_type === "fx" ? "fx" : item.asset_type;
        const records = recordsByType[type];
        const match = resolveAsset({ asset_id: item.asset_id ?? null, asset_name: item.asset_name, ticker: item.ticker }, records, buildNameIndex(records, "name"));
        if (match) ids.set(item.id, match.id);
      }
      const assetIds = [...new Set(ids.values())];
      if (!assetIds.length) { if (!cancelled) { setMovement(null); setLoading(false); } return; }
      const since = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("portfolio_market_quote_observations_public" as any)
        .select("asset_type,asset_id,value,observed_at")
        .in("asset_id", assetIds)
        .gte("observed_at", since)
        .order("observed_at", { ascending: false });
      if (!cancelled) {
        setMovement(calculatePortfolioLiveMovement(items, ids, (data ?? []) as Observation[]));
        setLoading(false);
      }
    };
    run().catch((error) => { console.error("usePortfolioLiveMovement error", error); if (!cancelled) { setMovement(null); setLoading(false); } });
    return () => { cancelled = true; };
  }, [marketItemsSignature]);

  return { movement, loading };
}
