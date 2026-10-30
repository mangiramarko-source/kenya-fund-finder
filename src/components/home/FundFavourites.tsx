import { Link } from "react-router-dom";
import { Star, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import FundLogo from "@/components/home/FundLogo";
import { getFundManagerLogoUrl } from "@/lib/fundBranding";
import type { FundFromDB, YieldSnapshot } from "@/lib/api";
import type { WatchlistEntry } from "@/hooks/useFundWatchlist";

interface FundFavouritesProps {
  entries: WatchlistEntry[];
  funds: FundFromDB[];
  snapshots: Record<string, YieldSnapshot>;
}

const fmtYield = (v: number, unit: string) => (unit === "%" ? `${v.toFixed(2)}%` : v.toFixed(2));

const FundFavourites = ({ entries, funds, snapshots }: FundFavouritesProps) => {
  if (entries.length === 0) return null;

  const favFunds = entries
    .map((e) => funds.find((f) => f.id === e.item_id))
    .filter(Boolean) as FundFromDB[];

  if (favFunds.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 px-0.5">
        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        <span className="text-sm font-bold text-foreground">Your Watchlist</span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {favFunds.length}
        </Badge>
      </div>

      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1 -mx-1 px-1 touch-pan-x">
        {favFunds.map((fund) => {
          const snap = snapshots[fund.id];
          const prevYield = snap?.annual_yield;
          const change = prevYield != null ? fund.annual_yield - prevYield : null;
          const logoUrl = getFundManagerLogoUrl(fund.manager, fund.logo_url);

          return (
            <Link
              key={fund.id}
              to={`/compare/${fund.slug}`}
              className="flex items-center justify-between gap-2.5 min-w-[190px] max-w-[240px] shrink-0 rounded-2xl border border-border/80 bg-slate-50/80 dark:bg-card px-3 py-2 hover:border-emerald-500/40 shadow-xs transition-all active:scale-[0.98] group"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FundLogo
                  name={fund.manager || fund.name}
                  logoUrl={logoUrl}
                  size={28}
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-foreground tracking-wide block truncate group-hover:text-accent transition-colors">
                    {fund.name}
                  </span>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {fund.manager || "Money Market"}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-xs font-bold tabular-nums text-foreground">
                  {fmtYield(fund.annual_yield, fund.yield_unit)}
                </p>
                {change != null ? (
                  <span
                    className={`inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums mt-0.5 ${
                      change > 0
                        ? "text-emerald-500 dark:text-emerald-400"
                        : change < 0
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {change > 0 ? (
                      <TrendingUp className="h-2.5 w-2.5" />
                    ) : change < 0 ? (
                      <TrendingDown className="h-2.5 w-2.5" />
                    ) : (
                      <Minus className="h-2.5 w-2.5" />
                    )}
                    {change >= 0 ? "+" : ""}
                    {change.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    annual
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default FundFavourites;
