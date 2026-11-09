import React from "react";
import { Link } from "react-router-dom";
import { DollarSign, SlidersHorizontal, ArrowRight } from "lucide-react";
import type { ExchangeRate } from "@/components/home/MarketTicker";
import WatchlistAssetAvatar from "@/components/watchlist/WatchlistAssetAvatar";

interface ExchangeRatesCardProps {
  rates?: ExchangeRate[];
  onOpenCustomize?: () => void;
}

export const ExchangeRatesCard: React.FC<ExchangeRatesCardProps> = ({
  rates = [],
  onOpenCustomize,
}) => {
  const displayRates = rates.length > 0 ? rates.slice(0, 4) : [
    { currency_code: "USD", currency_name: "US Dollar", rate: 129.42, day_change_percent: 0.08, flag: "🇺🇸" },
    { currency_code: "GBP", currency_name: "British Pound", rate: 173.97, day_change_percent: -0.09, flag: "🇬🇧" },
    { currency_code: "EUR", currency_name: "Euro", rate: 140.85, day_change_percent: 0.12, flag: "🇪🇺" },
    { currency_code: "TZS", currency_name: "Tanzanian Shilling", rate: 0.05, day_change_percent: 0.0, flag: "🇹🇿" },
  ];

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-bold text-foreground">Exchange Rates</h3>
        </div>
        <button
          onClick={onOpenCustomize}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-semibold transition-colors px-2 py-1 rounded-lg hover:bg-muted/50"
          title="Customize Currencies"
        >
          <span>Edit</span>
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Rates List */}
      <div className="space-y-1.5 pt-0.5">
        {displayRates.map((r: any) => {
          const isPos = (r.day_change_percent || 0) >= 0;
          return (
            <Link
              key={r.currency_code}
              to="/rates"
              className="flex items-center justify-between p-2 rounded-xl border border-border/50 bg-slate-50/50 dark:bg-card hover:border-emerald-500/40 hover:bg-muted/30 transition-all group text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <WatchlistAssetAvatar
                  type="currency"
                  currencyCode={r.currency_code}
                  name={r.currency_name || r.currency_code}
                  size={32}
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-bold text-foreground tracking-tight group-hover:text-emerald-500 transition-colors">
                    {r.currency_code}/KES
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate max-w-[110px]">
                    {r.currency_name || r.currency_code}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-bold text-foreground tabular-nums">
                  KES {Number(r.rate).toFixed(2)}
                </div>
                {r.day_change_percent != null && (
                  <div
                    className={`text-[10px] font-bold inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md ${
                      isPos
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {isPos ? "+" : ""}
                    {(r.day_change_percent || 0).toFixed(2)}%
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom Link */}
      <div className="pt-1 text-center">
        <Link
          to="/rates"
          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 transition-colors"
        >
          <span>View All CBK Rates</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
