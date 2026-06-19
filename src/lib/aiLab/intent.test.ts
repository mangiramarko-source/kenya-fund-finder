import { describe, it, expect } from "vitest";
import { classifyAiLabPrompt } from "./intent";

describe("classifyAiLabPrompt asset type", () => {
  it("KES 10,000 in SCOM → stock", () => {
    const r = classifyAiLabPrompt("KES 10,000 in SCOM");
    expect(r.assetType).toBe("stock");
    expect(r.matchedTerms.length).toBeGreaterThanOrEqual(1);
  });

  it("If I put 100,000 in an MMF → fund", () => {
    const r = classifyAiLabPrompt("If I put 100,000 in an MMF, how much do I get?");
    expect(r.assetType).toBe("fund");
  });

  it("Compare Gold vs Brent Crude → commodity", () => {
    const r = classifyAiLabPrompt("Compare Gold vs Brent Crude");
    expect(["commodity", "mixed"]).toContain(r.assetType);
    expect(r.intentType).toBe("compare");
  });

  it("KES 100,000 to USD → fx", () => {
    const r = classifyAiLabPrompt("KES 100,000 to USD");
    expect(r.assetType).toBe("fx");
  });

  it("Latest news about Safaricom → news (not stock or mixed)", () => {
    const r = classifyAiLabPrompt("Latest news about Safaricom");
    expect(r.assetType).toBe("news");
    expect(r.intentType).toBe("news-summary");
  });

  it("News about SCOM → news, news-summary", () => {
    const r = classifyAiLabPrompt("News about SCOM");
    expect(r.assetType).toBe("news");
    expect(r.intentType).toBe("news-summary");
  });

  it("Compare SCOM vs USD → mixed, compare", () => {
    const r = classifyAiLabPrompt("Compare SCOM vs USD");
    expect(r.assetType).toBe("mixed");
    expect(r.intentType).toBe("compare");
  });
});

describe("classifyAiLabPrompt intent type", () => {
  it("Should I buy Safaricom? → refusal", () => {
    expect(classifyAiLabPrompt("Should I buy Safaricom?").intentType).toBe("refusal");
  });

  it("Compare SCOM vs EQTY → compare", () => {
    expect(classifyAiLabPrompt("Compare SCOM vs EQTY").intentType).toBe("compare");
  });

  it("KES 10,000 in SCOM → stock-amount", () => {
    expect(classifyAiLabPrompt("KES 10,000 in SCOM").intentType).toBe("stock-amount");
  });

  it("What happens if SCOM falls 10%? → stock-move", () => {
    expect(classifyAiLabPrompt("What happens if SCOM falls 10%?").intentType).toBe("stock-move");
  });

  it("How much monthly income from 100k at 11%? → mmf-yield", () => {
    expect(classifyAiLabPrompt("How much monthly income from 100k at 11%?").intentType).toBe(
      "mmf-yield",
    );
  });

  it("yield drops from 11% to 9% on 100k → mmf-yield-change", () => {
    expect(
      classifyAiLabPrompt("What happens if yield drops from 11% to 9% on 100k?").intentType,
    ).toBe("mmf-yield-change");
  });

  it("start with 100k and add 10k monthly → goal-projection", () => {
    expect(
      classifyAiLabPrompt(
        "If I start with KES 100,000 and add KES 10,000 monthly at 11% for 12 months",
      ).intentType,
    ).toBe("goal-projection");
  });

  it("KES 100,000 to USD → fx-conversion", () => {
    expect(classifyAiLabPrompt("KES 100,000 to USD").intentType).toBe("fx-conversion");
  });

  it("Gold rises 5% → commodity-move", () => {
    expect(classifyAiLabPrompt("Gold rises 5%").intentType).toBe("commodity-move");
  });

  it("Latest news about SCOM → news-summary", () => {
    expect(classifyAiLabPrompt("Latest news about SCOM").intentType).toBe("news-summary");
  });

  it("Explain dividend yield → explainer", () => {
    expect(classifyAiLabPrompt("Explain dividend yield").intentType).toBe("explainer");
  });

  it("Random unsupported question → unknown", () => {
    const r = classifyAiLabPrompt("xyzzy plugh");
    expect(r.intentType).toBe("unknown");
    expect(r.assetType).toBe("unknown");
  });
});
