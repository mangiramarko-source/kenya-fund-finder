import { describe, it, expect } from "vitest";
import {
  calculateFxConversionScenario,
  calculateFxMoveScenario,
  calculateCommodityMoveScenario,
  getFxCommodityUserText,
  STANDARD_DISCLAIMER,
  FX_CONVERSION_SUMMARY,
} from "./scenarios";
import { routePrompt } from "./router";
import { FX_UNKNOWN_MSG, COMMODITY_UNKNOWN_MSG } from "./intent";
import type { ComparableAsset, MarketContext } from "./marketContext";

const FORBIDDEN = [
  "you will receive",
  "you will get",
  "best rate",
  "guaranteed",
  "risk-free",
  "i recommend",
  "you should buy",
  "put your money in",
];

const mkFx = (symbol: string, name: string, rate: number): ComparableAsset => ({
  kind: "fx",
  symbol,
  name,
  value: rate,
  valueLabel: "KES per 1 unit",
  changePct: 0.1,
  aliases: [symbol.toLowerCase(), name.toLowerCase()],
});

const mkCommodity = (symbol: string, name: string, price: number): ComparableAsset => ({
  kind: "commodity",
  symbol,
  name,
  value: price,
  valueLabel: "Price (USD)",
  changePct: 0.5,
  aliases: [symbol.toLowerCase(), name.toLowerCase(), name.split(" ")[0].toLowerCase()],
});

const fxCtx: MarketContext = {
  fundCount: 0,
  avgAnnualYieldPct: null,
  topAnnualYieldPct: null,
  lowAnnualYieldPct: null,
  sampleStockSymbol: null,
  sampleStockPrice: null,
  sampleStockChangePct: null,
  assets: [
    mkFx("USD", "US Dollar", 129.5),
    mkFx("EUR", "Euro", 141.2),
    mkCommodity("GOLD", "Gold", 2650),
    mkCommodity("BRENT", "Brent Crude", 82),
  ],
  fetchedAt: new Date().toISOString(),
};

describe("calculateFxConversionScenario", () => {
  it("KES to USD divides by rate", () => {
    const r = calculateFxConversionScenario(100_000, "KES", "USD", 129.5, "KES per 1 unit");
    expect(r.kind).toBe("fx-conversion");
    expect(r.convertedAmount).toBeCloseTo(772.2, 1);
    expect(r.summary).toBe(FX_CONVERSION_SUMMARY);
    expect(r.disclaimer).toBe(STANDARD_DISCLAIMER);
  });

  it("USD to KES multiplies by rate", () => {
    const r = calculateFxConversionScenario(1_000, "USD", "KES", 129.5, "KES per 1 unit");
    expect(r.convertedAmount).toBe(129_500);
  });

  it("user-facing text excludes forbidden phrases", () => {
    const r = calculateFxConversionScenario(100_000, "KES", "USD", 129.5, "KES per 1 unit");
    const text = getFxCommodityUserText(r).toLowerCase();
    for (const phrase of FORBIDDEN) {
      expect(text).not.toContain(phrase);
    }
    expect(text).toContain("estimated conversion");
    expect(text).toContain("latest available kenyafundfinder fx data");
  });
});

describe("calculateFxMoveScenario", () => {
  it("applies positive movement to rate", () => {
    const r = calculateFxMoveScenario("USD", "KES", 129.5, 5);
    expect(r.estimatedRateAfterMove).toBeCloseTo(135.975, 3);
  });

  it("applies negative movement to rate", () => {
    const r = calculateFxMoveScenario("USD", "KES", 129.5, -10);
    expect(r.estimatedRateAfterMove).toBeCloseTo(116.55, 2);
  });
});

describe("calculateCommodityMoveScenario", () => {
  it("computes value change for gold +5%", () => {
    const r = calculateCommodityMoveScenario("GOLD", "Gold", 2650, "Price (USD)", 5);
    expect(r.estimatedValueAfterMove).toBeCloseTo(2782.5, 1);
    expect(r.estimatedChange).toBeCloseTo(132.5, 1);
  });
});

describe("Phase 8D router — hard gates", () => {
  it("KES 100,000 to USD uses USD asset only (no KES asset required)", () => {
    const r = routePrompt("KES 100,000 to USD", fxCtx);
    expect(r.kind).toBe("fx-conversion");
    if (r.kind === "fx-conversion") {
      expect(r.inputs.fromCurrency).toBe("KES");
      expect(r.inputs.toCurrency).toBe("USD");
      expect(r.inputs.rate).toBe(129.5);
    }
  });

  it("USD 1,000 to KES uses USD asset", () => {
    const r = routePrompt("USD 1,000 to KES", fxCtx);
    expect(r.kind).toBe("fx-conversion");
    if (r.kind === "fx-conversion") {
      expect(r.inputs.fromCurrency).toBe("USD");
      expect(r.convertedAmount).toBe(129_500);
    }
  });

  it("EUR 1,000 to GBP returns FX-aware unknown (foreign to foreign)", () => {
    const r = routePrompt("EUR 1,000 to GBP", fxCtx);
    expect(r.kind).toBe("unknown");
    if (r.kind === "unknown") {
      expect(r.message).toBe(FX_UNKNOWN_MSG);
    }
  });

  it("KES 100,000 to USD without USD returns FX-aware unknown", () => {
    const r = routePrompt("KES 100,000 to USD", { ...fxCtx, assets: [mkFx("EUR", "Euro", 141.2)] });
    expect(r.kind).toBe("unknown");
    if (r.kind === "unknown") {
      expect(r.message).toBe(FX_UNKNOWN_MSG);
    }
  });

  it("Gold rises 5% without Gold returns commodity-aware unknown", () => {
    const r = routePrompt("Gold rises 5%", { ...fxCtx, assets: [mkFx("USD", "US Dollar", 129.5)] });
    expect(r.kind).toBe("unknown");
    if (r.kind === "unknown") {
      expect(r.message).toBe(COMMODITY_UNKNOWN_MSG);
    }
  });
});

describe("Phase 8D router — FX movement", () => {
  it("USD/KES rises 5% returns fx-move", () => {
    const r = routePrompt("USD/KES rises 5%", fxCtx);
    expect(r.kind).toBe("fx-move");
    if (r.kind === "fx-move") {
      expect(r.inputs.movementPct).toBe(5);
      expect(r.inputs.pair).toBe("USD/KES");
    }
  });

  it("USD/KES falls 10% returns fx-move with negative pct", () => {
    const r = routePrompt("USD/KES falls 10%", fxCtx);
    expect(r.kind).toBe("fx-move");
    if (r.kind === "fx-move") {
      expect(r.inputs.movementPct).toBe(-10);
    }
  });

  it("shilling weakens 5% maps to USD/KES rise", () => {
    const r = routePrompt("What happens if the shilling weakens 5%?", fxCtx);
    expect(r.kind).toBe("fx-move");
    if (r.kind === "fx-move") {
      expect(r.inputs.movementPct).toBe(5);
    }
  });

  it("shilling strengthens 5% maps to USD/KES fall", () => {
    const r = routePrompt("What happens if the shilling strengthens 5%?", fxCtx);
    expect(r.kind).toBe("fx-move");
    if (r.kind === "fx-move") {
      expect(r.inputs.movementPct).toBe(-5);
    }
  });
});

describe("Phase 8D router — commodity movement", () => {
  it("Gold rises 5% returns commodity-move", () => {
    const r = routePrompt("Gold rises 5%", fxCtx);
    expect(r.kind).toBe("commodity-move");
    if (r.kind === "commodity-move") {
      expect(r.inputs.symbol).toBe("GOLD");
      expect(r.inputs.movementPct).toBe(5);
    }
  });

  it("Gold falls 10% returns commodity-move", () => {
    const r = routePrompt("Gold falls 10%", fxCtx);
    expect(r.kind).toBe("commodity-move");
    if (r.kind === "commodity-move") {
      expect(r.inputs.movementPct).toBe(-10);
    }
  });

  it("Brent crude rises 5% returns commodity-move", () => {
    const r = routePrompt("Brent crude rises 5%", fxCtx);
    expect(r.kind).toBe("commodity-move");
    if (r.kind === "commodity-move") {
      expect(r.inputs.symbol).toBe("BRENT");
    }
  });

  it("Should I buy USD? refuses", () => {
    expect(routePrompt("Should I buy USD?", fxCtx).kind).toBe("refusal");
  });

  it("Should I buy gold? refuses", () => {
    expect(routePrompt("Should I buy gold?", fxCtx).kind).toBe("refusal");
  });
});
