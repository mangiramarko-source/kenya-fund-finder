import { inferCurrencyFromExchange, inferExchangeFromSymbol } from "@/lib/stockCache";

export interface ExchangeRateLike {
  currency_code: string;
  rate: number;
}

export const SUPPORTED_CORE_CURRENCIES = ["KES", "USD", "EUR", "GBP"] as const;

export const FALLBACK_RATES: Record<string, number> = {
  KES: 1,
  USD: 129.42,
  EUR: 141.50,
  GBP: 173.97,
  UGX: 0.035,
  TZS: 0.050,
  RWF: 0.092,
  ZAR: 7.15,
  AED: 35.24,
  CAD: 93.50,
  CNY: 17.85,
  JPY: 0.85,
  CHF: 148.20,
};

/**
 * Returns the exchange rate relative to KES (KES per 1 unit of foreign currency).
 * E.g., for USD, returns ~129.42 (1 USD = 129.42 KES).
 * For KES, returns 1.
 */
export function getActiveExchangeRate(
  currency: string,
  rates?: ExchangeRateLike[]
): { rate: number; label: string; isLive: boolean } {
  const code = currency.toUpperCase();
  if (code === "KES") {
    return { rate: 1, label: "KES (Base)", isLive: true };
  }

  const live = rates?.find((r) => r.currency_code.toUpperCase() === code);
  if (live && live.rate > 0) {
    return {
      rate: Number(live.rate),
      label: `1 ${code} = ${Number(live.rate).toFixed(2)} KES`,
      isLive: true,
    };
  }

  const fallback = FALLBACK_RATES[code] || 1;
  return {
    rate: fallback,
    label: `1 ${code} = ${fallback.toFixed(2)} KES (est.)`,
    isLive: false,
  };
}

/**
 * Resolves the native quote currency of a portfolio holding.
 */
export function resolveHoldingCurrency(item: {
  asset_type?: string | null;
  ticker?: string | null;
  currency?: string | null;
}): string {
  if (item.currency) return item.currency.toUpperCase();
  if (item.asset_type === "stock") {
    return inferCurrencyFromExchange(inferExchangeFromSymbol(item.ticker));
  }
  return "KES";
}

/**
 * Converts a monetary amount from its native currency (e.g. UGX, TZS, RWF, USD) into KES.
 */
export function convertToKes(
  amountInSourceCurrency: number,
  sourceCurrency: string,
  rates?: ExchangeRateLike[]
): number {
  if (!Number.isFinite(amountInSourceCurrency) || amountInSourceCurrency === 0) return 0;
  const code = (sourceCurrency || "KES").toUpperCase();
  if (code === "KES") return amountInSourceCurrency;

  const { rate } = getActiveExchangeRate(code, rates);
  return amountInSourceCurrency * rate;
}

/**
 * Converts a monetary value in KES to the target currency using live or fallback exchange rates.
 */
export function convertFromKes(
  amountInKes: number,
  targetCurrency: string,
  rates?: ExchangeRateLike[]
): number {
  if (!Number.isFinite(amountInKes) || amountInKes === 0) return 0;
  const code = targetCurrency.toUpperCase();
  if (code === "KES") return amountInKes;

  const { rate } = getActiveExchangeRate(code, rates);
  return amountInKes / rate;
}

/**
 * Formats a monetary value (which is stored in KES) into the target currency's localized display string.
 */
export function formatPortfolioCurrency(
  amountInKes: number,
  targetCurrency: string,
  rates?: ExchangeRateLike[],
  options?: {
    compact?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const converted = convertFromKes(amountInKes, targetCurrency, rates);
  const code = targetCurrency.toUpperCase();

  try {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: code,
      notation: options?.compact ? "compact" : "standard",
      minimumFractionDigits: options?.minimumFractionDigits ?? (options?.compact ? 0 : 2),
      maximumFractionDigits: options?.maximumFractionDigits ?? (options?.compact ? 1 : 2),
    }).format(converted);
  } catch {
    const formatted = converted.toLocaleString("en-KE", {
      minimumFractionDigits: options?.minimumFractionDigits ?? (options?.compact ? 0 : 2),
      maximumFractionDigits: options?.maximumFractionDigits ?? (options?.compact ? 1 : 2),
    });
    return `${code} ${formatted}`;
  }
}
