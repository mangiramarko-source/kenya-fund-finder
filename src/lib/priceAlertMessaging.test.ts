import { describe, expect, it } from "vitest";
import { PRICE_ALERT_AUTOMATION_STATUS, priceAlertMessaging } from "./priceAlertMessaging";

describe("public price-alert messaging", () => {
  it("does not claim automatic or immediate alert delivery", () => {
    const publicCopy = Object.values(priceAlertMessaging).join(" ");

    expect(publicCopy).not.toMatch(/instant|immediately|real-time/i);
    expect(publicCopy).toContain(PRICE_ALERT_AUTOMATION_STATUS);
  });

  it("keeps the current NSE-only alert scope clear", () => {
    expect(priceAlertMessaging.seoDescription).toContain("NSE stock");
  });
});
