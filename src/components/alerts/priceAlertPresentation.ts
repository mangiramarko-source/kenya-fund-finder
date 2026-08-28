import type { AppNotification } from "./NotificationProvider";

const money = new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const kes = (value: number) => `KES ${money.format(value)}`;

const asNumber = (value: unknown) => typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;

export type PriceAlertPresentation = {
  assetName: string;
  symbol: string | null;
  currentPrice: string | null;
  target: string | null;
  observedAt: string | null;
};

export function priceAlertPresentation(notification: AppNotification): PriceAlertPresentation {
  const metadata = notification.metadata ?? {};
  const rawTitle = notification.title.replace(/^Price alert:\s*/i, "").trim();
  const currentPrice = asNumber(metadata.triggered_price);
  const targetPrice = asNumber(metadata.target_price);
  const condition = metadata.condition === "below" ? "Below" : metadata.condition === "above" ? "Above" : null;

  return {
    assetName: notification.assetName ?? (rawTitle || "Price alert"),
    symbol: notification.assetSymbol ?? null,
    currentPrice: Number.isFinite(currentPrice) ? kes(currentPrice) : null,
    target: condition && Number.isFinite(targetPrice) ? `${condition} ${kes(targetPrice)}` : null,
    observedAt: typeof metadata.observed_at === "string" ? metadata.observed_at : notification.created_at,
  };
}
