import { describe, expect, it } from "vitest";
import { calculateMarketSummary } from "../../supabase/functions/_shared/market-summary";

describe("calculateMarketSummary", () => {
  it("calculates breadth, market cap and average P/E", () => {
    expect(calculateMarketSummary([
      { dayChange: 1.25, marketCap: 100, peRatio: 10 },
      { dayChange: -0.5, marketCap: 250, peRatio: 20 },
      { dayChange: 0, marketCap: null, peRatio: null },
    ])).toEqual({
      totalMarketCap: 350,
      averagePE: 15,
      advances: 1,
      declines: 1,
      unchanged: 1,
    });
  });

  it("handles null and zero P/E values without producing NaN", () => {
    expect(calculateMarketSummary([
      { dayChange: null, marketCap: null, peRatio: null },
      { dayChange: 0, marketCap: 50, peRatio: 0 },
    ])).toEqual({
      totalMarketCap: 50,
      averagePE: 0,
      advances: 0,
      declines: 0,
      unchanged: 2,
    });
  });
});
