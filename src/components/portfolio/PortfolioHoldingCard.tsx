import { TrendingUp, TrendingDown } from "lucide-react";
import { PortfolioItem, getCurrentValue, getPnL, getPnLPercent } from "@/hooks/usePortfolio";

interface PortfolioHoldingCardProps {
  item: PortfolioItem;
  currency: "KES" | "USD";
  totalValue: number;
  onClick: (item: PortfolioItem) => void;
  className?: string;
}

const fmtCurrency = (val: number, curr: "KES" | "USD" = "KES") => {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: curr,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(val);
};

export default function PortfolioHoldingCard({ item, currency, totalValue, onClick, className = "" }: PortfolioHoldingCardProps) {
  const val = getCurrentValue(item);
  const pnlPct = getPnLPercent(item);
  const pnl = getPnL(item);
  const sharePct = totalValue > 0 ? (val / totalValue) * 100 : 0;
  const isPos = pnl >= 0;

  return (
    <div
      onClick={() => onClick(item)}
      className={`bg-card border border-border/75 hover:border-emerald-500/50 active:bg-muted/40 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3 cursor-pointer transition-all dark:bg-neutral-900/90 dark:border-white/10 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Circle Icon */}
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            isPos
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
              : "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
          }`}
        >
          {isPos ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
        </div>

        {/* Details */}
        <div className="min-w-0">
          <div className="font-bold text-foreground text-sm truncate leading-tight">
            {item.asset_name}
          </div>
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {item.asset_type === "mmf" && item.current_yield
              ? `${item.current_yield}% p.a. · Daily compounding`
              : item.ticker
              ? `${item.ticker} · ${item.units.toLocaleString()} units`
              : `${item.units.toLocaleString()} units`}
          </div>
          <span className="inline-block bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded tracking-wide uppercase mt-1.5 border border-border/40 dark:bg-neutral-800">
            {item.asset_type === "fixed_income"
              ? "T-BILLS"
              : item.asset_type === "stock"
              ? "STOCKS"
              : item.asset_type.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Right Values */}
      <div className="text-right shrink-0">
        <div className="font-bold text-foreground text-sm tabular-nums">
          {fmtCurrency(val, currency)}
        </div>
        <div
          className={`text-xs font-semibold tabular-nums mt-0.5 ${
            isPos
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {isPos ? "+" : ""}
          {pnlPct.toFixed(2)}%
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {sharePct.toFixed(1)}% of portfolio
        </div>
      </div>
    </div>
  );
}
