import { describe, expect, it } from "vitest";
import { calculatePortfolioLiveMovement } from "./usePortfolioLiveMovement";
import type { PortfolioItem } from "./usePortfolio";

const now = new Date("2026-09-09T15:00:00.000Z");
const holding = (overrides: Partial<PortfolioItem> = {}): PortfolioItem => ({
  id: "holding", user_id: "user", asset_type: "fx", asset_name: "KES / USD", ticker: "KES/USD", asset_id: "usd",
  units: 100, buy_price: 1, current_price: 130, current_yield: 0, buy_date: "2026-01-01", notes: "",
  created_at: "2026-09-01T00:00:00.000Z", updated_at: "2026-09-01T00:00:00.000Z", ...overrides,
});

describe("calculatePortfolioLiveMovement", () => {
  it("calculates a rolling estimate from the last eligible pre-24-hour observation", () => {
    const result = calculatePortfolioLiveMovement([holding()], new Map([["holding", "usd"]]), [
      { asset_type: "fx", asset_id: "usd", value: 120, observed_at: "2026-09-08T15:30:00.000Z" },
      { asset_type: "fx", asset_id: "usd", value: 130, observed_at: "2026-09-09T14:00:00.000Z" },
    ], now);
    expect(result).toMatchObject({ openingValue: 12000, closingValue: 13000, change: 1000 });
    expect(result?.percentChange).toBeCloseTo(1000 / 120);
    expect(result?.observedAt).toBe("2026-09-09T14:00:00.000Z");
  });

  it("excludes holdings changed during the comparison period and never fabricates a result", () => {
    const result = calculatePortfolioLiveMovement([holding({ updated_at: "2026-09-09T14:00:00.000Z" })], new Map([["holding", "usd"]]), [
      { asset_type: "fx", asset_id: "usd", value: 120, observed_at: "2026-09-08T15:30:00.000Z" },
    ], now);
    expect(result).toBeNull();
  });
});
