import { describe, it, expect } from "vitest";
import { routePrompt } from "./router";
import type { MarketContext, ComparableAsset } from "./marketContext";

const mkStock = (symbol: string, name: string, price: number, changePct: number): ComparableAsset => ({
  kind: "stock",
  symbol,
  name,
  value: price,
  valueLabel: "Price (KES)",
  changePct,
  aliases: [symbol.toLowerCase(), name.toLowerCase()],
});

const mkFx = (code: string, name: string, rate: number, changePct: number): ComparableAsset => ({
  kind: "fx",
  symbol: code,
  name,
  value: rate,
  valueLabel: "KES per 1 unit",
  changePct,
  aliases: [code.toLowerCase(), name.toLowerCase()],
});

const ctx: MarketContext = {
  fundCount: 0,
  avgAnnualYieldPct: null,
  topAnnualYieldPct: null,
  lowAnnualYieldPct: null,
  sampleStockSymbol: null,
  sampleStockPrice: null,
  sampleStockChangePct: null,
  assets: [
    mkStock("SCOM", "Safaricom", 18.5, 1.2),
    mkStock("EQTY", "Equity Group", 44.1, -0.4),
    mkFx("USD", "US Dollar", 129.5, 0.1),
    mkFx("EUR", "Euro", 141.2, -0.3),
  ],
  fetchedAt: new Date().toISOString(),
};

describe("routePrompt compare", () => {
  it("compares two stocks by ticker", () => {
    const r = routePrompt("Compare SCOM vs EQTY", ctx);
    expect(r.kind).toBe("compare");
    if (r.kind === "compare") {
      expect(r.assets.map((a) => a.symbol)).toEqual(["SCOM", "EQTY"]);
      expect(r.diff.length).toBeGreaterThan(0);
    }
  });

  it("compares two FX currencies by code", () => {
    const r = routePrompt("Compare USD with EUR", ctx);
    expect(r.kind).toBe("compare");
  });

  it("compares using fuzzy name match", () => {
    const r = routePrompt("compare safaricom and equity", ctx);
    expect(r.kind).toBe("compare");
  });

  it("returns unknown with hints when an asset can't be found", () => {
    const r = routePrompt("Compare FOO vs BAR", ctx);
    expect(r.kind).toBe("unknown");
  });

  it("refuses advisory framing inside a compare prompt", () => {
    const r = routePrompt("Which stock should I buy SCOM or EQTY?", ctx);
    expect(r.kind).toBe("refusal");
  });
});
