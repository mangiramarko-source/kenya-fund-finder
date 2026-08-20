import { describe, it, expect } from "vitest";
import { routePrompt } from "./router";
import type { MarketContext } from "./marketContext";
import type { NewsContext } from "./newsContext";
import {
  composeAssistantResponse,
  composeCapabilitiesGuide,
  composedOutputIsSafe,
  isCapabilitiesPrompt,
  composeFilterUnsupportedResponse,
  capFollowUps,
  isFilterLookupPrompt,
} from "./responseComposer";
import { hasResponseQualityIssue, STANDARD_DISCLAIMER } from "./safety";
import type { WebsiteLookupScenarioResult } from "./scenarios";

const ctx: MarketContext = {
  fundCount: 10,
  avgAnnualYieldPct: 11,
  topAnnualYieldPct: 12,
  lowAnnualYieldPct: 9,
  sampleStockSymbol: "SCOM",
  sampleStockPrice: 18.5,
  sampleStockChangePct: 1.2,
  assets: [
    {
      kind: "stock",
      id: "s1",
      symbol: "SCOM",
      name: "Safaricom",
      value: 18.5,
      valueLabel: "Price (KES)",
      changePct: 1.2,
      aliases: ["scom", "safaricom"],
    },
    {
      kind: "fund",
      id: "f1",
      symbol: "Etica MMF",
      name: "Etica MMF",
      value: 11.5,
      valueLabel: "Annual yield (%)",
      changePct: null,
      aliases: ["etica"],
    },
    {
      kind: "fx",
      id: "fx1",
      symbol: "USD",
      name: "US Dollar",
      value: 129.5,
      valueLabel: "KES per 1 unit",
      changePct: 0.1,
      aliases: ["usd"],
    },
  ],
  fetchedAt: new Date().toISOString(),
};

const newsCtx: NewsContext = {
  articles: [
    {
      id: "n1",
      title: "Safaricom PLC reported quarterly results.",
      summary: "Safaricom reported strong earnings.",
      source: "Business Daily",
      datePublished: "2026-01-01",
      url: "https://example.com/a",
      category: "markets",
    },
  ],
  fetchedAt: new Date().toISOString(),
};

const websiteLookup: WebsiteLookupScenarioResult = {
  kind: "website-lookup",
  summary: "Website data shown for Etica MMF.",
  entityType: "fund",
  entityName: "Etica MMF",
  entitySymbol: "etica-mmf",
  fields: [{ label: "Annual yield", value: "11.5%" }],
  sourceNote: "Pulled from KenyaFundFinder public listings via the data gateway.",
  pagePath: "/compare/etica-mmf",
  disclaimer: STANDARD_DISCLAIMER,
};

const FORBIDDEN_IN_OUTPUT = [
  "i recommend",
  "best fund",
  "top fund",
  "you should buy",
  "you should sell",
  "put your money in",
  "show mmfs above",
];

describe("isCapabilitiesPrompt", () => {
  it("detects what can I ask", () => {
    expect(isCapabilitiesPrompt("What can I ask?")).toBe(true);
    expect(isCapabilitiesPrompt("What data do you have?")).toBe(true);
  });
});

describe("isFilterLookupPrompt", () => {
  it("detects yield filter queries", () => {
    expect(isFilterLookupPrompt("Show MMFs above 10%")).toBe(true);
    expect(isFilterLookupPrompt("Show funds with yield above 10%")).toBe(true);
  });
});


describe("capFollowUps", () => {
  it("caps at 3 and filters unsupported prompts", () => {
    const capped = capFollowUps([
      "Show Etica MMF yield",
      "Show CIC fund data",
      "What can I ask?",
      "Compare SCOM and KCB",
      "Show MMFs above 10%",
    ]);
    expect(capped).toHaveLength(3);
    expect(capped.join(" ").toLowerCase()).not.toContain("compare scom");
    expect(capped.join(" ").toLowerCase()).not.toContain("above 10%");
  });
});

describe("composeFilterUnsupportedResponse", () => {
  it("returns filter message without needing router result", () => {
    const { text, followUps } = composeFilterUnsupportedResponse();
    expect(text.toLowerCase()).toContain("can't filter");
    expect(followUps).toHaveLength(3);
    expect(followUps.some((s) => s.includes("Show Etica MMF yield"))).toBe(true);
    expect(composedOutputIsSafe(text, followUps)).toBe(true);
  });
});

describe("composeAssistantResponse", () => {
  it("returns safe text for stock amount", () => {
    const result = routePrompt("KES 10,000 in SCOM", ctx);
    expect(result.kind).toBe("stock-amount");
    const { text, followUps } = composeAssistantResponse({
      prompt: "KES 10,000 in SCOM",
      result,
    });
    expect(text.toLowerCase()).toContain("illustrative price");
    expect(text).toContain("SCOM");
    expect(text).toContain("Result");
    expect(text).toContain("Assumptions");
    expect(text).toContain("What could change");
    expect(text).toContain(STANDARD_DISCLAIMER);
    expect(text).toContain("not a recommendation");
    expect(composedOutputIsSafe(text, followUps)).toBe(true);
  });

  it("returns safe text for MMF", () => {
    const result = routePrompt("If I put 100,000 in an MMF, how much do I get?", ctx);
    expect(result.kind).toBe("mmf");
    const { text, followUps } = composeAssistantResponse({
      prompt: "If I put 100,000 in an MMF, how much do I get?",
      result,
    });
    expect(text.toLowerCase()).toContain("illustrative");
    expect(text).toContain("Result");
    expect(text).toContain("Assumptions");
    expect(text).toContain("What could change");
    expect(text).toContain("MMF yields can change");
    expect(text).toContain(STANDARD_DISCLAIMER);
    expect(composedOutputIsSafe(text, followUps)).toBe(true);
  });

  it("returns safe text for FX conversion", () => {
    const result = routePrompt("KES 100,000 to USD", ctx);
    expect(result.kind).toBe("fx-conversion");
    const { text, followUps } = composeAssistantResponse({
      prompt: "KES 100,000 to USD",
      result,
    });
    expect(text.toLowerCase()).toContain("conversion");
    expect(composedOutputIsSafe(text, followUps)).toBe(true);
  });

  it("returns safe text for website lookup", () => {
    const { text, followUps } = composeAssistantResponse({
      prompt: "Show Etica MMF yield",
      result: websiteLookup,
    });
    expect(text.toLowerCase()).toContain("data lookup");
    expect(text.toLowerCase()).toContain("not a recommendation");
    expect(composedOutputIsSafe(text, followUps)).toBe(true);
  });

  it("returns safe text for news", () => {
    const result = routePrompt("Latest news about Safaricom", ctx, newsCtx);
    expect(result.kind).toBe("news-summary");
    const { text, followUps } = composeAssistantResponse({
      prompt: "Latest news about Safaricom",
      result,
    });
    expect(text.toLowerCase()).toContain("stored news");
    expect(text.toLowerCase()).toContain("does not predict price movement");
    expect(composedOutputIsSafe(text, followUps)).toBe(true);
  });

  it("returns safe text for portfolio split", () => {
    const result = routePrompt("Split 100k between MMF and SCOM at 11% yield", ctx);
    expect(result.kind).toBe("portfolio-split");
    const { text, followUps } = composeAssistantResponse({
      prompt: "Split 100k between MMF and SCOM at 11% yield",
      result,
    });
    expect(text.toLowerCase()).toContain("illustrative split");
    expect(text).toContain(STANDARD_DISCLAIMER);
    expect(composedOutputIsSafe(text, followUps)).toBe(true);
  });

  it("refusal composer suggests safe reframe", () => {
    const result = routePrompt("Should I buy Safaricom?", ctx);
    expect(result.kind).toBe("refusal");
    const { text, followUps } = composeAssistantResponse({
      prompt: "Should I buy Safaricom?",
      result,
    });
    expect(text.toLowerCase()).toContain("can't tell you what to buy, sell, or choose");
    expect(text.toLowerCase()).toContain("can't rank instruments");
    expect(text).toContain(STANDARD_DISCLAIMER);
    expect(followUps).toContain("KES 100,000 in SCOM");
    expect(followUps).toContain("What would 100,000 earn at 11%?");
    expect(composedOutputIsSafe(text, followUps)).toBe(true);
  });

  it("unknown composer suggests safe examples", () => {
    const result = routePrompt("xyzzy nonsense prompt", ctx);
    expect(result.kind).toBe("unknown");
    const { text, followUps } = composeAssistantResponse({
      prompt: "xyzzy nonsense prompt",
      result,
    });
    expect(text.toLowerCase()).toMatch(/not sure|couldn't find|try rephrasing/);
    expect(followUps.some((s) => s.includes("What can I ask?"))).toBe(true);
    expect(composedOutputIsSafe(text, followUps)).toBe(true);
  });

  it("instrument-family-overview uses neutral intro copy", () => {
    const familyResult = {
      kind: "website-lookup" as const,
      summary: "Matching instruments for Britam from KenyaFundFinder listings.",
      entityType: "fund" as const,
      entityName: "Britam",
      fields: [
        { label: "Fund: Britam Money Market Fund", value: "10.2% annual yield · money market" },
        { label: "Fund: Britam Balanced Fund", value: "12.5% annual yield · balanced" },
      ],
      sourceNote: "Pulled from KenyaFundFinder public listings via the data gateway.",
      disclaimer: STANDARD_DISCLAIMER,
      lookupMode: "instrument-family-overview" as const,
      totalMatches: 2,
      shownCount: 2,
    };
    const { text, followUps } = composeAssistantResponse({
      prompt: "Britam",
      result: familyResult,
    });
    expect(text).toContain(
      "Matching instruments from available KenyaFundFinder data. This is a data lookup, not a recommendation.",
    );
    expect(familyResult.disclaimer).toBe(STANDARD_DISCLAIMER);
    expect(composedOutputIsSafe(text, followUps)).toBe(true);
  });

    it("MMF yield filter lookup result does not produce unsupported copy", () => {
    const filterResult = {
      kind: "website-lookup" as const,
      summary: "Money market funds matching your yield filter from KenyaFundFinder listings.",
      entityType: "fund" as const,
      entityName: "MMFs with annual yield above 10%",
      fields: [
        { label: "Etica Money Market Fund", value: "11.5% annual yield · money market" },
      ],
      sourceNote: "Filtered from KenyaFundFinder public listings via the data gateway.",
      disclaimer: STANDARD_DISCLAIMER,
      lookupMode: "mmf-yield-filter" as const,
      totalMatches: 1,
      shownCount: 1,
    };
    const { text, followUps } = composeAssistantResponse({
      prompt: "Show MMFs above 10%",
      result: filterResult,
    });
    expect(text.toLowerCase()).not.toContain("can't filter");
    expect(text.toLowerCase()).toContain("money market funds matching your yield filter");
    expect(composedOutputIsSafe(text, followUps)).toBe(true);
  });

  it("unsupported generic filter returns honest reframe", () => {
    const result = routePrompt("Show funds above 10%", ctx);
    expect(result.kind).toBe("unknown");
    const { text, followUps } = composeAssistantResponse({
      prompt: "Show funds above 10%",
      result,
    });
    expect(text.toLowerCase()).toContain("can't filter");
    expect(followUps.some((s) => s.includes("Show Etica MMF yield"))).toBe(true);
    expect(composedOutputIsSafe(text, followUps)).toBe(true);
  });

  it("follow-ups exclude advice wording and unsupported filters", () => {
    const kinds = [
      routePrompt("KES 10,000 in SCOM", ctx),
      routePrompt("If I put 100,000 in an MMF, how much do I get?", ctx),
      routePrompt("KES 100,000 to USD", ctx),
      websiteLookup,
      routePrompt("Latest news about Safaricom", ctx, newsCtx),
      routePrompt("Split 100k between MMF and SCOM at 11% yield", ctx),
      routePrompt("Should I buy Safaricom?", ctx),
      routePrompt("xyzzy", ctx),
    ];
    for (const result of kinds) {
      const { followUps } = composeAssistantResponse({ prompt: "", result });
      const joined = followUps.join(" ").toLowerCase();
      for (const forbidden of FORBIDDEN_IN_OUTPUT) {
        expect(joined).not.toContain(forbidden);
      }
      expect(followUps.length).toBeLessThanOrEqual(3);
    }
  });

  it("result disclaimer preserved on result object", () => {
    const result = routePrompt("KES 10,000 in SCOM", ctx);
    if (result.kind !== "refusal" && result.kind !== "unknown") {
      expect(result.disclaimer).toBe(STANDARD_DISCLAIMER);
    }
  });
});


  describe("hypothetical narrative responses", () => {
    it("stock scenario uses structured sections", () => {
      const result = routePrompt("KES 100,000 in SCOM", ctx);
      const { text } = composeAssistantResponse({ prompt: "KES 100,000 in SCOM", result });
      expect(text).toContain("Result");
      expect(text).toContain("Assumptions");
      expect(text).toContain("What could change");
      expect(text).toContain("Important");
      expect(text).toContain(STANDARD_DISCLAIMER);
    });

    it("MMF scenario uses structured sections", () => {
      const result = routePrompt("What would 100,000 earn at 11%?", ctx);
      const { text } = composeAssistantResponse({ prompt: "What would 100,000 earn at 11%?", result });
      expect(text).toContain("Result");
      expect(text).toContain("Assumptions");
      expect(text).toContain("What could change");
      expect(text).toContain(STANDARD_DISCLAIMER);
    });

    it("scenario responses avoid banned advice language", () => {
      const prompts = [
        "KES 100,000 in SCOM",
        "What would 100,000 earn at 11%?",
        "What if SCOM goes up 10%?",
        "What happens if yield drops from 11% to 9%?",
        "Split 100k between MMF and SCOM at 11% yield",
      ];
      for (const prompt of prompts) {
        const result = routePrompt(prompt, ctx);
        const { text, followUps } = composeAssistantResponse({ prompt, result });
        const combined = [text, ...followUps].join(" ").toLowerCase();
        expect(hasResponseQualityIssue(combined)).toBe(false);
      }
    });
  });

describe("manual QA response quality", () => {
  const qaPrompts = [
    { prompt: "KES 10,000 in SCOM", kind: "stock-amount" },
    { prompt: "What would 100,000 earn at 11%?", kind: "mmf" },
    { prompt: "Should I buy Safaricom?", kind: "refusal" },
    { prompt: "What is the best MMF?", kind: "refusal" },
    { prompt: "What if I split 100,000 between MMF and SCOM?", kind: "portfolio-split" },
  ] as const;

  for (const { prompt, kind } of qaPrompts) {
    it(`QA: ${prompt}`, () => {
      const result = routePrompt(prompt, ctx);
      expect(result.kind).toBe(kind);
      const { text, followUps } = composeAssistantResponse({ prompt, result });
      expect(text).toContain(STANDARD_DISCLAIMER);
      expect(composedOutputIsSafe(text, followUps)).toBe(true);
      if (kind === "stock-amount" || kind === "mmf" || kind === "portfolio-split") {
        expect(text).toContain("Result");
        expect(text).toContain("Assumptions");
        expect(text).toContain("What could change");
      }
      if (kind === "refusal") {
        expect(text.toLowerCase()).toContain("can't tell you what to buy");
        expect(text.toLowerCase()).toContain("can't rank instruments");
      }
    });
  }
});

describe("composeCapabilitiesGuide", () => {
  it("includes scenarios, lookup, news, explainers, and limits", () => {
    const { text, followUps } = composeCapabilitiesGuide();
    expect(text.toLowerCase()).toContain("data lookups");
    expect(text.toLowerCase()).toContain("scenarios");
    expect(text.toLowerCase()).toContain("news and explainers");
    expect(text.toLowerCase()).toContain("limits");
    expect(text.toLowerCase()).toContain("cannot tell you what to buy or sell");
    expect(text).toContain(STANDARD_DISCLAIMER);
    expect(composedOutputIsSafe(text, followUps)).toBe(true);
    expect(followUps.some((s) => s.includes("Show Etica MMF yield"))).toBe(true);
    expect(followUps.join(" ").toLowerCase()).not.toContain("above 10%");
  });
});
