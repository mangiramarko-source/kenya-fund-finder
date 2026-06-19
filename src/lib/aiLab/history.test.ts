import { describe, it, expect } from "vitest";
import { computeReturnPct } from "./history";

describe("computeReturnPct", () => {
  it("returns null for series with fewer than 2 points", () => {
    expect(computeReturnPct([])).toBeNull();
    expect(computeReturnPct([100])).toBeNull();
  });

  it("computes positive returns", () => {
    expect(computeReturnPct([100, 110])).toBe(10);
    expect(computeReturnPct([100, 105, 110, 121])).toBe(21);
  });

  it("computes negative returns", () => {
    expect(computeReturnPct([100, 90])).toBe(-10);
  });

  it("rounds to two decimal places", () => {
    expect(computeReturnPct([100, 103.456])).toBe(3.46);
  });

  it("returns null when first value is zero", () => {
    expect(computeReturnPct([0, 10])).toBeNull();
  });

  it("returns null when values are non-finite", () => {
    expect(computeReturnPct([NaN, 10])).toBeNull();
    expect(computeReturnPct([10, Infinity])).toBeNull();
  });
});
