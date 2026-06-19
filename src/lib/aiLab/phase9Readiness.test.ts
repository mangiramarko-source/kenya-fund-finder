/**
 * Phase 9 — public beta readiness smoke tests.
 * Verifies scenario inventory, disclaimers, and polish copy without adding calculators.
 */
import { describe, it, expect } from "vitest";
import { routePrompt } from "./router";
import {
  AI_LAB_BETA_BADGE,
  AI_LAB_BETA_NOTE,
  AI_LAB_SCENARIO_INVENTORY,
} from "./readiness";
import { NEWS_UNKNOWN_MSG } from "./intent";
import { SAFE_ALTERNATIVES, STANDARD_DISCLAIMER } from "./safety";
import type { NewsArticle, NewsContext } from "./newsContext";
import type { ComparableAsset, MarketContext } from "./marketContext";

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
    mkFx("USD", "US Dollar", 129.5),
    mkCommodity("GOLD", "Gold", 2650),
    mkCommodity("BRENT", "Brent Crude", 82),
  ],
  fetchedAt: new Date().toISOString(),
};

const newsCtx: NewsContext = {
  articles: [
    {
      id: "r1",
      title: "Safaricom earnings update",
      summary: "Safaricom PLC reported quarterly results.",
      source: "Nation",
      datePublished: new Date().toISOString(),
      url: "https://example.com/safaricom-r9",
      category: "Market News",
    },
  ],
  fetchedAt: new Date().toISOString(),
};

const SCENARIO_SMOKE: Array<{ prompt: string; kind: string; needsNews?: boolean }> = [
  { prompt: "If I put 100,000 in an MMF, how much do I get?", kind: "mmf" },
  { prompt: "What happens if yield drops from 11% to 9% on 100k?", kind: "mmf-yield-change" },
  { prompt: "KES 10,000 in SCOM", kind: "stock-amount" },
  { prompt: "What happens if a stock falls 10% on KES 100,000?", kind: "stock-move" },
  {
    prompt: "If I start with KES 100,000 and add KES 10,000 monthly at 11% for 12 months",
    kind: "goal-projection",
  },
  { prompt: "Compare SCOM vs EQTY", kind: "compare" },
  { prompt: "KES 100,000 to USD", kind: "fx-conversion" },
  { prompt: "USD/KES falls 5%", kind: "fx-move" },
  { prompt: "Gold rises 5%", kind: "commodity-move" },
  { prompt: "Latest news about Safaricom", kind: "news-summary", needsNews: true },
  { prompt: "Split 100k between MMF and SCOM at 11% yield", kind: "portfolio-split" },
  { prompt: "Explain dividend yield", kind: "explainer" },
];

describe("Phase 9 readiness copy", () => {
  it("exports beta badge and note", () => {
    expect(AI_LAB_BETA_BADGE.toLowerCase()).toContain("admin");
    expect(AI_LAB_BETA_BADGE.toLowerCase()).toContain("phase 13");
    expect(AI_LAB_BETA_NOTE).toContain("admin-only");
    expect(AI_LAB_BETA_NOTE).toContain("does not use an LLM");
  });

  it("documents supported scenario inventory without new kinds", () => {
    expect(AI_LAB_SCENARIO_INVENTORY).toHaveLength(12);
    expect(AI_LAB_SCENARIO_INVENTORY).toContain("portfolio-split");
    expect(AI_LAB_SCENARIO_INVENTORY).toContain("news-summary");
    expect(AI_LAB_SCENARIO_INVENTORY).not.toContain("llm");
  });

  it("NEWS_UNKNOWN_MSG reflects data miss not unsupported feature", () => {
    expect(NEWS_UNKNOWN_MSG.toLowerCase()).not.toContain("not fully supported");
    expect(NEWS_UNKNOWN_MSG.toLowerCase()).toContain("matching news");
  });

  it("SAFE_ALTERNATIVES use scenario phrasing only", () => {
    const forbidden = ["you should", "i recommend", "best fund", "put your money in"];
    const joined = SAFE_ALTERNATIVES.join(" ").toLowerCase();
    for (const phrase of forbidden) {
      expect(joined).not.toContain(phrase);
    }
    expect(SAFE_ALTERNATIVES.length).toBeGreaterThanOrEqual(4);
  });
});

describe("Phase 9 scenario smoke routing", () => {
  for (const { prompt, kind, needsNews } of SCENARIO_SMOKE) {
    it(`routes '${prompt.slice(0, 40)}…' to ${kind}`, () => {
      const r = routePrompt(prompt, ctx, needsNews ? newsCtx : undefined);
      expect(r.kind).toBe(kind);
      if (r.kind !== "refusal" && r.kind !== "unknown") {
        expect((r as { disclaimer: string }).disclaimer).toBe(DISCLAIMER);
      }
    });
  }

  it("refusal and unknown still include disclaimer", () => {
    const refusal = routePrompt("Which fund should I buy?", ctx);
    expect(refusal.kind).toBe("refusal");
    if (refusal.kind === "refusal") {
      expect(refusal.disclaimer).toBe(STANDARD_DISCLAIMER);
    }

    const unknown = routePrompt("Latest news about Safaricom", ctx);
    expect(unknown.kind).toBe("unknown");
    if (unknown.kind === "unknown") {
      expect(unknown.message).toBe(NEWS_UNKNOWN_MSG);
      expect(unknown.disclaimer).toBe(STANDARD_DISCLAIMER);
    }
  });
});

describe("Phase 9 regression guard", () => {
  it("does not add new scenario kind beyond inventory", () => {
    const kinds = new Set(
      SCENARIO_SMOKE.map((s) => {
        const r = routePrompt(s.prompt, ctx, s.needsNews ? newsCtx : undefined);
        return r.kind;
      }),
    );
    for (const kind of kinds) {
      if (kind === "refusal" || kind === "unknown") continue;
      expect(AI_LAB_SCENARIO_INVENTORY).toContain(kind);
    }
  });
});
