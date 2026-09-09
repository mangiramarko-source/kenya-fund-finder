import { describe, expect, it, vi } from "vitest";
import {
  processAiLabClarificationSelection,
  processAiLabUserPrompt,
  type AiLabSessionContext,
} from "./chat";
import type { ComparableAsset, MarketContext } from "./marketContext";

vi.mock("./queryResolutionTelemetry", () => ({ recordQueryResolutionTelemetry: vi.fn(async () => true) }));

const asset = (value: Partial<ComparableAsset> & Pick<ComparableAsset, "id" | "kind" | "name" | "symbol">): ComparableAsset => ({
  value: 10,
  valueLabel: value.kind === "fund" ? "Annual yield (%)" : "Price (KES)",
  changePct: 0,
  aliases: [],
  ...value,
});

const ctx: MarketContext = {
  fundCount: 2,
  avgAnnualYieldPct: 10,
  topAnnualYieldPct: 11,
  lowAnnualYieldPct: 9,
  sampleStockSymbol: "KCB",
  sampleStockPrice: 45,
  sampleStockChangePct: 0.5,
  fetchedAt: "2026-09-08T00:00:00.000Z",
  assets: [
    asset({ id: "kcb-stock", kind: "stock", name: "KCB Group", symbol: "KCB", value: 45, aliases: ["kcb"] }),
    asset({ id: "kcb-mmf", kind: "fund", name: "KCB Money Market Fund", symbol: "KCB Money Market Fund", aliases: ["kcb", "kcb mmf"], extras: [{ label: "Fund type", value: "money market" }, { label: "Manager", value: "KCB Asset Management" }] }),
    asset({ id: "eqty-stock", kind: "stock", name: "Equity Group", symbol: "EQTY", value: 50, aliases: ["equity"] }),
    asset({ id: "equity-mmf", kind: "fund", name: "Equity Money Market Fund", symbol: "Equity Money Market Fund", aliases: ["equity", "equity mmf"], extras: [{ label: "Fund type", value: "money market" }, { label: "Manager", value: "Equity Investment Bank" }] }),
  ],
};

describe("AI Lab universal clarification flow", () => {
  it("asks one product question and resumes the original compare", async () => {
    const first = await processAiLabUserPrompt("compare KCB", ctx, null, { naturalLanguage: true });
    expect(first.route).toBe("universal-query");
    expect(first.clarification?.kind).toBe("entity-choice");
    expect(first.text).toMatch(/Which KCB product/i);
    const stockChoice = first.clarification?.choices.find((choice) => choice.kind === "stock");
    expect(stockChoice?.id).toBe("stock:kcb-stock");

    const second = await processAiLabClarificationSelection(first.clarification!, stockChoice!.id, ctx);
    expect(second.clarification?.kind).toBe("missing-entity");
    expect(second.text).toMatch(/compare KCB Group with/i);

    const session: AiLabSessionContext = { pendingClarification: second.clarification };
    const final = await processAiLabUserPrompt("Equity stock", ctx, null, { sessionContext: session, naturalLanguage: true });
    expect(final.result?.kind).toBe("compare");
    if (final.result?.kind === "compare") {
      expect(final.result.assets.map((item) => item.symbol)).toEqual(["KCB", "EQTY"]);
    }
  });
});
