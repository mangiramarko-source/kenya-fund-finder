import React from "react";
import { Link } from "react-router-dom";
import { DollarSign, SlidersHorizontal } from "lucide-react";
import type { ExchangeRate } from "@/components/home/MarketTicker";

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
  ];

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-bold text-foreground">Exchange Rates</h3>
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
        {displayRates.map((r: any) => {
          const isPos = (r.day_change_percent || 0) >= 0;
          return (
            <div key={r.currency_code} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center text-sm">
                  {r.flag || "💱"}
                </div>
                <div>
                  <div className="font-bold text-foreground tracking-tight">{r.currency_code}/KES</div>
                  <div className="text-[11px] text-muted-foreground">{r.currency_name || r.currency_code}</div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-bold text-foreground">KES {r.rate.toFixed(2)}</div>
                <div className={`text-[11px] font-semibold ${isPos ? "text-emerald-500" : "text-red-500"}`}>
                  {isPos ? "+" : ""}{(r.day_change_percent || 0).toFixed(2)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
