import { describe, it, expect } from "vitest";
import { routePrompt } from "./router";
import {
  EXPLAINERS,
  STANDARD_DISCLAIMER,
  WITHHOLDING_TAX_GUARD,
  getExplainerText,
} from "./scenarios";

const TBILLS_FORBIDDEN = ["risk-free", "guaranteed return", "you should buy", "I recommend"];

const PHASE8_FORBIDDEN = [
  "risk-free",
  "I recommend",
  "you should buy",
  "best fund",
  "safest fund",
  "guaranteed return",
  "mutual fund",
];

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

describe("mmf-yield explainer", () => {
  it("does not hardcode 15% or mutual fund wording", () => {
    const text = getExplainerText(EXPLAINERS["mmf-yield"]);
    expect(text).not.toContain("15%");
    expect(text.toLowerCase()).not.toContain("mutual fund");
  });

  it("uses money market fund terminology", () => {
    const text = getExplainerText(EXPLAINERS["mmf-yield"]).toLowerCase();
    expect(text).toContain("money market fund");
  });
});

describe("Phase 8A explainers", () => {
  const keys = [
    "dividend-yield",
    "nav",
    "expense-ratio",
    "compounding",
    "unit-trust",
    "etf",
    "capital-gain",
    "downside-risk",
  ] as const;

  for (const key of keys) {
    it(`${key} includes the standard disclaimer`, () => {
      expect(EXPLAINERS[key].disclaimer).toBe(STANDARD_DISCLAIMER);
    });

    it(`${key} does not contain forbidden or mutual fund wording`, () => {
      const text = getExplainerText(EXPLAINERS[key]).toLowerCase();
      for (const phrase of PHASE8_FORBIDDEN) {
        expect(text).not.toContain(phrase.toLowerCase());
      }
    });
  }

  it("ETF explainer does not recommend or rank products", () => {
    const text = getExplainerText(EXPLAINERS.etf).toLowerCase();
    expect(text).not.toMatch(/\b(better|safer|recommended)\b/);
  });

  it("downside-risk explainer mentions values can fall", () => {
    const text = getExplainerText(EXPLAINERS["downside-risk"]).toLowerCase();
    expect(text).toMatch(/values can fall|lower than expected/);
  });

  it("unit-trust explainer uses unit trust terminology", () => {
    const text = getExplainerText(EXPLAINERS["unit-trust"]).toLowerCase();
    expect(text).toContain("unit trust");
  });
});

describe("Phase 8A explainer routing", () => {
  const routes: Array<{ prompt: string; key: keyof typeof EXPLAINERS }> = [
    { prompt: "Explain dividend yield", key: "dividend-yield" },
    { prompt: "What is NAV?", key: "nav" },
    { prompt: "Explain expense ratio", key: "expense-ratio" },
    { prompt: "Explain compounding", key: "compounding" },
    { prompt: "What is a unit trust?", key: "unit-trust" },
    { prompt: "Explain ETF", key: "etf" },
    { prompt: "Explain capital gain", key: "capital-gain" },
    { prompt: "Explain downside risk", key: "downside-risk" },
  ];

  for (const { prompt, key } of routes) {
    it(`routes '${prompt}' to ${key}`, () => {
      const r = routePrompt(prompt);
      expect(r.kind).toBe("explainer");
      if (r.kind === "explainer") {
        expect(r.title).toBe(EXPLAINERS[key].title);
      }
    });
  }
});
