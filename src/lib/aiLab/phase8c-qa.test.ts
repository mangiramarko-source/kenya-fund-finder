/**
 * Phase 8C manual QA checklist — deterministic routing verification.
 * Mirrors browser test prompts; delete after QA pass if desired.
 */
import { describe, it, expect } from "vitest";
import { routePrompt } from "./router";
import { COMMODITY_UNKNOWN_MSG, FX_UNKNOWN_MSG, NEWS_UNKNOWN_MSG } from "./intent";
import { getMmfUserText } from "./scenarios";
import type { ComparableAsset, MarketContext } from "./marketContext";
import type { NewsArticle, NewsContext } from "./newsContext";

const DISCLAIMER = "Data only. Not personal financial advice.";

const mkStock = (symbol: string, name: string, price: number): ComparableAsset => ({
  kind: "stock",
  symbol,
  name,
  value: price,
  valueLabel: "Price (KES)",
  changePct: 1.2,
  aliases: [symbol.toLowerCase(), name.toLowerCase()],
});

const mkCommodity = (symbol: string, name: string, price: number): ComparableAsset => ({
  kind: "commodity",
  symbol,
  name,
  value: price,
  valueLabel: "Price (USD)",
  changePct: 0.5,
  aliases: [symbol.toLowerCase(), name.toLowerCase(), name.split(" ")[0].toLowerCase()],
});

const mkFx = (symbol: string, name: string, rate: number): ComparableAsset => ({
  kind: "fx",
  symbol,
  name,
  value: rate,
  valueLabel: "KES per 1 unit",
  changePct: 0.1,
  aliases: [symbol.toLowerCase(), name.toLowerCase()],
});

const ctx: MarketContext = {
  fundCount: 10,
  avgAnnualYieldPct: 11,
  topAnnualYieldPct: 12,
  lowAnnualYieldPct: 9,
  sampleStockSymbol: "SCOM",
  sampleStockPrice: 18.5,
  sampleStockChangePct: 1.2,
  assets: [
    mkStock("SCOM", "Safaricom", 18.5),
    mkStock("EQTY", "Equity Group", 44.1),
    mkFx("USD", "US Dollar", 129.5),
    mkCommodity("GOLD", "Gold", 2650),
    mkCommodity("BRENT", "Brent Crude", 82),
  ],
  fetchedAt: new Date().toISOString(),
};

const safaricomNewsArticle: NewsArticle = {
  id: "qa-1",
  title: "Safaricom earnings update",
  summary: "Safaricom PLC reported quarterly results.",
  source: "Nation",
  datePublished: new Date().toISOString(),
  url: "https://example.com/safaricom-qa",
  category: "Market News",
};

const newsCtx: NewsContext = {
  articles: [safaricomNewsArticle],
  fetchedAt: new Date().toISOString(),
};

const FORBIDDEN = ["you should buy", "i recommend", "put your money in", "you will make", "you will earn"];

describe("Phase 8C manual QA checklist", () => {
  it("TEST 1 — Latest news about Safaricom without news data", () => {
    const r = routePrompt("Latest news about Safaricom");
    expect(r.kind).toBe("unknown");
    if (r.kind === "unknown") {
      expect(r.message).toBe(NEWS_UNKNOWN_MSG);
      expect(r.disclaimer).toBe(DISCLAIMER);
      const joined = [r.message, ...r.suggestions].join(" ").toLowerCase();
      for (const phrase of FORBIDDEN) expect(joined).not.toContain(phrase);
    }
  });

  it("TEST 1b — Latest news about Safaricom with mock news", () => {
    const r = routePrompt("Latest news about Safaricom", ctx, newsCtx);
    expect(r.kind).toBe("news-summary");
    if (r.kind === "news-summary") {
      expect(r.summary).toContain("KenyaFundFinder news data");
      expect(r.articles.length).toBeGreaterThan(0);
      expect(r.disclaimer).toBe(DISCLAIMER);
    }
  });

  it("TEST 2 — KES 100,000 to USD with USD asset", () => {
    const r = routePrompt("KES 100,000 to USD", ctx);
    expect(r.kind).toBe("fx-conversion");
    if (r.kind === "fx-conversion") {
      expect(r.inputs.toCurrency).toBe("USD");
      expect(r.disclaimer).toBe(DISCLAIMER);
    }
  });

  it("TEST 2b — KES 100,000 to USD without USD returns FX unknown", () => {
    const r = routePrompt("KES 100,000 to USD");
    expect(r.kind).toBe("unknown");
    if (r.kind === "unknown") {
      expect(r.message).toBe(FX_UNKNOWN_MSG);
      expect(r.disclaimer).toBe(DISCLAIMER);
    }
  });

  it("TEST 3 — Gold rises 5% with Gold asset", () => {
    const r = routePrompt("Gold rises 5%", ctx);
    expect(r.kind).toBe("commodity-move");
    if (r.kind === "commodity-move") {
      expect(r.inputs.symbol).toBe("GOLD");
      expect(r.disclaimer).toBe(DISCLAIMER);
    }
  });

  it("TEST 3b — Gold rises 5% without Gold returns commodity unknown", () => {
    const r = routePrompt("Gold rises 5%");
    expect(r.kind).toBe("unknown");
    if (r.kind === "unknown") {
      expect(r.message).toBe(COMMODITY_UNKNOWN_MSG);
      expect(r.disclaimer).toBe(DISCLAIMER);
    }
  });

  it("TEST 4 — KES 10,000 in SCOM", () => {
    const r = routePrompt("KES 10,000 in SCOM", ctx);
    expect(r.kind).toBe("stock-amount");
    if (r.kind === "stock-amount") {
      expect(r.inputs.latestPrice).toBeGreaterThan(0);
      expect(r.approximateShares).toBeGreaterThan(0);
      expect(r.rows.length).toBeGreaterThan(0);
      expect(r.disclaimer).toBe(DISCLAIMER);
    }
  });

  it("TEST 5 — How much will I make if I put KES 10,000 in Safaricom?", () => {
    const r = routePrompt("How much will I make if I put KES 10,000 in Safaricom?", ctx);
    expect(r.kind).toBe("stock-amount");
    if (r.kind === "stock-amount") {
      expect(r.summary.toLowerCase()).toContain("does not predict profit");
      expect(r.summary.toLowerCase()).not.toContain("you will make");
    }
  });

  it("TEST 6 — If I put 100,000 in an MMF, how much do I get?", () => {
    const r = routePrompt("If I put 100,000 in an MMF, how much do I get?", ctx);
    expect(r.kind).toBe("mmf");
    if (r.kind === "mmf") {
      expect(r.grossYearly).toBeGreaterThan(0);
      expect(r.monthlyEquivalent).toBeGreaterThan(0);
      expect(r.dailyEquivalent).toBeGreaterThan(0);
      expect(getMmfUserText(r).toLowerCase()).not.toContain("mutual fund");
      expect(r.disclaimer).toBe(DISCLAIMER);
    }
  });

  it("TEST 7 — goal projection", () => {
    const r = routePrompt(
      "If I start with KES 100,000 and add KES 10,000 monthly at 11% for 12 months",
    );
    expect(r.kind).toBe("goal-projection");
    if (r.kind === "goal-projection") {
      expect(r.totals.totalContributions).toBeGreaterThan(0);
      expect(r.totals.estimatedGrossValue).toBeGreaterThan(0);
      expect(r.rows).toHaveLength(12);
      expect(r.disclaimer).toBe(DISCLAIMER);
    }
  });

  it("TEST 8 — Compare Gold vs Brent Crude", () => {
    const r = routePrompt("Compare Gold vs Brent Crude", ctx);
    expect(r.kind).toBe("compare");
    if (r.kind === "compare") {
      expect(r.assets.map((a) => a.symbol).sort()).toEqual(["BRENT", "GOLD"]);
      expect(r.disclaimer).toBe(DISCLAIMER);
    }
  });

  it("TEST 9 — Explain dividend yield", () => {
    const r = routePrompt("Explain dividend yield");
    expect(r.kind).toBe("explainer");
    if (r.kind === "explainer") {
      expect(r.disclaimer).toBe(DISCLAIMER);
    }
  });

  it("TEST 10 — Which fund should I buy?", () => {
    const r = routePrompt("Which fund should I buy?");
    expect(r.kind).toBe("refusal");
    if (r.kind === "refusal") {
      expect(r.disclaimer).toBe(DISCLAIMER);
    }
  });
});
