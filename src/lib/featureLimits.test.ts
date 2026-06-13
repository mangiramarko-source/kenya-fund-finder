import { describe, it, expect } from "vitest";
import { canCreateAlert, limitMessages, FREE_PLAN } from "@/lib/featureLimits";

describe("featureLimits", () => {
  it("free plan caps active alerts at 3", () => {
    expect(FREE_PLAN.MAX_ACTIVE_ALERTS).toBe(3);
    expect(canCreateAlert(0)).toBe(true);
    expect(canCreateAlert(2)).toBe(true);
    expect(canCreateAlert(3)).toBe(false);
  });
  it("limit message is neutral and references 3 alerts", () => {
    expect(limitMessages.alertsAtMax).toMatch(/3 active alerts/);
    expect(limitMessages.alertsAtMax.toLowerCase()).not.toContain("recommended");
    expect(limitMessages.alertsAtMax.toLowerCase()).not.toContain("best");
  });
});
