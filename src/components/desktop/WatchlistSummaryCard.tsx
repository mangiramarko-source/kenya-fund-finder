import React from "react";
import { Link } from "react-router-dom";
import { Star, TrendingUp, TrendingDown, SlidersHorizontal, ArrowRight } from "lucide-react";
import type { Stock } from "@/types";
interface WatchlistSummaryItem {
  id: string;
  symbol: string;
  name: string;
  price: number;
  day_change_percent?: number;
}

interface WatchlistSummaryCardProps {
  items?: WatchlistSummaryItem[];
  stocks?: Stock[];
  onOpenCustomize?: () => void;
}

export const WatchlistSummaryCard: React.FC<WatchlistSummaryCardProps> = ({
  items,
  stocks = [],
  onOpenCustomize,
}) => {
  // Use passed watchlist items or fallback to top stocks
  const displayItems = (items && items.length > 0)
    ? items.slice(0, 5)
    : (stocks.slice(0, 4).length > 0 ? stocks.slice(0, 4) : [
        { id: "scom", symbol: "SCOM", name: "Safaricom PLC", price: 36.2, day_change_percent: -2.92 },
        { id: "eqty", symbol: "EQTY", name: "Equity Group Hol...", price: 86.5, day_change_percent: 0.0 },
        { id: "kcb", symbol: "KCB", name: "KCB Group PLC", price: 85.75, day_change_percent: -0.34 },
        { id: "coop", symbol: "COOP", name: "Co-operative Bank", price: 35.0, day_change_percent: 3.86 },
      ]);

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500/20" />
          <h3 className="text-sm font-bold text-foreground">Watchlist Summary</h3>
        </div>
        <button
          onClick={onOpenCustomize}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium transition-colors"
        >
          <span>Edit</span>
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-3 pt-1">
        {displayItems.map((item) => {
          const isPos = (item.day_change_percent || 0) >= 0;
          return (
            <div key={item.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center border ${
                  isPos
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                    : "bg-red-500/10 border-red-500/20 text-red-500"
                }`}>
                  {isPos ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <div className="font-bold text-foreground tracking-tight">{item.symbol}</div>
                  <div className="text-[11px] text-muted-foreground truncate max-w-[100px]">{item.name}</div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-bold text-foreground">KES {item.price.toFixed(2)}</div>
                <div className={`text-[11px] font-semibold ${isPos ? "text-emerald-500" : "text-red-500"}`}>
                  {isPos ? "+" : ""}{(item.day_change_percent || 0).toFixed(2)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-border/50 text-center">
        <Link
          to="/watchlist"
          className="text-xs font-bold text-emerald-500 hover:text-emerald-400 inline-flex items-center gap-1 transition-colors"
        >
          <span>View All Markets</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
