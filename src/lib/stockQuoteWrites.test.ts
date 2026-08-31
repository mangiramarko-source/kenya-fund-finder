import { describe, expect, it, vi } from "vitest";
import { persistStockQuote } from "../../supabase/functions/fetch-market-data/stock-writes";
import type { StockQuote } from "../../supabase/functions/fetch-market-data/stock-quotes";

const quote: StockQuote = {
  price: 37.85, previousPrice: 37.05, dayChange: 0.8, dayChangePct: 2.16, volume: 37145213,
  source: "primary", quoteSource: "rapidapi", providerUpdatedAt: "2026-08-28T15:20:07.022Z", asOfDate: null,
};
const now = "2026-08-31T16:00:00.000Z";
const range = { yearHigh: 40, yearLow: 30 };
function operations() {
  return {
    updateStock: vi.fn().mockResolvedValue({ data: { id: "stock-id" }, error: null }),
    upsertHistory: vi.fn().mockResolvedValue({ data: { id: "history-id" }, error: null }),
  };
}

describe("confirmed stock writes", () => {
  it("stores percentage, absolute change and provenance separately, preserving identity", async () => {
    const ops = operations();
    expect(await persistStockQuote("stock-id", quote, range, ops, now)).toEqual({ stockWritten: true, historyWritten: true, errors: [] });
    expect(ops.updateStock).toHaveBeenCalledWith("stock-id", {
      price: 37.85, previous_price: 37.05, day_change: 0.8, day_change_percent: 2.16, volume: 37145213,
      year_high: 40, year_low: 30, updated_at: now,
      provider_updated_at: quote.providerUpdatedAt, quote_source: "rapidapi",
    });
    expect(ops.upsertHistory).toHaveBeenCalledWith({ stock_id: "stock-id", price: 37.85, snapshot_date: "2026-08-31" });
  });

  it("does not write cached quotes or refresh their timestamps", async () => {
    const ops = operations();
    const cached: StockQuote = { ...quote, source: "cache" };
    const original = { ...cached };
    expect(await persistStockQuote("stock-id", cached, range, ops, now)).toEqual({ stockWritten: false, historyWritten: false, errors: [] });
    expect(ops.updateStock).not.toHaveBeenCalled();
    expect(ops.upsertHistory).not.toHaveBeenCalled();
    expect(cached).toEqual(original);
  });

  it("clears old provider time for official fallback without changing its snapshot date", async () => {
    const ops = operations();
    await persistStockQuote("stock-id", { ...quote, source: "secondary", quoteSource: "nse", providerUpdatedAt: null, asOfDate: "2026-08-28" }, range, ops, now);
    expect(ops.updateStock.mock.calls[0][1]).toMatchObject({ quote_source: "nse", provider_updated_at: null, updated_at: now });
    expect(ops.upsertHistory.mock.calls[0][0].snapshot_date).toBe("2026-08-28");
  });

  it.each([
    [{ data: null, error: { code: "23514" } }, "23514"],
    [{ data: null, error: null }, "NO_UPDATED_ROW"],
    [{ data: { id: "wrong-id" }, error: null }, "NO_UPDATED_ROW"],
  ])("does not count rejected/zero-row writes or write history (%j)", async (result, code) => {
    const ops = operations();
    ops.updateStock.mockResolvedValue(result);
    expect(await persistStockQuote("stock-id", quote, range, ops, now)).toEqual({ stockWritten: false, historyWritten: false, errors: [{ step: "stock_update", code }] });
    expect(ops.upsertHistory).not.toHaveBeenCalled();
  });

  it.each([
    [{ data: null, error: { code: "23503" } }, "23503"],
    [{ data: null, error: null }, "NO_HISTORY_ROW"],
  ])("reports history failure separately from a successful stock update (%j)", async (result, code) => {
    const ops = operations();
    ops.upsertHistory.mockResolvedValue(result);
    expect(await persistStockQuote("stock-id", quote, range, ops, now)).toEqual({ stockWritten: true, historyWritten: false, errors: [{ step: "history_upsert", code }] });
  });

  it("keeps processing later stocks after a thrown write and does not leak error text", async () => {
    const ops = operations();
    ops.updateStock.mockRejectedValueOnce(new Error("sensitive transport details"));
    const failed = await persistStockQuote("stock-id", quote, range, ops, now);
    const next = await persistStockQuote("stock-id", quote, range, ops, now);
    expect(failed.errors).toEqual([{ step: "stock_update", code: "REQUEST_FAILED" }]);
    expect(next.stockWritten).toBe(true);
  });

  it("reports thrown history requests", async () => {
    const ops = operations();
    ops.upsertHistory.mockRejectedValueOnce(new Error("network failure"));
    expect(await persistStockQuote("stock-id", quote, range, ops, now)).toEqual({ stockWritten: true, historyWritten: false, errors: [{ step: "history_upsert", code: "REQUEST_FAILED" }] });
  });

  it("preserves the existing zero-volume write policy", async () => {
    const ops = operations();
    await persistStockQuote("stock-id", { ...quote, volume: 0 }, range, ops, now);
    expect(ops.updateStock.mock.calls[0][1]).not.toHaveProperty("volume");
  });
});
