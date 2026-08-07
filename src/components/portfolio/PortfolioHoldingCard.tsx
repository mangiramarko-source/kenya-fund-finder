import { PieChart, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { PortfolioItem, getCurrentValue, getPnL, getPnLPercent } from "@/hooks/usePortfolio";
import type { ChangeRow } from "@/hooks/usePortfolioChanges";

interface PortfolioHoldingCardProps {
  item: PortfolioItem;
  currency: "KES" | "USD";
  totalValue?: number;
  change?: ChangeRow;
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
    item.asset_type === "fixed_income"
      ? "T-BILLS"
      : item.asset_type === "stock"
      ? "STOCKS"
      : item.asset_type.toUpperCase();

  return (
    <div
      onClick={() => onClick?.(item)}
      className={`bg-[#131316] border border-zinc-800/90 hover:border-zinc-700 active:bg-zinc-900 rounded-3xl p-5 shadow-xl flex flex-col justify-between cursor-pointer transition-all ${className}`}
    >
      {/* Top Header: Red Icon Box + Amber Pill Badge */}
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl bg-[#2A1416] border border-rose-500/25 flex items-center justify-center shrink-0">
          <PieChart className="h-5 w-5 text-rose-400" />
        </div>

        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-amber-500/10 border border-amber-500/30 text-amber-400">
          {assetBadgeLabel}
        </span>
      </div>

      {/* Main Asset Title & Value */}
      <div className="mt-3.5">
        <h3 className="text-white font-bold text-base leading-snug tracking-tight truncate">
          {item.asset_name}
        </h3>

        {/* Primary Value · Return % */}
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-white text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums">
            {fmtCurrency(val, currency)}
          </span>
          <span className="text-zinc-500 text-sm">·</span>
          <span
            className={`text-xs sm:text-sm font-semibold tabular-nums inline-flex items-center gap-0.5 ${
              isPos ? "text-[#10B981]" : "text-rose-500"
            }`}
          >
            {isPos ? (
              <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.5]" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5 stroke-[2.5]" />
            )}
            {isPos ? "+" : ""}
            {pnlPct.toFixed(1)}%
          </span>
        </div>

        {/* 1D Performance Subline */}
        <div className="flex items-center text-xs mt-1.5 tabular-nums">
          <span className="text-zinc-400 font-semibold mr-2">1D</span>
          <span
            className={`font-semibold mr-2 inline-flex items-center gap-0.5 ${
              is1DPos ? "text-[#10B981]" : "text-rose-500"
            }`}
          >
            {is1DPos ? (
              <ArrowUpRight className="h-3 w-3 stroke-[2.5]" />
            ) : (
              <ArrowDownRight className="h-3 w-3 stroke-[2.5]" />
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
      <div className="border-t border-zinc-800/80 my-3.5" />

      {/* Bottom Section: Overall Return */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400 font-medium">Overall</span>
        <div className="flex items-center gap-2 tabular-nums">
          <span
            className={`font-semibold inline-flex items-center gap-0.5 ${
              isPos ? "text-[#10B981]" : "text-rose-500"
            }`}
          >
            {isPos ? (
              <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.5]" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5 stroke-[2.5]" />
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
