import { describe, it, expect } from "vitest";
import { buildWeeklyBuckets } from "./portfolioWeeklyBuckets";
import type { ChangeRow } from "@/hooks/usePortfolioChanges";

const row = (over: Partial<ChangeRow>): ChangeRow => ({
  itemId: "x", assetType: "mmf", assetName: "X",
  current: 0, previous: 0, delta: 0, deltaPct: 0, unit: "%",
  ...over,
});

describe("buildWeeklyBuckets", () => {
  it("returns empty buckets when no changes", () => {
    const b = buildWeeklyBuckets([]);
    expect(b.isEmpty).toBe(true);
    expect(b.largestYieldIncrease).toBeNull();
  });

  it("classifies yield increases and decreases", () => {
    const b = buildWeeklyBuckets([
      row({ itemId: "a", assetName: "A", unit: "%", delta: 0.5 }),
      row({ itemId: "b", assetName: "B", unit: "%", delta: -0.3 }),
      row({ itemId: "c", assetName: "C", unit: "%", delta: 0.8 }),
    ]);
    expect(b.largestYieldIncrease?.assetName).toBe("C");
    expect(b.largestYieldDecrease?.assetName).toBe("B");
    expect(b.isEmpty).toBe(false);
  });

  it("classifies price increases and decreases independently", () => {
    const b = buildWeeklyBuckets([
      row({ itemId: "s1", assetType: "stock", assetName: "SCOM", unit: "KES", delta: 1.2 }),
      row({ itemId: "s2", assetType: "stock", assetName: "EQTY", unit: "KES", delta: -2.5 }),
    ]);
    expect(b.largestPriceIncrease?.assetName).toBe("SCOM");
    expect(b.largestPriceDecrease?.assetName).toBe("EQTY");
    expect(b.largestYieldIncrease).toBeNull();
  });

  it("treats null delta as missing data", () => {
    const b = buildWeeklyBuckets([
      row({ itemId: "a", assetName: "A", delta: null, deltaPct: null }),
      row({ itemId: "b", assetName: "B", unit: "%", delta: 0.2 }),
    ]);
    expect(b.missingData).toHaveLength(1);
    expect(b.missingData[0].assetName).toBe("A");
    expect(b.withData).toHaveLength(1);
  });

  it("ignores zero deltas in both withData and bucket picks", () => {
    const b = buildWeeklyBuckets([
      row({ itemId: "a", unit: "%", delta: 0 }),
    ]);
    expect(b.withData).toHaveLength(0);
    expect(b.largestYieldIncrease).toBeNull();
    expect(b.largestYieldDecrease).toBeNull();
  });
});
