import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { Stock } from "@/types";

interface MarketMoversCardProps {
  stocks?: Stock[];
}

export const MarketMoversCard: React.FC<MarketMoversCardProps> = ({ stocks = [] }) => {
  // Sort stocks into gainers and losers dynamically if available
  const gainers = stocks
    .filter((s) => (s.day_change_percent || 0) > 0)
    .sort((a, b) => (b.day_change_percent || 0) - (a.day_change_percent || 0))
    .slice(0, 3);

  const losers = stocks
    .filter((s) => (s.day_change_percent || 0) < 0)
    .sort((a, b) => (a.day_change_percent || 0) - (b.day_change_percent || 0))
    .slice(0, 3);

  // Fallbacks if data is not loaded or market is inactive
  const displayGainers = gainers.length > 0 ? gainers : [
    { id: "sgl", symbol: "SGL", name: "Standard Group...", price: 6.24, day_change_percent: 305.19 },
    { id: "ctum", symbol: "CTUM", name: "Centum Investm...", price: 19.30, day_change_percent: 100.21 },
    { id: "kegn", symbol: "KEGN", name: "KenGen PLC", price: 11.50, day_change_percent: 54.78 },
  ];

  const displayLosers = losers.length > 0 ? losers : [
    { id: "lkl", symbol: "LKL", name: "Longhorn Publis...", price: 2.86, day_change_percent: -48.75 },
    { id: "umme", symbol: "UMME", name: "Umeme Limited", price: 6.94, day_change_percent: -22.20 },
    { id: "kq", symbol: "KQ", name: "Kenya Airways", price: 5.46, day_change_percent: -20.07 },
  ];

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-emerald-500" />
        <h3 className="text-sm font-bold text-foreground">Market Movers</h3>
      </div>

      {/* Top Gainers */}
      <div className="space-y-2.5">
        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
          Top Gainers
        </h4>
        <div className="space-y-2.5">
          {displayGainers.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-foreground tracking-tight">{item.symbol}</div>
                  <div className="text-[11px] text-muted-foreground truncate max-w-[100px]">{item.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-foreground">KES {item.price.toFixed(2)}</div>
                <div className="text-[11px] font-semibold text-emerald-500">
                  +{(item.day_change_percent || 0).toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Losers */}
      <div className="space-y-2.5 pt-2 border-t border-border/50">
        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
          Top Losers
        </h4>
        <div className="space-y-2.5">
          {displayLosers.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center">
                  <TrendingDown className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-foreground tracking-tight">{item.symbol}</div>
                  <div className="text-[11px] text-muted-foreground truncate max-w-[100px]">{item.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-foreground">KES {item.price.toFixed(2)}</div>
                <div className="text-[11px] font-semibold text-red-500">
                  {(item.day_change_percent || 0).toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
