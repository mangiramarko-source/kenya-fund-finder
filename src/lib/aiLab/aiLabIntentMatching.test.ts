import { describe, it, expect } from "vitest";
import { classifyAiLabPrompt } from "./intent";
import { routePrompt } from "./router";
import { isNewsLabPrompt, NEWS_LIMITATION_MSG } from "./newsContext";
import { detectAdviceIntent, RESPONSE_QUALITY_BANNED } from "./safety";
import { composeAssistantResponse } from "./responseComposer";
import type { MarketContext, ComparableAsset } from "./marketContext";
import type { NewsArticle, NewsContext } from "./newsContext";

const mkStock = (symbol: string, name: string, aliases: string[] = []): ComparableAsset => ({
  kind: "stock",
  symbol,
  name,
  value: 18,
  valueLabel: "Price (KES)",
  changePct: 1,
  aliases: [symbol.toLowerCase(), name.toLowerCase(), ...aliases],
});

const ctx: MarketContext = {
  fundCount: 2,
  avgAnnualYieldPct: 11,
  topAnnualYieldPct: 12,
  lowAnnualYieldPct: 10,
  sampleStockSymbol: "SCOM",
  sampleStockPrice: 18,
  sampleStockChangePct: 1,
  assets: [
    mkStock("SCOM", "Safaricom", ["safaricom"]),
    mkStock("KCB", "KCB Group", ["kcb"]),
    mkStock("EQTY", "Equity Group", ["equity"]),
    mkStock("NCBA", "NCBA Group", ["ncba"]),
  ],
  fetchedAt: new Date().toISOString(),
};

const mkArticle = (overrides: Partial<NewsArticle> & { id: string; title: string }): NewsArticle => ({
  summary: "Market update",
  source: "Business Daily",
  datePublished: new Date().toISOString(),
  url: null,
  category: "Market News",
  ...overrides,
});

const newsCtx: NewsContext = {
  articles: [
    mkArticle({ id: "1", title: "Safaricom shares rise", summary: "Safaricom PLC earnings beat" }),
    mkArticle({ id: "2", title: "KCB reports steady growth", summary: "KCB Group quarterly update" }),
    mkArticle({ id: "3", title: "Markets mixed in Nairobi", summary: "NSE session recap" }),
  ],
  fetchedAt: new Date().toISOString(),
};

describe("news intent detection", () => {
  const newsPrompts = [
    "latest news",
    "tell me latest news",
    "market news",
    "what is happening in the market",
    "news on safaricom",
    "latest news on kcb",
  ];

  for (const prompt of newsPrompts) {
    it(`detects news intent for "${prompt}"`, () => {
      expect(isNewsLabPrompt(prompt.toLowerCase())).toBe(true);
      expect(classifyAiLabPrompt(prompt, ctx).intentType).toBe("news-summary");
    });
  }

  it("routes general latest news to news-summary when articles exist", () => {
    const r = routePrompt("tell me latest news", ctx, newsCtx);
    expect(r.kind).toBe("news-summary");
  });

  it("returns limitation fallback without news data", () => {
    const r = routePrompt("tell me latest news", ctx);
    expect(r.kind).toBe("unknown");
    if (r.kind === "unknown") {
      expect(r.message).toBe(NEWS_LIMITATION_MSG);
      expect(r.message.toLowerCase()).not.toContain("searched the internet");
    }
  });
});

describe("news safety fallback", () => {
  it("does not fabricate headlines in limitation fallback", () => {
    const r = routePrompt("latest news", ctx);
    expect(r.kind).toBe("unknown");
    if (r.kind === "unknown") {
      expect(r.message.toLowerCase()).toContain("will not create or guess headlines");
      const composed = composeAssistantResponse({ prompt: "latest news", result: r });
      expect(composed.text.toLowerCase()).not.toMatch(/\b(headline|breaking news):\s/i);
    }
  });

  it("does not claim live internet access", () => {
    const r = routePrompt("market news", ctx);
    expect(r.kind).toBe("unknown");
    if (r.kind === "unknown") {
      expect(r.message.toLowerCase()).toContain("not enabled");
      expect(r.message.toLowerCase()).not.toContain("searched the internet");
    }
  });
});

describe("advice refusals still pass", () => {
  it("refuses Should I buy Safaricom?", () => {
    expect(detectAdviceIntent("Should I buy Safaricom?")).toBe(true);
    expect(routePrompt("Should I buy Safaricom?", ctx).kind).toBe("refusal");
  });

  it("refuses What is the best MMF?", () => {
    expect(detectAdviceIntent("What is the best MMF?")).toBe(true);
    expect(routePrompt("What is the best MMF?", ctx).kind).toBe("refusal");
  });
});

describe("fuzzy compare responses stay safe", () => {
  it("compare safaricom and kcb does not use banned phrases", () => {
    const r = routePrompt("compare safaricom and kcb", ctx);
    expect(r.kind).toBe("compare");
    const composed = composeAssistantResponse({ prompt: "compare safaricom and kcb", result: r });
    for (const pattern of RESPONSE_QUALITY_BANNED) {
      expect(pattern.test(composed.text)).toBe(false);
    }
  });
});
