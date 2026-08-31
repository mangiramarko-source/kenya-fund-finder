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

  it("writes FX and commodity alerts without a stock foreign key", () => {
    expect(buildPriceAlertInsert("user-1", {
      asset_type: "currency", asset_id: "fx-1", asset_name: "USD/KES",
      target_price: 130, condition: "above", price_unit: "KES",
    })).toMatchObject({
      user_id: "user-1", stock_id: null, asset_id: "fx-1", asset_type: "currency", price_unit: "KES",
    });
    expect(buildPriceAlertInsert("user-1", {
      asset_type: "commodity", asset_id: "commodity-1", asset_name: "Gold",
      target_price: 300000, condition: "below", price_unit: "KSh per oz",
    })).toMatchObject({
      stock_id: null, asset_type: "commodity", price_unit: "KSh per oz",
    });
  });

  it("fails closed for assets that do not have a production evaluator", () => {
    expect(buildPriceAlertInsert("user-1", {
      asset_type: "fund", asset_id: "fund-1", asset_name: "Example MMF",
      target_price: 15, condition: "change_any",
    })).toBeNull();
    expect(PRICE_ALERT_AVAILABILITY_MESSAGE).toContain("unit trusts");
  });
});
