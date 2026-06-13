import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PortfolioItem } from "@/hooks/usePortfolio";

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
 */
export function usePortfolioChanges(items: PortfolioItem[]) {
  const [changes, setChanges] = useState<ChangeRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!items.length) { setChanges([]); return; }
      setLoading(true);

      const funds = items.filter((i) => i.asset_type === "mmf");
      const stocks = items.filter((i) => i.asset_type === "stock");

      // Match by asset name via funds_public; fall back to ticker (slug) when available.
      const out: ChangeRow[] = [];

      // ─── Funds ─────────────────────────────
      if (funds.length) {
        const fundIdsRes = await supabase
          .from("funds_public")
          .select("id, name, slug, annual_yield")
          .in("name", funds.map((f) => f.asset_name));
        const fundLookup = new Map<string, { id: string; current: number }>();
        (fundIdsRes.data || []).forEach((r: any) => {
          fundLookup.set(r.name, { id: r.id, current: Number(r.annual_yield) || 0 });
        });

        const fundIds = Array.from(fundLookup.values()).map((v) => v.id);
        if (fundIds.length) {
          const snapRes = await supabase
            .from("fund_yield_snapshots")
            .select("fund_id, annual_yield, snapshot_date")
            .in("fund_id", fundIds)
            .order("snapshot_date", { ascending: false })
            .limit(fundIds.length * 5);
          const prev = new Map<string, number>();
          (snapRes.data || []).forEach((s: any) => {
            if (!prev.has(s.fund_id)) prev.set(s.fund_id, Number(s.annual_yield));
          });

          funds.forEach((f) => {
            const meta = fundLookup.get(f.asset_name);
            if (!meta) {
              out.push({ itemId: f.id, assetType: "mmf", assetName: f.asset_name, current: f.current_yield || 0, previous: null, delta: null, deltaPct: null, unit: "%" });
              return;
            }
            const previous = prev.get(meta.id);
            const delta = previous != null ? meta.current - previous : null;
            const deltaPct = previous != null && previous !== 0 ? ((meta.current - previous) / previous) * 100 : null;
            out.push({
              itemId: f.id, assetType: "mmf", assetName: f.asset_name,
              current: meta.current, previous: previous ?? null, delta, deltaPct, unit: "%",
            });
          });
        }
      }

      // ─── Stocks ────────────────────────────
      if (stocks.length) {
        const stockRes = await supabase
          .from("stocks_public")
          .select("id, name, symbol, price")
          .in("name", stocks.map((s) => s.asset_name));
        const stockLookup = new Map<string, { id: string; current: number }>();
        (stockRes.data || []).forEach((r: any) => {
          stockLookup.set(r.name, { id: r.id, current: Number(r.price) || 0 });
        });
        const stockIds = Array.from(stockLookup.values()).map((v) => v.id);

        if (stockIds.length) {
          const hist = await supabase
            .from("stock_price_history_public")
            .select("stock_id, price, snapshot_date")
            .in("stock_id", stockIds)
            .order("snapshot_date", { ascending: false })
            .limit(stockIds.length * 5);
          const prev = new Map<string, number>();
          (hist.data || []).forEach((s: any) => {
            if (!prev.has(s.stock_id)) prev.set(s.stock_id, Number(s.price));
          });

          stocks.forEach((s) => {
            const meta = stockLookup.get(s.asset_name);
            if (!meta) {
              out.push({ itemId: s.id, assetType: "stock", assetName: s.asset_name, current: s.current_price, previous: null, delta: null, deltaPct: null, unit: "KES" });
              return;
            }
            const previous = prev.get(meta.id);
            const delta = previous != null ? meta.current - previous : null;
            const deltaPct = previous != null && previous !== 0 ? ((meta.current - previous) / previous) * 100 : null;
            out.push({
              itemId: s.id, assetType: "stock", assetName: s.asset_name,
              current: meta.current, previous: previous ?? null, delta, deltaPct, unit: "KES",
            });
          });
        }
      }

      if (!cancelled) {
        setChanges(out);
        setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [items]);

  return { changes, loading };
}
