import { useMemo } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import type { FundFromDB, YieldSnapshot } from "@/lib/api";

interface FundMobileCardsProps {
  funds: FundFromDB[];
  snapshots: Record<string, YieldSnapshot>;
  allSnapshots?: Record<string, YieldSnapshot[]>;
  bestYield?: number;
  loading: boolean;
  onClearSearch: () => void;
  hasSearch: boolean;
  isFavourite?: (id: string) => boolean;
  onToggleFavourite?: (id: string, name: string) => void;
}

const categoryLabels: Record<string, string> = {
  money_market: "Money Market",
  fixed_income: "Fixed Income",
  balanced: "Balanced",
  equity: "Equity",
  bond: "Bond",
};

const isPercentUnit = (unit: string) => unit === "%";

const fmtYield = (value: number, unit: string) => {
  if (isPercentUnit(unit)) return `${value}%`;
  return value.toFixed(2);
};

const CardSparkline = ({ history, currentValue }: { history?: YieldSnapshot[]; currentValue: number }) => {
  const vals = useMemo(() => {
    if (!history || history.length === 0) return [currentValue];
    return [...history.map((d) => d.annual_yield), currentValue].slice(-10);
  }, [history, currentValue]);

  if (vals.length < 2) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const W = 64;
  const H = 24;
  const pts = vals.map((v, i) => ({
    x: (i / (vals.length - 1)) * W,
    y: H - ((v - min) / range) * (H - 4) - 2,
  }));
  const isUp = vals[vals.length - 1] >= vals[0];
  const stroke = isUp ? "hsl(152 60% 42%)" : "hsl(0 72% 51%)";
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <svg width={W} height={H} className="overflow-visible shrink-0">
      <path d={pathD} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const CardSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="rounded-[20px] border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <Skeleton className="h-4 w-28 mb-1.5" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-5 w-14" />
        </div>
        <div className="border-t border-border/40 my-3" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = ({ hasSearch, onClearSearch }: { hasSearch: boolean; onClearSearch: () => void }) => (
  <div className="flex flex-col items-center gap-3 py-12">
    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
      <span className="text-2xl">📊</span>
    </div>
    <p className="text-sm text-muted-foreground font-medium">No funds match your filters</p>
    {hasSearch && (
      <button onClick={onClearSearch} className="text-xs text-emerald-600 dark:text-emerald-400 font-medium transition-colors">
        Clear search
      </button>
    )}
  </div>
);

const FundMobileCards = ({ funds, snapshots, allSnapshots, loading, onClearSearch, hasSearch, isFavourite, onToggleFavourite }: FundMobileCardsProps) => {
  if (loading) return <CardSkeleton />;

  if (funds.length === 0) return <EmptyState hasSearch={hasSearch} onClearSearch={onClearSearch} />;

  return (
    <div className="space-y-3 w-full overflow-hidden">
      {funds.map((fund) => (
        <Link 
          key={fund.id} 
          to={`/compare/${fund.slug}`} 
          className="block rounded-[20px] border border-border/80 bg-card p-4 shadow-sm hover:border-emerald-500/30 transition-all active:scale-[0.99] overflow-hidden"
        >
          {/* Top Row: Fund Name/Manager (Left), Sparkline (Center), Yield/Change (Right) */}
          <div className="flex items-center justify-between gap-2">
            {/* Fund Name + Manager */}
            <div className="min-w-0 flex-1">
              <span className="font-extrabold text-foreground text-base tracking-tight truncate block">
                {fund.name}
              </span>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{fund.manager}</p>
            </div>

            {/* Center: Sparkline Graph */}
            <div className="shrink-0 px-1">
              <CardSparkline history={allSnapshots?.[fund.id]} currentValue={fund.annual_yield} />
            </div>

            {/* Right: Annual Yield + Change */}
            <div className="text-right shrink-0">
              <p className="font-extrabold text-foreground text-base tabular-nums">
                {fmtYield(fund.annual_yield, fund.yield_unit)}
              </p>
              <div className="mt-0.5 flex justify-end">
                {(() => {
                  const prev = snapshots[fund.id]?.annual_yield;
                  if (prev === undefined) return <span className="text-[11px] text-muted-foreground">Annual</span>;
                  const diff = fund.annual_yield - prev;
                  const isFlat = Math.abs(diff) < 0.0001;
                  const isUp = diff > 0;
                  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
                  const colorClass = isFlat
                    ? "text-muted-foreground"
                    : isUp
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-500 dark:text-red-400";
                  const sign = isFlat ? "" : isUp ? "+" : "";
                  return (
                    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${colorClass}`}>
                      <Icon className="h-3 w-3" />
                      <span>{sign}{diff.toFixed(2)}%</span>
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Thin Divider Line */}
          <div className="border-t border-border/40 my-3" />

          {/* Bottom Row: Min KES & Fee (Left), Category Pill (Right) */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3 text-muted-foreground">
              <span>
                Min <strong className="font-semibold text-foreground ml-0.5">KES {fund.minimum_investment.toLocaleString()}</strong>
              </span>
              {fund.management_fee > 0 && (
                <span>
                  Fee <strong className="font-semibold text-foreground ml-0.5">{fund.management_fee}%</strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-muted/70 text-muted-foreground text-[11px] font-medium tracking-wide">
                {categoryLabels[fund.fund_type] || fund.fund_type}
              </span>

              {onToggleFavourite && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleFavourite(fund.id, fund.name);
                  }}
                  aria-label={isFavourite?.(fund.id) ? "Remove from watchlist" : "Add to watchlist"}
                  className="p-1 -mr-1"
                >
                  <Star
                    className={`h-4 w-4 transition-colors ${
                      isFavourite?.(fund.id) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30 hover:text-yellow-500"
                    }`}
                  />
                </button>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default FundMobileCards;
