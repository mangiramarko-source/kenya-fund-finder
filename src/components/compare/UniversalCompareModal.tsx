import { X, GitCompareArrows, Sparkles, Check, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useUniversalCompare, type CompareItem } from "@/hooks/useUniversalCompare";

const getGridColsClass = (count: number) => {
  if (count === 2) return "grid-cols-2";
  if (count === 3) return "grid-cols-3";
  if (count === 4) return "grid-cols-4";
  return "grid-cols-1";
};

export const UniversalCompareModal = () => {
  const { selected, category, isOpen, setIsOpen, remove, clear } = useUniversalCompare();

  if (!isOpen || selected.length === 0 || !category) return null;

  // ─── Metric Extractors per Category ───
  const renderFundMetrics = (items: CompareItem[]) => {
    // Find highest annual yield
    const highestYield = Math.max(...items.map((i) => Number(i.data.annual_yield) || 0));
    // Find lowest management fee (> 0)
    const fees = items.map((i) => Number(i.data.management_fee) || 0).filter((f) => f > 0);
    const lowestFee = fees.length > 0 ? Math.min(...fees) : null;

    const rows: Array<{
      label: string;
      sublabel?: string;
      getValue: (i: CompareItem) => React.ReactNode;
      isWinner?: (i: CompareItem) => boolean;
      winnerBadge?: string;
    }> = [
      {
        label: "Annual Effective Yield",
        sublabel: "Net of fund management fees",
        getValue: (i) => (
          <span className="text-base font-black text-foreground tabular-nums">
            {i.data.annual_yield}%
          </span>
        ),
        isWinner: (i) => Number(i.data.annual_yield) === highestYield && highestYield > 0,
        winnerBadge: "Highest Yield",
      },
      {
        label: "Daily Yield",
        getValue: (i) => (
          <span className="font-semibold text-foreground tabular-nums">
            {i.data.daily_yield ? `${i.data.daily_yield}%` : "—"}
          </span>
        ),
      },
      {
        label: "Annual Mgmt Fee",
        getValue: (i) => (
          <span className="font-semibold text-foreground tabular-nums">
            {i.data.management_fee ? `${i.data.management_fee}% p.a.` : "—"}
          </span>
        ),
        isWinner: (i) => lowestFee !== null && Number(i.data.management_fee) === lowestFee,
        winnerBadge: "Lowest Fee",
      },
      {
        label: "Minimum Initial Deposit",
        getValue: (i) => (
          <span className="font-semibold text-foreground tabular-nums">
            KES {Number(i.data.minimum_investment || 0).toLocaleString()}
          </span>
        ),
      },
      {
        label: "Withdrawal Settlement",
        getValue: (i) => (
          <span className="font-semibold text-foreground">
            {i.data.withdrawal_time || "1-3 days"}
          </span>
        ),
      },
      {
        label: "CMA Regulated Scheme",
        getValue: () => (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" /> Licensed
          </span>
        ),
      },
    ];

    return (
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.label} className="rounded-2xl border border-border/70 bg-card p-3.5 space-y-2 dark:bg-neutral-900/80">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-foreground block">{row.label}</span>
                {row.sublabel && <span className="text-[10px] text-muted-foreground">{row.sublabel}</span>}
              </div>
            </div>
            <div className={`grid ${getGridColsClass(items.length)} gap-2 pt-1 border-t border-border/40`}>
              {items.map((item) => {
                const winner = row.isWinner?.(item);
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl p-2.5 text-center transition-all ${
                      winner
                        ? "bg-emerald-500/10 border border-emerald-500/30 dark:bg-emerald-500/15"
                        : "bg-muted/40"
                    }`}
                  >
                    <div className="text-[11px] font-semibold text-muted-foreground truncate mb-1">
                      {item.subtitle || item.title}
                    </div>
                    <div>{row.getValue(item)}</div>
                    {winner && row.winnerBadge && (
                      <span className="inline-flex items-center gap-0.5 mt-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <Sparkles className="h-2.5 w-2.5" /> {row.winnerBadge}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderStockMetrics = (items: CompareItem[]) => {
    // Find best P/E ratio (> 0)
    const validPes = items.map((i) => Number(i.data.pe_ratio) || 0).filter((p) => p > 0);
    const bestPe = validPes.length > 0 ? Math.min(...validPes) : null;

    // Find highest Dividend Yield
    const divYields = items.map((i) => Number(i.data.dividend_yield) || 0).filter((d) => d > 0);
    const highestDiv = divYields.length > 0 ? Math.max(...divYields) : null;

    const rows: Array<{
      label: string;
      sublabel?: string;
      getValue: (i: CompareItem) => React.ReactNode;
      isWinner?: (i: CompareItem) => boolean;
      winnerBadge?: string;
    }> = [
      {
        label: "Share Price & Movement",
        getValue: (i) => {
          const chg = Number(i.data.day_change_percent) || 0;
          const isUp = chg > 0;
          const isFlat = chg === 0;
          const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
          const colorClass = isFlat
            ? "text-muted-foreground"
            : isUp
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400";
          return (
            <div>
              <span className="text-base font-black text-foreground tabular-nums">
                KSh {Number(i.data.price || 0).toFixed(2)}
              </span>
              <div className={`flex items-center justify-center gap-0.5 text-xs font-bold mt-0.5 ${colorClass}`}>
                <Icon className="h-3 w-3" />
                <span>{chg > 0 ? `+${chg.toFixed(2)}%` : `${chg.toFixed(2)}%`}</span>
              </div>
            </div>
          );
        },
      },
      {
        label: "P/E Valuation Ratio",
        sublabel: "Lower indicates more earnings per share value",
        getValue: (i) => (
          <span className="font-semibold text-foreground tabular-nums">
            {i.data.pe_ratio ? `${Number(i.data.pe_ratio).toFixed(1)}x` : "—"}
          </span>
        ),
        isWinner: (i) => bestPe !== null && Number(i.data.pe_ratio) === bestPe,
        winnerBadge: "Best Value P/E",
      },
      {
        label: "Dividend Yield",
        sublabel: "Annual cash payout ratio",
        getValue: (i) => (
          <span className="font-semibold text-foreground tabular-nums">
            {i.data.dividend_yield ? `${Number(i.data.dividend_yield).toFixed(1)}%` : "0.0%"}
          </span>
        ),
        isWinner: (i) => highestDiv !== null && Number(i.data.dividend_yield) === highestDiv,
        winnerBadge: "Top Dividend",
      },
      {
        label: "52-Week Range",
        getValue: (i) => {
          const low = i.data.year_low ? Number(i.data.year_low) : null;
          const high = i.data.year_high ? Number(i.data.year_high) : null;
          if (!low || !high) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="text-xs font-semibold tabular-nums text-foreground">
              {low.toFixed(2)} – {high.toFixed(2)}
            </span>
          );
        },
      },
      {
        label: "Sector",
        getValue: (i) => (
          <span className="text-xs font-medium text-muted-foreground">
            {i.data.sector || "Equities"}
          </span>
        ),
      },
    ];

    return (
      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.label} className="rounded-2xl border border-border/70 bg-card p-3.5 space-y-2 dark:bg-neutral-900/80">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-foreground block">{row.label}</span>
                {row.sublabel && <span className="text-[10px] text-muted-foreground">{row.sublabel}</span>}
              </div>
            </div>
            <div className={`grid ${getGridColsClass(items.length)} gap-2 pt-1 border-t border-border/40`}>
              {items.map((item) => {
                const winner = row.isWinner?.(item);
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl p-2.5 text-center transition-all ${
                      winner
                        ? "bg-emerald-500/10 border border-emerald-500/30 dark:bg-emerald-500/15"
                        : "bg-muted/40"
                    }`}
                  >
                    <div className="text-[11px] font-semibold text-muted-foreground truncate mb-1">
                      {item.subtitle || item.title}
                    </div>
                    <div>{row.getValue(item)}</div>
                    {winner && row.winnerBadge && (
                      <span className="inline-flex items-center gap-0.5 mt-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <Sparkles className="h-2.5 w-2.5" /> {row.winnerBadge}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCurrencyMetrics = (items: CompareItem[]) => {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-3 dark:bg-neutral-900/80">
          <div className="text-xs font-bold text-foreground">Exchange Rate against KES</div>
          <div className={`grid ${getGridColsClass(items.length)} gap-2 pt-1 border-t border-border/40`}>
            {items.map((item) => {
              const currentRate = Number(item.data.rate || 0);
              const prevRate = item.data.previous_rate != null ? Number(item.data.previous_rate) : null;
              const diff = prevRate != null ? currentRate - prevRate : null;
              const pct = prevRate != null && prevRate !== 0 ? (diff! / prevRate) * 100 : null;
              return (
                <div key={item.id} className="rounded-xl bg-muted/40 p-3 text-center space-y-1">
                  <span className="text-xs font-bold text-muted-foreground block">
                    {item.subtitle || item.title}
                  </span>
                  <span className="text-lg font-black text-foreground tabular-nums block">
                    KSh {currentRate.toFixed(2)}
                  </span>
                  {pct != null && (
                    <span
                      className={`text-[11px] font-bold tabular-nums block ${
                        pct > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : pct < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {pct > 0 ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`}
                    </span>
                  )}
                  {prevRate != null && (
                    <span className="text-[10px] text-muted-foreground block">
                      Prev: KSh {prevRate.toFixed(2)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderCommodityMetrics = (items: CompareItem[]) => {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-3 dark:bg-neutral-900/80">
          <div className="text-xs font-bold text-foreground">Global Spot Prices</div>
          <div className={`grid ${getGridColsClass(items.length)} gap-2 pt-1 border-t border-border/40`}>
            {items.map((item) => {
              const price = Number(item.data.price || 0);
              const prevPrice = item.data.previous_price != null ? Number(item.data.previous_price) : null;
              const diff = prevPrice != null ? price - prevPrice : null;
              const pct = prevPrice != null && prevPrice !== 0 ? (diff! / prevPrice) * 100 : null;
              return (
                <div key={item.id} className="rounded-xl bg-muted/40 p-3 text-center space-y-1">
                  <span className="text-xs font-bold text-muted-foreground block">
                    {item.title}
                  </span>
                  <span className="text-lg font-black text-foreground tabular-nums block">
                    ${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {pct != null && (
                    <span
                      className={`text-[11px] font-bold tabular-nums block ${
                        pct > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : pct < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {pct > 0 ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground block">
                    {item.data.unit || "per unit"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent
        side="bottom"
        hideCloseButton
        className="rounded-t-3xl border-border max-h-[88vh] overflow-y-auto px-4 sm:px-6 pt-4 pb-8"
      >
        <SheetHeader className="text-left pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <GitCompareArrows className="h-4 w-4" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold text-foreground">
                  Side-by-Side {category === "fund" ? "Fund" : category === "stock" ? "Stock" : category === "currency" ? "FX" : "Commodity"} Comparison
                </SheetTitle>
                <p className="text-xs text-muted-foreground">
                  Comparing {selected.length} peer {selected.length === 1 ? "asset" : "assets"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={clear}
                className="text-xs text-muted-foreground hover:text-foreground h-8"
              >
                Clear
              </Button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label="Close comparison sheet"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Header Row of Competing Assets */}
          <div className={`grid ${getGridColsClass(selected.length)} gap-2 pt-3`}>
            {selected.map((item) => (
              <div
                key={item.id}
                className="relative rounded-2xl border border-border/80 bg-muted/30 p-2.5 text-center"
              >
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center"
                  aria-label={`Remove ${item.title}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
                <div className="font-extrabold text-foreground text-xs sm:text-sm truncate pr-3">
                  {item.title}
                </div>
                <div className="text-[11px] text-muted-foreground font-semibold truncate">
                  {item.subtitle}
                </div>
              </div>
            ))}
          </div>
        </SheetHeader>

        {/* Comparison Metrics */}
        <div className="mt-4">
          {category === "fund" && renderFundMetrics(selected)}
          {category === "stock" && renderStockMetrics(selected)}
          {category === "currency" && renderCurrencyMetrics(selected)}
          {category === "commodity" && renderCommodityMetrics(selected)}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default UniversalCompareModal;
