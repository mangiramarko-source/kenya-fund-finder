import { describe, expect, it } from "vitest";
import { marketMovement, mmfValue } from "../../supabase/functions/_shared/portfolio-daily-summary";

const holding = {
  id: "holding-1", user_id: "user-1", asset_id: "stock-1", asset_type: "stock", asset_name: "Absa Bank Kenya", ticker: "ABSA",
  units: 100, buy_price: 10, buy_date: "2026-09-01T00:00:00.000Z",
};

describe("portfolio daily market movement", () => {
  it("reports gains, losses, and the largest contributors for unchanged holdings", () => {
    const result = marketMovement([
      { ...holding, value: 1200 },
      { ...holding, id: "holding-2", asset_name: "Safaricom PLC", units: 10, value: 300 },
    ], [
      { portfolio_holding_id: "holding-1", asset_name: "Absa Bank Kenya", units: 100, value: 1000 },
      { portfolio_holding_id: "holding-2", asset_name: "Safaricom PLC", units: 10, value: 350 },
    ]);
    expect(result.openingValue).toBe(1350);
    expect(result.closingValue).toBe(1500);
    expect(result.change).toBe(150);
    expect(result.percentChange).toBeCloseTo(11.111, 2);
    expect(result.movers.map((mover) => mover.assetName)).toEqual(["Absa Bank Kenya", "Safaricom PLC"]);
  });

  it("excludes newly added, removed, and quantity-edited holdings from movement", () => {
    const result = marketMovement([
      { ...holding, units: 200, value: 2400 },
      { ...holding, id: "new-holding", value: 500 },
    ], [{ portfolio_holding_id: "holding-1", asset_name: "Absa Bank Kenya", units: 100, value: 1000 }]);
    expect(result.comparable).toEqual([]);
    expect(result.change).toBe(0);
  });

  it("compounds MMF holdings daily and rejects unavailable yields", () => {
    const value = mmfValue({ ...holding, asset_type: "mmf", units: 1000, buy_price: 1, buy_date: "2026-09-01T00:00:00.000Z" }, 12, new Date("2026-09-11T00:00:00.000Z"));
    expect(value).toBeCloseTo(1003.29, 2);
    expect(mmfValue(holding, Number.NaN)).toBeNull();
  });
});
