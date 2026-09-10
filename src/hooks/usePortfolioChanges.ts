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
      const fx = items.filter((i) => i.asset_type === "fx");
      const commodities = items.filter((i) => i.asset_type === "commodity");

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
          .select("id, name, symbol, price, previous_price")
          .eq("is_active", true);
        const records = (stockRows || []).map((r: any) => ({
          id: r.id as string,
          name: r.name as string,
          symbol: r.symbol as string | null,
          current: Number(r.price) || 0,
          previous: r.previous_price == null ? null : Number(r.previous_price),
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
          const previous = match.previous ?? prev.get(match.id);
          const delta = previous != null ? match.current - previous : null;
          const deltaPct = previous != null && previous !== 0
            ? ((match.current - previous) / previous) * 100 : null;
          out.push({
            itemId: holding.id, assetType: "stock", assetName: holding.asset_name,
            current: match.current, previous: previous ?? null, delta, deltaPct, unit: "KES",
          });
        });
      }

      // ─── FX and commodities ──────────────────────────────────
      // These markets publish a current and previous quote directly. Using
      // them keeps the card's 1D movement aligned with the source quote.
      const quoteGroups = [
        { type: "fx" as const, holdings: fx, table: "exchange_rates_public", fields: "id, currency_code, currency_name, rate, previous_rate", currentField: "rate", previousField: "previous_rate", name: (row: any) => `KES / ${row.currency_code}`, ticker: (row: any) => `KES/${row.currency_code}` },
        { type: "commodity" as const, holdings: commodities, table: "commodities_public", fields: "id, name, symbol, price, previous_price", currentField: "price", previousField: "previous_price", name: (row: any) => row.name, ticker: (row: any) => row.symbol },
      ];
      for (const group of quoteGroups) {
        if (!group.holdings.length) continue;
        const { data: rows } = await supabase.from(group.table as any).select(group.fields);
        const records = (rows ?? []).map((row: any) => ({
          id: row.id as string,
          name: group.name(row) as string,
          ticker: group.ticker(row) as string | null,
          current: Number(row[group.currentField]) || 0,
          previous: row[group.previousField] == null ? null : Number(row[group.previousField]),
        }));
        const idx = buildNameIndex(records, "name");
        group.holdings.forEach((holding) => {
          const match = resolveAsset({ asset_id: holding.asset_id ?? null, asset_name: holding.asset_name, ticker: holding.ticker }, records, idx);
          const previous = match?.previous ?? null;
          const current = match?.current ?? holding.current_price;
          const delta = previous != null ? current - previous : null;
          out.push({
            itemId: holding.id, assetType: group.type, assetName: holding.asset_name,
            current, previous, delta,
            deltaPct: previous != null && previous !== 0 ? (delta! / previous) * 100 : null,
            unit: "KES",
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
  }, [items.map((i) => `${i.id}:${i.asset_name}:${i.asset_id ?? ""}:${i.ticker ?? ""}:${i.current_price}:${i.current_yield}`).join("|")]);

  return { changes, loading };
}
