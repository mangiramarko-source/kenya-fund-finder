import { describe, expect, it } from "vitest";
import {
  buildStructuredComparison,
  calculateDeterministicMmfYieldChange,
  type StructuredComparisonAsset,
} from "../../../supabase/functions/_shared/server-financial-results";
import { validateQuerySemanticFrame } from "../../../supabase/functions/_shared/universal-query";

const stock = (overrides: Partial<StructuredComparisonAsset> = {}): StructuredComparisonAsset => ({
  kind: "stock",
  id: "stock-scom",
  name: "Safaricom PLC",
  symbol: "SCOM",
  value: 37,
  valueLabel: "Price (KES)",
  changePct: -1.07,
  aliases: [],
  updatedAt: "2026-09-08T17:00:00Z",
  ...overrides,
});

describe("server structured comparisons", () => {
  it("returns a renderable deterministic comparison for two products", () => {
    const result = buildStructuredComparison([
      stock(),
      stock({ id: "stock-kcb", name: "KCB Group PLC", symbol: "KCB", value: 96.5, changePct: -1.53 }),
    ]);
    expect(result.kind).toBe("compare");
    expect(result.assets).toHaveLength(2);
    expect(result.diff[0]).toEqual({ label: "KCB vs SCOM (Price (KES))", value: "+59.5 (+160.81%)" });
    expect(result.warnings).toEqual([]);
  });

  it("supports more than two products within the contract limit", () => {
    const result = buildStructuredComparison([
      stock(),
      stock({ symbol: "KCB", name: "KCB Group PLC", value: 96.5 }),
      stock({ symbol: "EQTY", name: "Equity Group Holdings", value: 103 }),
    ]);
    expect(result.assets.map((asset) => asset.symbol)).toEqual(["SCOM", "KCB", "EQTY"]);
    expect(result.diff.some((row) => row.label.startsWith("EQTY vs SCOM"))).toBe(true);
  });

  it("shows missing data without inventing a numeric value", () => {
    const missing = stock({ symbol: "MISSING", name: "Missing Fund", value: 0, valueLabel: "Value unavailable", dataUnavailable: true, updatedAt: null });
    const result = buildStructuredComparison([stock(), missing]);
    expect(result.diff).toEqual([]);
    expect(result.warnings).toContain("Missing Fund: current comparison value is unavailable.");
    expect(result.warnings).toContain("Missing Fund: source timestamp is unavailable.");
  });

  it("warns when observation dates differ", () => {
    const result = buildStructuredComparison([
      stock(),
      stock({ symbol: "KCB", name: "KCB Group PLC", updatedAt: "2026-09-07T17:00:00Z" }),
    ]);
    expect(result.warnings).toEqual([
      "Values use different observation dates: SCOM 2026-09-08; KCB 2026-09-07.",
    ]);
  });

  it("does not subtract incompatible units", () => {
    const result = buildStructuredComparison([
      stock(),
      stock({ kind: "fund", symbol: "MMF", name: "Example MMF", value: 9.5, valueLabel: "Annual yield (%)" }),
    ]);
    expect(result.diff[0].value).toContain("Different units");
  });
});

describe("server deterministic MMF yield changes", () => {
  it("calculates the KES 500,000 decrease from 11% to 9%", () => {
    const result = calculateDeterministicMmfYieldChange(500_000, 11, 9);
    expect(result.fromGrossYearly).toBe(55_000);
    expect(result.toGrossYearly).toBe(45_000);
    expect(result.deltaYearly).toBe(-10_000);
    expect(result.deltaMonthly).toBeCloseTo(-833.3333, 3);
    expect(result.percentagePointChange).toBe(-2);
    expect(result.relativeYieldChangePct).toBeCloseTo(-18.1818, 3);
  });

  it.each([
    { from: 9, to: 11, annual: 2_000, points: 2 },
    { from: 9, to: 9, annual: 0, points: 0 },
    { from: 10.75, to: 9.25, annual: -1_500, points: -1.5 },
  ])("handles increase, same, and decimal yields: $from to $to", ({ from, to, annual, points }) => {
    const result = calculateDeterministicMmfYieldChange(100_000, from, to);
    expect(result.deltaYearly).toBeCloseTo(annual, 8);
    expect(result.percentagePointChange).toBeCloseTo(points, 8);
  });

  it("does not silently add tax, fees, or compounding", () => {
    const result = calculateDeterministicMmfYieldChange(100_000, 11, 9);
    expect(result.assumptions.join(" ")).toContain("Fees, taxes, withholding tax, compounding, reinvestment");
  });

  it("leaves relative change undefined from a zero starting yield", () => {
    expect(calculateDeterministicMmfYieldChange(100_000, 0, 5).relativeYieldChangePct).toBeNull();
  });

  it("rejects malformed model parameters at the semantic-frame boundary", () => {
    expect(validateQuerySemanticFrame({
      version: 1,
      action: "scenario",
      confidence: "high",
      entityMentions: [],
      requestedMetrics: [],
      parameters: { scenarioKind: "mmf-yield-change", amount: "KES 500,000", percentage: "11", secondPercentage: 9 },
      contextReferences: [],
    }).ok).toBe(false);
  });

  it("formats Kenyan amounts with grouped digits", () => {
    expect(new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(500_000)).toContain("500,000");
  });
});
