import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
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

const currencyLabel = (unit: string) => {
  if (unit === "%") return "%";
  if (unit === "KES") return "KSh";
  return unit;
};

const isPercentUnit = (unit: string) => unit === "%";

const fmtYield = (value: number, unit: string) => {
  if (isPercentUnit(unit)) return `${value}%`;
  return value.toFixed(2);
};

const CardSkeleton = () => (
  <div className="space-y-2.5">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="rounded-xl border border-border bg-card p-3.5">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-1.5" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
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
      <button onClick={onClearSearch} className="text-xs text-accent hover:text-accent/80 font-medium transition-colors">
        Clear search
      </button>
    )}
  </div>
);

const FundMobileCards = ({ funds, snapshots, loading, onClearSearch, hasSearch }: FundMobileCardsProps) => {
  if (loading) return <CardSkeleton />;

  if (funds.length === 0) return <EmptyState hasSearch={hasSearch} onClearSearch={onClearSearch} />;

  return (
    <div className="space-y-2.5 w-full overflow-hidden">
      {funds.map((fund) => (
        <Link 
          key={fund.id} 
          to={`/compare/${fund.slug}`} 
          className="block rounded-xl border border-border bg-card hover:border-accent/30 transition-all active:scale-[0.99] overflow-hidden"
        >
          <div className="flex items-center gap-3 p-3.5">
            {/* Left: Fund Name + Trend */}
            <div className="flex-1 min-w-0">
              <span className="font-bold text-foreground text-sm truncate block">{fund.name}</span>
              {(() => {
                const prev = snapshots[fund.id]?.annual_yield;
                if (prev === undefined) return null;
                const diff = fund.annual_yield - prev;
                const isFlat = Math.abs(diff) < 0.0001;
                const isUp = diff > 0;
                const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
                const colorClass = isFlat
                  ? "text-muted-foreground"
                  : isUp
                  ? "text-emerald-500 dark:text-emerald-400"
                  : "text-red-500 dark:text-red-400";
                const sign = isFlat ? "" : isUp ? "+" : "";
                return (
                  <span className={`mt-0.5 inline-flex items-center gap-1 text-xs font-medium tabular-nums ${colorClass}`}>
                    <Icon className="h-3 w-3" />
                    <span>{sign}{diff.toFixed(2)}%</span>
                  </span>
                );
              })()}
            </div>

            {/* Right: Annual Yield stacked over Daily Yield */}
            <div className="text-right shrink-0 space-y-1">
              <div className="flex items-baseline justify-end gap-2">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider w-10 text-right leading-none">annual</span>
                <span className="font-bold text-accent tabular-nums leading-none w-14 text-right text-sm">
                  {fmtYield(fund.annual_yield, fund.yield_unit)}
                </span>
              </div>
              <div className="flex items-baseline justify-end gap-2">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider w-10 text-right leading-none">daily</span>
                <span className="text-muted-foreground tabular-nums font-normal leading-none w-14 text-right text-xs">
                  {fmtYield(fund.daily_yield, fund.yield_unit)}
                </span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default FundMobileCards;
