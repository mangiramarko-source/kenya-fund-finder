import { describe, it, expect } from "vitest";
import { computeAlertSummary } from "./watchlistAlertSummary";

describe("computeAlertSummary", () => {
  const watched = new Set(["fund:f1", "fund:f2", "stock:s1"]);

  it("counts active and triggered alerts on watched assets only", () => {
    const res = computeAlertSummary(
      [
        { asset_type: "fund", asset_id: "f1", is_active: true, is_triggered: false },
        { asset_type: "fund", asset_id: "f2", is_active: true, is_triggered: true },
        { asset_type: "stock", asset_id: "s1", is_active: true, is_triggered: false },
        // Unwatched — ignored
        { asset_type: "fund", asset_id: "other", is_active: true, is_triggered: true },
        // Inactive — ignored
        { asset_type: "fund", asset_id: "f1", is_active: false, is_triggered: true },
      ],
      watched,
    );
    expect(res).toEqual({ active: 2, triggered: 1 });
  });

  it("returns zero counts when no alerts match", () => {
    expect(computeAlertSummary([], watched)).toEqual({ active: 0, triggered: 0 });
  });
});
