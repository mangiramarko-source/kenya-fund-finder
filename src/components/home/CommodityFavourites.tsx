import { Star, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { WatchlistEntry } from "@/hooks/useAssetWatchlist";

interface Commodity {
  id: string;
  name: string;
  symbol: string;
  price: number;
  previous_price: number | null;
  unit: string;
}

interface CommodityFavouritesProps {
  entries: WatchlistEntry[];
  commodities: Commodity[];
}

const formatPrice = (n: number) =>
  n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CommodityFavourites = ({ entries, commodities }: CommodityFavouritesProps) => {
  if (entries.length === 0) return null;

  const favCommodities = entries
    .map((e) => commodities.find((c) => c.id === e.item_id))
    .filter(Boolean) as Commodity[];

  if (favCommodities.length === 0) return null;

  return (
    <Card className="mb-4 border-primary/20 bg-primary/5">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-semibold text-foreground">Your Watchlist</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {favCommodities.length}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {favCommodities.slice(0, 6).map((c) => {
            const diff = c.previous_price != null ? c.price - c.previous_price : 0;
            const pct =
              c.previous_price && c.previous_price !== 0
                ? ((diff / c.previous_price) * 100).toFixed(2)
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
                key={c.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground tracking-wide">{c.symbol}</span>
                    <span className="text-[9px] text-muted-foreground bg-muted/60 rounded px-1 py-0.5">{c.unit}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{c.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold tabular-nums text-accent">{formatPrice(c.price)}</p>
                  <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold tabular-nums ${colorClass}`}>
                    <Icon className="h-2.5 w-2.5" />
                    {diff >= 0 ? "+" : ""}{pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {favCommodities.length > 6 && (
          <p className="text-xs text-muted-foreground mt-2">
            +{favCommodities.length - 6} more in watchlist
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default CommodityFavourites;
