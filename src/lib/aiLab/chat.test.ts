import { describe, it, expect } from "vitest";
import { routePrompt } from "./router";
import {
  createUserMessage,
  createAssistantMessage,
  deriveSessionContext,
  buildFollowUpSuggestions,
  buildClarifyingResponse,
  clarifyingTextIsSafe,
} from "./chat";
import { STANDARD_DISCLAIMER } from "./safety";
import type { MarketContext } from "./marketContext";

const ctx: MarketContext = {
  fundCount: 10,
  avgAnnualYieldPct: 11,
  topAnnualYieldPct: 12,
  lowAnnualYieldPct: 9,
  sampleStockSymbol: "SCOM",
  sampleStockPrice: 18.5,
  sampleStockChangePct: 1.2,
  assets: [
    {
      kind: "stock",
      symbol: "SCOM",
      name: "Safaricom",
      value: 18.5,
      valueLabel: "Price (KES)",
      changePct: 1.2,
      aliases: ["scom", "safaricom"],
    },
  ],
  fetchedAt: new Date().toISOString(),
};

describe("createUserMessage", () => {
  it("creates user message with text", () => {
    const msg = createUserMessage("KES 10,000 in SCOM");
    expect(msg.role).toBe("user");
    expect(msg.text).toBe("KES 10,000 in SCOM");
    expect(msg.status).toBe("sent");
    expect(msg.id).toBeTruthy();
  });
});

describe("createAssistantMessage", () => {
  it("creates assistant message with result", () => {
    const result = routePrompt("KES 10,000 in SCOM", ctx);
    const msg = createAssistantMessage({
      text: "Stock scenario",
      result,
    });
    expect(msg.role).toBe("assistant");
    expect(msg.result).toBe(result);
    expect(msg.status).toBe("answered");
  });
});

describe("deriveSessionContext", () => {
  it("extracts latest amount from a user prompt", () => {
    const messages = [
      createUserMessage("I have 100k"),
      createAssistantMessage({ text: "clarify", status: "clarifying" }),
      createUserMessage("KES 10,000 in SCOM"),
    ];
    const session = deriveSessionContext(messages);
    expect(session.lastAmount).toBe(10_000);
  });

  it("extracts latest yield from a user prompt", () => {
    const messages = [
      createUserMessage("If I put 100,000 in an MMF at 11%, what happens?"),
    ];
    const session = deriveSessionContext(messages);
    expect(session.lastYieldPct).toBe(11);
  });

  it("does not invent missing yield", () => {
    const messages = [createUserMessage("KES 10,000 in SCOM")];
    const session = deriveSessionContext(messages);
    expect(session.lastYieldPct).toBeUndefined();
  });
});

describe("buildFollowUpSuggestions", () => {
  it("returns safe suggestions for stock amount result", () => {
    const result = routePrompt("KES 10,000 in SCOM", ctx);
    const suggestions = buildFollowUpSuggestions(result);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some((s) => s.toLowerCase().includes("compare"))).toBe(true);
  });

  it("returns safe suggestions for MMF result", () => {
    const result = routePrompt("If I put 100,000 in an MMF, how much do I get?", ctx);
    const suggestions = buildFollowUpSuggestions(result);
    expect(suggestions.some((s) => s.toLowerCase().includes("etica"))).toBe(true);
  });

  it("returns safe suggestions for unknown result", () => {
    const result = routePrompt("xyzzy nonsense prompt", ctx);
    expect(result.kind).toBe("unknown");
    const suggestions = buildFollowUpSuggestions(result);
    expect(suggestions.length).toBeGreaterThanOrEqual(3);
    expect(suggestions.some((s) => s.includes("SCOM"))).toBe(true);
  });
});

describe("buildClarifyingResponse", () => {
  it('asks what scenario to test for "I have 100k"', () => {
    const response = buildClarifyingResponse("I have 100k");
    expect(response).not.toBeNull();
    expect(response!.text.toLowerCase()).toContain("one more detail");
    expect(response!.text).toContain("100");
    expect(response!.followUps.length).toBeGreaterThan(0);
  });

  it('asks for named stock and yield for "Split between MMF and stocks"', () => {
    const response = buildClarifyingResponse("Split between MMF and stocks");
    expect(response).not.toBeNull();
    expect(response!.text.toLowerCase()).toContain("named stock");
    expect(response!.text.toLowerCase()).toContain("yield");
  });

  it("includes disclaimer", () => {
    const response = buildClarifyingResponse("I have 100k");
    expect(response!.disclaimer).toBe(STANDARD_DISCLAIMER);
    expect(response!.text).toContain(STANDARD_DISCLAIMER);
    expect(response!.text).not.toContain("you should");
  });

  it("does not include forbidden advice wording", () => {
    const amountOnly = buildClarifyingResponse("I have 100k");
    const splitOnly = buildClarifyingResponse("Split between MMF and stocks");
    expect(clarifyingTextIsSafe(amountOnly!.text)).toBe(true);
    expect(clarifyingTextIsSafe(splitOnly!.text)).toBe(true);
  });
});
