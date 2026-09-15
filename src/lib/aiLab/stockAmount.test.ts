import { describe, it, expect } from "vitest";
import {
  calculateStockAmountScenario,
  getStockAmountUserText,
  STANDARD_DISCLAIMER,
} from "./scenarios";
import type { ComparableAsset } from "./marketContext";

const FORBIDDEN = [
  "i recommend",
  "best fund",
  "top fund",
  "safest fund",
  "you should buy",
  "you should sell",
  "guaranteed return",
  "risk-free",
  "put your money in",
];

const mkStock = (symbol: string, name: string, price: number): ComparableAsset => ({
  kind: "stock",
  symbol,
  name,
  value: price,
  valueLabel: "Price (KES)",
  changePct: null,
  aliases: [symbol.toLowerCase(), name.toLowerCase()],
});

describe("calculateStockAmountScenario", () => {
  const asset = mkStock("SCOM", "Safaricom", 20);

  it("computes approximate shares from amount and latest price", () => {
    const r = calculateStockAmountScenario(10_000, asset);
    expect(r.approximateShares).toBe(500);
  });

  it("computes +5% scenario value", () => {
    const r = calculateStockAmountScenario(10_000, asset);
    const row = r.rows.find((x) => x.movementPct === 5);
    expect(row?.estimatedValue).toBe(10_500);
  });

  it("computes -10% scenario value", () => {
    const r = calculateStockAmountScenario(10_000, asset);
    const row = r.rows.find((x) => x.movementPct === -10);
    expect(row?.estimatedValue).toBe(9_000);
  });

  it("adds balanced five-year illustrations only when the user gives a horizon", () => {
    const r = calculateStockAmountScenario(1_000_000, asset, 60);
    const upFifteen = r.projection?.scenarios.find((scenario) => scenario.annualMovementPct === 15);
    expect(r.projection?.months).toBe(60);
    expect(r.projection?.scenarios.map((scenario) => scenario.annualMovementPct)).toEqual([-30, -15, 0, 15, 30]);
    expect(upFifteen?.projectedValue).toBe(2_011_357);
    expect(upFifteen?.projectedGainLoss).toBe(1_011_357);
  });

  it("summary states this does not predict profit", () => {
    const r = calculateStockAmountScenario(10_000, asset);
    expect(r.summary.toLowerCase()).toContain("does not predict profit");
    expect(r.summary).toContain("SCOM");
  });

  it("uses simple duration wording when a horizon is present", () => {
    const r = calculateStockAmountScenario(100_000, asset, 10);
    expect(r.summary).toContain("what could it look like after 10 months");
    expect(r.summary).toContain("This is not a forecast");
    expect(r.assumptions.join(" ")).toContain("+15% means the price rises by 15% per year");
  });

  it("includes the standard disclaimer", () => {
    const r = calculateStockAmountScenario(10_000, asset);
    expect(r.disclaimer).toBe(STANDARD_DISCLAIMER);
  });

  it("user-facing text excludes forbidden phrases", () => {
    const r = calculateStockAmountScenario(10_000, asset);
    const text = getStockAmountUserText(r).toLowerCase();
    for (const phrase of FORBIDDEN) {
      expect(text).not.toContain(phrase);
    }
  });
});
