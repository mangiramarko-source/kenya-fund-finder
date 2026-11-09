import React from "react";
import { Link } from "react-router-dom";
import { Star, SlidersHorizontal, ArrowRight } from "lucide-react";
import type { Stock } from "@/types";
import WatchlistAssetAvatar from "@/components/watchlist/WatchlistAssetAvatar";

interface WatchlistSummaryItem {
  id: string;
  symbol: string;
  name: string;
  price: number;
  day_change_percent?: number;
  logo_url?: string | null;
}

interface WatchlistSummaryCardProps {
  items?: WatchlistSummaryItem[];
  stocks?: Stock[];
  onOpenCustomize?: () => void;
  compact?: boolean;
}

export const WatchlistSummaryCard: React.FC<WatchlistSummaryCardProps> = ({
  items,
  stocks = [],
  onOpenCustomize,
  compact = false,
}) => {
  // Use passed watchlist items or fallback to top stocks
  const displayItems = (items && items.length > 0)
    ? items.slice(0, 5)
    : (stocks.slice(0, 4).length > 0 ? stocks.slice(0, 4) : [
        { id: "scom", symbol: "SCOM", name: "Safaricom PLC", price: 36.2, day_change_percent: -2.92, logo_url: null },
        { id: "eqty", symbol: "EQTY", name: "Equity Group Holdings", price: 86.5, day_change_percent: 0.0, logo_url: null },
        { id: "kcb", symbol: "KCB", name: "KCB Group PLC", price: 85.75, day_change_percent: -0.34, logo_url: null },
        { id: "coop", symbol: "COOP", name: "Co-operative Bank", price: 35.0, day_change_percent: 3.86, logo_url: null },
      ]);

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-3.5">
      <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500/20" />
          <h3 className="text-sm font-bold text-foreground">Watchlist Summary</h3>
        </div>
        <button
          onClick={onOpenCustomize}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-semibold transition-colors px-2 py-1 rounded-lg hover:bg-muted/50"
          title="Edit Watchlist"
        >
          <span>Edit</span>
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className={`${compact ? "grid grid-cols-4 gap-3" : "space-y-1.5"} pt-0.5 text-xs`}>
        {displayItems.map((item) => {
          const isPos = (item.day_change_percent || 0) >= 0;
          return (
            <Link
              to={`/stocks/${item.symbol}`}
              key={item.id}
              className="flex items-center justify-between p-2 rounded-xl border border-border/50 bg-slate-50/50 dark:bg-card hover:border-emerald-500/40 hover:bg-muted/30 transition-all group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <WatchlistAssetAvatar
                  type="stock"
                  symbol={item.symbol}
                  name={item.name}
                  logoUrl={item.logo_url}
                  size={32}
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-bold text-foreground tracking-tight group-hover:text-emerald-500 transition-colors truncate">
                    {item.symbol}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate max-w-[100px]">{item.name}</div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-bold text-foreground tabular-nums">KES {item.price.toFixed(2)}</div>
                <div
                  className={`text-[10px] font-bold inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md ${
                    isPos
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-500/10 text-red-600 dark:text-red-400"
                  }`}
                >
                  {isPos ? "+" : ""}{(item.day_change_percent || 0).toFixed(2)}%
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className={`${compact ? "hidden" : "block"} pt-1 text-center`}>
        <Link
          to="/watchlist"
          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 transition-colors"
        >
          <span>View All Markets</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
