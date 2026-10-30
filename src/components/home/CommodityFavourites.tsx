import { Star, TrendingUp, TrendingDown, Minus } from "lucide-react";
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
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 px-0.5">
        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        <span className="text-sm font-bold text-foreground">Your Watchlist</span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {favCommodities.length}
        </Badge>
      </div>

      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1 -mx-1 px-1 touch-pan-x">
        {favCommodities.map((c) => {
          const diff = c.previous_price != null ? c.price - c.previous_price : 0;
          const pct =
            c.previous_price && c.previous_price !== 0
              ? ((diff / c.previous_price) * 100).toFixed(2)
              : "0.00";
          const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
          const colorClass =
            diff > 0
              ? "text-emerald-500 dark:text-emerald-400"
              : diff < 0
              ? "text-destructive"
              : "text-muted-foreground";
          return (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 min-w-[170px] max-w-[220px] shrink-0 rounded-2xl border border-border/80 bg-slate-50/80 dark:bg-card px-3.5 py-2 hover:border-emerald-500/40 shadow-xs transition-all"
            >
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-foreground tracking-wide block truncate">{c.symbol}</span>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{c.name}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold tabular-nums text-foreground">{formatPrice(c.price)}</p>
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums mt-0.5 ${colorClass}`}>
                  <Icon className="h-2.5 w-2.5" />
                  {diff >= 0 ? "+" : ""}{pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CommodityFavourites;
