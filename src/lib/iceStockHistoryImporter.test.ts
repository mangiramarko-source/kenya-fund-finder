import { describe, expect, it } from "vitest";
import { normalizeIceRows } from "../../scripts/lib/ice-stock-history.mjs";

const window = { startDate: new Date("2021-08-10T00:00:00Z"), endDate: new Date("2026-08-10T23:59:59Z") };

describe("ICE stock history normalization", () => {
  it("accepts supported date and closing-price fields", () => {
    expect(normalizeIceRows({ data: [
      { priceDate: "2026-08-08", closePrice: "31.5" },
      { tradeDate: "2026-08-09", officialClose: 32 },
    ] }, window)).toEqual([
      { snapshot_date: "2026-08-08", price: 31.5 },
      { snapshot_date: "2026-08-09", price: 32 },
    ]);
  });

  it("rejects invalid and out-of-window rows", () => {
    expect(normalizeIceRows({ prices: [
      { date: "2020-01-01", close: 20 },
      { date: "2026-08-01", close: 0 },
      { date: "invalid", close: 25 },
      { date: "2026-08-02", close: 25 },
    ] }, window)).toEqual([{ snapshot_date: "2026-08-02", price: 25 }]);
  });

  it("deduplicates dates using the last provider row", () => {
    expect(normalizeIceRows([
      { date: "2026-08-01", close: 20 },
      { date: "2026-08-01", close: 21 },
    ], window)).toEqual([{ snapshot_date: "2026-08-01", price: 21 }]);
  });
});
