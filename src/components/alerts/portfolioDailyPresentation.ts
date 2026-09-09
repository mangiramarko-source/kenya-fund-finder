import type { AppNotification } from "./NotificationProvider";

const money = new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const kes = (value: number) => `KES ${money.format(value)}`;
const asNumber = (value: unknown) => typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;

export type PortfolioDailyPresentation = {
  currentPrice: string;
  target: string;
  observedAt: string | null;
};

export function portfolioDailyPresentation(notification: AppNotification): PortfolioDailyPresentation {
  const metadata = notification.metadata ?? {};
  const closingValue = asNumber(metadata.closing_value);
  const change = asNumber(metadata.change);
  const percentChange = asNumber(metadata.percent_change);
  const movement = Number.isFinite(change)
    ? `${change > 0 ? "+" : ""}${kes(change)}${Number.isFinite(percentChange) ? ` (${percentChange > 0 ? "+" : ""}${percentChange.toFixed(2)}%)` : ""}`
    : notification.message;
  return {
    currentPrice: Number.isFinite(closingValue) ? kes(closingValue) : "Portfolio update",
    target: movement,
    observedAt: notification.created_at,
  };
}
