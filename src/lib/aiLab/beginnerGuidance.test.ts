import { describe, expect, it } from "vitest";
import { processAiLabUserPrompt } from "./chat";
import { findResponseQualityIssue } from "./safety";
import { getExplainerText } from "./scenarios";
import { routePrompt } from "./router";
import type { MarketContext } from "./marketContext";

const ctx: MarketContext = {
  fundCount: 1,
  avgAnnualYieldPct: 10,
  topAnnualYieldPct: 10,
  lowAnnualYieldPct: 10,
  sampleStockSymbol: "SCOM",
  sampleStockPrice: 38,
  sampleStockChangePct: 0,
  fetchedAt: "2026-09-08T08:00:00Z",
  assets: [
    { kind: "stock", symbol: "SCOM", name: "Safaricom", value: 38, valueLabel: "Price (KES)", changePct: 0, aliases: ["scom", "safaricom"] },
  ],
};

const BEGINNER_PROMPTS = [
  "I am new to investing, what do I do?",
  "i'm new to investing",
  "I am new to stocks",
  "how do I start investing?",
  "how can I begin investing?",
  "where do beginners start investing?",
  "I know nothing about shares",
  "I understand little about investing",
  "help a beginner start investing",
  "starting investing as a student",
  "new investor what now",
  "new to shares in Kenya",
  "beginner investing guide",
  "beginer in invsting",
  "how to begin with stocks",
  "can I start investing with small money",
  "what does a new investor learn first",
  "start learning about investments",
  "getting started with investing",
  "getting-started investing",
  "nataka kuanza investing",
  "nataka kuanza kuinvest",
  "help me start with shares",
  "I am starting to invest",
  "beginner guide to shares",
] as const;

describe("beginner investing guidance", () => {
  for (const prompt of BEGINNER_PROMPTS) {
    it(`routes '${prompt}' to maintained beginner education`, () => {
      const result = routePrompt(prompt, ctx);
      expect(result.kind).toBe("explainer");
      if (result.kind === "explainer") {
        expect(result.title).toBe("Getting started with investing");
        expect(findResponseQualityIssue(getExplainerText(result))).toBeNull();
      }
    });
  }

  it("returns beginner follow-ups that lead to maintained explainers", async () => {
    const out = await processAiLabUserPrompt("I am new to investing, what do I do?", ctx, null, { naturalLanguage: true });
    expect(out.result?.kind).toBe("explainer");
    expect(out.followUps).toEqual([
      "Explain MMFs in simple language",
      "What is the difference between an MMF and a stock?",
      "Explain investment risk",
    ]);
    expect(routePrompt(out.followUps![1], ctx).kind).toBe("explainer");
    expect(routePrompt(out.followUps![2], ctx).kind).toBe("explainer");
  });

  it("keeps product-selection questions behind the refusal boundary", () => {
    for (const prompt of [
      "I am new, which stock should I buy?",
      "What is the best investment for a beginner?",
      "As a beginner, where should I put my money?",
    ]) {
      expect(routePrompt(prompt, ctx).kind).toBe("refusal");
    }
  });
});
