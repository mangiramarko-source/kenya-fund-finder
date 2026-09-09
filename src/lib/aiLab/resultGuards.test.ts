import { describe, expect, it } from "vitest";
import type { RouterResult } from "./router";
import { isRenderableAiLabResult } from "./resultGuards";

describe("isRenderableAiLabResult", () => {
  it("rejects the legacy partial stock result that would format undefined", () => {
    const legacy = {
      kind: "stock-amount",
      summary: "Legacy response",
      inputs: { amount: 10_000, symbol: "SCOM", latestPrice: 20 },
      estimatedShares: 500,
      assumptions: [],
      disclaimer: "Data only.",
    } as unknown as RouterResult;

    expect(isRenderableAiLabResult(legacy)).toBe(false);
  });

  it("accepts a complete stock result", () => {
    const complete = {
      kind: "stock-amount",
      summary: "Complete response",
      inputs: { amount: 10_000, symbol: "SCOM", name: "Safaricom PLC", latestPrice: 20 },
      approximateShares: 500,
      rows: [],
      assumptions: [],
      importantNotes: [],
      disclaimer: "Data only.",
    } as RouterResult;

    expect(isRenderableAiLabResult(complete)).toBe(true);
  });
});
