import { describe, expect, it } from "vitest";
import { buildPriceAlertInsert } from "./usePriceAlerts";

describe("price-alert write contract", () => {
  it("writes the public stock identity for server-side validation", () => {
    const payload = buildPriceAlertInsert("user-1", {
      asset_type: "stock", asset_id: "stock-1", asset_name: "Safaricom (SCOM)",
      target_price: 20, condition: "above",
    });
    expect(payload).toMatchObject({
      user_id: "user-1", asset_id: "stock-1", asset_type: "stock",
    });
    expect(payload).not.toHaveProperty("stock_id");
  });

  it("preserves units for non-stock alerts", () => {
    expect(buildPriceAlertInsert("user-1", {
      asset_type: "currency", asset_id: "fx-1", asset_name: "USD/KES",
      target_price: 130, condition: "above", asset_unit: "KES",
    })).toMatchObject({
      user_id: "user-1", asset_id: "fx-1", asset_type: "currency", asset_unit: "KES",
    });
    expect(buildPriceAlertInsert("user-1", {
      asset_type: "commodity", asset_id: "commodity-1", asset_name: "Gold",
      target_price: 300000, condition: "below", asset_unit: "KSh per oz",
    })).toMatchObject({
      asset_type: "commodity", asset_unit: "KSh per oz",
    });
  });

  it("writes unit trust alerts with their percentage unit", () => {
    expect(buildPriceAlertInsert("user-1", {
      asset_type: "fund", asset_id: "fund-1", asset_name: "Example MMF",
      target_price: 15, condition: "above", asset_unit: "%",
    })).toMatchObject({ asset_type: "fund", asset_unit: "%" });
  });
});
