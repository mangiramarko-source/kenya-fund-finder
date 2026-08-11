import { describe, expect, it } from "vitest";
import type { CachedStock } from "@/lib/stockCache";
import { calculateDemoReturn, filterDemoStocks, findDemoStock, stockProductionPath } from "@/lib/stockDetailDemo";

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

  it("calculates period returns from the first available point in range", () => {
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 86400000).toISOString();
    const twentyDaysAgo = new Date(now.getTime() - 20 * 86400000).toISOString();
    expect(calculateDemoReturn([
      { snapshot_date: twentyDaysAgo, price: 80 },
      { snapshot_date: fiveDaysAgo, price: 100 },
    ], 110, 7)).toBeCloseTo(10);
    expect(calculateDemoReturn([], 110, 7)).toBeNull();
  });
});
