import { describe, it, expect, beforeEach } from "vitest";
import { portfolioStorage } from "./portfolioStorage";

describe("portfolioStorage backward compatibility", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists asset_id when provided", () => {
    portfolioStorage.add({
      asset_type: "mmf",
      asset_name: "CIC MMF",
      ticker: "cic-mmf",
      asset_id: "fund-uuid-123",
      units: 1000,
      buy_price: 1,
      current_price: 1,
    });
    const items = portfolioStorage.list();
    expect(items[0].asset_id).toBe("fund-uuid-123");
  });

  it("reads legacy demo rows that lack asset_id without crashing", () => {
    // Simulate an older saved demo portfolio (no asset_id field)
    const legacy = [{
      id: "local-old", user_id: "demo", asset_type: "mmf",
      asset_name: "Old Fund", ticker: null,
      units: 1, buy_price: 100, current_price: 100,
      current_yield: 14, buy_date: "2024-01-01", notes: "",
      created_at: "2024-01-01", updated_at: "2024-01-01",
    }];
    localStorage.setItem("kff_demo_portfolio_v1", JSON.stringify(legacy));

    const items = portfolioStorage.list();
    expect(items).toHaveLength(1);
    expect(items[0].asset_name).toBe("Old Fund");
    expect(items[0].asset_id).toBeUndefined();
  });

  it("defaults asset_id to null when not provided on add", () => {
    portfolioStorage.add({
      asset_type: "stock", asset_name: "Custom Co", units: 10,
      buy_price: 5, current_price: 5,
    });
    expect(portfolioStorage.list()[0].asset_id).toBeNull();
  });
});
