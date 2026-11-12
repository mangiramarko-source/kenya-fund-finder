import type { PriceAlert } from "@/hooks/usePriceAlerts";

export interface ParsedAlertDetails {
  symbol: string;
  name: string;
  currentPrice: number | null;
  logoUrl?: string | null;
  currencyCode?: string;
  linkTo?: string;
}

/**
 * Resolves current live price and visual identifiers for an alert across market data feeds.
 */
export function resolveAlertAsset(
  alert: PriceAlert,
  stocks: any[] = [],
  rates: any[] = [],
  commodities: any[] = []
): ParsedAlertDetails {
  let symbol = "";
  let name = alert.asset_name;
  let currentPrice: number | null = null;
  let logoUrl: string | null = null;
  let currencyCode: string | undefined;
  let linkTo: string | undefined;

  if (alert.asset_type === "stock") {
    const rawTarget = (alert.asset_id || "").toLowerCase();
    const rawStockId = (alert.stock_id || "").toLowerCase();
    const rawName = (alert.asset_name || "").toLowerCase();

    const parenMatch = alert.asset_name.match(/\(([^)]+)\)/);
    const dashMatch = alert.asset_name.match(/^([A-Z0-9]+)\s*-\s*(.+)$/i);
    const extractedSym = parenMatch
      ? parenMatch[1].trim().toLowerCase()
      : dashMatch
      ? dashMatch[1].trim().toLowerCase()
      : "";

    const matched = stocks.find((s) => {
      const sym = (s.symbol || "").toLowerCase();
      const sId = (s.id || "").toLowerCase();
      return (
        sId === rawTarget ||
        sId === rawStockId ||
        sym === rawTarget ||
        (extractedSym && sym === extractedSym) ||
        rawName.includes(sym) ||
        (s.name && rawName.includes(s.name.toLowerCase()))
      );
    });

    if (matched) {
      symbol = matched.symbol;
      name = matched.name;
      const p = Number(matched.price);
      currentPrice = Number.isFinite(p) && p > 0 ? p : null;
      logoUrl = matched.logo_url;
      linkTo = `/stocks/${matched.symbol}`;
    } else {
      if (parenMatch) {
        symbol = parenMatch[1].trim().toUpperCase();
        name = alert.asset_name.replace(/\([^)]+\)/, "").trim();
      } else if (dashMatch) {
        symbol = dashMatch[1].trim().toUpperCase();
        name = dashMatch[2].trim();
      } else {
        symbol = alert.asset_id?.toUpperCase() || alert.asset_name.slice(0, 4).toUpperCase();
      }
      linkTo = `/stocks/${symbol}`;
    }
  } else if (alert.asset_type === "currency") {
    const rawTarget = (alert.asset_id || "").toLowerCase();
    const rawName = (alert.asset_name || "").toLowerCase();

    const matched = rates.find((r) => {
      const code = (r.currency_code || "").toLowerCase();
      const rId = (r.id || "").toLowerCase();
      return (
        rId === rawTarget ||
        code === rawTarget ||
        rawName.includes(code) ||
        (r.currency_name && rawName.includes(r.currency_name.toLowerCase()))
      );
    });

    if (matched) {
      currencyCode = matched.currency_code;
      symbol = `${matched.currency_code}/KES`;
      name = matched.currency_name || `${matched.currency_code} Rate`;
      const p = Number(matched.rate);
      currentPrice = Number.isFinite(p) && p > 0 ? p : null;
    } else {
      const code = (alert.asset_name.split("/")[0] || alert.asset_id || "USD").toUpperCase();
      currencyCode = code;
      symbol = `${code}/KES`;
    }
    linkTo = "/rates";
  } else if (alert.asset_type === "commodity") {
    const rawTarget = (alert.asset_id || "").toLowerCase();
    const rawName = (alert.asset_name || "").toLowerCase();

    const matched = commodities.find((c) => {
      const sym = (c.symbol || "").toLowerCase();
      const cId = (c.id || "").toLowerCase();
      return (
        cId === rawTarget ||
        sym === rawTarget ||
        rawName.includes(sym) ||
        (c.name && rawName.includes(c.name.toLowerCase()))
      );
    });

    if (matched) {
      symbol = matched.symbol || matched.name;
      name = matched.name;
      const p = Number(matched.price);
      currentPrice = Number.isFinite(p) && p > 0 ? p : null;
    } else {
      symbol = alert.asset_name;
    }
    linkTo = "/rates";
  }

  return { symbol, name, currentPrice, logoUrl, currencyCode, linkTo };
}

/**
 * Evaluates whether a live price meets the alert target condition.
 * Strictly guards against currentPrice <= 0, NaN, or loading state so "below" alerts
 * never falsely trigger on unresolved quotes.
 */
export function doesPriceSatisfyTarget(
  condition: "above" | "below",
  targetPrice: number,
  currentPrice: number | null
): boolean {
  if (
    typeof currentPrice !== "number" ||
    !Number.isFinite(currentPrice) ||
    currentPrice <= 0 ||
    typeof targetPrice !== "number" ||
    !Number.isFinite(targetPrice) ||
    targetPrice <= 0
  ) {
    return false;
  }

  if (condition === "above") {
    return currentPrice >= targetPrice;
  }

  if (condition === "below") {
    return currentPrice <= targetPrice;
  }

  return false;
}

/**
 * Evaluates whether an alert condition is met.
 * If alert.is_triggered is true, returns true.
 * If alert.is_active is false, returns false immediately (paused alerts do not trigger mathematically).
 * Strictly guards against currentPrice <= 0, NaN, or loading state so "below" alerts
 * never falsely trigger on unresolved quotes.
 */
export function isAlertTriggered(alert: PriceAlert, currentPrice: number | null): boolean {
  if (alert.is_triggered) return true;
  if (alert.is_active === false) return false;

  return doesPriceSatisfyTarget(alert.condition, alert.target_price, currentPrice);
}

/**
 * Calculates progress percentage (0 - 100) towards the target price.
 * Safely handles missing baseline, zero denominators, and NaN.
 */
export function calculateAlertProgress(
  alert: PriceAlert,
  currentPrice: number | null,
  isHit?: boolean
): number {
  const triggered = isHit ?? isAlertTriggered(alert, currentPrice);
  if (triggered) return 100;

  if (
    typeof currentPrice !== "number" ||
    !Number.isFinite(currentPrice) ||
    currentPrice <= 0 ||
    typeof alert.target_price !== "number" ||
    !Number.isFinite(alert.target_price) ||
    alert.target_price <= 0
  ) {
    return 5;
  }

  const target = alert.target_price;
  const isAbove = alert.condition === "above";

  // 1. Journey progress from stored baseline price
  if (
    typeof alert.baseline_price === "number" &&
    Number.isFinite(alert.baseline_price) &&
    alert.baseline_price > 0 &&
    alert.baseline_price !== target
  ) {
    const baseline = alert.baseline_price;
    if (isAbove) {
      const totalDistance = target - baseline;
      if (totalDistance > 0) {
        const covered = currentPrice - baseline;
        const pct = (covered / totalDistance) * 100;
        if (Number.isFinite(pct)) {
          return Math.max(5, Math.min(95, Math.round(pct)));
        }
      }
    } else {
      const totalDistance = baseline - target;
      if (totalDistance > 0) {
        const covered = baseline - currentPrice;
        const pct = (covered / totalDistance) * 100;
        if (Number.isFinite(pct)) {
          return Math.max(5, Math.min(95, Math.round(pct)));
        }
      }
    }
  }

  // 2. Adaptive 10% proximity band fallback when baseline is missing or equal to target
  if (target > 0) {
    const distance = Math.abs(target - currentPrice);
    const distancePctOfTarget = (distance / target) * 100;
    if (Number.isFinite(distancePctOfTarget) && distancePctOfTarget <= 10) {
      const bandProgress = ((10 - distancePctOfTarget) / 10) * 100;
      if (Number.isFinite(bandProgress)) {
        return Math.max(8, Math.min(95, Math.round(bandProgress)));
      }
    }
  }

  return 5;
}

/**
 * Calculates distance metrics between currentPrice and targetPrice.
 * Safely guards against currentPrice <= 0 before division.
 */
export function calculateAlertDistance(
  alert: PriceAlert,
  currentPrice: number | null,
  isHit?: boolean
): {
  isHit: boolean;
  deltaPrice: number | null;
  deltaPercent: number | null;
  formattedDelta: string | null;
} {
  const triggered = isHit ?? isAlertTriggered(alert, currentPrice);

  if (
    typeof currentPrice !== "number" ||
    !Number.isFinite(currentPrice) ||
    currentPrice <= 0 ||
    typeof alert.target_price !== "number" ||
    !Number.isFinite(alert.target_price) ||
    alert.target_price <= 0
  ) {
    return {
      isHit: triggered,
      deltaPrice: null,
      deltaPercent: null,
      formattedDelta: triggered ? "Triggered" : null,
    };
  }

  const deltaPrice = Math.abs(alert.target_price - currentPrice);
  const deltaPercent = (deltaPrice / currentPrice) * 100;

  if (triggered) {
    if (deltaPrice > 0 && deltaPercent > 0) {
      return {
        isHit: true,
        deltaPrice,
        deltaPercent,
        formattedDelta: `Triggered (+${deltaPercent.toFixed(1)}%)`,
      };
    }
    return {
      isHit: true,
      deltaPrice: 0,
      deltaPercent: 0,
      formattedDelta: "Triggered",
    };
  }

  const unit = alert.asset_unit || "KES";
  const formattedPrice = deltaPrice < 1 ? deltaPrice.toFixed(2) : deltaPrice.toFixed(1);
  const formattedDelta = `${unit} ${formattedPrice} (${deltaPercent.toFixed(1)}%) away`;

  return {
    isHit: false,
    deltaPrice,
    deltaPercent,
    formattedDelta,
  };
}
