import { describe, expect, it } from "vitest";
import { routePrompt } from "./router";
import type { ComparableAsset, MarketContext } from "./marketContext";

const asset = (
  kind: ComparableAsset["kind"],
  symbol: string,
  name: string,
  value: number,
  valueLabel: string,
  aliases: string[] = [],
): ComparableAsset => ({ kind, symbol, name, value, valueLabel, changePct: null, aliases });

const ctx: MarketContext = {
  fundCount: 1,
  avgAnnualYieldPct: 9,
  topAnnualYieldPct: 12,
  lowAnnualYieldPct: 9,
  sampleStockSymbol: "SCOM",
  sampleStockPrice: 20,
  sampleStockChangePct: 0,
  assets: [
    asset("stock", "ABSA", "Absa Bank Kenya", 15, "Price (KES)", ["absa", "absa bank"]),
    asset("stock", "SCOM", "Safaricom", 20, "Price (KES)", ["safaricom", "safcom"]),
    asset("fund", "Etica Money Market Fund", "Etica Money Market Fund", 12, "Annual yield (%)", ["etica", "etica mmf"]),
    asset("fx", "USD", "US Dollar", 125, "KES per 1 unit", ["usd", "dollar", "dollars"]),
    asset("commodity", "GOLD", "Gold", 2_500, "Price (USD)", ["gold"]),
  ],
  fetchedAt: "2026-09-08T00:00:00.000Z",
};

describe("asset-aware amount scenarios", () => {
  it.each([
    ["put 100k in ABSA", "ABSA"],
    ["KES 20k in Safaricom", "SCOM"],
    ["put 100 bob in Safarcom", "SCOM"],
  ])("routes stock wording without a hard-coded ticker: %s", (prompt, symbol) => {
    const result = routePrompt(prompt, ctx);
    expect(result.kind).toBe("stock-amount");
    if (result.kind === "stock-amount") expect(result.inputs.symbol).toBe(symbol);
  });

  it("uses the matched fund's published yield rather than the average", () => {
    const result = routePrompt("put 100k in Etica MMF", ctx);
    expect(result.kind).toBe("mmf");
    if (result.kind === "mmf") {
      expect(result.inputs.annualYieldPct).toBe(12);
      expect(result.grossYearly).toBe(12_000);
      expect(result.assumptions.join(" ")).toContain("Etica Money Market Fund");
    }
  });

  it.each([
    ["put 100k in USD", 100_000],
    ["buy dollars with 50k", 50_000],
  ])("defaults an FX amount prompt to a KES conversion: %s", (prompt, amount) => {
    const result = routePrompt(prompt, ctx);
    expect(result.kind).toBe("fx-conversion");
    if (result.kind === "fx-conversion") {
      expect(result.inputs.amount).toBe(amount);
      expect(result.inputs.fromCurrency).toBe("KES");
      expect(result.inputs.toCurrency).toBe("USD");
    }
  });

  it("converts KES through the catalog FX rate before estimating commodity units", () => {
    const result = routePrompt("invest 100k in gold", ctx);
    expect(result.kind).toBe("commodity-amount");
    if (result.kind === "commodity-amount") {
      expect(result.inputs.quoteCurrency).toBe("USD");
      expect(result.inputs.fxRate).toBe(125);
      expect(result.quoteAmount).toBe(800);
      expect(result.estimatedUnits).toBeCloseTo(0.32, 4);
    }
  });

  it("asks for the missing published FX rate instead of inventing commodity units", () => {
    const result = routePrompt("put 100k in gold", { ...ctx, assets: ctx.assets.filter((a) => a.kind !== "fx") });
    expect(result.kind).toBe("unknown");
    if (result.kind === "unknown") expect(result.message).toContain("USD/KES rate");
  });

  it("keeps a personalized selection request behind the refusal boundary", () => {
    expect(routePrompt("Should I put 100k in ABSA?", ctx).kind).toBe("refusal");
  });
});
