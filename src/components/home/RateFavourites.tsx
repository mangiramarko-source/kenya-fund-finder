import { Star, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { WatchlistEntry } from "@/hooks/useAssetWatchlist";

interface Rate {
  id: string;
  currency_code: string;
  currency_name: string;
  rate: number;
  previous_rate: number | null;
}

interface RateFavouritesProps {
  entries: WatchlistEntry[];
  rates: Rate[];
}

const formatRate = (n: number) =>
  n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

const RateFavourites = ({ entries, rates }: RateFavouritesProps) => {
  if (entries.length === 0) return null;

  const favRates = entries
    .map((e) => rates.find((r) => r.id === e.item_id))
    .filter(Boolean) as Rate[];

  if (favRates.length === 0) return null;

  return (
    <Card className="mb-4 border-primary/20 bg-primary/5">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-semibold text-foreground">Your Watchlist</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {favRates.length}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {favRates.slice(0, 6).map((r) => {
            const diff = r.previous_rate != null ? r.rate - r.previous_rate : 0;
            const pct =
              r.previous_rate && r.previous_rate !== 0
                ? ((diff / r.previous_rate) * 100).toFixed(2)
                : "0.00";
            const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
            const colorClass =
              diff > 0
                ? "text-accent"
                : diff < 0
                ? "text-destructive"
                : "text-muted-foreground";
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground tracking-wide">{r.currency_code}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{r.currency_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold tabular-nums text-accent">{formatRate(r.rate)}</p>
                  <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold tabular-nums ${colorClass}`}>
                    <Icon className="h-2.5 w-2.5" />
                    {diff >= 0 ? "+" : ""}{pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {favRates.length > 6 && (
          <p className="text-xs text-muted-foreground mt-2">
            +{favRates.length - 6} more in watchlist
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default RateFavourites;
