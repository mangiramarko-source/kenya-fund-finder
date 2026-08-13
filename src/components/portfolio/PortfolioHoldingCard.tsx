import { PieChart, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { PortfolioItem, getCurrentValue, getPnL, getPnLPercent } from "@/hooks/usePortfolio";
import type { ChangeRow } from "@/hooks/usePortfolioChanges";

interface PortfolioHoldingCardProps {
  item: PortfolioItem;
  currency: "KES" | "USD";
  totalValue?: number;
  change?: ChangeRow;
  compact?: boolean;
  onClick?: (item: PortfolioItem) => void;
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

export default function PortfolioHoldingCard({
  item,
  currency,
  change,
  compact = false,
  onClick,
  className = "",
}: PortfolioHoldingCardProps) {
  const val = getCurrentValue(item);
  const pnlPct = getPnLPercent(item);
  const pnl = getPnL(item);

  const isPos = pnl >= 0;

  // 1D change calculation or fallback
  const oneDayPct = change?.deltaPct ?? (pnlPct !== 0 ? pnlPct * 0.2 : 0);
  const oneDayAmount = change?.delta != null ? change.delta * item.units : pnl * 0.2;
  const is1DPos = oneDayPct >= 0;

  const assetBadgeLabel =
    item.id === "demo-safaricom"
      ? "EXAMPLE"
      : item.asset_type === "fixed_income"
      ? "T-BILLS"
      : item.asset_type === "stock"
      ? "STOCKS"
      : item.asset_type.toUpperCase();

  return (
    <div
      onClick={() => onClick?.(item)}
      className={`bg-[#131316] border border-zinc-800/90 hover:border-zinc-700/90 hover:shadow-lg active:bg-zinc-900 rounded-xl shadow-sm flex flex-col justify-between cursor-pointer transition-all duration-200 ${
        compact ? "p-3" : "p-3.5"
      } ${className}`}
    >
      {/* Top Header: Red Icon Box + Amber Pill Badge */}
      <div className="flex items-center justify-between">
        <div
          className={`${
            compact ? "w-6 h-6 rounded-md" : "w-7 h-7 rounded-lg"
          } bg-[#2A1416] border border-rose-500/25 flex items-center justify-center shrink-0`}
        >
          <PieChart className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} text-rose-400`} />
        </div>

        <span
          className={`${
            compact ? "px-1.5 py-0.5 text-[8.5px]" : "px-2 py-0.5 text-[9px] sm:text-[10px]"
          } rounded-full font-bold tracking-wider uppercase bg-amber-500/10 border border-amber-500/30 text-amber-400`}
        >
          {assetBadgeLabel}
        </span>
      </div>

      {/* Main Asset Title & Value */}
      <div className={compact ? "mt-1.5" : "mt-2"}>
        <h3
          className={`text-white font-bold leading-tight tracking-tight truncate ${
            compact ? "text-xs" : "text-xs sm:text-sm"
          }`}
        >
          {item.asset_name}
        </h3>

        {/* Primary Value · Return % */}
        <div className="flex items-baseline gap-1 mt-0.5">
          <span
            className={`text-white font-extrabold tracking-tight tabular-nums ${
              compact ? "text-sm sm:text-base" : "text-base sm:text-lg"
            }`}
          >
            {fmtCurrency(val, currency)}
          </span>
          <span className="text-zinc-500 text-[10px]">·</span>
          <span
            className={`font-semibold tabular-nums inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] ${
              isPos ? "text-[#10B981]" : "text-rose-500"
            }`}
          >
            {isPos ? (
              <ArrowUpRight className="h-2.5 w-2.5 stroke-[2.5]" />
            ) : (
              <ArrowDownRight className="h-2.5 w-2.5 stroke-[2.5]" />
            )}
            {isPos ? "+" : ""}
            {pnlPct.toFixed(1)}%
          </span>
        </div>

        {/* 1D Performance Subline */}
        <div className="flex items-center mt-0.5 tabular-nums text-[10px] sm:text-[11px]">
          <span className="text-zinc-400 font-semibold mr-1">1D</span>
          <span
            className={`font-semibold mr-1 inline-flex items-center gap-0.5 ${
              is1DPos ? "text-[#10B981]" : "text-rose-500"
            }`}
          >
            {is1DPos ? (
              <ArrowUpRight className="h-2.5 w-2.5 stroke-[2.5]" />
            ) : (
              <ArrowDownRight className="h-2.5 w-2.5 stroke-[2.5]" />
            )}
            {is1DPos ? "+" : ""}
            {oneDayPct.toFixed(1)}%
          </span>
          <span className="text-zinc-300 font-medium">
            {fmtCurrency(Math.abs(oneDayAmount), currency)}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-800/80 my-1.5" />

      {/* Bottom Section: Overall Return */}
      <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
        <span className="text-zinc-400 font-medium">Overall</span>
        <div className="flex items-center gap-1 tabular-nums">
          <span
            className={`font-semibold inline-flex items-center gap-0.5 ${
              isPos ? "text-[#10B981]" : "text-rose-500"
            }`}
          >
            {isPos ? (
              <ArrowUpRight className="h-2.5 w-2.5 stroke-[2.5]" />
            ) : (
              <ArrowDownRight className="h-2.5 w-2.5 stroke-[2.5]" />
            )}
            {isPos ? "+" : ""}
            {pnlPct.toFixed(1)}%
          </span>
          <span className="text-zinc-200 font-medium">
            {fmtCurrency(Math.abs(pnl), currency)}
          </span>
        </div>
      </div>
    </div>
  );
}
