import type { StockQuote } from "./stock-quotes.ts";

type WriteResult = { data: { id: string } | null; error: { code?: string } | null };
export type StockWriteOperations = {
  updateStock(id: string, patch: Record<string, unknown>): PromiseLike<WriteResult>;
  upsertHistory(row: { stock_id: string; price: number; snapshot_date: string }): PromiseLike<WriteResult>;
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
