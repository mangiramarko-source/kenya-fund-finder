import { useMemo } from "react";
import { Plus, ShieldCheck, TrendingUp, TrendingDown } from "lucide-react";
import { AssetType, ASSET_TYPE_LABELS } from "@/hooks/usePortfolio";

interface DesktopPortfolioHeroProps {
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  recentChangePct: number | null;
  currency: "KES" | "USD";
  setCurrency: (c: "KES" | "USD") => void;
  allocation: Record<AssetType, number>;
  onOpenAddModal: () => void;
  onOpenReportModal: () => void;
}

const CATEGORY_COLORS: Record<AssetType, string> = {
  mmf: "#10B981",          // Emerald Green
  stock: "#6366F1",        // Indigo Blue
  fixed_income: "#F59E0B",    // Amber / T-Bills
  fx: "#14B8A6",           // Teal
  commodity: "#6B7280",    // Slate Grey
};

const fmtCurrency = (val: number, curr: "KES" | "USD" = "KES") => {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: curr,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(val);
};

export default function DesktopPortfolioHero({
  totalValue,
  totalPnL,
  totalPnLPercent,
  recentChangePct,
  currency,
  setCurrency,
  allocation,
  onOpenAddModal,
  onOpenReportModal,
}: DesktopPortfolioHeroProps) {
  // Calculate allocation percentages
  const allocationShares = useMemo(() => {
    const total = Object.values(allocation).reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    return Object.entries(allocation)
      .filter(([, val]) => val > 0)
      .map(([type, val]) => ({
        type: type as AssetType,
        label: ASSET_TYPE_LABELS[type as AssetType] || type,
        value: val,
        pct: (val / total) * 100,
        color: CATEGORY_COLORS[type as AssetType] || "#6B7280",
      }))
      .sort((a, b) => b.value - a.value);
  }, [allocation]);

  return (
    <div className="bg-card border border-border/75 rounded-3xl p-6 shadow-sm space-y-5 dark:bg-neutral-900/90 dark:border-white/10">
      {/* Top Row: TOTAL VALUE & Currency Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          TOTAL VALUE
        </span>
        <div className="flex bg-muted rounded-full p-1 border border-border/50 text-xs font-semibold dark:bg-neutral-800">
          <button
            onClick={() => setCurrency("KES")}
            className={`px-3.5 py-1 rounded-full transition-all ${
              currency === "KES"
                ? "bg-card text-foreground shadow-xs font-bold dark:bg-neutral-700"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            KES
          </button>
          <button
            onClick={() => setCurrency("USD")}
            className={`px-3.5 py-1 rounded-full transition-all ${
              currency === "USD"
                ? "bg-card text-foreground shadow-xs font-bold dark:bg-neutral-700"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            USD
          </button>
        </div>
      </div>

      {/* Main Balance & PnL Subline */}
      <div className="flex items-baseline justify-between flex-wrap gap-4">
        <div>
          <div className="text-3xl sm:text-4xl font-black text-foreground tracking-tight tabular-nums">
            {fmtCurrency(totalValue, currency)}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            {recentChangePct != null ? (
              <span
                className={`inline-flex items-center gap-1 text-sm font-bold ${
                  recentChangePct >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {recentChangePct >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {recentChangePct >= 0 ? "+" : ""}
                {recentChangePct.toFixed(2)}% today
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-1 text-sm font-bold ${
                  totalPnL >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {totalPnL >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {totalPnL >= 0 ? "+" : ""}
                {totalPnLPercent.toFixed(2)}% total
              </span>
            )}
            <span className="text-sm text-muted-foreground font-medium">
              ({fmtCurrency(totalPnL, currency)})
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenAddModal}
            className="bg-[#00A651] hover:bg-[#008f45] active:scale-[0.99] text-white font-semibold rounded-full px-6 py-2.5 text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            Add investment
          </button>

          <button
            onClick={onOpenReportModal}
            className="border border-border/90 hover:bg-muted/50 active:scale-[0.99] text-foreground font-semibold rounded-full px-5 py-2.5 text-sm flex items-center justify-center transition-all cursor-pointer dark:border-white/20"
          >
            Report
          </button>
        </div>
      </div>

      {/* Multi-segment Allocation Bar */}
      {allocationShares.length > 0 && (
        <div className="space-y-3 pt-1">
          <div className="h-3 rounded-full overflow-hidden flex gap-0.5 bg-muted/60 dark:bg-neutral-800">
            {allocationShares.map((item) => (
              <div
                key={item.type}
                style={{ width: `${Math.max(item.pct, 2)}%`, backgroundColor: item.color }}
                className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
                title={`${item.label}: ${item.pct.toFixed(1)}%`}
              />
            ))}
          </div>

          {/* Allocation Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground font-medium">
            {allocationShares.map((item) => (
              <span key={item.type} className="inline-flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span>
                  {item.type === "fixed_income" ? "T-Bills" : item.type === "stock" ? "Stocks" : item.type.toUpperCase()}{" "}
                  <strong className="text-foreground font-semibold">{item.pct.toFixed(0)}%</strong>
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sub-note */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 pt-3 border-t border-border/40">
        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>100% mock — no real money, live Kenyan market data.</span>
      </div>
    </div>
  );
}
