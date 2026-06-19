import { describe, it, expect } from "vitest";
import {
  calculateGoalProjectionScenario,
  getGoalProjectionUserText,
  STANDARD_DISCLAIMER,
} from "./scenarios";

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

describe("calculateGoalProjectionScenario", () => {
  it("returns goal-projection kind", () => {
    const r = calculateGoalProjectionScenario(100_000, 10_000, 11, 12);
    expect(r.kind).toBe("goal-projection");
  });

  it("total contributions = start + monthly × months", () => {
    const r = calculateGoalProjectionScenario(100_000, 10_000, 11, 12);
    expect(r.totals.totalContributions).toBe(220_000);
  });

  it("estimated gross value is greater than total contributions", () => {
    const r = calculateGoalProjectionScenario(100_000, 10_000, 11, 12);
    expect(r.totals.estimatedGrossValue).toBeGreaterThan(r.totals.totalContributions);
  });

  it("estimated gross growth equals value minus contributions", () => {
    const r = calculateGoalProjectionScenario(100_000, 10_000, 11, 12);
    expect(r.totals.estimatedGrossGrowth).toBeCloseTo(
      r.totals.estimatedGrossValue - r.totals.totalContributions,
      2,
    );
  });

  it("produces one row per month", () => {
    const r = calculateGoalProjectionScenario(100_000, 10_000, 11, 12);
    expect(r.rows).toHaveLength(12);
  });

  it("first row uses start amount as starting value", () => {
    const r = calculateGoalProjectionScenario(100_000, 10_000, 11, 12);
    expect(r.rows[0].startingValue).toBe(100_000);
  });

  it("summary states it does not predict future returns", () => {
    const r = calculateGoalProjectionScenario(100_000, 10_000, 11, 12);
    expect(r.summary.toLowerCase()).toContain("does not predict future returns");
  });

  it("includes the standard disclaimer", () => {
    const r = calculateGoalProjectionScenario(100_000, 10_000, 11, 12);
    expect(r.disclaimer).toBe(STANDARD_DISCLAIMER);
  });

  it("user-facing text does not include forbidden phrases", () => {
    const r = calculateGoalProjectionScenario(100_000, 10_000, 11, 12);
    const text = getGoalProjectionUserText(r).toLowerCase();
    for (const phrase of FORBIDDEN) {
      expect(text).not.toContain(phrase);
    }
  });
});
