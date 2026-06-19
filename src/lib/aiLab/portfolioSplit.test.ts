import { describe, it, expect } from "vitest";
import { routePrompt } from "./router";
import { PORTFOLIO_SPLIT_UNKNOWN_MSG } from "./intent";
import {
  calculatePortfolioSplitScenario,
  getPortfolioSplitUserText,
  PORTFOLIO_SPLIT_IMPORTANT_NOTES,
  PORTFOLIO_SPLIT_SUMMARY,
} from "./scenarios";
import type { NewsArticle, NewsContext } from "./newsContext";
import type { ComparableAsset, MarketContext } from "./marketContext";

const mkStock = (symbol: string, name: string, price: number): ComparableAsset => ({
  kind: "stock",
  symbol,
  name,
  value: price,
  valueLabel: "Price (KES)",
  changePct: 1.2,
  aliases: [symbol.toLowerCase(), name.toLowerCase()],
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

const mkCommodity = (symbol: string, name: string, price: number): ComparableAsset => ({
  kind: "commodity",
  symbol,
  name,
  value: price,
  valueLabel: "Price (USD)",
  changePct: 0.5,
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
    mkStock("KCB", "KCB Group", 55),
    mkFx("USD", "US Dollar", 129.5),
    mkCommodity("GOLD", "Gold", 2650),
    mkCommodity("BRENT", "Brent Crude", 82),
  ],
  fetchedAt: new Date().toISOString(),
};

const noYieldCtx: MarketContext = { ...ctx, avgAnnualYieldPct: null };

const safaricomNewsArticle: NewsArticle = {
  id: "ps-1",
  title: "Safaricom earnings update",
  summary: "Safaricom PLC reported quarterly results.",
  source: "Nation",
  datePublished: new Date().toISOString(),
  url: "https://example.com/safaricom-ps",
  category: "Market News",
};

const newsCtx: NewsContext = {
  articles: [safaricomNewsArticle],
  fetchedAt: new Date().toISOString(),
};

const FORBIDDEN = [
  "you should buy",
  "i recommend",
  "best allocation",
  "optimal allocation",
  "put your money in",
  "guaranteed return",
  "will rise",
  "will fall",
];

describe("portfolio-split routing and calculation", () => {
  it("G5-1: 70% MMF and 30% SCOM at 11% yield uses illustrative KES 100,000", () => {
    const r = routePrompt("70% MMF and 30% SCOM at 11% yield", ctx);
    expect(r.kind).toBe("portfolio-split");
    if (r.kind === "portfolio-split") {
      expect(r.inputs.totalAmount).toBe(100_000);
      expect(r.inputs.mmfPercent).toBe(70);
      expect(r.inputs.stockPercent).toBe(30);
      expect(r.assumptions.some((a) => a.includes("illustrative KES 100,000"))).toBe(true);
    }
  });

  it("Split 100k between MMF and SCOM at 11% yield routes to portfolio-split", () => {
    const r = routePrompt("Split 100k between MMF and SCOM at 11% yield", ctx);
    expect(r.kind).toBe("portfolio-split");
    if (r.kind === "portfolio-split") {
      expect(r.inputs.totalAmount).toBe(100_000);
      expect(r.inputs.mmfPercent).toBe(50);
      expect(r.inputs.stockPercent).toBe(50);
      expect(r.inputs.annualYieldPct).toBe(11);
    }
  });

  it("default split is 50/50 when no percentages given", () => {
    const r = routePrompt("Split 100k between MMF and SCOM at 11% yield", ctx);
    expect(r.kind).toBe("portfolio-split");
    if (r.kind === "portfolio-split") {
      expect(r.inputs.mmfPercent).toBe(50);
      expect(r.inputs.stockPercent).toBe(50);
    }
  });

  it("70% MMF / 30% Safaricom parses correctly", () => {
    const r = routePrompt("70% MMF and 30% Safaricom at 11% yield", ctx);
    expect(r.kind).toBe("portfolio-split");
    if (r.kind === "portfolio-split") {
      expect(r.inputs.mmfPercent).toBe(70);
      expect(r.inputs.stockPercent).toBe(30);
      expect(r.inputs.stockSymbol).toBe("SCOM");
    }
  });

  it("50k MMF / 50k SCOM parses correctly", () => {
    const r = routePrompt("50k in MMF and 50k in SCOM at 11% yield", ctx);
    expect(r.kind).toBe("portfolio-split");
    if (r.kind === "portfolio-split") {
      expect(r.inputs.totalAmount).toBe(100_000);
      expect(r.inputs.mmfAmount).toBe(50_000);
      expect(r.inputs.stockAmount).toBe(50_000);
    }
  });

  it("stock -10% row calculates correctly", () => {
    const r = routePrompt("Split 100k between MMF and SCOM at 11% yield", ctx);
    expect(r.kind).toBe("portfolio-split");
    if (r.kind === "portfolio-split") {
      const row = r.rows.find((x) => x.stockMovementPct === -10);
      expect(row).toBeDefined();
      expect(row!.mmfEstimatedValue).toBe(55_500);
      expect(row!.stockEstimatedValue).toBe(45_000);
      expect(row!.totalEstimatedValue).toBe(100_500);
      expect(row!.estimatedGainLoss).toBe(500);
    }
  });

  it("stock +10% row calculates correctly", () => {
    const r = routePrompt("Split 100k between MMF and SCOM at 11% yield", ctx);
    expect(r.kind).toBe("portfolio-split");
    if (r.kind === "portfolio-split") {
      const row = r.rows.find((x) => x.stockMovementPct === 10);
      expect(row!.stockEstimatedValue).toBe(55_000);
      expect(row!.totalEstimatedValue).toBe(110_500);
      expect(row!.estimatedGainLoss).toBe(10_500);
    }
  });

  it("MMF side uses stated yield", () => {
    const r = routePrompt("Split 100k between MMF and SCOM at 10.5% yield", ctx);
    expect(r.kind).toBe("portfolio-split");
    if (r.kind === "portfolio-split") {
      expect(r.inputs.annualYieldPct).toBe(10.5);
      expect(r.rows[0].mmfEstimatedValue).toBe(Math.round(50_000 * 1.105));
    }
  });

  it("total estimated gain/loss calculates correctly", () => {
    const result = calculatePortfolioSplitScenario({
      totalAmount: 100_000,
      mmfPercent: 50,
      stockPercent: 50,
      stockSymbol: "SCOM",
      stockName: "Safaricom",
      stockPrice: 18.5,
      annualYieldPct: 11,
    });
    const flat = result.rows.find((x) => x.stockMovementPct === 0);
    expect(flat!.totalEstimatedValue).toBe(105_500);
    expect(flat!.estimatedGainLoss).toBe(5_500);
  });
});

describe("portfolio-split missing data", () => {
  it("G5-2: If stocks fall 10% but MMF earns 11% returns unknown", () => {
    const r = routePrompt("If stocks fall 10% but MMF earns 11%, what happens?", ctx);
    expect(r.kind).toBe("unknown");
    if (r.kind === "unknown") {
      expect(r.message).toBe(PORTFOLIO_SPLIT_UNKNOWN_MSG);
    }
  });

  it("G5-3: If SCOM falls 10% but MMF earns 11% routes to portfolio-split", () => {
    const r = routePrompt("If SCOM falls 10% but MMF earns 11%, what happens?", ctx);
    expect(r.kind).toBe("portfolio-split");
    if (r.kind === "portfolio-split") {
      expect(r.inputs.stockSymbol).toBe("SCOM");
      expect(r.inputs.annualYieldPct).toBe(11);
      expect(r.inputs.totalAmount).toBe(100_000);
    }
  });

  it("missing stock asset returns safe unknown", () => {
    const r = routePrompt("Split 100k between MMF and FAKECO at 11% yield", ctx);
    expect(r.kind).toBe("unknown");
  });

  it("missing stock price returns safe unknown", () => {
    const badCtx: MarketContext = {
      ...ctx,
      assets: [mkStock("SCOM", "Safaricom", 0)],
    };
    const r = routePrompt("Split 100k between MMF and SCOM at 11% yield", badCtx);
    expect(r.kind).toBe("unknown");
  });

  it("missing yield and no reliable average yield returns safe unknown", () => {
    const r = routePrompt("Split 100k between MMF and SCOM", noYieldCtx);
    expect(r.kind).toBe("unknown");
  });

  it("conflicting percentages return safe unknown", () => {
    const r = routePrompt("70% MMF and 20% SCOM at 11% yield", ctx);
    expect(r.kind).toBe("unknown");
  });
});

describe("portfolio-split refusals", () => {
  it("G5-4: Should I split 100k between MMF and SCOM refuses", () => {
    expect(routePrompt("Should I split 100k between MMF and SCOM?", ctx).kind).toBe("refusal");
  });

  it("G5-5: Should I put 70% in MMF and 30% in Safaricom refuses", () => {
    expect(routePrompt("Should I put 70% in MMF and 30% in Safaricom?", ctx).kind).toBe("refusal");
  });

  it("Which split is better refuses", () => {
    expect(routePrompt("Which split is better?", ctx).kind).toBe("refusal");
  });

  it("What is the best allocation refuses", () => {
    expect(routePrompt("What is the best allocation?", ctx).kind).toBe("refusal");
  });

  it("Should I put more in MMF or stocks refuses", () => {
    expect(routePrompt("Should I put more in MMF or stocks?", ctx).kind).toBe("refusal");
  });

  it("Do you recommend 70/30 refuses", () => {
    expect(routePrompt("Do you recommend 70/30?", ctx).kind).toBe("refusal");
  });
});

describe("portfolio-split safety output", () => {
  it("output includes disclaimer", () => {
    const r = routePrompt("Split 100k between MMF and SCOM at 11% yield", ctx);
    expect(r.kind).toBe("portfolio-split");
    if (r.kind === "portfolio-split") {
      expect(r.disclaimer).toBe("Data only. Not personal financial advice.");
    }
  });

  it("output includes not a recommendation", () => {
    const r = routePrompt("Split 100k between MMF and SCOM at 11% yield", ctx);
    expect(r.kind).toBe("portfolio-split");
    if (r.kind === "portfolio-split") {
      expect(r.summary).toContain("not a recommendation");
      for (const note of PORTFOLIO_SPLIT_IMPORTANT_NOTES) {
        expect(r.importantNotes).toContain(note);
      }
    }
  });

  it("generated output excludes forbidden advisory wording", () => {
    const result = calculatePortfolioSplitScenario({
      totalAmount: 100_000,
      mmfPercent: 50,
      stockPercent: 50,
      stockSymbol: "SCOM",
      stockName: "Safaricom",
      stockPrice: 18.5,
      annualYieldPct: 11,
    });
    const text = getPortfolioSplitUserText(result).toLowerCase();
    for (const phrase of FORBIDDEN) {
      expect(text).not.toContain(phrase);
    }
    expect(result.summary).toBe(PORTFOLIO_SPLIT_SUMMARY);
  });
});

describe("portfolio-split regressions", () => {
  it("KES 10,000 in SCOM still routes to stock amount", () => {
    expect(routePrompt("KES 10,000 in SCOM", ctx).kind).toBe("stock-amount");
  });

  it("If I put 100,000 in an MMF still routes to MMF", () => {
    expect(routePrompt("If I put 100,000 in an MMF, how much do I get?", ctx).kind).toBe("mmf");
  });

  it("KES 100,000 to USD still routes to FX conversion", () => {
    expect(routePrompt("KES 100,000 to USD", ctx).kind).toBe("fx-conversion");
  });

  it("Gold rises 5% still routes to commodity move", () => {
    expect(routePrompt("Gold rises 5%", ctx).kind).toBe("commodity-move");
  });

  it("Latest news about Safaricom still routes to news-summary with news data", () => {
    const r = routePrompt("Latest news about Safaricom", ctx, newsCtx);
    expect(r.kind).toBe("news-summary");
  });

  it("Compare Gold vs Brent Crude still routes to compare", () => {
    expect(routePrompt("Compare Gold vs Brent Crude", ctx).kind).toBe("compare");
  });
});
