import { describe, expect, it } from "vitest";
import {
  evaluateStockScorecard,
  resolveSectorBenchmark,
} from "@/lib/stockFundamentalScorecard";
import { buildInvestorBriefing } from "@/lib/newsBriefingMapper";
import type { NewsFromDB, PublicStock } from "@/lib/api";

describe("stockFundamentalScorecard", () => {
  it("resolves Kenyan NSE sector benchmarks accurately without redundant NSE prefixes", () => {
    expect(resolveSectorBenchmark("Banking").label).toBe("Banking");
    expect(resolveSectorBenchmark("Telecommunications").label).toBe("Telecommunications");
    expect(resolveSectorBenchmark("Manufacturing & Allied").label).toBe("Manufacturing");
    expect(resolveSectorBenchmark(null).label).toBe("All-Share");
  });

  it("evaluates Equity Group (EQTY) with dynamic verified denominator and audited baselines", () => {
    const eqty: PublicStock = {
      id: "eqty-1",
      symbol: "EQTY",
      name: "Equity Group Holdings Plc",
      sector: "Banking",
      price: 42.5,
      previous_price: 41.8,
      day_change_percent: 1.67,
      pe_ratio: 4.6,
      dividend_yield: 8.4,
      year_low: 36.0,
      year_high: 52.5,
    };

    const scorecard = evaluateStockScorecard(eqty, { mmfBenchmarkYield: 14.5, mmfBenchmarkName: "Etica MMF" });

    expect(scorecard.symbol).toBe("EQTY");
    expect(scorecard.sectorLabel).toBe("Banking");
    expect(scorecard.passedScore).toBeGreaterThanOrEqual(15);
    expect(scorecard.evaluatedCount).toBeGreaterThanOrEqual(20);
    expect(scorecard.evaluatedCount + scorecard.unverifiedCount).toBe(30);
    expect(scorecard.scoreText).toBe(`${scorecard.passedScore}/${scorecard.evaluatedCount} Verified`);
    expect(scorecard.pillars.value).toBeGreaterThanOrEqual(0);
    expect(scorecard.pillars.value).toBeLessThanOrEqual(6);
    expect(scorecard.metrics.peRatio).toBe(4.6);
    expect(scorecard.metrics.sectorMedianPe).toBe(5.4);
    expect(scorecard.metrics.earningsYield).toBeCloseTo(21.7, 1);
    expect(scorecard.metrics.mmfEarningsYieldSpread).toBeGreaterThan(0);
    expect(scorecard.metrics.mmfBenchmarkName).toBe("Etica MMF");
    expect(scorecard.metrics.mmfBenchmarkYield).toBe(14.5);
    expect(scorecard.feedChips.length).toBeGreaterThanOrEqual(2);
    expect(scorecard.checks.length).toBe(30);

    // Checks without data should have insufficient_data status and passed: false
    const pendingChecks = scorecard.checks.filter((c) => c.status === "insufficient_data");
    expect(pendingChecks.length).toBe(scorecard.unverifiedCount);
    pendingChecks.forEach((c) => {
      expect(c.passed).toBe(false);
      expect(c.title).toContain("Pending Disclosure");
    });
  });

  it("handles thin-traded or unlisted tickers strictly without fabricating fake data", () => {
    const thinStock: PublicStock = {
      id: "thin-1",
      symbol: "UNKN",
      name: "Unknown Counter Ltd",
      price: 12.0,
      previous_price: 12.0,
      day_change_percent: 0,
    };

    const scorecard = evaluateStockScorecard(thinStock);
    expect(scorecard.passedScore).toBeGreaterThanOrEqual(0);
    expect(scorecard.evaluatedCount).toBeLessThan(30);
    expect(scorecard.unverifiedCount).toBeGreaterThan(10);
    expect(scorecard.scoreText).toBe(`${scorecard.passedScore}/${scorecard.evaluatedCount} Verified`);
    expect(Number.isNaN(scorecard.totalScore)).toBe(false);
    expect(scorecard.sectorLabel).toBe("All-Share");

    // Intrinsic fair value must be null when audited book value / EPS is missing
    expect(scorecard.metrics.fairValueEstimate).toBeNull();
    expect(scorecard.metrics.valuationStatus).toBe("Disclosures Pending");
  });

  it("attaches the 5-pillar scorecard to NormalizedMarketSnapshot in buildInvestorBriefing", () => {
    const article: NewsFromDB = {
      id: "art-scom-1",
      title: "Safaricom expands M-PESA merchant network across Kenya",
      summary: "Safaricom reported higher active merchant usage across retail channels.",
      content: "Safaricom PLC expanded its merchant network by 14% year-on-year.",
      source: "Business Daily",
      date_published: new Date().toISOString(),
      source_published_at: new Date().toISOString(),
      url: "https://businessdailyafrica.com/scom",
      category: "Stocks",
      read_time: "2 min read",
      is_featured: false,
      status: "published",
      image_url: null,
      related_stock_id: "scom-id",
      ai_insight: null,
    };

    const stock: PublicStock = {
      id: "scom-id",
      symbol: "SCOM",
      name: "Safaricom PLC",
      sector: "Telecommunications",
      price: 35.75,
      previous_price: 35.2,
      day_change_percent: 1.56,
      pe_ratio: 10.5,
      dividend_yield: 6.2,
      year_low: 20.0,
      year_high: 40.0,
    };

    const briefing = buildInvestorBriefing(article, { stock });
    expect(briefing.marketSnapshot).toBeDefined();
    expect(briefing.marketSnapshot?.scorecard).toBeDefined();
    expect(briefing.marketSnapshot?.scorecard?.symbol).toBe("SCOM");
    expect(briefing.marketSnapshot?.scorecard?.passedScore).toBeGreaterThan(10);
    expect(briefing.marketSnapshot?.scorecard?.scoreText).toContain("Verified");
  });
});
