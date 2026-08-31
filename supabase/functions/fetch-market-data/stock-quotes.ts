export type QuoteSource = "rapidapi" | "nse";
export type StockQuote = {
  price: number;
  previousPrice: number;
  dayChange: number;
  dayChangePct: number;
  volume: number;
  source: "primary" | "secondary" | "cache";
  asOfDate: string | null;
  // Provider/cache update time, never an exchange trade timestamp.
  providerUpdatedAt: string | null;
  quoteSource: QuoteSource | null;
};

type RapidApiQuote = StockQuote & { isin: string | null };

// Preserve the legacy KFF symbol/UUID, historical relationships and detail URLs.
const RAPIDAPI_ALIASES: Record<string, { ticker: string; isin: string }> = {
  NSE20: { ticker: "NSE", isin: "KE3000009674" },
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function numeric(value: unknown, percentage = false): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/,/g, "");
  const pattern = percentage ? /^[+-]?\d+(?:\.\d+)?%?$/ : /^[+-]?\d+(?:\.\d+)?$/;
  if (!pattern.test(normalized)) return null;
  const parsed = Number(normalized.replace(/%$/, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function providerTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

export function parseRapidApiStockResponse(payload: unknown) {
  const envelope = record(payload);
  if (!envelope || envelope.success === false || !Array.isArray(envelope.data)) {
    throw new Error("Invalid RapidAPI stock response");
  }
  const meta = record(envelope.meta);
  const providerUpdatedAt = providerTimestamp(meta?.lastUpdated);
  const quotes = new Map<string, RapidApiQuote>();
  let rejected = 0;
  for (const value of envelope.data) {
    const row = record(value);
    const ticker = typeof row?.ticker === "string" ? row.ticker.trim().toUpperCase() : "";
    const price = numeric(row?.price);
    const pct = numeric(row?.change, true);
    const volume = numeric(row?.volume);
    if (!ticker || price === null || price <= 0 || pct === null || pct <= -100 ||
        volume === null || !Number.isSafeInteger(volume) || volume < 0) {
      rejected++;
      continue;
    }
    const current = Number(price.toFixed(2));
    // Rounded provider percentages only allow an approximate previous close.
    const previousPrice = Number((current / (1 + pct / 100)).toFixed(2));
    if (current <= 0 || !Number.isFinite(previousPrice) || previousPrice <= 0) {
      rejected++;
      continue;
    }
    quotes.set(ticker, {
      price: current,
      previousPrice,
      dayChange: Number((current - previousPrice).toFixed(2)),
      dayChangePct: Number(pct.toFixed(2)),
      volume,
      source: "primary",
      asOfDate: null,
      providerUpdatedAt,
      quoteSource: "rapidapi",
      isin: typeof row?.isin === "string" ? row.isin.trim().toUpperCase() : null,
    });
  }
  return {
    quotes,
    diagnostics: {
      returned: envelope.data.length,
      accepted: quotes.size,
      rejected,
      provider_updated_at: providerUpdatedAt,
      response_timestamp: providerTimestamp(envelope.timestamp),
      cached: typeof meta?.cached === "boolean" ? meta.cached : null,
      provider_timestamp_status: providerUpdatedAt ? "present" : "missing_or_invalid",
    },
  };
}

export function matchRapidApiStocks(symbols: string[], providerQuotes: Map<string, RapidApiQuote>) {
  const quotes = new Map<string, StockQuote>();
  const rejectedAliases: string[] = [];
  for (const rawSymbol of symbols) {
    const symbol = rawSymbol.toUpperCase();
    const alias = RAPIDAPI_ALIASES[symbol];
    const quote = providerQuotes.get(alias?.ticker ?? symbol);
    if (!quote) continue;
    if (alias && quote.isin !== alias.isin) {
      rejectedAliases.push(symbol);
      continue;
    }
    quotes.set(symbol, quote);
  }
  return { quotes, rejectedAliases };
}
