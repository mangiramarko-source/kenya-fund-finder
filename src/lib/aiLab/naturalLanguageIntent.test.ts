import { describe, expect, it } from "vitest";
import {
  numberAppearsInPrompt,
  naturalLanguageIntentToFrame,
  validateQuerySemanticFrame,
  validateNaturalLanguageIntent,
} from "./naturalLanguageIntent";

describe("natural-language intent contract", () => {
  it("accepts every supported intent family", () => {
    for (const intent of ["capabilities", "overview", "lookup", "scenario", "compare", "news", "explainer", "refusal", "clarification"]) {
      expect(validateNaturalLanguageIntent({ intent, confidence: "high" }).ok).toBe(true);
    }
  });

  it("accepts bounded structured scenario inputs", () => {
    const result = validateNaturalLanguageIntent({
      intent: "scenario", confidence: "medium", assetKind: "stock",
      scenarioKind: "stock-move", entity: "Safaricom", amount: 10_000,
      percentage: -5, periodDays: 30,
    });
    expect(result.ok).toBe(true);
  });

  it("accepts a catalog-backed asset amount scenario without model facts", () => {
    expect(validateNaturalLanguageIntent({
      intent: "scenario", confidence: "high", assetKind: "commodity",
      scenarioKind: "asset-amount", entity: "GOLD", amount: 100_000,
    }).ok).toBe(true);
  });

  it("rejects market facts and generated answers from the model", () => {
    expect(validateNaturalLanguageIntent({ intent: "overview", confidence: "high", price: 42 }).ok).toBe(false);
    expect(validateNaturalLanguageIntent({ intent: "overview", confidence: "high", answer: "Buy it" }).ok).toBe(false);
    expect(validateNaturalLanguageIntent({ intent: "overview", confidence: "high", yield: 12 }).ok).toBe(false);
  });

  it("uses a versioned semantic frame that contains mentions but no canonical IDs", () => {
    const frame = naturalLanguageIntentToFrame({
      intent: "compare",
      confidence: "high",
      entity: "KCB",
      secondEntity: "Equity",
    });
    expect(frame).toMatchObject({ version: 1, action: "compare" });
    expect(frame.entityMentions.map((mention) => mention.text)).toEqual(["KCB", "Equity"]);
    expect(validateQuerySemanticFrame(frame).ok).toBe(true);
    expect(JSON.stringify(frame)).not.toContain("canonicalId");
  });

  it("rejects malformed and out-of-range values", () => {
    expect(validateNaturalLanguageIntent(null).ok).toBe(false);
    expect(validateNaturalLanguageIntent({ intent: "magic", confidence: "high" }).ok).toBe(false);
    expect(validateNaturalLanguageIntent({ intent: "scenario", confidence: "high", percentage: -101 }).ok).toBe(false);
  });

  it("recognizes explicit numeric values and Kenyan shorthand", () => {
    expect(numberAppearsInPrompt("I have 10k for Safaricom", 10_000)).toBe(true);
    expect(numberAppearsInPrompt("Use 100 bob", 100)).toBe(true);
    expect(numberAppearsInPrompt("Tell me about Safaricom", 50_000)).toBe(false);
  });
});
