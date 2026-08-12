import { describe, expect, it } from "vitest";
import type { CachedStock } from "@/lib/stockCache";
import { calculateDemoReturn, fetchCompleteDemoHistory, filterDemoStocks, findDemoStock, stockProductionPath } from "@/lib/stockDetailDemo";

const stocks: CachedStock[] = [
  {
    id: "scom-id", symbol: "SCOM", name: "Safaricom PLC", sector: "Telecommunications",
    price: 35.75, previous_price: 35.33, day_change: 0.42, day_change_percent: 1.19,
    volume: 2500000, market_cap: 936000000000, year_high: 36.05, year_low: 27.78,
    pe_ratio: 18, dividend_yield: 5.2, updated_at: "2026-08-11T08:00:00Z",
  },
  {
    id: "kcb-id", symbol: "KCB", name: "KCB Group PLC", sector: "Banking",
    price: 85, previous_price: 85, day_change: 0, day_change_percent: 0,
    volume: 1000, market_cap: null, year_high: null, year_low: null,
    pe_ratio: null, dividend_yield: null, updated_at: "2026-08-11T08:00:00Z",
  },
];

describe("stock detail desktop demo helpers", () => {
  it("matches the route symbol case-insensitively", () => {
    expect(findDemoStock(stocks, "scom")?.name).toBe("Safaricom PLC");
    expect(findDemoStock(stocks, "missing")).toBeNull();
  });

  it("filters by ticker, company, and sector", () => {
    expect(filterDemoStocks(stocks, "SCOM")).toEqual([stocks[0]]);
    expect(filterDemoStocks(stocks, "group")).toEqual([stocks[1]]);
    expect(filterDemoStocks(stocks, "telecom")).toEqual([stocks[0]]);
    expect(filterDemoStocks(stocks, "")).toEqual(stocks);
  });

  it("builds the production stock route safely", () => {
    expect(stockProductionPath("SCOM")).toBe("/stocks/SCOM");
    expect(stockProductionPath("A B")).toBe("/stocks/A%20B");
  });

  it("uses distinct period boundaries for sparse stock history", () => {
    const history = [
      { snapshot_date: "2026-05-11", price: 20 },
      { snapshot_date: "2026-07-10", price: 25 },
      { snapshot_date: "2026-08-01", price: 30 },
      { snapshot_date: "2026-08-11", price: 35 },
    ];

    expect(calculateDemoReturn(history, 36, 7)).toBeCloseTo(20);
    expect(calculateDemoReturn(history, 36, 30)).toBeCloseTo(44);
    expect(calculateDemoReturn(history, 36, 90)).toBeCloseTo(80);
  });

  it("anchors returns to the latest stored observation instead of wall-clock time", () => {
    const history = [
      { snapshot_date: "2024-01-01", price: 10 },
      { snapshot_date: "2024-01-24", price: 12 },
      { snapshot_date: "2024-01-31", price: 15 },
    ];

    expect(calculateDemoReturn(history, 15, 7)).toBeCloseTo(25);
    expect(calculateDemoReturn(history, 15, 30)).toBeCloseTo(50);
    expect(calculateDemoReturn([], 110, 7)).toBeNull();
  });

  it("does not label incomplete history as a full-period return", () => {
    const history = [
      { snapshot_date: "2026-08-01", price: 30 },
      { snapshot_date: "2026-08-11", price: 35 },
    ];

    expect(calculateDemoReturn(history, 35, 7)).toBeCloseTo(16.6667);
    expect(calculateDemoReturn(history, 35, 30)).toBeNull();
    expect(calculateDemoReturn(history, 35, 365)).toBeNull();
  });

  it("paginates and deduplicates a complete one-year bulk history", async () => {
    const offsets: number[] = [];
    const grouped = await fetchCompleteDemoHistory(async (offset) => {
      offsets.push(offset);
      if (offset === 0) return {
        count: 4,
        data: [
          { stock_id: "scom-id", snapshot_date: "2026-08-10", price: 34 },
          { stock_id: "kcb-id", snapshot_date: "2026-08-10", price: 84 },
        ],
      };
      return {
        count: 4,
        data: [
          { stock_id: "scom-id", snapshot_date: "2026-08-10", price: 35 },
          { stock_id: "scom-id", snapshot_date: "2026-08-11", price: 36 },
        ],
      };
    }, 2);

    expect(offsets).toEqual([0, 2]);
    expect(grouped["scom-id"]).toEqual([
      { snapshot_date: "2026-08-10", price: 35 },
      { snapshot_date: "2026-08-11", price: 36 },
    ]);
    expect(grouped["kcb-id"]).toEqual([{ snapshot_date: "2026-08-10", price: 84 }]);
  });
});
