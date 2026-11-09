import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Plus,
  X,
  GitCompareArrows,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  Search,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Scale,
  Percent,
  Coins,
} from "lucide-react";
import WatchlistAssetAvatar, { type WatchlistAssetType } from "@/components/watchlist/WatchlistAssetAvatar";
import { Input } from "@/components/ui/input";

export interface UniversalCompareEntity {
  id: string;
  type: WatchlistAssetType;
  title: string;
  subtitle: string;
  symbol?: string;
  badge?: string;
  link: string;
  metrics: {
    primaryYieldOrReturnPct?: number; // e.g. 14.12 for 14.12%
    netReturnPct?: number; // after tax
    isUnitPrice?: boolean;
    yieldUnit?: string;
    priceKes?: number;
    dayChangePct?: number;
    peRatio?: number;
    dividendYieldPct?: number;
    managementFeePct?: number;
    minDepositKes?: number;
    tenorOrWithdrawal?: string;
    riskLevel?: "Low / Capital Preservation" | "Moderate" | "Equity Market Risk" | "Currency Fluctuations";
    regulator?: "CMA Regulated" | "CBK Monitored" | "SASRA Regulated" | "KDIC Insured Bank";
    sectorOrType?: string;
    marketCapFormatted?: string;
    currencyCode?: string;
  };
  raw?: any;
}

interface CompareWorkbenchProps {
  category: "stocks" | "funds" | "rates" | "savings" | "cross-asset";
  selectedItems: UniversalCompareEntity[];
  availableItems: UniversalCompareEntity[];
  onAddItem: (item: UniversalCompareEntity) => void;
  onRemoveItem: (id: string) => void;
  onSwapItem: (oldId: string, newItem: UniversalCompareEntity) => void;
  onLoadPreset: (items: UniversalCompareEntity[]) => void;
}

export const CompareWorkbench: React.FC<CompareWorkbenchProps> = ({
  category,
  selectedItems,
  availableItems,
  onAddItem,
  onRemoveItem,
  onSwapItem,
  onLoadPreset,
}) => {
  const [swapSlotId, setSwapSlotId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [investmentPrincipal, setInvestmentPrincipal] = useState<number>(100000);

  // Filter available items for the search picker
  const filteredCandidates = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return availableItems
      .filter((i) => !selectedItems.some((s) => s.id === i.id))
      .filter((i) => {
        if (!q) return true;
        return (
          i.title.toLowerCase().includes(q) ||
          i.subtitle.toLowerCase().includes(q) ||
          (i.symbol && i.symbol.toLowerCase().includes(q))
        );
      })
      .slice(0, 20);
  }, [availableItems, selectedItems, searchQuery]);

  // Presets per category
  const presets = useMemo(() => {
    const findBySymbolOrName = (needle: string) => {
      const n = needle.toLowerCase();
      return availableItems.find(
        (i) =>
          (i.symbol && i.symbol.toLowerCase() === n) ||
          i.title.toLowerCase().includes(n) ||
          i.id.toLowerCase() === n
      );
    };

    if (category === "stocks") {
      return [
        {
          label: "Safaricom vs Equity Bank",
          items: [findBySymbolOrName("SCOM"), findBySymbolOrName("EQTY")].filter(Boolean) as UniversalCompareEntity[],
        },
        {
          label: "KCB Group vs Equity Bank",
          items: [findBySymbolOrName("KCB"), findBySymbolOrName("EQTY")].filter(Boolean) as UniversalCompareEntity[],
        },
        {
          label: "EABL vs BAT Kenya",
          items: [findBySymbolOrName("EABL"), findBySymbolOrName("BAT")].filter(Boolean) as UniversalCompareEntity[],
        },
        {
          label: "StanChart vs ABSA",
          items: [findBySymbolOrName("SCBK"), findBySymbolOrName("ABSA")].filter(Boolean) as UniversalCompareEntity[],
        },
      ].filter((p) => p.items.length >= 2);
    }

    if (category === "funds") {
      return [
        {
          label: "Kuza MMF vs Etica MMF",
          items: [findBySymbolOrName("kuza"), findBySymbolOrName("etica")].filter(Boolean) as UniversalCompareEntity[],
        },
        {
          label: "Sanlam MMF vs CIC MMF",
          items: [findBySymbolOrName("sanlam"), findBySymbolOrName("cic")].filter(Boolean) as UniversalCompareEntity[],
        },
        {
          label: "Etica vs Lofty-Corban",
          items: [findBySymbolOrName("etica"), findBySymbolOrName("lofty")].filter(Boolean) as UniversalCompareEntity[],
        },
      ].filter((p) => p.items.length >= 2);
    }

    if (category === "rates") {
      return [
        {
          label: "USD vs EUR vs GBP",
          items: [findBySymbolOrName("USD"), findBySymbolOrName("EUR"), findBySymbolOrName("GBP")].filter(Boolean) as UniversalCompareEntity[],
        },
        {
          label: "USD vs EUR",
          items: [findBySymbolOrName("USD"), findBySymbolOrName("EUR")].filter(Boolean) as UniversalCompareEntity[],
        },
      ].filter((p) => p.items.length >= 2);
    }

    if (category === "savings") {
      return [
        {
          label: "Equity Bank FD vs Stima SACCO",
          items: [findBySymbolOrName("equity"), findBySymbolOrName("stima")].filter(Boolean) as UniversalCompareEntity[],
        },
        {
          label: "KCB FD vs Police SACCO",
          items: [findBySymbolOrName("kcb"), findBySymbolOrName("police")].filter(Boolean) as UniversalCompareEntity[],
        },
      ].filter((p) => p.items.length >= 2);
    }

    // Cross-Asset presets
    return [
      {
        label: "Top MMF vs 91-Day T-Bill vs Dividend Stock",
        items: [
          findBySymbolOrName("kuza") || findBySymbolOrName("etica") || availableItems.find((i) => i.type === "fund"),
          findBySymbolOrName("treasury") || findBySymbolOrName("t-bill") || availableItems.find((i) => i.subtitle.includes("CBK")),
          findBySymbolOrName("EQTY") || findBySymbolOrName("SCOM") || availableItems.find((i) => i.type === "stock"),
        ].filter(Boolean) as UniversalCompareEntity[],
      },
      {
        label: "MMF vs Bank Fixed Deposit",
        items: [
          availableItems.find((i) => i.type === "fund"),
          availableItems.find((i) => i.type === "savings"),
        ].filter(Boolean) as UniversalCompareEntity[],
      },
    ].filter((p) => p.items.length >= 2);
  }, [category, availableItems]);

  // Metric Calculation & Winner Detection
  const highestYield = useMemo(() => {
    const vals = selectedItems.map((i) => i.metrics.primaryYieldOrReturnPct || 0).filter((v) => v > 0);
    return vals.length > 0 ? Math.max(...vals) : null;
  }, [selectedItems]);

  const bestPe = useMemo(() => {
    const vals = selectedItems.map((i) => i.metrics.peRatio || 0).filter((v) => v > 0);
    return vals.length > 0 ? Math.min(...vals) : null;
  }, [selectedItems]);

  const topDividend = useMemo(() => {
    const vals = selectedItems.map((i) => i.metrics.dividendYieldPct || 0).filter((v) => v > 0);
    return vals.length > 0 ? Math.max(...vals) : null;
  }, [selectedItems]);

  const lowestFee = useMemo(() => {
    const vals = selectedItems.map((i) => i.metrics.managementFeePct || 0).filter((v) => v > 0);
    return vals.length > 0 ? Math.min(...vals) : null;
  }, [selectedItems]);

  const gridColsClass =
    selectedItems.length === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : selectedItems.length === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : selectedItems.length >= 4
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      : "grid-cols-1";

  return (
    <div className="space-y-6">
      {/* ─── QUICK PRESETS BAR ─── */}
      {presets.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider shrink-0 flex items-center gap-1.5 pl-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Popular Duels:</span>
          </span>
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onLoadPreset(preset.items)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-muted/60 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/30 border border-border/70 transition-all shrink-0 whitespace-nowrap"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* ─── SIDE-BY-SIDE SLOTS HEADER ─── */}
      <div className={`grid ${gridColsClass} gap-4`}>
        {selectedItems.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-border/80 bg-card p-4 relative shadow-xs flex flex-col justify-between group transition-all hover:border-emerald-500/30"
          >
            {/* Top Action Buttons */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <WatchlistAssetAvatar
                  type={item.type}
                  symbol={item.symbol}
                  name={item.title}
                  currencyCode={item.metrics.currencyCode}
                  size={40}
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-foreground truncate">
                      {item.symbol || item.title}
                    </span>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground uppercase">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{item.title}</div>
                </div>
              </div>

              {selectedItems.length > 2 && (
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  title="Remove from comparison"
                  className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Primary Highlight Metric */}
            <div className="py-2.5 px-3 rounded-xl bg-muted/40 my-2 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  {category === "stocks"
                    ? "Live Price"
                    : category === "rates"
                    ? "CBK Exchange Rate"
                    : "Annual Return"}
                </span>
                <span className="text-lg font-black text-foreground tabular-nums">
                  {category === "stocks" && item.metrics.priceKes != null
                    ? `KES ${item.metrics.priceKes.toFixed(2)}`
                    : category === "rates" && item.metrics.priceKes != null
                    ? `KES ${item.metrics.priceKes.toFixed(2)}`
                    : item.metrics.primaryYieldOrReturnPct != null
                    ? `${item.metrics.primaryYieldOrReturnPct.toFixed(2)}% p.a.`
                    : "—"}
                </span>
              </div>

              {item.metrics.dayChangePct != null && (
                <div
                  className={`text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-0.5 tabular-nums ${
                    item.metrics.dayChangePct > 0
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : item.metrics.dayChangePct < 0
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {item.metrics.dayChangePct > 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : item.metrics.dayChangePct < 0 ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : (
                    <Minus className="w-3 h-3" />
                  )}
                  <span>
                    {item.metrics.dayChangePct > 0 ? "+" : ""}
                    {item.metrics.dayChangePct.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Controls: Swap & Profile Link */}
            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setSwapSlotId(item.id);
                  setSearchQuery("");
                }}
                className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold inline-flex items-center gap-1"
              >
                <span>Swap Asset</span>
              </button>

              <Link
                to={item.link}
                className="text-muted-foreground hover:text-foreground font-semibold inline-flex items-center gap-1"
              >
                <span>Details</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ))}

        {/* Add Slot Button if under 4 items */}
        {selectedItems.length < 4 && (
          <button
            type="button"
            onClick={() => {
              setShowAddModal(true);
              setSearchQuery("");
            }}
            className="rounded-2xl border-2 border-dashed border-border/80 hover:border-emerald-500/50 hover:bg-emerald-500/5 p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-all min-h-[160px]"
          >
            <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">Add Instrument to Compare</span>
            <span className="text-[10px] text-muted-foreground">Up to 4 items head-to-head</span>
          </button>
        )}
      </div>

      {/* ─── METRIC COMPARISON MATRIX ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-foreground">Detailed Metric Breakdown</h3>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground">
            {selectedItems.length} items compared side-by-side
          </span>
        </div>

        {/* Category-Specific Table Rows */}
        {category === "stocks" && (
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
            <div className="divide-y divide-border/60">
              {/* Row: Valuation (P/E) */}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground">P/E Valuation Multiple</span>
                    <span className="text-[10px] text-muted-foreground block">
                      Price to earnings ratio (lower indicates better value)
                    </span>
                  </div>
                </div>
                <div className={`grid ${gridColsClass} gap-3 pt-1`}>
                  {selectedItems.map((item) => {
                    const pe = item.metrics.peRatio;
                    const isWin = pe != null && pe > 0 && pe === bestPe;
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl text-center ${
                          isWin
                            ? "bg-emerald-500/10 border border-emerald-500/30"
                            : "bg-muted/30"
                        }`}
                      >
                        <span className="text-sm font-bold text-foreground tabular-nums">
                          {pe != null && pe > 0 ? `${pe.toFixed(1)}x` : "—"}
                        </span>
                        {isWin && (
                          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> Best Value P/E
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Row: Dividend Yield */}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground">Annual Dividend Yield</span>
                    <span className="text-[10px] text-muted-foreground block">
                      Cash distribution yield based on latest annual payouts
                    </span>
                  </div>
                </div>
                <div className={`grid ${gridColsClass} gap-3 pt-1`}>
                  {selectedItems.map((item) => {
                    const dy = item.metrics.dividendYieldPct;
                    const isWin = dy != null && dy > 0 && dy === topDividend;
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl text-center ${
                          isWin
                            ? "bg-emerald-500/10 border border-emerald-500/30"
                            : "bg-muted/30"
                        }`}
                      >
                        <span className="text-sm font-bold text-foreground tabular-nums">
                          {dy != null ? `${dy.toFixed(2)}%` : "0.00%"}
                        </span>
                        {isWin && (
                          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> Top Dividend Payout
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Row: Sector & Category */}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Market Sector</span>
                </div>
                <div className={`grid ${gridColsClass} gap-3 pt-1`}>
                  {selectedItems.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl text-center bg-muted/30">
                      <span className="text-xs font-semibold text-foreground">
                        {item.metrics.sectorOrType || "Equities"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row: Market Capitalization */}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Market Capitalization</span>
                </div>
                <div className={`grid ${gridColsClass} gap-3 pt-1`}>
                  {selectedItems.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl text-center bg-muted/30">
                      <span className="text-xs font-bold text-foreground tabular-nums">
                        {item.metrics.marketCapFormatted || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Funds Breakdown */}
        {category === "funds" && (
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
            <div className="divide-y divide-border/60">
              {/* Row: Effective Annual Yield */}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground">Effective Annual Yield (EAR)</span>
                    <span className="text-[10px] text-muted-foreground block">
                      Published compound annual return after fund expenses
                    </span>
                  </div>
                </div>
                <div className={`grid ${gridColsClass} gap-3 pt-1`}>
                  {selectedItems.map((item) => {
                    const y = item.metrics.primaryYieldOrReturnPct;
                    const isWin = y != null && y > 0 && y === highestYield;
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl text-center ${
                          isWin
                            ? "bg-emerald-500/10 border border-emerald-500/30"
                            : "bg-muted/30"
                        }`}
                      >
                        <span className="text-sm font-black text-foreground tabular-nums">
                          {y != null ? `${y.toFixed(2)}% p.a.` : "—"}
                        </span>
                        {isWin && (
                          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> Highest Yield
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Row: Management Fee */}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground">Annual Management Fee</span>
                    <span className="text-[10px] text-muted-foreground block">
                      Expense ratio deducted by the fund manager
                    </span>
                  </div>
                </div>
                <div className={`grid ${gridColsClass} gap-3 pt-1`}>
                  {selectedItems.map((item) => {
                    const fee = item.metrics.managementFeePct;
                    const isWin = fee != null && fee > 0 && fee === lowestFee;
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl text-center ${
                          isWin
                            ? "bg-emerald-500/10 border border-emerald-500/30"
                            : "bg-muted/30"
                        }`}
                      >
                        <span className="text-xs font-bold text-foreground tabular-nums">
                          {fee != null ? `${fee.toFixed(1)}% p.a.` : "—"}
                        </span>
                        {isWin && (
                          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> Lowest Fee
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Row: Minimum Initial Investment */}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Minimum Initial Deposit</span>
                </div>
                <div className={`grid ${gridColsClass} gap-3 pt-1`}>
                  {selectedItems.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl text-center bg-muted/30">
                      <span className="text-xs font-bold text-foreground tabular-nums">
                        {item.metrics.minDepositKes != null
                          ? `KES ${item.metrics.minDepositKes.toLocaleString()}`
                          : "KES 1,000"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row: Withdrawal Settlement */}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Withdrawal Settlement</span>
                </div>
                <div className={`grid ${gridColsClass} gap-3 pt-1`}>
                  {selectedItems.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl text-center bg-muted/30">
                      <span className="text-xs font-medium text-foreground">
                        {item.metrics.tenorOrWithdrawal || "1 to 3 Business Days"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Savings & Fixed Income Breakdown */}
        {category === "savings" && (
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
            <div className="divide-y divide-border/60">
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Quoted Annual Rate</span>
                </div>
                <div className={`grid ${gridColsClass} gap-3 pt-1`}>
                  {selectedItems.map((item) => {
                    const r = item.metrics.primaryYieldOrReturnPct;
                    const isWin = r != null && r > 0 && r === highestYield;
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl text-center ${
                          isWin
                            ? "bg-emerald-500/10 border border-emerald-500/30"
                            : "bg-muted/30"
                        }`}
                      >
                        <span className="text-sm font-black text-foreground tabular-nums">
                          {r != null ? `${r.toFixed(2)}%` : "—"}
                        </span>
                        {isWin && (
                          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> Highest Return
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground">Net Return After Tax</span>
                    <span className="text-[10px] text-muted-foreground block">
                      Effective take-home yield after statutory Withholding Tax (15%)
                    </span>
                  </div>
                </div>
                <div className={`grid ${gridColsClass} gap-3 pt-1`}>
                  {selectedItems.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl text-center bg-muted/30">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {item.metrics.netReturnPct != null
                          ? `${item.metrics.netReturnPct.toFixed(2)}%`
                          : item.metrics.primaryYieldOrReturnPct != null
                          ? `${(item.metrics.primaryYieldOrReturnPct * 0.85).toFixed(2)}%`
                          : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Safety &amp; Regulatory Guarantee</span>
                </div>
                <div className={`grid ${gridColsClass} gap-3 pt-1`}>
                  {selectedItems.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl text-center bg-muted/30">
                      <span className="text-xs font-semibold text-foreground flex items-center justify-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        {item.metrics.regulator || "Statutory Regulator"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cross-Asset Breakdown */}
        {category === "cross-asset" && (
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden">
            <div className="divide-y divide-border/60">
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground">Expected Annual Return</span>
                    <span className="text-[10px] text-muted-foreground block">
                      Yield, dividend, or interest rate
                    </span>
                  </div>
                </div>
                <div className={`grid ${gridColsClass} gap-3 pt-1`}>
                  {selectedItems.map((item) => {
                    const r = item.metrics.primaryYieldOrReturnPct;
                    const isWin = r != null && r > 0 && r === highestYield;
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl text-center ${
                          isWin
                            ? "bg-emerald-500/10 border border-emerald-500/30"
                            : "bg-muted/30"
                        }`}
                      >
                        <span className="text-sm font-black text-foreground tabular-nums">
                          {r != null ? `${r.toFixed(2)}% p.a.` : "—"}
                        </span>
                        {isWin && (
                          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
                            <Sparkles className="w-2.5 h-2.5" /> Highest Return
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Risk &amp; Capital Volatility</span>
                </div>
                <div className={`grid ${gridColsClass} gap-3 pt-1`}>
                  {selectedItems.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl text-center bg-muted/30">
                      <span className="text-xs font-medium text-foreground">
                        {item.metrics.riskLevel || (item.type === "stock" ? "Equity Market Risk" : "Capital Preservation")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Liquidity &amp; Withdrawal</span>
                </div>
                <div className={`grid ${gridColsClass} gap-3 pt-1`}>
                  {selectedItems.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl text-center bg-muted/30">
                      <span className="text-xs font-medium text-foreground">
                        {item.metrics.tenorOrWithdrawal || (item.type === "stock" ? "T+2 NSE Trading" : "Daily (1-3 Days)")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── ILLUSTRATIVE INVESTMENT PROJECTION CALCULATOR ─── */}
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-500" />
            <div>
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                1-Year Projected Return Comparison
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Side-by-side projected earnings based on gross rates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Principal:</span>
            <div className="flex items-center gap-1.5">
              {[50000, 100000, 500000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setInvestmentPrincipal(amt)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                    investmentPrincipal === amt
                      ? "bg-foreground text-background"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  }`}
                >
                  KES {(amt / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={`grid ${gridColsClass} gap-3 pt-1`}>
          {selectedItems.map((item) => {
            const rate = (item.metrics.primaryYieldOrReturnPct || item.metrics.dividendYieldPct || 0) / 100;
            const projectedInterest = investmentPrincipal * rate;
            const projectedTotal = investmentPrincipal + projectedInterest;

            return (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-card border border-border/70 text-center space-y-1"
              >
                <span className="text-xs font-bold text-muted-foreground truncate block">
                  {item.symbol || item.title}
                </span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums block">
                  +KES {Math.round(projectedInterest).toLocaleString()}
                </span>
                <span className="text-[10px] text-muted-foreground block tabular-nums">
                  Total: KES {Math.round(projectedTotal).toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── MODAL / POPOVER FOR SWAPPING OR ADDING ASSETS ─── */}
      {(swapSlotId !== null || showAddModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  {swapSlotId ? "Swap Comparison Asset" : "Add Instrument to Compare"}
                </h4>
                <p className="text-xs text-muted-foreground">
                  Choose from available {category} instruments
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSwapSlotId(null);
                  setShowAddModal(false);
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or symbol..."
                className="pl-9 text-xs h-9 rounded-xl"
                autoFocus
              />
            </div>

            {/* List of candidates */}
            <div className="max-h-64 overflow-y-auto divide-y divide-border/50">
              {filteredCandidates.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No matching instruments found.
                </div>
              ) : (
                filteredCandidates.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      if (swapSlotId) {
                        onSwapItem(swapSlotId, c);
                        setSwapSlotId(null);
                      } else {
                        onAddItem(c);
                        setShowAddModal(false);
                      }
                    }}
                    className="w-full p-2.5 flex items-center justify-between text-left hover:bg-muted/40 rounded-xl transition-all group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 mr-2">
                      <WatchlistAssetAvatar
                        type={c.type}
                        symbol={c.symbol}
                        name={c.title}
                        currencyCode={c.metrics.currencyCode}
                        size={32}
                        className="shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-foreground truncate group-hover:text-emerald-500">
                          {c.symbol ? `${c.symbol} · ${c.title}` : c.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">{c.subtitle}</div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-foreground tabular-nums block">
                        {c.metrics.primaryYieldOrReturnPct != null
                          ? `${c.metrics.primaryYieldOrReturnPct.toFixed(2)}%`
                          : c.metrics.priceKes != null
                          ? `KES ${c.metrics.priceKes.toFixed(2)}`
                          : "—"}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold group-hover:underline">
                        Select
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
