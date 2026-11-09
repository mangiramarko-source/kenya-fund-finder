import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Check, TrendingUp, TrendingDown, Minus } from "lucide-react";
import WatchlistAssetAvatar from "@/components/watchlist/WatchlistAssetAvatar";
import { Input } from "@/components/ui/input";
import type { UniversalCompareEntity } from "./CompareWorkbench";

interface CompareCatalogRatesProps {
  rates: UniversalCompareEntity[];
  selectedItems: UniversalCompareEntity[];
  onToggleCompare: (rate: UniversalCompareEntity) => void;
}

export const CompareCatalogRates: React.FC<CompareCatalogRatesProps> = ({
  rates,
  selectedItems,
  onToggleCompare,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRates = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return rates.filter((r) => {
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.subtitle.toLowerCase().includes(q) ||
        (r.symbol && r.symbol.toLowerCase().includes(q))
      );
    });
  }, [rates, searchQuery]);

  return (
    <div className="space-y-4 pt-4 border-t border-border/60">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-foreground">Central Bank of Kenya (CBK) Foreign Exchange Rates</h4>
          <p className="text-xs text-muted-foreground">
            Official mean conversion rates against the Kenya Shilling (KES).
          </p>
        </div>

        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search currency by name or code..."
            className="pl-8 text-xs h-8 rounded-xl"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/60">
              <tr>
                <th className="py-3 px-4">Currency</th>
                <th className="py-3 px-3 text-right">CBK Mean Rate</th>
                <th className="py-3 px-3 text-right">1D Move</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredRates.map((rate) => {
                const isSelected = selectedItems.some((s) => s.id === rate.id);
                const isPos = (rate.metrics.dayChangePct || 0) > 0;
                const isNeg = (rate.metrics.dayChangePct || 0) < 0;

                return (
                  <tr key={rate.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <WatchlistAssetAvatar
                          type="currency"
                          currencyCode={rate.metrics.currencyCode || rate.symbol}
                          name={rate.title}
                          size={32}
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <Link
                            to={rate.link}
                            className="font-bold text-foreground hover:text-emerald-500 transition-colors truncate block"
                          >
                            {rate.symbol} / KES
                          </Link>
                          <span className="text-[10px] text-muted-foreground truncate block">
                            {rate.title}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-black text-foreground tabular-nums">
                      {rate.metrics.priceKes != null ? `KES ${rate.metrics.priceKes.toFixed(2)}` : "—"}
                    </td>

                    <td className="py-3 px-3 text-right tabular-nums">
                      {rate.metrics.dayChangePct != null ? (
                        <span
                          className={`inline-flex items-center gap-0.5 font-bold ${
                            isPos
                              ? "text-emerald-600 dark:text-emerald-400"
                              : isNeg
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-muted-foreground"
                          }`}
                        >
                          {isPos ? "+" : ""}
                          {rate.metrics.dayChangePct.toFixed(2)}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onToggleCompare(rate)}
                        className={`h-7 px-2.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all ${
                          isSelected
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-muted hover:bg-emerald-600 hover:text-white text-foreground"
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            <span>Compare</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
