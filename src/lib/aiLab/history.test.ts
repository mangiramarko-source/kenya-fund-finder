import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computeReturnPct,
  fetchAssetHistory,
  LOOKBACK_OPTIONS,
  formatReturnLabel,
  formatTrendLabel,
  formatHistoryAssumption,
} from "./history";
import type { ComparableAsset } from "./marketContext";

vi.mock("@/lib/gateway", () => ({
  fetchPublicData: vi.fn(),
}));

import { fetchPublicData } from "@/lib/gateway";

const mkStock = (id: string): ComparableAsset => ({
  kind: "stock",
  id,
  symbol: "SCOM",
  name: "Safaricom",
  value: 18.5,
  valueLabel: "Price (KES)",
  changePct: 1.2,
  aliases: ["scom"],
});

const mkFund = (): ComparableAsset => ({
  kind: "fund",
  id: "fund-1",
  symbol: "ABC",
  name: "Sample MMF",
  value: 12.5,
  valueLabel: "Annual yield (%)",
  changePct: null,
  aliases: ["abc"],
});

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

describe("lookback helpers", () => {
  it("LOOKBACK_OPTIONS contains 7, 30, and 90", () => {
    expect(LOOKBACK_OPTIONS).toEqual([7, 30, 90]);
  });

  it("formatReturnLabel returns day-specific return labels", () => {
    expect(formatReturnLabel(7)).toBe("7-day return");
    expect(formatReturnLabel(90)).toBe("90-day return");
  });

  it("formatTrendLabel returns day-specific trend labels", () => {
    expect(formatTrendLabel(7)).toBe("7-day trend");
    expect(formatTrendLabel(90)).toBe("90-day trend");
  });

  it("formatHistoryAssumption includes lookback and fund limitation", () => {
    const text = formatHistoryAssumption(30);
    expect(text).toContain("30-day history");
    expect(text).toContain("Unit trusts");
    expect(text).toContain("no per-fund history endpoint");
  });
});

describe("fetchAssetHistory", () => {
  beforeEach(() => {
    vi.mocked(fetchPublicData).mockReset();
    vi.mocked(fetchPublicData).mockResolvedValue({
      resource: "history",
      count: 2,
      limit: 100,
      offset: 0,
      data: [
        { snapshot_date: "2026-05-01", price: 100 },
        { snapshot_date: "2026-05-08", price: 110 },
      ],
    });
  });

  it("passes 7-day lookback to gateway for stock assets", async () => {
    await fetchAssetHistory(mkStock("stock-1"), 7);
    expect(fetchPublicData).toHaveBeenCalledWith("stock-history", {
      id: "stock-1",
      days: 7,
      order: "snapshot_date.asc",
      limit: 12,
    });
  });

  it("passes 90-day lookback to gateway for stock assets", async () => {
    await fetchAssetHistory(mkStock("stock-2"), 90);
    expect(fetchPublicData).toHaveBeenCalledWith("stock-history", {
      id: "stock-2",
      days: 90,
      order: "snapshot_date.asc",
      limit: 95,
    });
  });

  it("returns empty history for funds without calling gateway", async () => {
    const result = await fetchAssetHistory(mkFund(), 30);
    expect(fetchPublicData).not.toHaveBeenCalled();
    expect(result).toEqual({
      points: [],
      returnPct: null,
      metric: "",
      from: null,
      to: null,
    });
  });
});
