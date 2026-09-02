import { useCallback, useEffect, useId, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { fetchPublicData } from "@/lib/gateway";

export interface ExchangeRate {
  id: string;
  currency_code: string;
  currency_name: string;
  rate: number;
  previous_rate: number | null;
  day_change_percent?: number | null;
  updated_at: string;
}

export interface Commodity {
  id: string;
  name: string;
  symbol: string;
  price: number;
  previous_price: number | null;
  unit: string;
  day_change_percent?: number | null;
  updated_at: string;
}

const ChangeIndicator = ({ current, previous }: { current: number; previous: number | null }) => {
  if (previous == null) return <span className="text-muted-foreground text-xs">—</span>;
  const diff = current - previous;
  const pct = previous !== 0 ? ((diff / previous) * 100).toFixed(2) : "0.00";
  if (diff > 0) return (
    <span className="inline-flex items-center gap-0.5 text-accent text-[11px] font-semibold">
      <TrendingUp className="h-3 w-3" /> +{pct}%
    </span>
  );
  if (diff < 0) return (
    <span className="inline-flex items-center gap-0.5 text-destructive text-[11px] font-semibold">
      <TrendingDown className="h-3 w-3" /> {pct}%
    </span>
  );
  return <span className="inline-flex items-center gap-0.5 text-muted-foreground text-[11px]"><Minus className="h-3 w-3" /> 0.00%</span>;
};

export interface Stock {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  price: number;
  previous_price: number | null;
  day_change: number;
  day_change_percent: number;
  volume: number;
  market_cap: number | null;
  logo_url?: string | null;
  updated_at: string;
}

export function useMarketData() {
  // Watchlist's desktop and mobile shells can both use this hook during a
  // responsive render. Supabase channels cannot share a topic while one is
  // already subscribed, so each hook instance gets its own stable channel.
  const marketChannelId = useId().replace(/:/g, "");
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    const [ratesRes, commoditiesRes, stocksRes] = await Promise.all([
      fetchPublicData<ExchangeRate>("rates", { limit: 200 }),
      fetchPublicData<Commodity>("commodities", { limit: 200 }),
      fetchPublicData<Stock>("stocks", { limit: 500 }),
    ]);
    setRates(
      ((ratesRes.data || []).map((r) => ({
        ...r,
        rate: Number(r.rate),
        previous_rate: r.previous_rate != null ? Number(r.previous_rate) : null,
      })) as ExchangeRate[])
    );
    setCommodities(
      ((commoditiesRes.data || []).map((c) => ({
        ...c,
        price: Number(c.price),
        previous_price: c.previous_price != null ? Number(c.previous_price) : null,
      })) as Commodity[])
    );
    setStocks(
      ((stocksRes.data || []).map((s) => ({
        ...s,
        price: Number(s.price),
        previous_price: s.previous_price != null ? Number(s.previous_price) : null,
        day_change: Number(s.day_change),
        day_change_percent: Number(s.day_change_percent),
      })) as Stock[])
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchData(true);

    const channel = supabase
      .channel(`market-realtime-${marketChannelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "exchange_rates" }, () => void fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "commodities" }, () => void fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "stocks" }, () => void fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, marketChannelId]);

  return { rates, commodities, stocks, loading };
}

/* ─── Desktop Table: FX Rates ─── */
export const RatesTable = ({ rates, loading }: { rates: ExchangeRate[]; loading: boolean }) => {
  if (loading) return <TableSkeleton />;
  if (rates.length === 0) return <EmptyMarket label="exchange rates" />;

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <table className="w-full text-sm table-fixed">
        <colgroup>
          <col className="w-10" />
          <col />
          <col className="w-36" />
          <col className="w-28" />
        </colgroup>
        <thead>
          <tr className="bg-muted/70 text-xs">
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">#</th>
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Currency</th>
            <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Rate (KES)</th>
            <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Change</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((r, i) => (
            <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3.5 text-muted-foreground text-xs tabular-nums">{i + 1}</td>
              <td className="px-4 py-3.5">
                <span className="font-semibold text-foreground">{r.currency_code}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">{r.currency_name}</span>
              </td>
              <td className="px-4 py-3.5 text-right tabular-nums">
                <span className="font-bold text-accent text-base">
                  {r.rate.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </td>
              <td className="px-4 py-3.5 text-right">
                <ChangeIndicator current={r.rate} previous={r.previous_rate} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ─── Desktop Table: Commodities ─── */
export const CommoditiesTable = ({ commodities, loading }: { commodities: Commodity[]; loading: boolean }) => {
  if (loading) return <TableSkeleton />;
  if (commodities.length === 0) return <EmptyMarket label="commodities" />;

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <table className="w-full text-sm table-fixed">
        <colgroup>
          <col className="w-10" />
          <col />
          <col className="w-40" />
          <col className="w-28" />
        </colgroup>
        <thead>
          <tr className="bg-muted/70 text-xs">
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">#</th>
            <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Item</th>
            <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Price</th>
            <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Change</th>
          </tr>
        </thead>
        <tbody>
          {commodities.map((c, i) => (
            <tr key={c.id} className="border-t border-border hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3.5 text-muted-foreground text-xs tabular-nums">{i + 1}</td>
              <td className="px-4 py-3.5">
                <span className="font-semibold text-foreground">{c.name}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">{c.symbol}</span>
              </td>
              <td className="px-4 py-3.5 text-right tabular-nums">
                <span className="font-bold text-accent text-base">
                  {c.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-muted-foreground ml-1 text-[10px]">{c.unit}</span>
              </td>
              <td className="px-4 py-3.5 text-right">
                <ChangeIndicator current={c.price} previous={c.previous_price} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ─── Mobile Cards: FX Rates ─── */
export const RatesMobileCards = ({ rates, loading }: { rates: ExchangeRate[]; loading: boolean }) => {
  if (loading) return <MobileSkeleton />;
  if (rates.length === 0) return <EmptyMarket label="exchange rates" />;

  return (
    <div className="space-y-2.5">
      {rates.map((r, i) => (
        <div key={r.id} className="rounded-xl border border-border bg-card p-3.5">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs tabular-nums w-5">{i + 1}</span>
              <div>
                <span className="font-semibold text-foreground text-sm">{r.currency_code}</span>
                <span className="block text-xs text-muted-foreground">{r.currency_name}</span>
              </div>
            </div>
            <ChangeIndicator current={r.rate} previous={r.previous_rate} />
          </div>
          <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Rate (KES)</p>
            <p className="font-bold text-accent text-lg tabular-nums">
              {r.rate.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─── Mobile Cards: Commodities ─── */
export const CommoditiesMobileCards = ({ commodities, loading }: { commodities: Commodity[]; loading: boolean }) => {
  if (loading) return <MobileSkeleton />;
  if (commodities.length === 0) return <EmptyMarket label="commodities" />;

  return (
    <div className="space-y-2.5">
      {commodities.map((c, i) => (
        <div key={c.id} className="rounded-xl border border-border bg-card p-3.5">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs tabular-nums w-5">{i + 1}</span>
              <div>
                <span className="font-semibold text-foreground text-sm">{c.name}</span>
                <span className="block text-xs text-muted-foreground">{c.symbol}</span>
              </div>
            </div>
            <ChangeIndicator current={c.price} previous={c.previous_price} />
          </div>
          <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">{c.unit}</p>
            <p className="font-bold text-accent text-lg tabular-nums">
              {c.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─── Shared Skeletons ─── */
const TableSkeleton = () => (
  <div className="rounded-xl border border-border overflow-hidden bg-card">
    <div className="bg-muted/70 px-4 py-3">
      <div className="flex gap-4">
        <Skeleton className="h-4 w-8" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24 ml-auto" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-t border-border">
        <Skeleton className="h-4 w-5" />
        <div className="flex-1">
          <Skeleton className="h-4 w-40 mb-1.5" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-14" />
      </div>
    ))}
  </div>
);

const MobileSkeleton = () => (
  <div className="space-y-2.5">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="rounded-xl border border-border bg-card p-3.5">
        <div className="flex items-start gap-2.5 mb-2.5">
          <Skeleton className="h-4 w-5 mt-0.5" />
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-1.5" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-14 rounded-lg" />
      </div>
    ))}
  </div>
);

const EmptyMarket = ({ label }: { label: string }) => (
  <div className="rounded-xl border border-border bg-card text-center py-14">
    <div className="flex flex-col items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <span className="text-2xl">📊</span>
      </div>
      <p className="text-sm text-muted-foreground font-medium">No {label} available</p>
    </div>
  </div>
);
