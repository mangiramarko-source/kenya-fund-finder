import { ArrowDownRight, ArrowUpRight, Minus, PieChart } from "lucide-react";
import { PortfolioItem, getCurrentValue, getPnL, getPnLPercent } from "@/hooks/usePortfolio";
import type { ChangeRow } from "@/hooks/usePortfolioChanges";

interface PortfolioHoldingCardProps {
  item: PortfolioItem;
  currency: "KES" | "USD";
  totalValue?: number;
  change?: ChangeRow;
  compact?: boolean;
  presentation?: "mobile" | "desktop";
  onClick?: (item: PortfolioItem) => void;
  className?: string;
}

type PerformanceDirection = "gain" | "loss" | "flat";

export interface OneDayPerformance {
  available: boolean;
  percent: number | null;
  amount: number | null;
}

const fmtCurrency = (val: number, curr: "KES" | "USD" = "KES") =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: curr, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(val);

const directionFor = (value: number): PerformanceDirection => value > 0 ? "gain" : value < 0 ? "loss" : "flat";

const toneFor = (direction: PerformanceDirection) =>
  direction === "gain" ? "text-[#10B981]" : direction === "loss" ? "text-rose-500" : "text-zinc-300";

/** Only price quotes can truthfully become a holding's monetary 1D result. */
export const holdingOneDayPerformance = (item: PortfolioItem, change?: ChangeRow): OneDayPerformance => {
  if (
    change?.unit !== "KES" || change.delta == null || change.deltaPct == null ||
    !Number.isFinite(change.delta) || !Number.isFinite(change.deltaPct)
  ) return { available: false, percent: null, amount: null };

  return { available: true, percent: change.deltaPct, amount: change.delta * item.units };
};

function PerformanceValue({ value, direction }: { value: number; direction: PerformanceDirection }) {
  const Icon = direction === "gain" ? ArrowUpRight : direction === "loss" ? ArrowDownRight : Minus;
  return (
    <span className={`font-semibold tabular-nums inline-flex items-center gap-0.5 ${toneFor(direction)}`}>
      <Icon className="h-3.5 w-3.5 stroke-[2.5]" aria-hidden="true" />
      {direction === "gain" ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

export default function PortfolioHoldingCard({
  item, currency, change, compact = false, presentation, onClick, className = "",
}: PortfolioHoldingCardProps) {
  const val = getCurrentValue(item);
  const pnlPct = getPnLPercent(item);
  const pnl = getPnL(item);
  const overallDirection = directionFor(pnl);
  const oneDay = holdingOneDayPerformance(item, change);
  const oneDayDirection = oneDay.percent == null ? "flat" : directionFor(oneDay.percent);
  const mobilePresentation = presentation === "mobile" || (!presentation && !compact);
  const assetBadgeLabel = item.id === "demo-safaricom" ? "EXAMPLE" : item.asset_type === "fixed_income" ? "T-BILLS" : item.asset_type === "stock" ? "STOCKS" : item.asset_type.toUpperCase();

  return (
    <div
      onClick={() => onClick?.(item)}
      className={`bg-[#131316] border border-zinc-800/90 hover:border-zinc-700/90 hover:shadow-lg active:bg-zinc-900 flex flex-col justify-between cursor-pointer transition-all duration-200 ${mobilePresentation ? "w-[245px] min-h-[135px] shrink-0 snap-start rounded-xl p-3" : compact ? "rounded-xl p-3" : "rounded-xl p-3.5"} ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className={`${mobilePresentation ? "w-7 h-7 rounded-lg" : compact ? "w-6 h-6 rounded-md" : "w-7 h-7 rounded-lg"} bg-[#2A1416] border border-rose-500/25 flex items-center justify-center shrink-0`}>
          <PieChart className={`${mobilePresentation ? "h-3.5 w-3.5" : compact ? "h-3 w-3" : "h-3.5 w-3.5"} text-rose-400`} />
        </div>
        <span className={`${mobilePresentation ? "px-2 py-0.5 text-[10px]" : compact ? "px-1.5 py-0.5 text-[8.5px]" : "px-2 py-0.5 text-[9px] sm:text-[10px]"} rounded-full font-bold tracking-wider uppercase bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0`}>
          {assetBadgeLabel}
        </span>
      </div>

      <div className={mobilePresentation ? "mt-2" : compact ? "mt-1.5" : "mt-2"}>
        <h3 className={`text-white font-bold leading-tight tracking-tight truncate ${mobilePresentation ? "text-sm" : compact ? "text-xs" : "text-xs sm:text-sm"}`}>{item.asset_name}</h3>
        <div className={`flex items-baseline flex-wrap ${mobilePresentation ? "gap-1 mt-1" : "gap-1 mt-0.5"}`}>
          <span className={`text-white font-extrabold tracking-tight tabular-nums ${mobilePresentation ? "text-lg" : compact ? "text-sm sm:text-base" : "text-base sm:text-lg"}`}>{fmtCurrency(val, currency)}</span>
          {!mobilePresentation && <span className="text-zinc-500 text-[10px]">·</span>}
          <span data-testid="overall-return-summary" data-direction={overallDirection} className={mobilePresentation ? "text-[11px]" : "text-[10px] sm:text-[11px]"}>
            <PerformanceValue value={pnlPct} direction={overallDirection} />
          </span>
        </div>
      </div>

      <div className={`border-t border-zinc-800/80 ${mobilePresentation ? "my-2.5" : "my-1.5"}`} />
      <div className={mobilePresentation ? "space-y-2" : "space-y-1.5"}>
        <div className={`flex items-center justify-between gap-3 ${mobilePresentation ? "text-xs" : "text-[10px] sm:text-[11px]"}`}>
          <span className="text-zinc-400 font-medium">1D</span>
          {oneDay.available && oneDay.percent != null && oneDay.amount != null ? (
            <div data-testid="one-day-performance" data-direction={oneDayDirection} className="flex items-center gap-1.5 tabular-nums">
              <PerformanceValue value={oneDay.percent} direction={oneDayDirection} />
              <span className="text-zinc-200 font-medium">{fmtCurrency(Math.abs(oneDay.amount), currency)}</span>
            </div>
          ) : <span aria-label="No verified 1-day performance data" className="text-zinc-500 font-medium">Unavailable</span>}
        </div>
        <div className={`flex items-center justify-between gap-3 ${mobilePresentation ? "text-xs" : "text-[10px] sm:text-[11px]"}`}>
          <span className="text-zinc-400 font-medium">Overall</span>
          <div data-testid="overall-performance" data-direction={overallDirection} className="flex items-center gap-1.5 tabular-nums">
            <PerformanceValue value={pnlPct} direction={overallDirection} />
            <span className="text-zinc-200 font-medium">{fmtCurrency(Math.abs(pnl), currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
