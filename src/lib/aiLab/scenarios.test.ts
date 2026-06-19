import { describe, it, expect } from "vitest";
import {
  calculateMmfScenario,
  calculateMmfYieldChangeScenario,
  calculateStockMoveScenario,
  calculateMonthlyContributionScenario,
  STANDARD_DISCLAIMER,
  MMF_SCENARIO_SUMMARY,
  getMmfUserText,
} from "./scenarios";

describe("calculateMmfScenario", () => {
  it("KES 100,000 at 11% yield for 12 months → KES 11,000 gross yearly income", () => {
    const r = calculateMmfScenario(100_000, 11, 12);
    expect(r.grossYearly).toBe(11_000);
    expect(r.monthlyEquivalent).toBeCloseTo(916.6667, 3);
    expect(r.projectedGross).toBe(111_000);
    expect(r.disclaimer).toBe(STANDARD_DISCLAIMER);
  });

  it("computes dailyEquivalent as grossYearly / 365 rounded to 2dp", () => {
    const r = calculateMmfScenario(100_000, 11, 12);
    expect(r.dailyEquivalent).toBeCloseTo(30.14, 2);
  });

  it("uses the canonical safe MMF summary wording", () => {
    const r = calculateMmfScenario(100_000, 11, 12);
    expect(r.summary).toBe(MMF_SCENARIO_SUMMARY);
    expect(r.summary.toLowerCase()).not.toContain("you will earn");
    expect(r.summary.toLowerCase()).not.toContain("you will make");
  });

  it("user-facing MMF text does not contain 'mutual fund'", () => {
    const r = calculateMmfScenario(100_000, 11, 12);
    expect(getMmfUserText(r).toLowerCase()).not.toContain("mutual fund");
  });
});

describe("calculateMmfYieldChangeScenario", () => {
  it("computes delta between two yield assumptions", () => {
    const r = calculateMmfYieldChangeScenario(100_000, 11, 9, 12);
    expect(r.fromGrossYearly).toBe(11_000);
    expect(r.toGrossYearly).toBe(9_000);
    expect(r.deltaYearly).toBe(-2_000);
    expect(r.fromMonthly).toBeCloseTo(916.67, 1);
    expect(r.toMonthly).toBeCloseTo(750, 1);
    expect(r.summary.toLowerCase()).not.toContain("guarantee");
  });

  it("user-facing yield-change text does not contain 'mutual fund'", () => {
    const r = calculateMmfYieldChangeScenario(100_000, 11, 9);
    expect(getMmfUserText(r).toLowerCase()).not.toContain("mutual fund");
  });
});

describe("calculateStockMoveScenario", () => {
  it("+5% on KES 100,000 returns KES 105,000", () => {
    const r = calculateStockMoveScenario(100_000, 5);
    expect(r.newValue).toBe(105_000);
    expect(r.delta).toBe(5_000);
    expect(r.direction).toBe("up");
  });
  it("-10% on KES 100,000 returns KES 90,000", () => {
    const r = calculateStockMoveScenario(100_000, -10);
    expect(r.newValue).toBe(90_000);
    expect(r.delta).toBe(-10_000);
    expect(r.direction).toBe("down");
  });
});

describe("calculateMonthlyContributionScenario", () => {
  it("grows monotonically with positive yield and contributions", () => {
    const a = calculateMonthlyContributionScenario(10_000, 1_000, 10, 6);
    const b = calculateMonthlyContributionScenario(10_000, 1_000, 10, 12);
    expect(b.projectedGross).toBeGreaterThan(a.projectedGross);
    expect(a.totalContributions).toBe(10_000 + 1_000 * 6);
    expect(a.disclaimer).toBe(STANDARD_DISCLAIMER);
  });
});
