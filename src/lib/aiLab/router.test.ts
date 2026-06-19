import { describe, it, expect } from "vitest";
import { routePrompt } from "./router";
import type { MarketContext, ComparableAsset } from "./marketContext";

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
