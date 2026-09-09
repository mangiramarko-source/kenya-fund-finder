import { afterEach, describe, expect, it, vi } from "vitest";
import {
  INVESTMENT_GLOSSARY,
  LEARN_ACADEMY_FAQS,
  findInvestmentEducation,
} from "@/data/investmentEducation";
import { routePrompt } from "./router";
import { processAiLabUserPrompt } from "./chat";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Learn Academy investment education", () => {
  it("answers a basic stock definition from the shared glossary", () => {
    const result = routePrompt("What is a stock?");

    expect(result.kind).toBe("explainer");
    if (result.kind === "explainer") {
      expect(result.title).toBe("What is Stock?");
      expect(result.paragraphs.join(" ")).toMatch(/ownership of a company/i);
    }
  });

  it.each(INVESTMENT_GLOSSARY.map((entry) => [entry.term, entry.definition]))(
    "makes the Learn glossary term %s searchable",
    (term, definition) => {
      const match = findInvestmentEducation(`Define ${term}`);
      expect(match?.source).toBe("glossary");
      expect(match?.answer).toBe(definition);
    },
  );

  it.each(LEARN_ACADEMY_FAQS.map((item) => [item.question, item.answer]))(
    "makes the Learn FAQ searchable: %s",
    (question, answer) => {
      const match = findInvestmentEducation(question);
      expect(match?.source).toBe("faq");
      expect(match?.answer).toBe(answer);
    },
  );

  it("understands common investing aliases", () => {
    expect(findInvestmentEducation("Explain shares")?.title).toBe("What is Stock?");
    expect(findInvestmentEducation("What are bps?")?.title).toBe("What is Basis Point (bp)?");
    expect(findInvestmentEducation("What is market cap?")?.title).toBe("What is Market Capitalisation?");
    expect(findInvestmentEducation("Define MMF")?.title).toBe("What is Money Market Fund (MMF)?");
  });

  it("accepts a shortened version of an unambiguous Academy FAQ", () => {
    const match = findInvestmentEducation("How do dividends work");
    expect(match?.title).toBe("How do dividends work for Kenyan stocks?");
    expect(match?.answer).toMatch(/paid per share/i);
  });

  it("does not turn calculations or broad prose into glossary lookups", () => {
    expect(findInvestmentEducation("KES 100,000 in stocks")).toBeNull();
    expect(findInvestmentEducation("Compare stocks and MMFs")).toBeNull();
    expect(findInvestmentEducation("Stocks rose today")).toBeNull();
  });

  it("keeps existing specialist explainers and safety routing intact", () => {
    const nav = routePrompt("What is NAV?");
    expect(nav.kind).toBe("explainer");
    if (nav.kind === "explainer") expect(nav.paragraphs.length).toBeGreaterThan(1);

    expect(routePrompt("What is the best stock for me?").kind).toBe("refusal");
    expect(routePrompt("Should I buy a stock?").kind).toBe("refusal");
  });

  it("answers Academy terms locally even when server-authoritative mode is enabled", async () => {
    vi.stubEnv("VITE_AI_LAB_SERVER_AUTHORITATIVE", "true");

    const output = await processAiLabUserPrompt("What is a stock?", null, null, {
      naturalLanguage: true,
    });

    expect(output.route).toBe("router");
    expect(output.result?.kind).toBe("explainer");
    if (output.result?.kind === "explainer") {
      expect(output.result.paragraphs.join(" ")).toMatch(/ownership of a company/i);
    }
  });
});
