import { describe, it, expect } from "vitest";
import { applyLiveContext, type MarketContext } from "./marketContext";

const ctx: MarketContext = {
  fundCount: 20,
  avgAnnualYieldPct: 10.5,
  topAnnualYieldPct: 13.2,
  lowAnnualYieldPct: 6.1,
  sampleStockSymbol: "SCOM",
  sampleStockPrice: 15,
  sampleStockChangePct: 2.4,
  fetchedAt: new Date().toISOString(),
};

describe("applyLiveContext", () => {
  it("substitutes current average yield when prompt asks for it", () => {
    const r = applyLiveContext("If I invest KES 100,000 at the current average yield", ctx);
    expect(r.substituted).toBe(true);
    expect(r.prompt).toMatch(/10\.5%\s+yield/);
  });

  it("substitutes top MMF yield", () => {
    const r = applyLiveContext("If I invest KES 100,000 at the top MMF for 12 months", ctx);
    expect(r.substituted).toBe(true);
    expect(r.prompt).toMatch(/13\.2%\s+yield/);
  });

  it("leaves explicit percentages alone", () => {
    const r = applyLiveContext("If I invest KES 100,000 at 11% yield", ctx);
    expect(r.substituted).toBe(false);
    expect(r.prompt).toBe("If I invest KES 100,000 at 11% yield");
  });

  it("no-ops when ctx is null", () => {
    const r = applyLiveContext("current average yield", null);
    expect(r.substituted).toBe(false);
  });
});
