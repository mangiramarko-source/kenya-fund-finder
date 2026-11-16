export type StockExchangeCode = "NSE" | "USE" | "DSE" | "RSE";
export type StockCurrencyCode = "KES" | "UGX" | "TZS" | "RWF";
export type StockCountryCode = "KE" | "UG" | "TZ" | "RW";

export interface CachedStock {
  id: string;
  symbol: string;
  exchange?: StockExchangeCode;
  exchange_ticker?: string;
  currency?: StockCurrencyCode;
  country_code?: StockCountryCode;
  name: string;
  sector: string;
  price: number;
  previous_price: number | null;
  day_change: number;
  day_change_percent: number;
  volume: number;
  market_cap: number | null;
  year_high: number | null;
  year_low: number | null;
  pe_ratio: number | null;
  dividend_yield: number | null;
  /** Exchange-provided intraday values when the quote source has supplied them. */
  day_low?: number | null;
  day_high?: number | null;
  logo_url?: string | null;
  /** Editorial profile data, separate from live market quote fields. */
  company_summary?: string | null;
  official_website?: string | null;
  headquarters?: string | null;
  telephone?: string | null;
  updated_at: string;
  /** Provider/cache timestamp, not a confirmed exchange trade time. */
  provider_updated_at?: string | null;
  quote_source?: "rapidapi" | "nse" | "mansa" | null;
}

const LEGACY_STOCKS_KEY = "kff:cache:stocks:v2";
const getStocksCacheKey = (exchange = "NSE") => `kff_stocks_cache_${exchange.toUpperCase()}`;
const STOCK_HISTORY_BULK_KEY = "kff:cache:stock-history-bulk:v1";

export interface StockHistoryPoint {
  snapshot_date: string;
  price: number;
}

/** 6 hours in milliseconds — stale cache triggers a live refetch */
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

interface StockCacheEnvelope {
  savedAt: number;
  data: CachedStock[];
}

export const STOCK_CURRENCY_SYMBOLS: Record<string, string> = {
  KES: "KSh",
  UGX: "USh",
  TZS: "TSh",
  RWF: "FRw",
};

export const STOCK_CURRENCY_LABELS: Record<string, string> = {
  KES: "Kenyan Shilling (KSh)",
  UGX: "Ugandan Shilling (USh)",
  TZS: "Tanzanian Shilling (TSh)",
  RWF: "Rwandan Franc (FRw)",
};

export const STOCK_EXCHANGE_LABELS: Record<string, string> = {
  NSE: "Nairobi Securities Exchange (NSE)",
  USE: "Uganda Securities Exchange (USE)",
  DSE: "Dar es Salaam Stock Exchange (DSE)",
  RSE: "Rwanda Stock Exchange (RSE)",
};

export function getStockCurrencySymbol(currency?: string | null): string {
  const code = (currency || "KES").toUpperCase();
  return STOCK_CURRENCY_SYMBOLS[code] || code;
}

export function getStockCurrencyLabel(currency?: string | null): string {
  const code = (currency || "KES").toUpperCase();
  return STOCK_CURRENCY_LABELS[code] || code;
}

export function getStockExchangeLabel(exchange?: string | null): string {
  const code = (exchange || "NSE").toUpperCase();
  return STOCK_EXCHANGE_LABELS[code] || code;
}

export function inferExchangeFromSymbol(symbol?: string | null, explicitExchange?: string | null): StockExchangeCode {
  if (explicitExchange) {
    const upper = explicitExchange.toUpperCase();
    if (upper === "USE" || upper === "DSE" || upper === "RSE" || upper === "NSE") {
      return upper;
    }
  }
  const sym = (symbol || "").toUpperCase();
  if (sym.startsWith("USE-")) return "USE";
  if (sym.startsWith("DSE-")) return "DSE";
  if (sym.startsWith("RSE-")) return "RSE";
  return "NSE";
}

export function inferCurrencyFromExchange(exchange?: string | null, explicitCurrency?: string | null): StockCurrencyCode {
  if (explicitCurrency) {
    const upper = explicitCurrency.toUpperCase();
    if (upper === "KES" || upper === "UGX" || upper === "TZS" || upper === "RWF") {
      return upper;
    }
  }
  const ex = (exchange || "NSE").toUpperCase();
  if (ex === "USE") return "UGX";
  if (ex === "DSE") return "TZS";
  if (ex === "RSE") return "RWF";
  return "KES";
}

export const normalizeStock = (stock: any): CachedStock => {
  const exchange = inferExchangeFromSymbol(stock.symbol, stock.exchange);
  const currency = inferCurrencyFromExchange(exchange, stock.currency);
  const rawSym = String(stock.symbol || "");
  const exchangeTicker = stock.exchange_ticker || rawSym.replace(/^(USE|DSE|RSE)-/i, "");

  return {
    ...stock,
    exchange,
    exchange_ticker: exchangeTicker,
    currency,
    country_code: stock.country_code || (exchange === "USE" ? "UG" : exchange === "DSE" ? "TZ" : exchange === "RSE" ? "RW" : "KE"),
    price: Number(stock.price),
    previous_price: stock.previous_price != null ? Number(stock.previous_price) : null,
    day_change: Number(stock.day_change),
    day_change_percent: Number(stock.day_change_percent),
    volume: Number(stock.volume),
    market_cap: stock.market_cap != null ? Number(stock.market_cap) : null,
    year_high: stock.year_high != null ? Number(stock.year_high) : null,
    year_low: stock.year_low != null ? Number(stock.year_low) : null,
    pe_ratio: stock.pe_ratio != null ? Number(stock.pe_ratio) : null,
    dividend_yield: stock.dividend_yield != null ? Number(stock.dividend_yield) : null,
    day_low: stock.day_low != null ? Number(stock.day_low) : null,
    day_high: stock.day_high != null ? Number(stock.day_high) : null,
  };
};

const readStocks = (exchange = "NSE"): StockCacheEnvelope | null => {
  const targetEx = exchange.toUpperCase();
  const key = getStocksCacheKey(targetEx);
  try {
    let raw = localStorage.getItem(key);
    if (!raw && targetEx === "NSE") {
      raw = localStorage.getItem(LEGACY_STOCKS_KEY);
    }
    if (!raw) return null;
    const envelope = JSON.parse(raw) as StockCacheEnvelope;
    // Discard if stale — force a live fetch after TTL expires
    if (Date.now() - envelope.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(key);
      if (targetEx === "NSE") localStorage.removeItem(LEGACY_STOCKS_KEY);
      return null;
    }
    const filtered = (envelope.data || []).filter(
      (item) => inferExchangeFromSymbol(item.symbol, item.exchange) === targetEx,
    );
    return { savedAt: envelope.savedAt, data: filtered };
  } catch {
    return null;
  }
};

const writeStocks = (stocks: CachedStock[], exchange = "NSE") => {
  const targetEx = exchange.toUpperCase();
  const key = getStocksCacheKey(targetEx);
  try {
    const filtered = stocks.filter(
      (item) => inferExchangeFromSymbol(item.symbol, item.exchange) === targetEx,
    );
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data: filtered }));
    if (targetEx === "NSE") {
      localStorage.removeItem(LEGACY_STOCKS_KEY);
    }
  } catch {
    // Storage may be unavailable in private browsing mode.
  }
};

export const stockCache = {
  loadStocks(exchange: StockExchangeCode = "NSE"): { stocks: CachedStock[]; savedAt: number } | null {
    const cached = readStocks(exchange);
    return cached && cached.data.length > 0 ? { stocks: cached.data, savedAt: cached.savedAt } : null;
  },
  findStockBySymbol(symbol: string): CachedStock | null {
    const upper = symbol.toUpperCase();
    const inferredEx = inferExchangeFromSymbol(upper);
    const primary = readStocks(inferredEx)?.data.find((item) => item.symbol.toUpperCase() === upper);
    if (primary) return primary;
    for (const ex of ["NSE", "USE", "DSE", "RSE"] as const) {
      if (ex === inferredEx) continue;
      const found = readStocks(ex)?.data.find((item) => item.symbol.toUpperCase() === upper);
      if (found) return found;
    }
    return null;
  },
  saveStocks(stocks: CachedStock[], exchange: StockExchangeCode = "NSE") {
    if (stocks.length > 0) writeStocks(stocks, exchange);
  },
  upsertStock(stock: CachedStock) {
    const exchange = inferExchangeFromSymbol(stock.symbol, stock.exchange);
    const existing = readStocks(exchange)?.data ?? [];
    const next = existing.filter((item) => item.id !== stock.id && item.symbol !== stock.symbol);
    writeStocks([...next, stock], exchange);
  },
  loadStockHistoryBulk(): Record<string, StockHistoryPoint[]> | null {
    try {
      const raw = localStorage.getItem(STOCK_HISTORY_BULK_KEY);
      if (!raw) return null;
      const envelope = JSON.parse(raw) as { savedAt: number; data: Record<string, StockHistoryPoint[]> };
      if (Date.now() - envelope.savedAt > MAX_AGE_MS) {
        localStorage.removeItem(STOCK_HISTORY_BULK_KEY);
        return null;
      }
      return envelope.data;
    } catch {
      return null;
    }
  },
  saveStockHistoryBulk(history: Record<string, StockHistoryPoint[]>) {
    try {
      if (history && Object.keys(history).length > 0) {
        localStorage.setItem(
          STOCK_HISTORY_BULK_KEY,
          JSON.stringify({ savedAt: Date.now(), data: history })
        );
      }
    } catch {
      // Storage may be unavailable
    }
  },
};
