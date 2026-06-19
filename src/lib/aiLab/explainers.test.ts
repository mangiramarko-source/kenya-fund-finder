import { describe, it, expect } from "vitest";
import { routePrompt } from "./router";
import {
  EXPLAINERS,
  STANDARD_DISCLAIMER,
  WITHHOLDING_TAX_GUARD,
  getExplainerText,
} from "./scenarios";

const TBILLS_FORBIDDEN = ["risk-free", "guaranteed return", "you should buy", "I recommend"];

describe("T-bills explainer safety", () => {
  it("routes treasury bills prompts to explainer", () => {
    const r = routePrompt("Explain treasury bills");
    expect(r.kind).toBe("explainer");
  });

  it("does not contain forbidden advisory or guarantee wording", () => {
    const text = getExplainerText(EXPLAINERS["t-bills"]).toLowerCase();
    for (const phrase of TBILLS_FORBIDDEN) {
      expect(text).not.toContain(phrase.toLowerCase());
    }
  });

  it("describes T-bills as government-backed", () => {
    const text = getExplainerText(EXPLAINERS["t-bills"]).toLowerCase();
    expect(text).toContain("government-backed");
  });

  it("includes the standard disclaimer", () => {
    expect(EXPLAINERS["t-bills"].disclaimer).toBe(STANDARD_DISCLAIMER);
  });
});

describe("withholding-tax explainer", () => {
  it("includes the neutral tax guard wording verbatim", () => {
    const text = getExplainerText(EXPLAINERS["withholding-tax"]);
    expect(text).toContain(WITHHOLDING_TAX_GUARD);
  });

  it("does not hardcode a specific tax rate", () => {
    const text = getExplainerText(EXPLAINERS["withholding-tax"]);
    expect(text).not.toMatch(/\d+\s*%/);
  });
});

describe("all Phase 6 explainers", () => {
  const keys = [
    "t-bills",
    "withholding-tax",
    "fees",
    "liquidity",
    "volatility",
    "gross-vs-net",
  ] as const;

  for (const key of keys) {
    it(`${key} includes the standard disclaimer`, () => {
      expect(EXPLAINERS[key].disclaimer).toBe(STANDARD_DISCLAIMER);
    });
  }
});
