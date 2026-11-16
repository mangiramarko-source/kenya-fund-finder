import type { StockQuote } from "./stock-quotes.ts";
import type { MansaStockQuote } from "./mansa-stocks.ts";

type WriteResult = { data: { id: string } | null; error: { code?: string } | null };
export type StockWriteOperations = {
  updateStock(id: string, patch: Record<string, unknown>): PromiseLike<WriteResult>;
  upsertHistory(row: { stock_id: string; price: number; snapshot_date: string }): PromiseLike<WriteResult>;
  insertStock?(row: Record<string, unknown>): PromiseLike<WriteResult>;
};

export async function persistStockQuote(
  id: string,
  quote: StockQuote,
  range: { yearHigh: number | null; yearLow: number | null },
  operations: StockWriteOperations,
  now = new Date().toISOString(),
) {
  const outcome = {
    stockWritten: false,
    historyWritten: false,
    errors: [] as Array<{ step: "stock_update" | "history_upsert"; code: string }>,
  };
  // Cached quotes must not acquire new timestamps or lose their provenance.
  if (quote.source === "cache") return outcome;
  const patch: Record<string, unknown> = {
    previous_price: quote.previousPrice,
    price: quote.price,
    day_change: quote.dayChange,
    day_change_percent: quote.dayChangePct,
    year_high: range.yearHigh,
    year_low: range.yearLow,
    updated_at: now,
    provider_updated_at: quote.providerUpdatedAt,
    quote_source: quote.quoteSource,
  };
  // Preserve the existing zero-volume policy for this narrowly scoped patch.
  if (quote.volume > 0) patch.volume = quote.volume;
  if (quote.marketCap != null && quote.marketCap > 0) patch.market_cap = quote.marketCap;
  if (quote.peRatio != null && quote.peRatio > 0) patch.pe_ratio = quote.peRatio;
  if (quote.dividendYield != null && quote.dividendYield >= 0) patch.dividend_yield = quote.dividendYield;
  if (quote.dayLow != null && quote.dayHigh != null && quote.dayLow > 0 && quote.dayHigh >= quote.dayLow) {
    patch.day_low = quote.dayLow;
    patch.day_high = quote.dayHigh;
  }
  try {
    const result = await operations.updateStock(id, patch);
    if (result.error || result.data?.id !== id) {
      outcome.errors.push({ step: "stock_update", code: result.error?.code || "NO_UPDATED_ROW" });
      return outcome;
    }
    outcome.stockWritten = true;
  } catch {
    outcome.errors.push({ step: "stock_update", code: "REQUEST_FAILED" });
    return outcome;
  }
  try {
    const result = await operations.upsertHistory({
      stock_id: id,
      price: quote.price,
      // Preserve existing daily history semantics, not provider cache dates.
      snapshot_date: quote.asOfDate || now.split("T")[0],
    });
    if (result.error || !result.data?.id) {
      outcome.errors.push({ step: "history_upsert", code: result.error?.code || "NO_HISTORY_ROW" });
    } else {
      outcome.historyWritten = true;
    }
  } catch {
    outcome.errors.push({ step: "history_upsert", code: "REQUEST_FAILED" });
  }
  return outcome;
}

export interface BackfillHistoryRow {
  stock_id: string;
  price: number;
  snapshot_date: string;
}

export function compute52WeekRange(
  livePrice: number | null | undefined,
  points: Array<{ snapshot_date?: string; date?: string; price: number }>,
  referenceDateIso = new Date().toISOString().slice(0, 10),
): { yearHigh: number | null; yearLow: number | null } {
  const refMs = Date.parse(`${referenceDateIso}T00:00:00Z`);
  const cutoffIso = Number.isFinite(refMs)
    ? new Date(refMs - 365 * 86_400_000).toISOString().slice(0, 10)
    : referenceDateIso;

  const candidates: number[] = [];
  if (typeof livePrice === "number" && Number.isFinite(livePrice) && livePrice > 0) {
    candidates.push(livePrice);
  }
  for (const pt of points) {
    const dt = pt.snapshot_date || pt.date || "";
    if (!dt || dt < cutoffIso || dt > referenceDateIso) continue;
    if (typeof pt.price === "number" && Number.isFinite(pt.price) && pt.price > 0) {
      candidates.push(pt.price);
    }
  }

  if (candidates.length === 0) {
    return { yearHigh: null, yearLow: null };
  }

  return {
    yearHigh: Math.max(...candidates),
    yearLow: Math.min(...candidates),
  };
}

export async function insertBackfillHistoryBatch(
  rows: BackfillHistoryRow[],
  upsertChunk: (
    chunk: BackfillHistoryRow[],
  ) => PromiseLike<{ error: { message?: string; code?: string } | null }>,
  chunkSize = 500,
): Promise<{ insertedBatches: number; writtenRows: number; error: string | null }> {
  let insertedBatches = 0;
  let writtenRows = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await upsertChunk(chunk);
    if (error) {
      return {
        insertedBatches,
        writtenRows,
        error: error.message || error.code || "HISTORY_BATCH_UPSERT_FAILED",
      };
    }
    insertedBatches++;
    writtenRows += chunk.length;
  }
  return { insertedBatches, writtenRows, error: null };
}

export async function insertNewMansaStock(
  quote: MansaStockQuote,
  sortOrder: number,
  operations: StockWriteOperations,
  now = new Date().toISOString(),
) {
  const outcome = {
    stockId: null as string | null,
    stockWritten: false,
    historyWritten: false,
    errors: [] as Array<{ step: "stock_insert" | "history_upsert"; code: string }>,
  };
  if (!operations.insertStock) {
    outcome.errors.push({ step: "stock_insert", code: "INSERT_UNSUPPORTED" });
    return outcome;
  }

  const row: Record<string, unknown> = {
    symbol: quote.symbol,
    exchange: quote.exchange,
    exchange_ticker: quote.exchangeTicker,
    currency: quote.currency,
    country_code: quote.countryCode,
    name: quote.name,
    sector: quote.sector || "Other",
    price: quote.price,
    previous_price: quote.previousPrice,
    day_change: quote.dayChange,
    day_change_percent: quote.dayChangePct,
    volume: quote.volume >= 0 ? quote.volume : 0,
    market_cap: quote.marketCap,
    pe_ratio: quote.peRatio,
    dividend_yield: quote.dividendYield,
    year_high: quote.yearHigh ?? quote.price,
    year_low: quote.yearLow ?? quote.price,
    day_high: quote.dayHigh,
    day_low: quote.dayLow,
    is_active: true,
    sort_order: sortOrder,
    updated_at: now,
    provider_updated_at: quote.providerUpdatedAt,
    quote_source: "mansa",
  };

  try {
    const result = await operations.insertStock(row);
    if (result.error || !result.data?.id) {
      outcome.errors.push({ step: "stock_insert", code: result.error?.code || "NO_INSERTED_ROW" });
      return outcome;
    }
    outcome.stockId = result.data.id;
    outcome.stockWritten = true;
  } catch {
    outcome.errors.push({ step: "stock_insert", code: "REQUEST_FAILED" });
    return outcome;
  }

  try {
    const histRes = await operations.upsertHistory({
      stock_id: outcome.stockId,
      price: quote.price,
      snapshot_date: quote.asOfDate || now.split("T")[0],
    });
    if (histRes.error || !histRes.data?.id) {
      outcome.errors.push({ step: "history_upsert", code: histRes.error?.code || "NO_HISTORY_ROW" });
    } else {
      outcome.historyWritten = true;
    }
  } catch {
    outcome.errors.push({ step: "history_upsert", code: "REQUEST_FAILED" });
  }

  return outcome;
}
