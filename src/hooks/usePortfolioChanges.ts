import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PortfolioItem } from "@/hooks/usePortfolio";
import { resolveAsset, buildNameIndex } from "@/lib/assetMatch";

export interface ChangeRow {
  itemId: string;
  assetType: string;
  assetName: string;
  current: number;
  previous: number | null;
  delta: number | null;
  deltaPct: number | null;
  unit: "%" | "KES";
}

/**
 * Fetches the most recent prior snapshot for each portfolio item from
 * fund_yield_snapshots (funds) and stock_price_history (stocks).
 * Returns honest "delta unavailable" (null) when no prior snapshot exists.
 *
 * Asset lookup uses asset_id first, then ticker/symbol, then a normalized
 * asset_name fallback. Missing matches degrade gracefully — they do not crash.
 */
export function usePortfolioChanges(items: PortfolioItem[]) {
  const [changes, setChanges] = useState<ChangeRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!items.length) { setChanges([]); return; }
      setLoading(true);
      const out: ChangeRow[] = [];

      const funds = items.filter((i) => i.asset_type === "mmf");
      const stocks = items.filter((i) => i.asset_type === "stock");

      // ─── Funds ────────────────────────────────────────────────
      if (funds.length) {
        const { data: fundRows } = await supabase
          .from("funds_public")
          .select("id, name, slug, annual_yield")
          .eq("is_published", true);
        const records = (fundRows || []).map((r: any) => ({
          id: r.id as string,
          name: r.name as string,
          ticker: r.slug as string | null,
          current: Number(r.annual_yield) || 0,
        }));
        const idx = buildNameIndex(records, "name");

        const matched = funds.map((f) => ({
          holding: f,
          match: resolveAsset({ asset_id: f.asset_id ?? null, asset_name: f.asset_name, ticker: f.ticker }, records, idx),
        }));
        const fundIds = matched.map((m) => m.match?.id).filter(Boolean) as string[];

        const prev = new Map<string, number>();
        if (fundIds.length) {
          const { data: snap } = await supabase
            .from("fund_yield_snapshots")
            .select("fund_id, annual_yield, snapshot_date")
            .in("fund_id", fundIds)
            .order("snapshot_date", { ascending: false })
            .limit(fundIds.length * 5);
          (snap || []).forEach((s: any) => {
            if (!prev.has(s.fund_id)) prev.set(s.fund_id, Number(s.annual_yield));
          });
        }

        matched.forEach(({ holding, match }) => {
          if (!match) {
            out.push({
              itemId: holding.id, assetType: "mmf", assetName: holding.asset_name,
              current: holding.current_yield || 0, previous: null, delta: null, deltaPct: null, unit: "%",
            });
            return;
          }
          const previous = prev.get(match.id);
          const delta = previous != null ? match.current - previous : null;
          const deltaPct = previous != null && previous !== 0
            ? ((match.current - previous) / previous) * 100 : null;
          out.push({
            itemId: holding.id, assetType: "mmf", assetName: holding.asset_name,
            current: match.current, previous: previous ?? null, delta, deltaPct, unit: "%",
          });
        });
      }

      // ─── Stocks ───────────────────────────────────────────────
      if (stocks.length) {
        const { data: stockRows } = await supabase
          .from("stocks_public")
          .select("id, name, symbol, price")
          .eq("is_active", true);
        const records = (stockRows || []).map((r: any) => ({
          id: r.id as string,
          name: r.name as string,
          symbol: r.symbol as string | null,
          current: Number(r.price) || 0,
        }));
        const idx = buildNameIndex(records, "name");

        const matched = stocks.map((s) => ({
          holding: s,
          match: resolveAsset({ asset_id: s.asset_id ?? null, asset_name: s.asset_name, ticker: s.ticker }, records, idx),
        }));
        const stockIds = matched.map((m) => m.match?.id).filter(Boolean) as string[];

        const prev = new Map<string, number>();
        if (stockIds.length) {
          const { data: hist } = await supabase
            .from("stock_price_history_public")
            .select("stock_id, price, snapshot_date")
            .in("stock_id", stockIds)
            .order("snapshot_date", { ascending: false })
            .limit(stockIds.length * 5);
          (hist || []).forEach((s: any) => {
            if (!prev.has(s.stock_id)) prev.set(s.stock_id, Number(s.price));
          });
        }

        matched.forEach(({ holding, match }) => {
          if (!match) {
            out.push({
              itemId: holding.id, assetType: "stock", assetName: holding.asset_name,
              current: holding.current_price, previous: null, delta: null, deltaPct: null, unit: "KES",
            });
            return;
          }
          const previous = prev.get(match.id);
          const delta = previous != null ? match.current - previous : null;
          const deltaPct = previous != null && previous !== 0
            ? ((match.current - previous) / previous) * 100 : null;
          out.push({
            itemId: holding.id, assetType: "stock", assetName: holding.asset_name,
            current: match.current, previous: previous ?? null, delta, deltaPct, unit: "KES",
          });
        });
      }

      if (!cancelled) {
        setChanges(out);
        setLoading(false);
      }
    };
    run().catch((e) => {
      console.error("usePortfolioChanges error", e);
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => `${i.id}:${i.asset_name}`).join("|")]);

  return { changes, loading };
}
