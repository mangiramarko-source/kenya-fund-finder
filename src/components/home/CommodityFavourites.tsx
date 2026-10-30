import { Star, TrendingUp, TrendingDown, Minus, Coins, Fuel, Sparkles, Coffee, Leaf, Wheat, Gem } from "lucide-react";
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

const getCommodityVisual = (symbol: string, name: string) => {
  const s = symbol.toLowerCase();
  const n = name.toLowerCase();

  if (s.includes("xau") || n.includes("gold")) {
    return {
      Icon: Coins,
      className: "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/40",
    };
  }
  if (s.includes("brent") || s.includes("oil") || n.includes("oil") || n.includes("crude")) {
    return {
      Icon: Fuel,
      className: "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300/80 dark:border-slate-700/40",
    };
  }
  if (s.includes("xag") || n.includes("silver")) {
    return {
      Icon: Sparkles,
      className: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-300/80 dark:border-zinc-700/40",
    };
  }
  if (s.includes("cof") || n.includes("coffee")) {
    return {
      Icon: Coffee,
      className: "bg-amber-100/80 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/40",
    };
  }
  if (s.includes("tea") || n.includes("tea")) {
    return {
      Icon: Leaf,
      className: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/40",
    };
  }
  if (s.includes("wheat") || n.includes("wheat") || s.includes("corn") || n.includes("maize")) {
    return {
      Icon: Wheat,
      className: "bg-yellow-100 dark:bg-yellow-950/60 text-yellow-700 dark:text-yellow-400 border-yellow-200/80 dark:border-yellow-800/40",
    };
  }
  return {
    Icon: Gem,
    className: "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200/80 dark:border-indigo-800/40",
  };
};

const CommodityAvatar = ({ symbol, name, size = 28 }: { symbol: string; name: string; size?: number }) => {
  const { Icon, className } = getCommodityVisual(symbol, name);

  return (
    <div
      aria-hidden
      className={`rounded-full flex items-center justify-center border shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <Icon className="h-3.5 w-3.5" />
    </div>
  );
};

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
              className="flex items-center justify-between gap-2.5 min-w-[190px] max-w-[240px] shrink-0 rounded-2xl border border-border/80 bg-slate-50/80 dark:bg-card px-3 py-2 hover:border-emerald-500/40 shadow-xs transition-all"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <CommodityAvatar symbol={c.symbol} name={c.name} size={28} />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-foreground tracking-wide block truncate">{c.symbol}</span>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">{c.name}</p>
                </div>
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
