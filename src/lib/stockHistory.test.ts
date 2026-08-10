import { describe, expect, it } from "vitest";
import { downsampleStockHistory, fetchAllStockHistoryPages, filterStockHistory, STOCK_HISTORY_DAYS } from "./stockHistory";

const point = (snapshot_date: string, price: number) => ({ snapshot_date, price });

describe("stock history ranges", () => {
  it("defines every long-range lookback", () => {
    expect(STOCK_HISTORY_DAYS["1Y"]).toBe(365);
    expect(STOCK_HISTORY_DAYS["5Y"]).toBe(1825);
    expect(STOCK_HISTORY_DAYS["10Y"]).toBe(3650);
    expect(STOCK_HISTORY_DAYS["15Y"]).toBe(5475);
    expect(STOCK_HISTORY_DAYS.ALL).toBe(7305);
  });

  it("loads, deduplicates, and sorts paginated history", async () => {
    const pages = [
      { count: 4, data: [point("2024-01-02", 12), point("2024-01-01", 10)] },
      { count: 4, data: [point("2024-01-02", 13), point("2024-01-03", 14)] },
    ];
    const result = await fetchAllStockHistoryPages((offset) => Promise.resolve(pages[offset / 2]), 2);
    expect(result).toEqual([
      point("2024-01-01", 10),
      point("2024-01-02", 13),
      point("2024-01-03", 14),
    ]);
  });

  it("continues when the server caps pages below the requested size", async () => {
    const offsets: number[] = [];
    const result = await fetchAllStockHistoryPages(async (offset) => {
      offsets.push(offset);
      const data = offset === 0
        ? [point("2024-01-01", 10), point("2024-01-02", 11)]
        : [point("2024-01-03", 12)];
      return { count: 3, data };
    }, 1500);
    expect(offsets).toEqual([0, 2]);
    expect(result).toHaveLength(3);
  });

  it("filters points using the selected cutoff", () => {
    const history = [point("2025-01-01", 10), point("2026-07-15", 12), point("2026-08-10", 14)];
    expect(filterStockHistory(history, "1M", new Date("2026-08-10T12:00:00Z"))).toEqual([point("2026-07-15", 12), point("2026-08-10", 14)]);
    expect(filterStockHistory(history, "ALL")).toEqual(history);
  });

  it("preserves endpoints and extrema while limiting chart points", () => {
    const history = Array.from({ length: 1000 }, (_, index) => point(`2024-01-${String((index % 28) + 1).padStart(2, "0")}`, index === 500 ? 5000 : index));
    const sampled = downsampleStockHistory(history, 300);
    expect(sampled.length).toBeLessThanOrEqual(300);
    expect(sampled[0]).toEqual(history[0]);
    expect(sampled.at(-1)).toEqual(history.at(-1));
    expect(sampled.some((entry) => entry.price === 5000)).toBe(true);
  });
});
