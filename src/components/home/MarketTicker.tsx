import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, DollarSign, Gem } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface ExchangeRate {
  id: string;
  currency_code: string;
  currency_name: string;
  rate: number;
  previous_rate: number | null;
  updated_at: string;
}

interface Commodity {
  id: string;
  name: string;
  symbol: string;
  price: number;
  previous_price: number | null;
  unit: string;
  updated_at: string;
}

const ChangeIndicator = ({ current, previous }: { current: number; previous: number | null }) => {
  if (previous == null) return <Minus className="h-3 w-3 text-muted-foreground" />;
  const diff = current - previous;
  const pct = previous !== 0 ? ((diff / previous) * 100).toFixed(2) : "0.00";
  if (diff > 0) return (
    <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
      <TrendingUp className="h-3 w-3" /> +{pct}%
    </span>
  );
  if (diff < 0) return (
    <span className="inline-flex items-center gap-0.5 text-red-500 text-[11px] font-semibold">
      <TrendingDown className="h-3 w-3" /> {pct}%
    </span>
  );
  return <span className="inline-flex items-center gap-0.5 text-muted-foreground text-[11px]"><Minus className="h-3 w-3" /> 0.00%</span>;
};

const TableSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <div className="rounded-xl border border-border overflow-hidden bg-card">
    <div className="bg-muted/70 px-4 py-2.5">
      <Skeleton className="h-4 w-32" />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-4 py-2.5 border-t border-border">
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-4 w-24 flex-1" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-14" />
      </div>
    ))}
  </div>
);

const MarketTicker = () => {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase
        .from("exchange_rates")
        .select("id, currency_code, currency_name, rate, previous_rate, updated_at")
        .eq("is_active", true)
        .order("sort_order")
        .then(({ data }) => setRates((data as ExchangeRate[]) || [])),
      supabase
        .from("commodities")
        .select("id, name, symbol, price, previous_price, unit, updated_at")
        .eq("is_active", true)
        .order("sort_order")
        .then(({ data }) => setCommodities((data as Commodity[]) || [])),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <TableSkeleton rows={6} />
        <TableSkeleton rows={4} />
      </div>
    );
  }

  const lastUpdated = rates[0]?.updated_at
    ? new Date(rates[0].updated_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="space-y-4">
      {/* Exchange Rates */}
      {rates.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <div className="bg-muted/70 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-accent" />
              <span className="text-xs font-semibold text-foreground">FX Rates vs KES</span>
            </div>
            {lastUpdated && (
              <span className="text-[10px] text-muted-foreground">{lastUpdated}</span>
            )}
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-t border-border bg-muted/30">
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Currency</th>
                <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Rate (KES)</th>
                <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Change</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="font-bold text-foreground">{r.currency_code}</span>
                    <span className="text-muted-foreground ml-1.5 hidden sm:inline">{r.currency_name}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-foreground">
                    {r.rate.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <ChangeIndicator current={r.rate} previous={r.previous_rate} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Commodities */}
      {commodities.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <div className="bg-muted/70 px-4 py-2.5 flex items-center gap-2">
            <Gem className="h-4 w-4 text-accent" />
            <span className="text-xs font-semibold text-foreground">Commodities & Crypto</span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-t border-border bg-muted/30">
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Item</th>
                <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Price</th>
                <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Change</th>
              </tr>
            </thead>
            <tbody>
              {commodities.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="font-bold text-foreground">{c.name}</span>
                    <span className="text-muted-foreground ml-1.5 text-[10px]">{c.symbol}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-foreground">
                    {c.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="text-muted-foreground ml-1 text-[10px]">{c.unit}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <ChangeIndicator current={c.price} previous={c.previous_price} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MarketTicker;
