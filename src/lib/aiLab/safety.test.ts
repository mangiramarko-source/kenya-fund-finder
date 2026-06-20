import { describe, it, expect } from "vitest";
import {
  detectAdviceIntent,
  sanitizeOutput,
  buildRefusal,
  FORBIDDEN_PATTERNS,
  STANDARD_DISCLAIMER,
  RESPONSE_QUALITY_BANNED,
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
    expect(
      detectAdviceIntent("If I put 100,000 in an MMF, how much do I get?")
    ).toBe(false);
    expect(
      detectAdviceIntent("How much would 500k make in a money market fund?")
    ).toBe(false);
  });
  it("flags 'Which fund will make me the most?'", () => {
    expect(detectAdviceIntent("Which fund will make me the most?")).toBe(true);
  });
  it("flags 'Which fund has the best yield?'", () => {
    expect(detectAdviceIntent("Which fund has the best yield?")).toBe(true);
  });
  it("flags 'What is the top MMF?'", () => {
    expect(detectAdviceIntent("What is the top MMF?")).toBe(true);
  });
  it("flags 'Which ETF should I buy?'", () => {
    expect(detectAdviceIntent("Which ETF should I buy?")).toBe(true);
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
  it("does not flag forward goal projection prompts", () => {
    expect(
      detectAdviceIntent("If I save KES 10,000 monthly at 11% for 24 months"),
    ).toBe(false);
  });
  it("does not flag reverse-goal calculator phrasing as advice", () => {
    expect(detectAdviceIntent("How much should I save monthly to reach 1M?")).toBe(false);
  });
  it("flags 'What should I invest in monthly?'", () => {
    expect(detectAdviceIntent("What should I invest in monthly?")).toBe(true);
  });
  it("flags 'Should I put 10k monthly in SCOM?'", () => {
    expect(detectAdviceIntent("Should I put 10k monthly in SCOM?")).toBe(true);
  });
  it("flags 'Where should I save 10k monthly?'", () => {
    expect(detectAdviceIntent("Where should I save 10k monthly?")).toBe(true);
  });
  it("flags news advice: Will SCOM rise because of this news?", () => {
    expect(detectAdviceIntent("Will SCOM rise because of this news?")).toBe(true);
  });
  it("flags news advice: because of this news", () => {
    expect(detectAdviceIntent("Should I sell because of this news?")).toBe(true);
  });
  it("does not flag neutral news summary prompts", () => {
    expect(detectAdviceIntent("Latest news about Safaricom")).toBe(false);
    expect(detectAdviceIntent("Explain this news in simple terms")).toBe(false);
  });
  it("flags portfolio advice: Should I split 100k between MMF and SCOM?", () => {
    expect(detectAdviceIntent("Should I split 100k between MMF and SCOM?")).toBe(true);
  });
  it("flags portfolio advice: Should I put 70% in MMF and 30% in Safaricom?", () => {
    expect(detectAdviceIntent("Should I put 70% in MMF and 30% in Safaricom?")).toBe(true);
  });
  it("flags portfolio advice: Which split is better?", () => {
    expect(detectAdviceIntent("Which split is better?")).toBe(true);
  });
  it("does not flag neutral portfolio scenario prompts", () => {
    expect(detectAdviceIntent("What happens if I split 100k between MMF and SCOM?")).toBe(false);
    expect(detectAdviceIntent("Split 100k between MMF and SCOM at 11% yield")).toBe(false);
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
  it("uses updated refusal message copy", () => {
    const r = buildRefusal();
    expect(r.message).toContain("I can't tell you what to buy, sell, or choose");
    expect(r.message).toContain("I can't rank instruments");
    expect(r.message).toContain("I can show:");
    expect(r.message).toContain(STANDARD_DISCLAIMER);
  });

  it("safe alternatives include illustrative scenario reframes", () => {
    const r = buildRefusal();
    expect(r.safeAlternatives).toContain("KES 100,000 in SCOM");
    expect(r.safeAlternatives).toContain("What would 100,000 earn at 11%?");
  });

  it("returns the canonical refusal message", () => {
    const r = buildRefusal();
    expect(r.kind).toBe("refusal");
    expect(r.message).toMatch(/can't tell you what to buy/i);
    expect(r.safeAlternatives.length).toBeGreaterThan(0);
    expect(r.disclaimer).toBe(STANDARD_DISCLAIMER);
    for (const re of RESPONSE_QUALITY_BANNED) {
      expect(r.message).not.toMatch(re);
    }
  });
});
