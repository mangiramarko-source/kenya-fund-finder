import React from "react";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface StockTickerItem {
  id: string;
  symbol: string;
  name: string;
  price: number;
  day_change: number;
  day_change_percent: number;
}

interface StockTickerTapeProps {
  stocks: StockTickerItem[];
  onSelectStock?: (symbol: string) => void;
}

export const StockTickerTape: React.FC<StockTickerTapeProps> = ({ stocks, onSelectStock }) => {
  if (!stocks || stocks.length === 0) return null;

  // Duplicate list to create a seamless infinite loop effect
  const tickerItems = [...stocks, ...stocks];

  return (
    <div className="relative w-full overflow-hidden bg-card/80 backdrop-blur border-y border-border py-2 text-xs">
      {/* Left/Right Fade Gradient Masks */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10" />

      {/* Marquee Track */}
      <div className="flex w-max animate-ticker hover:[animation-play-state:paused] items-center gap-6 pr-6">
        {tickerItems.map((item, idx) => {
          const isUp = item.day_change_percent > 0;
          const isDown = item.day_change_percent < 0;

          return (
            <div
              key={`${item.symbol}-${idx}`}
              onClick={() => onSelectStock && onSelectStock(item.symbol)}
              className="flex items-center gap-2 cursor-pointer px-2.5 py-1 rounded-lg hover:bg-muted/60 transition-colors group select-none"
            >
              <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                {item.symbol}
              </span>
              <span className="font-medium text-foreground tabular-nums">
                KSh {item.price.toFixed(2)}
              </span>
              <div
                className={`flex items-center gap-0.5 font-semibold tabular-nums px-1.5 py-0.5 rounded text-[11px] ${
                  isUp
                    ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400"
                    : isDown
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isUp && <TrendingUp className="h-3 w-3" />}
                {isDown && <TrendingDown className="h-3 w-3" />}
                {!isUp && !isDown && <Minus className="h-3 w-3" />}
                <span>
                  {isUp ? "+" : ""}
                  {item.day_change_percent.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StockTickerTape;
