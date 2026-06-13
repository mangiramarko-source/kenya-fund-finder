import { describe, it, expect } from "vitest";
import {
  buildSavedFundsSection,
  buildSavedStocksSection,
  buildPortfolioSummarySection,
  buildRetentionBlock,
  NEUTRAL_DISCLAIMER_HTML,
} from "../../supabase/functions/_shared/weekly-email-sections";

const FORBIDDEN_WORDS = [
  "best", "top", "recommended", "winner", "safest", "guaranteed",
  "should invest", "ideal", "perfect for you",
];

describe("weekly email sections — saved funds", () => {
  it("renders empty string when no rows", () => {
    expect(buildSavedFundsSection([])).toBe("");
  });
  it("renders rows with neutral copy and change badge", () => {
    const html = buildSavedFundsSection([
      { name: "CIC MMF", latest_yield: 14.5, yield_unit: "%", yield_change: 0.2, last_updated: "2026-06-10" },
    ]);
    expect(html).toContain("Saved unit trusts");
    expect(html).toContain("CIC MMF");
    expect(html).toContain("14.50%");
    expect(html).toContain("0.20%");
    FORBIDDEN_WORDS.forEach((w) => expect(html.toLowerCase()).not.toContain(w));
  });
  it("omits change badge when change is null", () => {
    const html = buildSavedFundsSection([
      { name: "Test Fund", latest_yield: 10, yield_unit: "%", yield_change: null, last_updated: null },
    ]);
    expect(html).not.toContain("▲");
    expect(html).not.toContain("▼");
  });
  it("escapes HTML in fund names", () => {
    const html = buildSavedFundsSection([
      { name: "<script>x</script>", latest_yield: 1, yield_unit: "%", yield_change: null, last_updated: null },
    ]);
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("weekly email sections — saved stocks", () => {
  it("renders empty string when no rows", () => {
    expect(buildSavedStocksSection([])).toBe("");
  });
  it("renders rows with KES formatting", () => {
    const html = buildSavedStocksSection([
      { name: "Safaricom PLC", symbol: "SCOM", price: 17.5, price_change: -0.3, last_updated: "2026-06-10" },
    ]);
    expect(html).toContain("Saved stocks");
    expect(html).toContain("SCOM");
    expect(html).toContain("KES 17.50");
    FORBIDDEN_WORDS.forEach((w) => expect(html.toLowerCase()).not.toContain(w));
  });
});

describe("weekly email sections — portfolio summary", () => {
  it("returns empty when portfolio is null", () => {
    expect(buildPortfolioSummarySection(null)).toBe("");
  });
  it("returns empty when total is 0", () => {
    expect(buildPortfolioSummarySection({
      totalValue: 0, weightedYield: null, monthlyIncomeEstimate: null, allocation: [],
    })).toBe("");
  });
  it("renders summary with weighted yield & monthly income", () => {
    const html = buildPortfolioSummarySection({
      totalValue: 100000,
      weightedYield: 12.5,
      monthlyIncomeEstimate: 885.42,
      allocation: [{ label: "Unit Trusts", value: 100000, pct: 100 }],
    });
    expect(html).toContain("Portfolio summary");
    expect(html).toContain("KES 100,000.00");
    expect(html).toContain("12.50%");
    expect(html).toContain("Unit Trusts");
    FORBIDDEN_WORDS.forEach((w) => expect(html.toLowerCase()).not.toContain(w));
  });
  it("falls back to neutral wording when data unavailable", () => {
    const html = buildPortfolioSummarySection({
      totalValue: 1000, weightedYield: null, monthlyIncomeEstimate: null, allocation: [],
    });
    expect(html).toContain("Not available yet");
  });
});

describe("buildRetentionBlock", () => {
  it("returns empty string when all inputs are empty", () => {
    expect(buildRetentionBlock({ savedFunds: [], savedStocks: [], portfolio: null })).toBe("");
  });
  it("renders only sections that have data (no empty sections)", () => {
    const html = buildRetentionBlock({
      savedFunds: [{ name: "F", latest_yield: 10, yield_unit: "%", yield_change: null, last_updated: null }],
      savedStocks: [],
      portfolio: null,
    });
    expect(html).toContain("Saved unit trusts");
    expect(html).not.toContain("Saved stocks");
    expect(html).not.toContain("Portfolio summary");
  });
});

describe("neutral disclaimer", () => {
  it("does not contain advice language", () => {
    expect(NEUTRAL_DISCLAIMER_HTML).toContain("not personal financial advice");
    FORBIDDEN_WORDS.forEach((w) => expect(NEUTRAL_DISCLAIMER_HTML.toLowerCase()).not.toContain(w));
  });
});
