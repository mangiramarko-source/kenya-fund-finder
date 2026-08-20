import { describe, it, expect } from "vitest";
import { routePrompt, UNKNOWN_FALLBACK_MSG } from "./router";
import {
  classifyHypotheticalPrompt,
  buildHypotheticalScenarioResponse,
  isHypotheticalScenarioPrompt,
} from "./hypotheticalScenarios";
import { classifyEducational } from "./educationalClassifier";
import { hasResponseQualityIssue } from "./safety";

function isSafeText(text: string) {
  return !hasResponseQualityIssue(text);
}

describe("classifyHypotheticalPrompt", () => {
  it("detects income-goal prompts", () => {
    const c = classifyHypotheticalPrompt("How much do I need to earn 10k per month?");
    expect(c.kind).toBe("income-goal");
    expect(c.monthlyTarget).toBe(10_000);
  });

  it("detects live-off-interest prompts", () => {
    expect(classifyHypotheticalPrompt("Can I live off MMF interest?").kind).toBe(
      "live-off-interest",
    );
  });

  it("detects rate-change prompts", () => {
    expect(classifyHypotheticalPrompt("What happens if rates go down?").kind).toBe(
      "rate-change",
    );
    expect(
      classifyHypotheticalPrompt("What if yields drop next quarter?").kind,
    ).toBe("rate-change");
  });

  it("detects risk-preference prompts", () => {
    expect(
      classifyHypotheticalPrompt("I want something safer than stocks, explain my options").kind,
    ).toBe("risk-preference");
  });

  it("detects monthly-invest prompts", () => {
    expect(classifyHypotheticalPrompt("What if I invest monthly?").kind).toBe(
      "monthly-invest",
    );
  });

  it("detects scenario-buffet prompts with amount", () => {
    const c = classifyHypotheticalPrompt(
      "I have 50k and want income, what scenarios can I explore?",
    );
    expect(c.kind).toBe("scenario-buffet");
    expect(c.amount).toBe(50_000);
  });

  it("does not classify nonsense", () => {
    expect(classifyHypotheticalPrompt("xyzzy plugh").kind).toBe("none");
  });

  it("does not classify advice-shaped prompts (routed as refusal upstream)", () => {
    // These reach the router first and become refusals; the classifier itself
    // just needs to not spuriously trigger on nonsense.
    expect(classifyHypotheticalPrompt("").kind).toBe("none");
  });
});

describe("buildHypotheticalScenarioResponse", () => {
  it("returns null for non-hypothetical prompts", () => {
    expect(buildHypotheticalScenarioResponse("xyzzy plugh")).toBeNull();
  });

  it("returns safe scenario-buffet copy for broad amount prompts", () => {
    const r = buildHypotheticalScenarioResponse(
      "I have 100,000, show me scenarios",
    );
    expect(r).not.toBeNull();
    expect(r!.kind).toBe("unknown");
    expect(r!.message).toContain("100,000");
    expect(isSafeText(r!.message)).toBe(true);
  });

  it("returns income-goal formula response", () => {
    const r = buildHypotheticalScenarioResponse(
      "How much do I need to earn 10k per month?",
    );
    expect(r).not.toBeNull();
    expect(r!.message).toContain("monthly target");
    expect(isSafeText(r!.message)).toBe(true);
  });

  it("all builders produce safe text", () => {
    const prompts = [
      "How much do I need to earn 10k per month?",
      "Can I live off MMF interest?",
      "What happens if rates go down?",
      "I want something safer than stocks, explain my options",
      "What if I invest monthly?",
      "I have 50k and want income, what scenarios can I explore?",
    ];
    for (const p of prompts) {
      const r = buildHypotheticalScenarioResponse(p);
      expect(r, p).not.toBeNull();
      expect(isSafeText(r!.message), p).toBe(true);
      for (const s of r!.suggestions) {
        expect(isSafeText(s), s).toBe(true);
      }
    }
  });
});

describe("routePrompt — natural hypothetical prompts do not become generic unknown", () => {
  const naturalPrompts = [
    "How much do I need to earn 10k per month?",
    "Can I live off MMF interest?",
    "What happens if rates go down?",
    "I want something safer than stocks, explain my options",
    "What if I invest monthly?",
    "I have 50k and want income, what scenarios can I explore?",
  ];

  for (const prompt of naturalPrompts) {
    it(`${prompt} -> scenario-builder, not generic unknown`, () => {
      const r = routePrompt(prompt);
      expect(r.kind).toBe("unknown");
      if (r.kind === "unknown") {
        expect(r.message).not.toBe(UNKNOWN_FALLBACK_MSG);
      }
    });
  }

  it("nonsense still returns the plain unknown fallback", () => {
    const r = routePrompt("xyzzy plugh");
    expect(r.kind).toBe("unknown");
    if (r.kind === "unknown") {
      expect(r.message).toBe(UNKNOWN_FALLBACK_MSG);
    }
  });
});

describe("advice-shaped prompts still refuse", () => {
  const advice = [
    "Where should I invest 100k?",
    "Should I put 100k in MMF or Safaricom?",
    "What is the best investment for 100k?",
    "Recommend a fund for me",
  ];
  for (const p of advice) {
    it(p, () => {
      expect(routePrompt(p).kind).toBe("refusal");
    });
  }
});

describe("Gemini classifier does not steal hypothetical scenarios", () => {
  const prompts = [
    "How much do I need to earn 10k per month?",
    "Can I live off MMF interest?",
    "What happens if rates go down?",
    "I want something safer than stocks, explain my options",
    "What if I invest monthly?",
    "I have 50k and want income, what scenarios can I explore?",
  ];
  for (const p of prompts) {
    it(`classifyEducational('${p}') === false`, () => {
      expect(isHypotheticalScenarioPrompt(p)).toBe(true);
      expect(classifyEducational(p)).toBe(false);
    });
  }
});
