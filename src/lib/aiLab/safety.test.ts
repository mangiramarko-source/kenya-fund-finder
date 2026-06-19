import { describe, it, expect } from "vitest";
import {
  detectAdviceIntent,
  sanitizeOutput,
  buildRefusal,
  FORBIDDEN_PATTERNS,
} from "./safety";

describe("detectAdviceIntent", () => {
  it("flags 'Which fund should I buy?'", () => {
    expect(detectAdviceIntent("Which fund should I buy?")).toBe(true);
  });
  it("flags 'Should I sell Safaricom?'", () => {
    expect(detectAdviceIntent("Should I sell Safaricom?")).toBe(true);
  });
  it("flags 'What is the best MMF?'", () => {
    expect(detectAdviceIntent("What is the best MMF?")).toBe(true);
  });
  it("flags 'Where should I put my money?'", () => {
    expect(detectAdviceIntent("Where should I put my money?")).toBe(true);
  });
  it("does not flag scenario questions", () => {
    expect(
      detectAdviceIntent("If I invest KES 100,000 at 11% yield, what happens?")
    ).toBe(false);
    expect(detectAdviceIntent("What happens if a stock falls 10%?")).toBe(false);
    expect(
      detectAdviceIntent("How much will I make if I put KES 10,000 in Safaricom?")
    ).toBe(false);
  });
  it("flags 'Will I make money in SCOM?'", () => {
    expect(detectAdviceIntent("Will I make money in SCOM?")).toBe(true);
  });
  it("flags 'Is SCOM a good buy?'", () => {
    expect(detectAdviceIntent("Is SCOM a good buy?")).toBe(true);
  });
  it("flags 'Should I put KES 10,000 in SCOM?'", () => {
    expect(detectAdviceIntent("Should I put KES 10,000 in SCOM?")).toBe(true);
  });
  it("flags 'Should I buy Safaricom?'", () => {
    expect(detectAdviceIntent("Should I buy Safaricom?")).toBe(true);
  });
});

describe("sanitizeOutput", () => {
  const phrases = [
    "I recommend Fund X",
    "this is the best fund",
    "top fund of the year",
    "safest fund available",
    "you should buy now",
    "you should sell tomorrow",
    "guaranteed return of 15%",
    "risk-free investment",
    "put your money in MMF",
  ];
  for (const p of phrases) {
    it(`throws on forbidden phrase: "${p}"`, () => {
      expect(() => sanitizeOutput(p)).toThrow(/Forbidden/i);
    });
  }
  it("covers every spec forbidden pattern", () => {
    expect(FORBIDDEN_PATTERNS.length).toBeGreaterThanOrEqual(9);
  });
  it("passes through neutral wording", () => {
    expect(sanitizeOutput("Based on the data shown, KES 11,000 gross yearly.")).toContain(
      "Based on the data shown"
    );
  });
});

describe("buildRefusal", () => {
  it("returns the canonical refusal message", () => {
    const r = buildRefusal();
    expect(r.kind).toBe("refusal");
    expect(r.message).toMatch(/can't tell you what to buy/i);
    expect(r.safeAlternatives.length).toBeGreaterThan(0);
    expect(r.disclaimer).toBe("Data only. Not personal financial advice.");
  });
});
