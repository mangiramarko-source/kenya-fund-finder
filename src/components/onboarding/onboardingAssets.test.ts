import { describe, expect, it } from "vitest";
import { buildOnboardingAssets, portfolioItemFromOnboardingAsset, watchlistType } from "./onboardingAssets";

const liveAssets = {
  mmf: [{ id: "00000000-0000-0000-0000-000000000001", name: "Alpha Fund", ticker: "alpha", price: 1, yld: 12.1, fundType: "money_market" }],
  stock: [{ id: "00000000-0000-0000-0000-000000000002", name: "Safaricom", ticker: "SCOM", price: 18.25 }],
  fx: [{ id: "00000000-0000-0000-0000-000000000003", name: "KES / USD", ticker: "KES/USD", price: 129.4 }],
  commodity: [{ id: "00000000-0000-0000-0000-000000000004", name: "Gold", ticker: "XAU", price: 2340 }],
  fixed_income: [{ name: "91-Day T-Bill", price: 100, yld: 15.8 }],
};

describe("onboarding asset mapping", () => {
  it("maps every live category and keeps fixed income out of the watchlist contract", () => {
    const assets = buildOnboardingAssets(liveAssets);
    expect(assets.map((asset) => asset.type)).toEqual(["fund", "stock", "currency", "commodity", "fixed_income"]);
    expect(assets[0].detail).toBe("MMF · 12.10% p.a.");
    expect(watchlistType(assets[4])).toBeNull();
    expect(watchlistType(assets[1])).toBe("stock");
  });

  it("labels each Unit Trust by its actual fund type", () => {
    const assets = buildOnboardingAssets({
      ...liveAssets,
      mmf: [
        ...liveAssets.mmf,
        { id: "00000000-0000-0000-0000-000000000005", name: "Income Fund", ticker: "income", price: 1, yld: 11.4, fundType: "fixed_income" },
      ],
    });
    expect(assets[1].detail).toBe("Fixed Income · 11.40% p.a.");
  });

  it("uses principal for funds and derives units for priced assets", () => {
    const [fund, stock] = buildOnboardingAssets(liveAssets);
    expect(portfolioItemFromOnboardingAsset(fund, 10_000)).toMatchObject({ asset_type: "mmf", units: 1, buy_price: 10_000, current_yield: 12.1 });
    expect(portfolioItemFromOnboardingAsset(stock, 182.5)).toMatchObject({ asset_type: "stock", units: 10, buy_price: 18.25 });
  });
});
