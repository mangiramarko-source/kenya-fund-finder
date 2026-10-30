import { useState } from "react";
import { Link } from "react-router-dom";
import { Star, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getStockLogoUrl } from "@/lib/stockBranding";
import type { WatchlistEntry } from "@/hooks/useFundWatchlist";

interface Stock {
  id: string;
  symbol: string;
  name: string;
  price: number;
  day_change: number;
  day_change_percent: number;
  sector: string;
  logo_url?: string | null;
}

interface StockFavouritesProps {
  entries: WatchlistEntry[];
  stocks: Stock[];
}

const formatNumber = (n: number) =>
  n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const StockAvatar = ({ symbol, logoUrl, size = 28 }: { symbol: string; logoUrl?: string | null; size?: number }) => {
  const [failed, setFailed] = useState(false);
  const resolvedLogo = getStockLogoUrl(symbol, logoUrl);

  const hash = Array.from(symbol).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hue = hash % 360;
  const bg = `hsl(${hue} 60% 90%)`;
  const fg = `hsl(${hue} 50% 30%)`;
  const initials = symbol.slice(0, 2).toUpperCase();

  if (resolvedLogo && !failed) {
    return (
      <img
        src={resolvedLogo}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="rounded-full border border-border/40 bg-white object-contain p-0.5 shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      aria-hidden
      className="rounded-full flex items-center justify-center font-bold border border-border/40 shrink-0"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
};

const StockFavourites = ({ entries, stocks }: StockFavouritesProps) => {
  if (entries.length === 0) return null;

  const favStocks = entries
    .map((e) => stocks.find((s) => s.id === e.item_id))
    .filter(Boolean) as Stock[];

  if (favStocks.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 px-0.5">
        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        <span className="text-sm font-bold text-foreground">Your Watchlist</span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {favStocks.length}
        </Badge>
      </div>

      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1 -mx-1 px-1 touch-pan-x">
        {favStocks.map((s) => (
          <Link
            key={s.id}
            to={`/stocks/${s.symbol}`}
            className="flex items-center justify-between gap-2.5 min-w-[190px] max-w-[240px] shrink-0 rounded-2xl border border-border/80 bg-slate-50/80 dark:bg-card px-3 py-2 hover:border-emerald-500/40 shadow-xs transition-all active:scale-[0.98] group"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <StockAvatar symbol={s.symbol} logoUrl={s.logo_url} size={28} />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-foreground tracking-wide block truncate group-hover:text-accent transition-colors">
                  {s.symbol}
                </span>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{s.name}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-bold tabular-nums text-foreground">
                {formatNumber(s.price)}
              </p>
              <span
                className={`inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums mt-0.5 ${
                  s.day_change > 0 ? "text-emerald-500 dark:text-emerald-400" : s.day_change < 0 ? "text-destructive" : "text-muted-foreground"
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
          </Link>
        ))}
      </div>
    </div>
  );
};

export default StockFavourites;
