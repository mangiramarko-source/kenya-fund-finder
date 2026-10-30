import { useState } from "react";
import { Star, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getCurrencyFlagUrl } from "@/lib/currencyBranding";
import type { WatchlistEntry } from "@/hooks/useAssetWatchlist";

interface Rate {
  id: string;
  currency_code: string;
  currency_name: string;
  rate: number;
  previous_rate: number | null;
}

interface RateFavouritesProps {
  entries: WatchlistEntry[];
  rates: Rate[];
}

const formatRate = (n: number) =>
  n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

const CurrencyAvatar = ({ currencyCode, size = 28 }: { currencyCode: string; size?: number }) => {
  const [failed, setFailed] = useState(false);
  const flagUrl = getCurrencyFlagUrl(currencyCode);

  if (flagUrl && !failed) {
    return (
      <img
        src={flagUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="rounded-full border border-border/40 object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      aria-hidden
      className="rounded-full flex items-center justify-center font-bold border border-border/40 bg-muted text-muted-foreground shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {currencyCode.slice(0, 2).toUpperCase()}
    </div>
  );
};

const RateFavourites = ({ entries, rates }: RateFavouritesProps) => {
  if (entries.length === 0) return null;

  const favRates = entries
    .map((e) => rates.find((r) => r.id === e.item_id))
    .filter(Boolean) as Rate[];

  if (favRates.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 px-0.5">
        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        <span className="text-sm font-bold text-foreground">Your Watchlist</span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {favRates.length}
        </Badge>
      </div>

      <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1 -mx-1 px-1 touch-pan-x">
        {favRates.map((r) => {
          const diff = r.previous_rate != null ? r.rate - r.previous_rate : 0;
          const pct =
            r.previous_rate && r.previous_rate !== 0
              ? ((diff / r.previous_rate) * 100).toFixed(2)
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
              key={r.id}
              className="flex items-center justify-between gap-2.5 min-w-[190px] max-w-[240px] shrink-0 rounded-2xl border border-border/80 bg-slate-50/80 dark:bg-card px-3 py-2 hover:border-emerald-500/40 shadow-xs transition-all"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <CurrencyAvatar currencyCode={r.currency_code} size={28} />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-foreground tracking-wide block truncate">
                    {r.currency_code}/KES
                  </span>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">{r.currency_name}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-bold tabular-nums text-foreground">{formatRate(r.rate)}</p>
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

export default RateFavourites;
