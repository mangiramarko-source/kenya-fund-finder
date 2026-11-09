import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Check } from "lucide-react";
import WatchlistAssetAvatar from "@/components/watchlist/WatchlistAssetAvatar";
import { Input } from "@/components/ui/input";
import type { UniversalCompareEntity } from "./CompareWorkbench";

interface CompareCatalogFundsProps {
  funds: UniversalCompareEntity[];
  selectedItems: UniversalCompareEntity[];
  onToggleCompare: (fund: UniversalCompareEntity) => void;
}

export const CompareCatalogFunds: React.FC<CompareCatalogFundsProps> = ({
  funds,
  selectedItems,
  onToggleCompare,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"yield" | "fee" | "min_deposit">("yield");

  const types = useMemo(() => {
    const set = new Set<string>();
    funds.forEach((f) => {
      if (f.badge) set.add(f.badge);
    });
    return ["all", ...Array.from(set).sort()];
  }, [funds]);

  const filteredFunds = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const list = funds.filter((f) => {
      if (typeFilter !== "all" && f.badge !== typeFilter) return false;
      if (!q) return true;
      return (
        f.title.toLowerCase().includes(q) ||
        f.subtitle.toLowerCase().includes(q) ||
        (f.symbol && f.symbol.toLowerCase().includes(q))
      );
    });

    return list.sort((a, b) => {
      if (sortBy === "fee") {
        const feeA = a.metrics.managementFeePct || 999;
        const feeB = b.metrics.managementFeePct || 999;
        return feeA - feeB;
      }
      if (sortBy === "min_deposit") {
        return (a.metrics.minDepositKes || 0) - (b.metrics.minDepositKes || 0);
      }
      // default: highest yield
      const yieldA = a.metrics.primaryYieldOrReturnPct ?? -1;
      const yieldB = b.metrics.primaryYieldOrReturnPct ?? -1;
      if (yieldA !== yieldB) return yieldB - yieldA;
      return (b.metrics.priceKes || 0) - (a.metrics.priceKes || 0);
    });
  }, [funds, searchQuery, typeFilter, sortBy]);

  return (
    <div className="space-y-4 pt-4 border-t border-border/60">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-foreground">Explore Regulated Unit Trust Funds &amp; MMFs</h4>
          <p className="text-xs text-muted-foreground">
            Compare daily compounding yields, minimums, and management fees across CMA-licensed managers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search funds or managers..."
              className="pl-8 text-xs h-8 rounded-xl"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-8 px-2.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground focus:outline-hidden"
          >
            <option value="yield">Sort: Highest Yield</option>
            <option value="fee">Sort: Lowest Fee</option>
            <option value="min_deposit">Sort: Lowest Min Deposit</option>
          </select>
        </div>
      </div>

      {/* Funds Table */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase border-b border-border/60">
              <tr>
                <th className="py-3 px-4">Fund &amp; Manager</th>
                <th className="py-3 px-3 text-right">Yield / NAV Price</th>
                <th className="py-3 px-3 text-right hidden sm:table-cell">Mgmt Fee</th>
                <th className="py-3 px-3 text-right hidden md:table-cell">Min Deposit</th>
                <th className="py-3 px-3 hidden lg:table-cell">Withdrawal</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredFunds.map((fund) => {
                const isSelected = selectedItems.some((s) => s.id === fund.id);

                return (
                  <tr key={fund.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <WatchlistAssetAvatar
                          type="fund"
                          name={fund.title}
                          manager={fund.subtitle}
                          size={32}
                          className="shrink-0"
                        />
                        <div className="min-w-0">
                          <Link
                            to={fund.link}
                            className="font-bold text-foreground hover:text-emerald-500 transition-colors truncate block"
                          >
                            {fund.title}
                          </Link>
                          <span className="text-[10px] text-muted-foreground truncate block">
                            {fund.subtitle}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-black tabular-nums">
                      {fund.metrics.isUnitPrice ? (
                        <div>
                          <span className="text-foreground">
                            KES {fund.metrics.priceKes?.toFixed(2) ?? "—"}
                          </span>
                          <span className="block text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                            NAV Price
                          </span>
                        </div>
                      ) : fund.metrics.primaryYieldOrReturnPct != null ? (
                        <div>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {fund.metrics.primaryYieldOrReturnPct.toFixed(2)}%
                          </span>
                          <span className="block text-[9px] font-normal text-muted-foreground">
                            {fund.metrics.netReturnPct != null ? `~${fund.metrics.netReturnPct.toFixed(2)}% net` : "p.a. Gross"}
                          </span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="py-3 px-3 text-right tabular-nums hidden sm:table-cell font-semibold text-foreground">
                      {fund.metrics.managementFeePct != null
                        ? `${fund.metrics.managementFeePct.toFixed(1)}%`
                        : "—"}
                    </td>

                    <td className="py-3 px-3 text-right tabular-nums hidden md:table-cell text-muted-foreground">
                      {fund.metrics.minDepositKes != null
                        ? `KES ${fund.metrics.minDepositKes.toLocaleString()}`
                        : "KES 1,000"}
                    </td>

                    <td className="py-3 px-3 hidden lg:table-cell text-muted-foreground">
                      {fund.metrics.tenorOrWithdrawal || "1-3 Days"}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onToggleCompare(fund)}
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
