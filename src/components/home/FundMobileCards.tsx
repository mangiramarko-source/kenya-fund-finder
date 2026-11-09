import { useMemo } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus, Star, WalletCards, BadgePercent, GitCompareArrows, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import type { FundFromDB, YieldSnapshot } from "@/lib/api";
import { getFundManagerLogoUrl } from "@/lib/fundBranding";
import { useUniversalCompare } from "@/hooks/useUniversalCompare";
import FundLogo from "./FundLogo";

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
  special: "Special",
};

const isPercentUnit = (unit: string) => unit === "%";

const fmtYield = (value: number, unit: string) => {
  if (isPercentUnit(unit)) return `${value}%`;
  return value.toFixed(2);
};

const CardSparkline = ({ history, currentValue }: { history?: YieldSnapshot[]; currentValue: number }) => {
  const result = useMemo(() => {
    if (!history || history.length === 0) return null;

    const cleanData = history
      .filter((d) => Number.isFinite(d.annual_yield) && d.annual_yield > 0)
      .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));

    if (cleanData.length === 0) return null;

    const vals: number[] = cleanData.map((d) => d.annual_yield);
    const lastSnap = cleanData[cleanData.length - 1];
    const todayIso = new Date().toISOString().split("T")[0];

    if (
      Number.isFinite(currentValue) &&
      currentValue > 0 &&
      (!lastSnap || lastSnap.snapshot_date < todayIso || Math.abs(lastSnap.annual_yield - currentValue) > 0.001)
    ) {
      vals.push(currentValue);
    }

    if (vals.length < 2) return null;

    const last10 = vals.slice(-10);
    const min = Math.min(...last10);
    const max = Math.max(...last10);
    const range = max - min;
    const isFlat = range < 0.0001;
    const W = 64;
    const H = 24;

    const pts = last10.map((v, i) => ({
      x: (i / (last10.length - 1)) * W,
      y: isFlat ? H / 2 : H - ((v - min) / range) * (H - 4) - 2,
    }));

    const isUp = isFlat ? false : last10[last10.length - 1] > last10[0];
    const stroke = isFlat ? "hsl(var(--muted-foreground))" : isUp ? "hsl(152 60% 42%)" : "hsl(0 72% 51%)";
    const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

    return { pathD, stroke, W, H };
  }, [history, currentValue]);

  if (!result) return null;

  return (
    <svg width={result.W} height={result.H} className="overflow-visible shrink-0">
      <path d={result.pathD} fill="none" stroke={result.stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const CardSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="rounded-[20px] border border-border bg-slate-50/80 dark:bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div>
            <Skeleton className="h-4 w-28 mb-1.5" />
            <Skeleton className="h-3 w-36" />
            </div>
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
  const { add, remove, isSelected } = useUniversalCompare();

  if (loading) return <CardSkeleton />;

  if (funds.length === 0) return <EmptyState hasSearch={hasSearch} onClearSearch={onClearSearch} />;

  return (
    <div className="space-y-3 w-full overflow-hidden">
      {funds.map((fund) => {
        const isCompared = isSelected(fund.id);

        const handleToggleCompare = (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          if (isCompared) {
            remove(fund.id);
          } else {
            add({
              id: fund.id,
              category: "fund",
              title: fund.name,
              subtitle: fund.manager,
              data: fund,
            });
          }
        };

        return (
          <Link 
            key={fund.id} 
            to={`/compare/${fund.slug}`} 
            className={`block rounded-[22px] border bg-slate-50/80 dark:bg-card p-4 shadow-sm transition-all active:scale-[0.99] overflow-hidden ${
              isCompared
                ? "border-emerald-500 ring-2 ring-emerald-500/20 dark:border-emerald-400 bg-emerald-500/[0.04]"
                : "border-border/80 hover:border-emerald-500/30"
            }`}
          >
            {/* Top Row: Brand, fund details, sparkline, then annual yield. */}
            <div className="flex items-center gap-3">
              <FundLogo
                name={fund.name}
                logoUrl={getFundManagerLogoUrl(fund.manager, fund.logo_url)}
                size={48}
                fullBleed
                className="shrink-0"
              />

              <div className="min-w-0 flex-1">
                <span className="font-extrabold text-foreground text-[17px] tracking-tight truncate block">
                  {fund.name}
                </span>
                <p className="text-sm text-muted-foreground truncate mt-0.5">{fund.manager}</p>
              </div>

              <div className="shrink-0 px-1">
                <CardSparkline history={allSnapshots?.[fund.id]} currentValue={fund.annual_yield} />
              </div>

              <div className="text-right shrink-0">
                <p className="font-extrabold text-foreground text-[17px] tabular-nums">
                  {fmtYield(fund.annual_yield, fund.yield_unit)}
                </p>
                <div className="mt-0.5 flex justify-end">
                  {(() => {
                    const prev = snapshots[fund.id]?.annual_yield;
                    if (prev === undefined) return <span className="text-[11px] text-muted-foreground">Annual</span>;
                    const diff = fund.annual_yield - prev;
                    const isFlat = Math.abs(diff) < 0.0001;
                    if (isFlat) {
                      return (
                        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-muted-foreground">
                          <Minus className="h-3 w-3" />
                          <span>Unchanged</span>
                        </span>
                      );
                    }
                    const isUp = diff > 0;
                    const Icon = isUp ? TrendingUp : TrendingDown;
                    const colorClass = isUp
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-500 dark:text-red-400";
                    const sign = isUp ? "+" : "";
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

            <div className="border-t border-border/40 my-3.5" />

            {/* Bottom Row: key fund details on left, compare action & favourite star on right */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3.5 text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <WalletCards className="h-3.5 w-3.5" aria-hidden="true" />
                  Min <strong className="font-semibold text-foreground">KES {fund.minimum_investment.toLocaleString()}</strong>
                </span>
                {fund.management_fee > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <BadgePercent className="h-3.5 w-3.5" aria-hidden="true" />
                    Fee <strong className="font-semibold text-foreground">{fund.management_fee}%</strong>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleCompare}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                    isCompared
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "border border-border/80 bg-muted/40 text-foreground hover:bg-muted"
                  }`}
                  aria-label={isCompared ? `Remove ${fund.name} from compare` : `Compare ${fund.name}`}
                >
                  {isCompared ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <GitCompareArrows className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <span>{isCompared ? "Added" : "Compare"}</span>
                </button>

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
        );
      })}
    </div>
  );
};

export default FundMobileCards;
