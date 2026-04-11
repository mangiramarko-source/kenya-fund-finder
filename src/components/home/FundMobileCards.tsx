import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell } from "lucide-react";
import YieldChange from "@/components/YieldChange";
import type { FundFromDB, YieldSnapshot } from "@/lib/api";

interface FundMobileCardsProps {
  funds: FundFromDB[];
  snapshots: Record<string, YieldSnapshot>;
  bestYield: number;
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
        <div className="flex items-start gap-2.5 mb-2.5">
          <Skeleton className="h-4 w-5 mt-0.5" />
          <div className="flex-1">
            <Skeleton className="h-4 w-40 mb-1.5" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, j) => (
            <Skeleton key={j} className="h-14 rounded-lg" />
          ))}
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

const FundMobileCards = ({ funds, snapshots, loading, onClearSearch, hasSearch, isFavourite, onToggleFavourite }: FundMobileCardsProps) => {
  if (loading) return <CardSkeleton />;

  if (funds.length === 0) return <EmptyState hasSearch={hasSearch} onClearSearch={onClearSearch} />;

  return (
    <div className="space-y-2.5 w-full overflow-hidden">
      {funds.map((fund, i) => (
        <Link key={fund.id} to={`/compare/${fund.slug}`} className="block rounded-xl border border-border bg-card p-3 hover:border-accent/30 transition-all active:scale-[0.99] overflow-hidden">
          <div className="flex items-start gap-2.5 mb-2.5">
            <span className="text-xs font-bold text-muted-foreground tabular-nums shrink-0 w-5 text-center mt-0.5">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-[15px] truncate">{fund.name}</h3>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{fund.manager}</p>
            </div>
            {snapshots[fund.id] && (
              <YieldChange current={fund.annual_yield} previous={snapshots[fund.id]?.annual_yield} unit={fund.yield_unit} className="text-[11px] shrink-0 mt-0.5" />
            )}
            {onToggleFavourite && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavourite(fund.id, fund.name); }}
                className="p-1 rounded-md shrink-0"
                aria-label={isFavourite?.(fund.id) ? "Remove from watchlist" : "Add to watchlist"}
              >
                <Bell className={`h-4 w-4 transition-colors ${isFavourite?.(fund.id) ? "text-accent fill-accent" : "text-muted-foreground/40"}`} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-muted/50 px-2 py-2 text-center">
              <span className="block text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Currency</span>
              <span className="block text-sm font-bold tabular-nums text-foreground mt-0.5">{currencyLabel(fund.yield_unit)}</span>
            </div>
            <div className="rounded-lg bg-muted/50 px-2 py-2 text-center">
              <span className="block text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Daily</span>
              <span className="block text-sm font-bold tabular-nums text-foreground mt-0.5">{fmtYield(fund.daily_yield, fund.yield_unit)}</span>
            </div>
            <div className="rounded-lg bg-muted/50 px-2 py-2 text-center">
              <span className="block text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Annual</span>
              <span className="block text-sm font-bold tabular-nums text-accent mt-0.5">{fmtYield(fund.annual_yield, fund.yield_unit)}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default FundMobileCards;
