import { Link } from "react-router-dom";
import { Star, TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { WatchlistEntry } from "@/hooks/useFundWatchlist";

interface Stock {
  id: string;
  symbol: string;
  name: string;
  price: number;
  day_change: number;
  day_change_percent: number;
  sector: string;
}

interface StockFavouritesProps {
  entries: WatchlistEntry[];
  stocks: Stock[];
}

const formatNumber = (n: number) =>
  n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const StockFavourites = ({ entries, stocks }: StockFavouritesProps) => {
  if (entries.length === 0) return null;

  const favStocks = entries
    .map((e) => stocks.find((s) => s.id === e.item_id))
    .filter(Boolean) as Stock[];

  if (favStocks.length === 0) return null;

  return (
    <Card className="mb-4 border-primary/20 bg-primary/5">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-semibold text-foreground">Your Watchlist</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {favStocks.length}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {favStocks.slice(0, 6).map((s) => (
            <Link
              key={s.id}
              to={`/stocks/${s.symbol}`}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 hover:border-accent/40 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground tracking-wide">{s.symbol}</span>
                  <span className="text-[9px] text-muted-foreground bg-muted/60 rounded px-1 py-0.5">{s.sector}</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{s.name}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold tabular-nums text-accent">
                  {formatNumber(s.price)}
                </p>
                <span
                  className={`inline-flex items-center gap-0.5 text-[9px] font-semibold tabular-nums ${
                    s.day_change > 0 ? "text-accent" : s.day_change < 0 ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {s.day_change > 0 ? (
                    <TrendingUp className="h-2.5 w-2.5" />
                  ) : s.day_change < 0 ? (
                    <TrendingDown className="h-2.5 w-2.5" />
                  ) : (
                    <Minus className="h-2.5 w-2.5" />
                  )}
                  {s.day_change >= 0 ? "+" : ""}{s.day_change_percent.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {favStocks.length > 6 && (
          <p className="text-xs text-muted-foreground mt-2">
            +{favStocks.length - 6} more in watchlist
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StockFavourites;
