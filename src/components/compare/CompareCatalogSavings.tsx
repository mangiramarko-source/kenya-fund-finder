import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Check, ShieldCheck } from "lucide-react";
import WatchlistAssetAvatar from "@/components/watchlist/WatchlistAssetAvatar";
import { Input } from "@/components/ui/input";
import type { UniversalCompareEntity } from "./CompareWorkbench";

interface CompareCatalogSavingsProps {
  savings: UniversalCompareEntity[];
  selectedItems: UniversalCompareEntity[];
  onToggleCompare: (item: UniversalCompareEntity) => void;
}

export const CompareCatalogSavings: React.FC<CompareCatalogSavingsProps> = ({
  savings,
  selectedItems,
  onToggleCompare,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return savings.filter((s) => {
      if (typeFilter !== "all" && s.badge !== typeFilter) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.subtitle.toLowerCase().includes(q) ||
        (s.symbol && s.symbol.toLowerCase().includes(q))
      );
    });
  }, [savings, searchQuery, typeFilter]);

  return (
    <div className="space-y-4 pt-4 border-t border-border/60">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-foreground">
            Explore Bank Fixed Deposits, SACCOs &amp; CBK T-Bills
          </h4>
          <p className="text-xs text-muted-foreground">
            Compare guaranteed returns from KDIC insured banks, SASRA regulated SACCOs, and Central Bank Treasury Bills.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search banks, SACCOs..."
              className="pl-8 text-xs h-8 rounded-xl"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-8 px-2.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground focus:outline-hidden"
          >
            <option value="all">All Types</option>
            <option value="Bank Fixed Deposit">Bank Fixed Deposits</option>
            <option value="Regulated SACCO">SACCO Dividends</option>
            <option value="Government T-Bill">Treasury Bills</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/60">
              <tr>
                <th className="py-3 px-4">Institution &amp; Product</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Gross Return</th>
                <th className="py-3 px-3 text-right hidden sm:table-cell">Net (After Tax)</th>
                <th className="py-3 px-3 hidden md:table-cell">Guarantee</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredItems.map((item) => {
                const isSelected = selectedItems.some((s) => s.id === item.id);

                return (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <WatchlistAssetAvatar
                          type="savings"
                          name={item.title}
                          size={32}
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-foreground truncate block">
                            {item.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate block">
                            {item.subtitle}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground">
                        {item.badge}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-black text-foreground tabular-nums">
                      {item.metrics.primaryYieldOrReturnPct != null
                        ? `${item.metrics.primaryYieldOrReturnPct.toFixed(2)}%`
                        : "—"}
                    </td>

                    <td className="py-3 px-3 text-right tabular-nums hidden sm:table-cell font-bold text-emerald-600 dark:text-emerald-400">
                      {item.metrics.netReturnPct != null
                        ? `${item.metrics.netReturnPct.toFixed(2)}%`
                        : item.metrics.primaryYieldOrReturnPct != null
                        ? `${(item.metrics.primaryYieldOrReturnPct * 0.85).toFixed(2)}%`
                        : "—"}
                    </td>

                    <td className="py-3 px-3 hidden md:table-cell text-muted-foreground">
                      <span className="inline-flex items-center gap-1 text-[11px]">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        {item.metrics.regulator || "Regulated"}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onToggleCompare(item)}
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
