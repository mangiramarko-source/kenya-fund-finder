import { describe, it, expect } from "vitest";
import { getHoldingAlertState, findHoldingAlert } from "./portfolioAlertBadge";

const alerts = [
  { asset_type: "fund", asset_id: "f1", asset_name: "CIC MMF", is_active: true, is_triggered: false },
  { asset_type: "fund", asset_id: "f2", asset_name: "Sanlam MMF", is_active: true, is_triggered: true },
  { asset_type: "fund", asset_id: "f3", asset_name: "Old", is_active: false, is_triggered: true },
  { asset_type: "stock", asset_id: "s1", asset_name: "Safaricom", is_active: true, is_triggered: false },
];

describe("portfolioAlertBadge", () => {
  it('returns "active" for a fund matched by asset_id', () => {
    expect(getHoldingAlertState(
      { asset_type: "mmf", asset_id: "f1", asset_name: "anything" },
      alerts,
    )).toBe("active");
  });

  it('returns "triggered" for a fund whose alert fired', () => {
    expect(getHoldingAlertState(
      { asset_type: "mmf", asset_id: "f2", asset_name: "anything" },
      alerts,
    )).toBe("triggered");
  });

  it("ignores inactive alerts", () => {
    expect(getHoldingAlertState(
      { asset_type: "mmf", asset_id: "f3", asset_name: "Old" },
      alerts,
    )).toBe("none");
  });

  it("falls back to normalized name when asset_id is missing", () => {
    expect(getHoldingAlertState(
      { asset_type: "mmf", asset_name: "cic mmf" },
      alerts,
    )).toBe("active");
  });

  it("maps mmf → fund correctly", () => {
    const hit = findHoldingAlert(
      { asset_type: "mmf", asset_id: "f1", asset_name: "x" },
      alerts,
    );
    expect(hit?.asset_type).toBe("fund");
  });

  it("returns none for unmatched holdings", () => {
    expect(getHoldingAlertState(
      { asset_type: "mmf", asset_name: "Unknown Fund" },
      alerts,
    )).toBe("none");
  });
});
