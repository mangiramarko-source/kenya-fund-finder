import { describe, it, expect } from "vitest";
import {
  calculateMmfScenario,
  calculateStockMoveScenario,
  calculateMonthlyContributionScenario,
  STANDARD_DISCLAIMER,
} from "./scenarios";

describe("calculateMmfScenario", () => {
  it("KES 100,000 at 11% yield for 12 months → KES 11,000 gross yearly income", () => {
    const r = calculateMmfScenario(100_000, 11, 12);
    expect(r.grossYearly).toBe(11_000);
    expect(r.monthlyEquivalent).toBeCloseTo(916.6667, 3);
    expect(r.projectedGross).toBe(111_000);
    expect(r.disclaimer).toBe(STANDARD_DISCLAIMER);
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
