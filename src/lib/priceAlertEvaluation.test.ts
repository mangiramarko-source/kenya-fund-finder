import { describe, it, expect } from "vitest";
import {
  isAlertTriggered,
  calculateAlertProgress,
  calculateAlertDistance,
  resolveAlertAsset,
  doesPriceSatisfyTarget,
} from "./priceAlertEvaluation";
import type { PriceAlert } from "@/hooks/usePriceAlerts";

const createMockAlert = (overrides: Partial<PriceAlert> = {}): PriceAlert => ({
  id: "test-alert-1",
  user_id: "user-1",
  asset_type: "stock",
  asset_id: "scom-id",
  stock_id: null,
  asset_name: "Safaricom PLC (SCOM)",
  asset_unit: "KES",
  target_price: 38.0,
  condition: "above",
  baseline_price: 35.0,
  notify_email: true,
  notify_inapp: true,
  is_triggered: false,
  is_active: true,
  triggered_at: null,
  triggered_price: null,
  created_at: new Date().toISOString(),
  trigger_count: 0,
  ...overrides,
});

describe("priceAlertEvaluation", () => {
  describe("Paused Alerts and Real-Time Evaluation", () => {
    it("returns false for paused alerts (is_active === false) even when live price satisfies target", () => {
      const pausedAboveAlert = createMockAlert({
        condition: "above",
        target_price: 38.0,
        is_active: false,
        is_triggered: false,
      });
      // Price 40.0 satisfies target 38.0, but alert is paused
      expect(isAlertTriggered(pausedAboveAlert, 40.0)).toBe(false);

      const pausedBelowAlert = createMockAlert({
        condition: "below",
        target_price: 30.0,
        is_active: false,
        is_triggered: false,
      });
      // Price 28.0 satisfies target 30.0, but alert is paused
      expect(isAlertTriggered(pausedBelowAlert, 28.0)).toBe(false);
    });

    it("returns true for persisted triggered alerts (is_triggered === true) even if is_active is false", () => {
      const triggeredAlert = createMockAlert({
        is_triggered: true,
        is_active: false,
      });
      expect(isAlertTriggered(triggeredAlert, 20.0)).toBe(true);
      expect(isAlertTriggered(triggeredAlert, null)).toBe(true);
    });

    it("evaluates doesPriceSatisfyTarget accurately regardless of alert state", () => {
      expect(doesPriceSatisfyTarget("above", 38.0, 39.0)).toBe(true);
      expect(doesPriceSatisfyTarget("above", 38.0, 38.0)).toBe(true);
      expect(doesPriceSatisfyTarget("above", 38.0, 37.0)).toBe(false);
      expect(doesPriceSatisfyTarget("above", 38.0, 0)).toBe(false);
      expect(doesPriceSatisfyTarget("above", 38.0, null)).toBe(false);

      expect(doesPriceSatisfyTarget("below", 30.0, 29.0)).toBe(true);
      expect(doesPriceSatisfyTarget("below", 30.0, 30.0)).toBe(true);
      expect(doesPriceSatisfyTarget("below", 30.0, 31.0)).toBe(false);
      expect(doesPriceSatisfyTarget("below", 30.0, 0)).toBe(false);
      expect(doesPriceSatisfyTarget("below", 30.0, -5)).toBe(false);
      expect(doesPriceSatisfyTarget("below", 30.0, null)).toBe(false);
    });
  });

  describe("Edge Case 2: Guard against currentPrice <= 0 / loading on 'below' alerts", () => {
    it("does NOT trigger a 'below' alert when currentPrice is 0", () => {
      const belowAlert = createMockAlert({ condition: "below", target_price: 30.0 });
      expect(isAlertTriggered(belowAlert, 0)).toBe(false);
    });

    it("does NOT trigger a 'below' alert when currentPrice is negative", () => {
      const belowAlert = createMockAlert({ condition: "below", target_price: 30.0 });
      expect(isAlertTriggered(belowAlert, -10)).toBe(false);
    });

    it("does NOT trigger a 'below' alert when currentPrice is null, undefined, or NaN", () => {
      const belowAlert = createMockAlert({ condition: "below", target_price: 30.0 });
      expect(isAlertTriggered(belowAlert, null)).toBe(false);
      expect(isAlertTriggered(belowAlert, undefined as any)).toBe(false);
      expect(isAlertTriggered(belowAlert, Number.NaN)).toBe(false);
    });

    it("triggers a 'below' alert when currentPrice is a valid positive number <= target", () => {
      const belowAlert = createMockAlert({ condition: "below", target_price: 30.0 });
      expect(isAlertTriggered(belowAlert, 29.5)).toBe(true);
      expect(isAlertTriggered(belowAlert, 30.0)).toBe(true);
      expect(isAlertTriggered(belowAlert, 30.5)).toBe(false);
    });

    it("triggers an 'above' alert when currentPrice >= target", () => {
      const aboveAlert = createMockAlert({ condition: "above", target_price: 38.0 });
      expect(isAlertTriggered(aboveAlert, 38.5)).toBe(true);
      expect(isAlertTriggered(aboveAlert, 38.0)).toBe(true);
      expect(isAlertTriggered(aboveAlert, 37.5)).toBe(false);
      expect(isAlertTriggered(aboveAlert, 0)).toBe(false);
    });
  });

  describe("Edge Case 3: Guard against Division by Zero (NaN) in Progress and Percentage math", () => {
    it("handles targetPrice === baselinePrice without dividing by zero or producing NaN", () => {
      const alertEqual = createMockAlert({
        target_price: 35.0,
        baseline_price: 35.0,
        condition: "above",
      });
      const progress = calculateAlertProgress(alertEqual, 34.0);
      expect(Number.isFinite(progress)).toBe(true);
      expect(progress).toBeGreaterThanOrEqual(5);
      expect(progress).toBeLessThanOrEqual(95);
    });

    it("returns 100 for triggered alerts regardless of prices", () => {
      const triggeredAlert = createMockAlert({ is_triggered: true });
      expect(calculateAlertProgress(triggeredAlert, 0)).toBe(100);
      expect(calculateAlertProgress(triggeredAlert, null)).toBe(100);
    });

    it("correctly calculates journey progress when baseline is valid", () => {
      // baseline = 35, target = 40, current = 37.5 -> 50%
      const alert = createMockAlert({
        baseline_price: 35.0,
        target_price: 40.0,
        condition: "above",
      });
      const progress = calculateAlertProgress(alert, 37.5);
      expect(progress).toBe(50);
    });

    it("safely handles calculateAlertDistance when currentPrice <= 0", () => {
      const alert = createMockAlert();
      const distance0 = calculateAlertDistance(alert, 0);
      expect(distance0.deltaPercent).toBeNull();
      expect(distance0.formattedDelta).toBeNull();

      const distanceNull = calculateAlertDistance(alert, null);
      expect(distanceNull.deltaPercent).toBeNull();
    });

    it("correctly formats delta price and percentage when valid", () => {
      // current = 36, target = 38 -> diff = 2, pct = (2 / 36) * 100 = 5.55%
      const alert = createMockAlert({ target_price: 38.0 });
      const distance = calculateAlertDistance(alert, 36.0);
      expect(distance.isHit).toBe(false);
      expect(distance.deltaPrice).toBe(2);
      expect(distance.deltaPercent).toBeCloseTo(5.56, 1);
      expect(distance.formattedDelta).toContain("KES 2.0 (5.6%) away");
    });
  });

  describe("Asset Resolution", () => {
    it("matches stocks by symbol, id, or parenthesized ticker", () => {
      const mockStocks = [
        { id: "uuid-scom", symbol: "SCOM", name: "Safaricom PLC", price: 36.5, logo_url: "/scom.png" },
      ];
      const alert = createMockAlert({ asset_id: "uuid-scom" });
      const resolved = resolveAlertAsset(alert, mockStocks);
      expect(resolved.symbol).toBe("SCOM");
      expect(resolved.currentPrice).toBe(36.5);
      expect(resolved.logoUrl).toBe("/scom.png");
    });
  });
});
