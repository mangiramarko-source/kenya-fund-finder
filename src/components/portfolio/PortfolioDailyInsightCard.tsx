import { Clock3, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { AppNotification } from "@/components/alerts/NotificationProvider";
import type { PortfolioLiveMovement } from "@/hooks/usePortfolioLiveMovement";

type InsightStatus = "gain" | "loss" | "unchanged" | "baseline";

export type PortfolioDailyInsight = {
  status: InsightStatus;
  title: string;
  amount: string | null;
  percentage: string | null;
  explanation: string;
  mover: string;
  updatedAt: string;
  label: "Live estimate" | "Daily close" | "Tracking";
};

const money = new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const kes = (value: number) => `KES ${money.format(value)}`;
const asNumber = (value: unknown) => typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;

function updateTime(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Last market update unavailable";
  return `Last market update: ${new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  }).format(new Date(timestamp))} EAT`;
}

export function portfolioDailyInsight(notification: AppNotification | null | undefined): PortfolioDailyInsight {
  if (!notification || notification.type !== "portfolio_daily") return {
    status: "baseline", title: "Portfolio movement is building", amount: null, percentage: null,
    explanation: "A 24-hour comparison will appear as soon as enough market data is available for your unchanged holdings.",
    mover: "Your verified daily close is delivered on weekdays at 5:15 PM EAT.", updatedAt: "No 24-hour baseline yet", label: "Tracking",
  };

  const metadata = notification.metadata ?? {};
  const opening = asNumber(metadata.opening_value);
  const closing = asNumber(metadata.closing_value);
  const change = asNumber(metadata.change);
  const percentage = asNumber(metadata.percent_change);
  if (![opening, closing, change].every(Number.isFinite)) return portfolioDailyInsight(null);
  const status: InsightStatus = change > 0.005 ? "gain" : change < -0.005 ? "loss" : "unchanged";
  const movers = Array.isArray(metadata.movers) ? metadata.movers : [];
  const moverName = typeof movers[0] === "object" && movers[0] !== null && typeof (movers[0] as Record<string, unknown>).asset_name === "string"
    ? (movers[0] as Record<string, unknown>).asset_name as string : null;
  const mover = status === "unchanged"
    ? "No material market movement was recorded across your holdings."
    : moverName ? `${moverName} had the largest effect on today’s move.` : "Comparable holdings drove today’s market movement.";
  return {
    status,
    title: status === "gain" ? "Your portfolio gained today" : status === "loss" ? "Your portfolio declined today" : "Your portfolio was unchanged today",
    amount: `${change > 0 ? "+" : change < 0 ? "−" : ""}${kes(Math.abs(change))}`,
    percentage: Number.isFinite(percentage) ? `${percentage > 0 ? "+" : ""}${percentage.toFixed(2)}%` : null,
    explanation: `Your comparable holdings moved from ${kes(opening)} to ${kes(closing)}.`, mover, updatedAt: updateTime(notification.created_at), label: "Daily close",
  };
}

function liveInsight(movement: PortfolioLiveMovement): PortfolioDailyInsight {
  const status: InsightStatus = movement.change > 0.005 ? "gain" : movement.change < -0.005 ? "loss" : "unchanged";
  const mover = movement.movers[0];
  return {
    status,
    label: "Live estimate",
    title: status === "gain" ? "Your portfolio is up over the last 24 hours" : status === "loss" ? "Your portfolio is down over the last 24 hours" : "Your portfolio is unchanged over the last 24 hours",
    amount: `${movement.change > 0 ? "+" : movement.change < 0 ? "−" : ""}${kes(Math.abs(movement.change))}`,
    percentage: `${movement.percentChange > 0 ? "+" : ""}${movement.percentChange.toFixed(2)}%`,
    explanation: `${movement.comparedHoldings} unchanged ${movement.comparedHoldings === 1 ? "holding" : "holdings"} moved from ${kes(movement.openingValue)} to ${kes(movement.closingValue)}.`,
    mover: status === "unchanged" ? "No material market movement was recorded across comparable holdings." : mover ? `${mover.assetName} has the largest effect on this estimate.` : "Comparable holdings are driving this estimate.",
    updatedAt: updateTime(movement.observedAt),
  };
}

function isTodayDailyClose(notification: AppNotification | null | undefined) {
  if (!notification || notification.type !== "portfolio_daily") return false;
  const snapshotDate = notification.metadata?.snapshot_date;
  // Daily summaries created before snapshot_date was added remain valid closes.
  if (typeof snapshotDate !== "string") return true;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter(({ type }) => type !== "literal").map(({ type, value }) => [type, value]));
  const today = `${values.year}-${values.month}-${values.day}`;
  return snapshotDate === today;
}

export function portfolioInsight(notification: AppNotification | null | undefined, movement?: PortfolioLiveMovement | null): PortfolioDailyInsight {
  if (isTodayDailyClose(notification)) return portfolioDailyInsight(notification);
  return movement ? liveInsight(movement) : portfolioDailyInsight(null);
}

export default function PortfolioDailyInsightCard({ notification, movement, showUpdatedAt = true }: { notification?: AppNotification | null; movement?: PortfolioLiveMovement | null; showUpdatedAt?: boolean }) {
  const insight = portfolioInsight(notification, movement);
  const gain = insight.status === "gain";
  const loss = insight.status === "loss";
  const Icon = gain ? TrendingUp : loss ? TrendingDown : Minus;
  const tone = gain ? "text-emerald-600 dark:text-emerald-400" : loss ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground";
  const circle = gain ? "bg-emerald-600" : loss ? "bg-rose-600" : "bg-muted-foreground";
  const border = gain ? "border-emerald-500/20 dark:border-emerald-400/20" : loss ? "border-rose-500/20 dark:border-rose-400/20" : "border-border";

  return <article aria-label="Portfolio daily insight" className={`mt-4 rounded-[28px] border bg-card p-5 shadow-sm dark:bg-[#101713] ${border}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-4">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-white ${circle}`}><Icon className="h-6 w-6" aria-hidden="true" /></span>
        <div className="min-w-0"><p className={`text-sm font-black uppercase tracking-wide ${tone}`}>{insight.label}</p><h2 className="mt-0.5 text-xl font-bold tracking-tight text-foreground">{insight.title}</h2></div>
      </div>
      {insight.percentage && <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-black ${border} ${tone}`}><Icon className="h-3.5 w-3.5" />{insight.percentage}</span>}
    </div>
    {insight.amount && <p className={`mt-6 text-4xl font-black tracking-tight tabular-nums ${tone}`}>{insight.amount}</p>}
    <p className="mt-4 text-base leading-relaxed text-muted-foreground">{insight.explanation}</p>
    <div className="mt-5 border-t border-border/70 pt-4">
      <p className="flex items-start gap-3 text-base font-semibold leading-relaxed text-foreground"><span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-white ${circle}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>{insight.mover}</p>
      {showUpdatedAt && <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-muted-foreground"><Clock3 className="h-4 w-4" />{insight.updatedAt}</p>}
    </div>
  </article>;
}
