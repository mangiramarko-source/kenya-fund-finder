import { describe, expect, it } from "vitest";
import { buildPriceAlertInsert, PRICE_ALERT_AVAILABILITY_MESSAGE } from "./usePriceAlerts";

describe("price-alert write contract", () => {
  it("writes the evaluator's canonical stock foreign key", () => {
    expect(buildPriceAlertInsert("user-1", {
      asset_type: "stock", asset_id: "stock-1", asset_name: "Safaricom (SCOM)",
      target_price: 20, condition: "above",
    })).toMatchObject({
      user_id: "user-1", stock_id: "stock-1", asset_id: "stock-1", asset_type: "stock",
    });
  });

  it("fails closed for assets that do not have a production evaluator", () => {
    expect(buildPriceAlertInsert("user-1", {
      asset_type: "fund", asset_id: "fund-1", asset_name: "Example MMF",
      target_price: 15, condition: "change_any",
    })).toBeNull();
    expect(PRICE_ALERT_AVAILABILITY_MESSAGE).toContain("NSE stocks only");
  });
});
