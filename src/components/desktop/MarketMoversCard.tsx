import React from "react";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import type { Stock } from "@/types";
import WatchlistAssetAvatar from "@/components/watchlist/WatchlistAssetAvatar";
import { getStockLogoUrl } from "@/lib/stockBranding";

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
    { id: "sgl", symbol: "SGL", name: "Standard Group PLC", price: 6.24, day_change_percent: 305.19, logo_url: "/images/stocks/sgl.png" },
    { id: "ctum", symbol: "CTUM", name: "Centum Investment", price: 19.30, day_change_percent: 100.21, logo_url: "/images/stocks/ctum.svg" },
    { id: "kegn", symbol: "KEGN", name: "KenGen PLC", price: 11.50, day_change_percent: 54.78, logo_url: "/images/stocks/kegn.svg" },
  ];

  const displayLosers = losers.length > 0 ? losers : [
    { id: "lkl", symbol: "LKL", name: "Longhorn Publishers", price: 2.86, day_change_percent: -48.75, logo_url: "/images/stocks/lkl.svg" },
    { id: "umme", symbol: "UMME", name: "Umeme Limited", price: 6.94, day_change_percent: -22.20, logo_url: "/images/stocks/umme.svg" },
    { id: "kq", symbol: "KQ", name: "Kenya Airways", price: 5.46, day_change_percent: -20.07, logo_url: "/images/stocks/kq.svg" },
  ];

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-4">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-bold text-foreground">Market Movers</h3>
        </div>
        <Link
          to="/stocks"
          className="text-xs text-muted-foreground hover:text-emerald-500 flex items-center gap-1 font-semibold transition-colors"
        >
          <span>Stocks</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Top Gainers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Top Gainers
          </h4>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Bullish</span>
        </div>
        <div className="space-y-1.5">
          {displayGainers.map((item) => (
            <Link
              key={item.id}
              to={`/stocks/${item.symbol}`}
              className="flex items-center justify-between p-2 rounded-xl border border-border/50 bg-slate-50/50 dark:bg-card hover:border-emerald-500/40 hover:bg-muted/30 transition-all group text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <WatchlistAssetAvatar
                  type="stock"
                  symbol={item.symbol}
                  name={item.name}
                  logoUrl={item.logo_url || getStockLogoUrl(item.symbol, null, item.name)}
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
                <div className="text-[10px] font-bold inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  +{(item.day_change_percent || 0).toFixed(2)}%
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Top Losers */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Top Losers
          </h4>
          <span className="text-[10px] font-bold text-red-500">Bearish</span>
        </div>
        <div className="space-y-1.5">
          {displayLosers.map((item) => (
            <Link
              key={item.id}
              to={`/stocks/${item.symbol}`}
              className="flex items-center justify-between p-2 rounded-xl border border-border/50 bg-slate-50/50 dark:bg-card hover:border-red-500/30 hover:bg-muted/30 transition-all group text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <WatchlistAssetAvatar
                  type="stock"
                  symbol={item.symbol}
                  name={item.name}
                  logoUrl={item.logo_url || getStockLogoUrl(item.symbol, null, item.name)}
                  size={32}
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-bold text-foreground tracking-tight group-hover:text-red-500 transition-colors truncate">
                    {item.symbol}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate max-w-[100px]">{item.name}</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-foreground tabular-nums">KES {item.price.toFixed(2)}</div>
                <div className="text-[10px] font-bold inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
                  {(item.day_change_percent || 0).toFixed(2)}%
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Card Footer */}
      <div className="pt-1 text-center">
        <Link
          to="/stocks"
          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 transition-colors"
        >
          <span>View All NSE Stocks</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
