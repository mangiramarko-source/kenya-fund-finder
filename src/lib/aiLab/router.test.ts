import { describe, it, expect } from "vitest";
import { routePrompt, UNKNOWN_FALLBACK_MSG, UNKNOWN_FALLBACK_SUGGESTIONS } from "./router";
import {
  COMMODITY_UNKNOWN_MSG,
  FX_UNKNOWN_MSG,
  NEWS_UNKNOWN_MSG,
} from "./intent";
import type { MarketContext, ComparableAsset } from "./marketContext";
import type { NewsArticle, NewsContext } from "./newsContext";
import { MMF_SCENARIO_SUMMARY } from "./scenarios";

const mkStock = (
  symbol: string,
  name: string,
  price: number,
  changePct: number | null = null,
): ComparableAsset => ({
  kind: "stock",
  symbol,
  name,
  value: price,
  valueLabel: "Price (KES)",
  changePct,
  aliases: [symbol.toLowerCase(), name.toLowerCase()],
});

const stockCtx: MarketContext = {
  fundCount: 0,
  avgAnnualYieldPct: null,
  topAnnualYieldPct: null,
  lowAnnualYieldPct: null,
  sampleStockSymbol: "SCOM",
  sampleStockPrice: 18.5,
  sampleStockChangePct: 1.2,
  assets: [
    mkStock("SCOM", "Safaricom", 18.5, 1.2),
    mkStock("EQTY", "Equity Group", 44.1, -0.4),
  ],
  fetchedAt: new Date().toISOString(),
};

const safaricomNewsArticle: NewsArticle = {
  id: "router-1",
  title: "Safaricom shares in focus",
  summary: "Safaricom PLC remains in the headlines.",
  source: "Standard",
  datePublished: new Date().toISOString(),
  url: "https://example.com/safaricom-router",
  category: "Market News",
};

const newsCtx: NewsContext = {
  articles: [safaricomNewsArticle],
  fetchedAt: new Date().toISOString(),
};

describe("routePrompt", () => {
  it("refuses 'Which fund should I buy?'", () => {
    expect(routePrompt("Which fund should I buy?").kind).toBe("refusal");
  });

  it("refuses 'Should I sell Safaricom?'", () => {
    expect(routePrompt("Should I sell Safaricom?").kind).toBe("refusal");
  });

  it("routes MMF scenario from natural prompt", () => {
    const r = routePrompt("If I invest KES 100,000 at 11% yield, what happens?");
    expect(r.kind).toBe("mmf");
    if (r.kind === "mmf") {
      expect(r.inputs.amount).toBe(100_000);
      expect(r.inputs.annualYieldPct).toBe(11);
      expect(r.grossYearly).toBe(11_000);
    }
  });

  it("routes stock-move scenario for a fall", () => {
    const r = routePrompt("What happens if a stock falls 10% on KES 100,000?");
    expect(r.kind).toBe("stock-move");
    if (r.kind === "stock-move") {
      expect(r.newValue).toBe(90_000);
    }
  });

  it("routes explainer for 'Explain money market fund yield'", () => {
    const r = routePrompt("Explain money market fund yield");
    expect(r.kind).toBe("explainer");
  });

  const explainerCases: Array<{ prompt: string; title: string }> = [
    { prompt: "Explain treasury bills", title: "What are treasury bills (T-bills)?" },
    { prompt: "What is withholding tax?", title: "What is withholding tax on investment income?" },
    { prompt: "Explain fund fees", title: "What are fund fees?" },
    { prompt: "Explain liquidity", title: "What is liquidity?" },
    { prompt: "What is stock volatility?", title: "What is volatility?" },
    { prompt: "Explain gross vs net return", title: "Gross vs net return" },
  ];

  for (const { prompt, title } of explainerCases) {
    it(`routes explainer for '${prompt}'`, () => {
      const r = routePrompt(prompt);
      expect(r.kind).toBe("explainer");
      if (r.kind === "explainer") {
        expect(r.title).toBe(title);
        expect(r.disclaimer).toBe("Data only. Not personal financial advice.");
      }
    });
  }

  describe("stock-amount scenarios", () => {
    it("routes 'KES 10,000 in SCOM' to stock-amount", () => {
      const r = routePrompt("KES 10,000 in SCOM", stockCtx);
      expect(r.kind).toBe("stock-amount");
      if (r.kind === "stock-amount") {
        expect(r.inputs.symbol).toBe("SCOM");
        expect(r.inputs.amount).toBe(10_000);
        expect(r.disclaimer).toBe("Data only. Not personal financial advice.");
      }
    });

    it("reframes 'How much will I make if I put KES 10,000 in Safaricom?' as stock-amount", () => {
      const r = routePrompt("How much will I make if I put KES 10,000 in Safaricom?", stockCtx);
      expect(r.kind).toBe("stock-amount");
      if (r.kind === "stock-amount") {
        expect(r.summary.toLowerCase()).toContain("does not predict profit");
        expect(r.summary.toLowerCase()).not.toContain("you will make");
      }
    });

    it("refuses 'Should I put KES 10,000 in SCOM?'", () => {
      expect(routePrompt("Should I put KES 10,000 in SCOM?", stockCtx).kind).toBe("refusal");
    });

    it("refuses 'Should I buy Safaricom?'", () => {
      expect(routePrompt("Should I buy Safaricom?", stockCtx).kind).toBe("refusal");
    });

    it("refuses 'Will I make money in SCOM?'", () => {
      expect(routePrompt("Will I make money in SCOM?", stockCtx).kind).toBe("refusal");
    });

    it("refuses 'Is SCOM a good buy?'", () => {
      expect(routePrompt("Is SCOM a good buy?", stockCtx).kind).toBe("refusal");
    });

    it("returns safe unknown for unmatched stock", () => {
      const r = routePrompt("KES 10,000 in UNKNOWNSTOCK", stockCtx);
      expect(r.kind).toBe("unknown");
      if (r.kind === "unknown") {
        expect(r.message).toMatch(/could not confidently match/i);
        expect(r.suggestions).toContain("KES 10,000 in SCOM");
      }
    });
  });

  describe("Phase 8A MMF routing", () => {
    it("routes 'If I put 100,000 in an MMF, how much do I get?' to mmf", () => {
      const r = routePrompt("If I put 100,000 in an MMF, how much do I get?", stockCtx);
      expect(r.kind).toBe("mmf");
    });

    it("routes 'How much would 500k make in a money market fund?' to mmf with safe summary", () => {
      const r = routePrompt("How much would 500k make in a money market fund?", stockCtx);
      expect(r.kind).toBe("mmf");
      if (r.kind === "mmf") {
        expect(r.inputs.amount).toBe(500_000);
        expect(r.summary).toBe(MMF_SCENARIO_SUMMARY);
      }
    });

    it("routes 'How much monthly income from 100k at 11%?' to mmf", () => {
      const r = routePrompt("How much monthly income from 100k at 11%?");
      expect(r.kind).toBe("mmf");
      if (r.kind === "mmf") {
        expect(r.inputs.amount).toBe(100_000);
        expect(r.inputs.annualYieldPct).toBe(11);
      }
    });

    it("routes 'How much per day from 100k at 11%?' to mmf with dailyEquivalent", () => {
      const r = routePrompt("How much per day from 100k at 11%?");
      expect(r.kind).toBe("mmf");
      if (r.kind === "mmf") {
        expect(r.dailyEquivalent).toBeCloseTo(30.14, 2);
      }
    });

    it("routes yield drop prompts to mmf-yield-change", () => {
      const r = routePrompt("If yield drops from 11% to 9% on KES 100,000");
      expect(r.kind).toBe("mmf-yield-change");
      if (r.kind === "mmf-yield-change") {
        expect(r.inputs.fromYieldPct).toBe(11);
        expect(r.inputs.toYieldPct).toBe(9);
        expect(r.deltaYearly).toBe(-2_000);
      }
    });

    it("refuses 'Which fund will make me the most?'", () => {
      expect(routePrompt("Which fund will make me the most?", stockCtx).kind).toBe("refusal");
    });

    it("refuses 'Which fund has the best yield?'", () => {
      expect(routePrompt("Which fund has the best yield?", stockCtx).kind).toBe("refusal");
    });

    it("refuses 'What is the top MMF?'", () => {
      expect(routePrompt("What is the top MMF?", stockCtx).kind).toBe("refusal");
    });

    it("returns unknown fallback for unsupported prompts", () => {
      const r = routePrompt("xyzzy plugh");
      expect(r.kind).toBe("unknown");
      if (r.kind === "unknown") {
        expect(r.message).toBe(UNKNOWN_FALLBACK_MSG);
        expect(r.suggestions).toEqual(UNKNOWN_FALLBACK_SUGGESTIONS);
      }
    });
  });

  describe("Phase 8B goal projection", () => {
    it("routes start + monthly + yield + months to goal-projection", () => {
      const r = routePrompt(
        "If I start with KES 100,000 and add KES 10,000 monthly at 11% for 12 months",
      );
      expect(r.kind).toBe("goal-projection");
      if (r.kind === "goal-projection") {
        expect(r.inputs.startAmount).toBe(100_000);
        expect(r.inputs.monthlyContribution).toBe(10_000);
        expect(r.inputs.annualYieldPct).toBe(11);
        expect(r.inputs.months).toBe(12);
      }
    });

    it("routes compact start/add phrasing to goal-projection", () => {
      const r = routePrompt("Start with 100k, add 10k monthly, 11% yield, 12 months");
      expect(r.kind).toBe("goal-projection");
      if (r.kind === "goal-projection") {
        expect(r.inputs.startAmount).toBe(100_000);
        expect(r.inputs.monthlyContribution).toBe(10_000);
      }
    });

    it("routes monthly-only save prompt with startAmount 0", () => {
      const r = routePrompt("If I save KES 10,000 monthly at 11% for 24 months");
      expect(r.kind).toBe("goal-projection");
      if (r.kind === "goal-projection") {
        expect(r.inputs.startAmount).toBe(0);
        expect(r.inputs.monthlyContribution).toBe(10_000);
        expect(r.inputs.months).toBe(24);
      }
    });

    it("routes year-based time wording to goal-projection", () => {
      const r = routePrompt("What happens if I add KES 10,000 monthly for 1 year at 11%?");
      expect(r.kind).toBe("goal-projection");
      if (r.kind === "goal-projection") {
        expect(r.inputs.months).toBe(12);
        expect(r.inputs.monthlyContribution).toBe(10_000);
      }
    });
  });

  describe("Phase 8B reverse-goal vs refusal", () => {
    it("returns unknown for 'How much do I need monthly to reach 1M?'", () => {
      const r = routePrompt("How much do I need monthly to reach 1M?");
      expect(r.kind).toBe("unknown");
      expect(r.kind).not.toBe("refusal");
    });

    it("returns unknown for 'How much should I save monthly to reach 1M?'", () => {
      const r = routePrompt("How much should I save monthly to reach 1M?");
      expect(r.kind).toBe("unknown");
      expect(r.kind).not.toBe("refusal");
    });

    it("returns unknown for 'How long to reach 1M if I save 10k monthly?'", () => {
      const r = routePrompt("How long to reach 1M if I save 10k monthly?");
      expect(r.kind).toBe("unknown");
      expect(r.kind).not.toBe("refusal");
    });

    it("refuses 'Which fund should I use to reach 1M?'", () => {
      expect(routePrompt("Which fund should I use to reach 1M?").kind).toBe("refusal");
    });

    it("refuses 'Where should I save 10k monthly?'", () => {
      expect(routePrompt("Where should I save 10k monthly?").kind).toBe("refusal");
    });

    it("refuses 'What should I invest in monthly?'", () => {
      expect(routePrompt("What should I invest in monthly?").kind).toBe("refusal");
    });
  });

  describe("Phase 8A explainer routes", () => {
    const phase8ExplainerCases: Array<{ prompt: string; title: string }> = [
      { prompt: "Explain dividend yield", title: "What is dividend yield?" },
      { prompt: "What is NAV?", title: "What is NAV (net asset value)?" },
      { prompt: "Explain expense ratio", title: "What is an expense ratio?" },
      { prompt: "Explain compounding", title: "What is compounding?" },
      { prompt: "What is a unit trust?", title: "What is a unit trust?" },
      { prompt: "Explain ETF", title: "What is an ETF?" },
      { prompt: "Explain capital gain", title: "What is a capital gain?" },
      { prompt: "Explain downside risk", title: "What is downside risk?" },
    ];

    for (const { prompt, title } of phase8ExplainerCases) {
      it(`routes explainer for '${prompt}'`, () => {
        const r = routePrompt(prompt);
        expect(r.kind).toBe("explainer");
        if (r.kind === "explainer") {
          expect(r.title).toBe(title);
        }
      });
    }
  });

  describe("Phase 8C classified unknown fallback", () => {
    it("KES 100,000 to USD without FX data returns FX-aware unknown", () => {
      const r = routePrompt("KES 100,000 to USD");
      expect(r.kind).toBe("unknown");
      if (r.kind === "unknown") {
        expect(r.message).toBe(FX_UNKNOWN_MSG);
        expect(r.message).not.toBe(UNKNOWN_FALLBACK_MSG);
      }
    });

    it("Latest news about Safaricom returns news-aware unknown without newsCtx", () => {
      const r = routePrompt("Latest news about Safaricom");
      expect(r.kind).toBe("unknown");
      if (r.kind === "unknown") {
        expect(r.message).toBe(NEWS_UNKNOWN_MSG);
      }
    });

    it("Latest news about Safaricom returns news-summary with newsCtx", () => {
      const r = routePrompt("Latest news about Safaricom", stockCtx, newsCtx);
      expect(r.kind).toBe("news-summary");
      if (r.kind === "news-summary") {
        expect(r.summary).toContain("KenyaFundFinder news data");
      }
    });

    it("Gold rises 5% without commodity data returns commodity-aware unknown", () => {
      const r = routePrompt("Gold rises 5%");
      expect(r.kind).toBe("unknown");
      if (r.kind === "unknown") {
        expect(r.message).toBe(COMMODITY_UNKNOWN_MSG);
      }
    });

    it("unknown suggestions are non-advisory", () => {
      const prompts = ["KES 100,000 to USD", "Latest news about Safaricom", "Gold rises 5%"];
      const forbidden = ["you should buy", "best fund", "I recommend", "put your money in"];
      for (const p of prompts) {
        const r = routePrompt(p);
        if (r.kind === "unknown") {
          const joined = [r.message, ...r.suggestions].join(" ").toLowerCase();
          for (const phrase of forbidden) {
            expect(joined).not.toContain(phrase);
          }
        }
      }
    });

    it("every classified unknown fallback includes the standard disclaimer", () => {
      for (const p of ["KES 100,000 to USD", "Latest news about Safaricom", "Gold rises 5%"]) {
        const r = routePrompt(p);
        expect(r.kind).toBe("unknown");
        expect((r as { disclaimer: string }).disclaimer).toBe(
          "Data only. Not personal financial advice.",
        );
      }
    });
  });

  it("every non-refusal result includes the standard disclaimer", () => {
    const prompts = [
      "If I invest KES 100,000 at 11% yield, what happens?",
      "What happens if a stock falls 10% on KES 100,000?",
      "Explain money market fund yield",
      "Explain treasury bills",
      "Explain withholding tax",
      "Explain gross vs net return",
      "KES 10,000 in SCOM",
      "What happens if I add KES 10,000 monthly at 11% for 12 months?",
      "gibberish",
    ];
    for (const p of prompts) {
      const r = routePrompt(p);
      expect((r as { disclaimer: string }).disclaimer).toBe(
        "Data only. Not personal financial advice."
      );
    }
  });
});
