import { Link } from "react-router-dom";
import { Star, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type FundFromDB, type YieldSnapshot, FUND_TYPE_LABELS, type FundType } from "@/lib/api";
import type { WatchlistEntry } from "@/hooks/useFundWatchlist";

interface FundFavouritesProps {
  entries: WatchlistEntry[];
  funds: FundFromDB[];
  snapshots: Record<string, YieldSnapshot>;
}

const fmtYield = (v: number, unit: string) => (unit === "%" ? `${v}%` : v.toFixed(2));

const FundFavourites = ({ entries, funds, snapshots }: FundFavouritesProps) => {
  if (entries.length === 0) return null;

  const favFunds = entries
    .map((e) => funds.find((f) => f.id === e.item_id))
    .filter(Boolean) as FundFromDB[];

  if (favFunds.length === 0) return null;

  return (
    <Card className="mb-4 border-primary/20 bg-primary/5">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-semibold text-foreground">Your Favourite Funds</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {favFunds.length}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {favFunds.slice(0, 6).map((fund) => {
            const snap = snapshots[fund.id];
            const prevYield = snap?.annual_yield;
            const change = prevYield != null ? fund.annual_yield - prevYield : null;

            return (
              <Link
                key={fund.id}
                to={`/funds/${fund.slug}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 hover:border-accent/40 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate group-hover:text-accent transition-colors">
                    {fund.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{fund.manager}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold tabular-nums text-accent">
                    {fmtYield(fund.annual_yield, fund.yield_unit)}
                  </p>
                  {change != null && (
                    <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold tabular-nums ${change >= 0 ? "text-accent" : "text-destructive"}`}>
                      {change >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                      {change >= 0 ? "+" : ""}{change.toFixed(2)}
                    </span>
                  )}
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              </Link>
            );
          })}
        </div>

        {favFunds.length > 6 && (
          <p className="text-xs text-muted-foreground mt-2">
            +{favFunds.length - 6} more favourite{favFunds.length - 6 > 1 ? "s" : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default FundFavourites;
