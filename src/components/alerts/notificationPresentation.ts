import type { AppNotification } from "./NotificationProvider";
import { portfolioDailyPresentation } from "./portfolioDailyPresentation";
import { priceAlertPresentation } from "./priceAlertPresentation";

export type NotificationCategory = "alerts" | "portfolio" | "market";
export type NotificationDirection = "up" | "down" | "neutral";

export interface UnifiedNotificationPresentation {
  category: NotificationCategory;
  categoryBadgeLabel: string;
  direction: NotificationDirection;
  headline: string;
  subline: string;
  primaryMetric?: string;
  secondaryPill?: string;
  observedAt: string | null;
  destination: string;
  ctaLabel: string;
  symbol: string | null;
}

const money = new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const kes = (value: number) => `KES ${money.format(value)}`;
const asNumber = (value: unknown) =>
  typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;

function safeInternalRoute(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.startsWith("/") && !trimmed.startsWith("//") ? trimmed : null;
}

export function formatNotificationRelativeTime(value: string | null, fallback = "Recently"): string {
  if (!value) return fallback;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return fallback;
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h ago`;
  if (minutes < 10_080) return `${Math.floor(minutes / 1_440)}d ago`;
  return new Date(timestamp).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

export function notificationCategory(type: string): NotificationCategory {
  if (type === "price_alert" || type === "watchlist_mover") return "alerts";
  if (type === "portfolio_daily") return "portfolio";
  return "market";
}

export function notificationPresentation(notification: AppNotification): UnifiedNotificationPresentation {
  const metadata = notification.metadata ?? {};
  const explicitRoute = safeInternalRoute(metadata.route);

  if (notification.type === "price_alert") {
    const details = priceAlertPresentation(notification);
    return {
      category: "alerts",
      categoryBadgeLabel: "Price Alert",
      direction: "neutral",
      headline: details.assetName,
      subline: details.target ?? notification.message,
      primaryMetric: details.currentPrice ?? undefined,
      observedAt: details.observedAt,
      destination: explicitRoute ?? "/alerts",
      ctaLabel: "View alert",
      symbol: details.symbol,
    };
  }

  if (notification.type === "portfolio_daily") {
    const details = portfolioDailyPresentation(notification);
    const change = asNumber(metadata.change);
    const isLoss = Number.isFinite(change) && change < -0.005;
    const isFlat = Number.isFinite(change) && Math.abs(change) <= 0.005;

    return {
      category: "portfolio",
      categoryBadgeLabel: "Portfolio Close",
      direction: isLoss ? "down" : isFlat ? "neutral" : "up",
      headline: notification.title || "Portfolio update",
      subline: details.target || notification.message,
      primaryMetric: details.currentPrice,
      observedAt: details.observedAt,
      destination: explicitRoute ?? "/portfolio",
      ctaLabel: "View portfolio",
      symbol: "PORT",
    };
  }

  if (notification.type === "watchlist_mover") {
    const symbol = notification.assetSymbol ?? (typeof metadata.symbol === "string" ? metadata.symbol : null);
    const assetName = notification.assetName ?? (typeof metadata.asset_name === "string" ? metadata.asset_name : notification.title);
    const price = asNumber(metadata.price);
    const pct = asNumber(metadata.day_change_percent);
    const isDown = Number.isFinite(pct) && pct < 0;
    const pctLabel = Number.isFinite(pct) ? `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%` : undefined;
    const stockRoute = symbol ? `/stocks/${encodeURIComponent(symbol)}` : "/watchlist";

    return {
      category: "alerts",
      categoryBadgeLabel: "Watchlist Mover",
      direction: isDown ? "down" : "up",
      headline: symbol && !assetName.includes(`(${symbol})`) ? `${assetName} (${symbol})` : assetName,
      subline: "NSE daily move",
      primaryMetric: Number.isFinite(price) ? kes(price) : pctLabel,
      secondaryPill: Number.isFinite(price) ? pctLabel : undefined,
      observedAt: typeof metadata.observed_at === "string" ? metadata.observed_at : notification.created_at,
      destination: explicitRoute ?? stockRoute,
      ctaLabel: "View stock",
      symbol,
    };
  }

  if (notification.type === "mmf_yield_shift") {
    const assetName = notification.assetName ?? (typeof metadata.asset_name === "string" ? metadata.asset_name : notification.title);
    const slug = typeof metadata.slug === "string" ? metadata.slug : null;
    const annualYield = asNumber(metadata.annual_yield);
    const deltaBps = asNumber(metadata.delta_bps);
    const isDown = Number.isFinite(deltaBps) && deltaBps < 0;
    const bpsLabel = Number.isFinite(deltaBps) ? `${deltaBps > 0 ? "+" : ""}${Math.round(deltaBps)} bps` : undefined;
    const fundRoute = slug ? `/compare/${encodeURIComponent(slug)}` : "/funds";

    return {
      category: "market",
      categoryBadgeLabel: "MMF Yield",
      direction: isDown ? "down" : "up",
      headline: assetName,
      subline: "Annual yield updated",
      primaryMetric: Number.isFinite(annualYield) ? `${annualYield.toFixed(2)}%` : undefined,
      secondaryPill: bpsLabel,
      observedAt: notification.created_at,
      destination: explicitRoute ?? fundRoute,
      ctaLabel: "View fund",
      symbol: "MMF",
    };
  }

  if (notification.type === "tbill_auction") {
    const rate91 = asNumber(metadata.rate_91);
    const rate182 = asNumber(metadata.rate_182);
    const rate364 = asNumber(metadata.rate_364);
    const otherTenors = [
      Number.isFinite(rate182) ? `182d: ${rate182.toFixed(2)}%` : null,
      Number.isFinite(rate364) ? `364d: ${rate364.toFixed(2)}%` : null,
    ].filter(Boolean);

    return {
      category: "market",
      categoryBadgeLabel: "CBK T-Bills",
      direction: "neutral",
      headline:
        (notification.title || "Weekly Auction Results").replace(/^CBK T-Bill\s+/i, "") ||
        "Weekly Auction Results",
      subline: otherTenors.length > 0 ? otherTenors.join(" · ") : notification.message,
      primaryMetric: Number.isFinite(rate91) ? `${rate91.toFixed(2)}%` : undefined,
      secondaryPill: Number.isFinite(rate91) ? "91-Day" : undefined,
      observedAt: notification.created_at,
      destination: explicitRoute ?? "/treasury",
      ctaLabel: "View T-Bills",
      symbol: "CBK",
    };
  }

  if (notification.type === "market_close_brief") {
    const gainers = asNumber(metadata.gainers_count);
    const losers = asNumber(metadata.losers_count);
    const usdRate = asNumber(metadata.usd_rate);
    const breadth = typeof metadata.breadth_direction === "string" ? metadata.breadth_direction : null;
    const subline = Number.isFinite(gainers) && Number.isFinite(losers)
      ? `${gainers} gainers · ${losers} losers`
      : notification.message;

    return {
      category: "market",
      categoryBadgeLabel: "Market Brief",
      direction: breadth === "bearish" || breadth === "down" ? "down" : breadth === "bullish" || breadth === "up" ? "up" : "neutral",
      headline: notification.title || "NSE Market Close Brief",
      subline,
      primaryMetric: Number.isFinite(usdRate) ? `${usdRate.toFixed(2)} USD` : undefined,
      secondaryPill: breadth ? breadth.toUpperCase() : undefined,
      observedAt: notification.created_at,
      destination: explicitRoute ?? "/",
      ctaLabel: "Open overview",
      symbol: "NSE",
    };
  }

  if (notification.type === "admin_broadcast") {
    return {
      category: "market",
      categoryBadgeLabel: "KFF Update",
      direction: "neutral",
      headline: notification.title || "KenyaFundFinder Update",
      subline: notification.message,
      observedAt: notification.created_at,
      destination: explicitRoute ?? "/updates",
      ctaLabel: "Read update",
      symbol: "KFF",
    };
  }

  return {
    category: "market",
    categoryBadgeLabel: "Update",
    direction: "neutral",
    headline: notification.title || "Market notification",
    subline: notification.message,
    observedAt: notification.created_at,
    destination: explicitRoute ?? "/alerts",
    ctaLabel: "View",
    symbol: notification.assetSymbol ?? "KFF",
  };
}
