import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Check, TrendingUp, TrendingDown, Minus, ArrowUpDown } from "lucide-react";
import WatchlistAssetAvatar from "@/components/watchlist/WatchlistAssetAvatar";
import { Input } from "@/components/ui/input";
import type { UniversalCompareEntity } from "./CompareWorkbench";

interface CompareCatalogStocksProps {
  stocks: UniversalCompareEntity[];
  selectedItems: UniversalCompareEntity[];
  onToggleCompare: (stock: UniversalCompareEntity) => void;
}

export const CompareCatalogStocks: React.FC<CompareCatalogStocksProps> = ({
  stocks,
  selectedItems,
  onToggleCompare,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"market_cap" | "day_change" | "dividend_yield" | "pe_ratio">("market_cap");

  const sectors = useMemo(() => {
    const set = new Set<string>();
    stocks.forEach((s) => {
      if (s.metrics.sectorOrType) set.add(s.metrics.sectorOrType);
    });
    return ["all", ...Array.from(set).sort()];
  }, [stocks]);

  const filteredStocks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const list = stocks.filter((s) => {
      if (sectorFilter !== "all" && s.metrics.sectorOrType !== sectorFilter) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        (s.symbol && s.symbol.toLowerCase().includes(q)) ||
        (s.subtitle && s.subtitle.toLowerCase().includes(q))
      );
    });

    return list.sort((a, b) => {
      if (sortBy === "dividend_yield") {
        return (b.metrics.dividendYieldPct || 0) - (a.metrics.dividendYieldPct || 0);
      }
      if (sortBy === "day_change") {
        return (b.metrics.dayChangePct || 0) - (a.metrics.dayChangePct || 0);
      }
      if (sortBy === "pe_ratio") {
        const peA = a.metrics.peRatio || 999;
        const peB = b.metrics.peRatio || 999;
        return peA - peB;
      }
      // default: market cap / raw price
      return (b.metrics.priceKes || 0) - (a.metrics.priceKes || 0);
    });
  }, [stocks, searchQuery, sectorFilter, sortBy]);

  return (
    <div className="space-y-4 pt-4 border-t border-border/60">
      {/* Search and Filters Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-foreground">Explore Nairobi Securities Exchange (NSE) Stocks</h4>
          <p className="text-xs text-muted-foreground">
            Click "+ Compare" on any stock to add it to the comparison workbench above.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stocks by name or ticker..."
              className="pl-8 text-xs h-8 rounded-xl"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-8 px-2.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground focus:outline-hidden"
          >
            <option value="market_cap">Sort: Market Cap</option>
            <option value="dividend_yield">Sort: Top Dividend</option>
            <option value="day_change">Sort: 1D Gainers</option>
            <option value="pe_ratio">Sort: Lowest P/E</option>
          </select>
        </div>
      </div>

      {/* Stocks Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/60">
              <tr>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-3 text-right">Price (KES)</th>
                <th className="py-3 px-3 text-right">1D Move</th>
                <th className="py-3 px-3 text-right hidden md:table-cell">P/E Ratio</th>
                <th className="py-3 px-3 text-right hidden sm:table-cell">Div Yield</th>
                <th className="py-3 px-3 hidden lg:table-cell">Sector</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredStocks.map((stock) => {
                const isSelected = selectedItems.some((s) => s.id === stock.id);
                const isPos = (stock.metrics.dayChangePct || 0) > 0;
                const isNeg = (stock.metrics.dayChangePct || 0) < 0;

                return (
                  <tr key={stock.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <WatchlistAssetAvatar
                          type="stock"
                          symbol={stock.symbol}
                          name={stock.title}
                          size={32}
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <Link
                            to={stock.link}
                            className="font-bold text-foreground hover:text-emerald-500 transition-colors truncate block"
                          >
                            {stock.symbol || stock.title}
                          </Link>
                          <span className="text-[10px] text-muted-foreground truncate block">
                            {stock.title}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-foreground tabular-nums">
                      {stock.metrics.priceKes != null ? stock.metrics.priceKes.toFixed(2) : "—"}
                    </td>

                    <td className="py-3 px-3 text-right tabular-nums">
                      {stock.metrics.dayChangePct != null ? (
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
                          {stock.metrics.dayChangePct.toFixed(2)}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="py-3 px-3 text-right tabular-nums hidden md:table-cell font-semibold text-foreground">
                      {stock.metrics.peRatio != null && stock.metrics.peRatio > 0
                        ? `${stock.metrics.peRatio.toFixed(1)}x`
                        : "—"}
                    </td>

                    <td className="py-3 px-3 text-right tabular-nums hidden sm:table-cell font-semibold text-foreground">
                      {stock.metrics.dividendYieldPct != null
                        ? `${stock.metrics.dividendYieldPct.toFixed(2)}%`
                        : "0.00%"}
                    </td>

                    <td className="py-3 px-3 hidden lg:table-cell text-muted-foreground">
                      {stock.metrics.sectorOrType || "Equities"}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onToggleCompare(stock)}
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
