import { describe, it, expect, beforeEach } from "vitest";
import { portfolioEventsStorage } from "./portfolioEventsStorage";

describe("portfolioEventsStorage (guest history)", () => {
  beforeEach(() => localStorage.clear());

  it("records add events", () => {
    portfolioEventsStorage.record({
      portfolio_holding_id: "h1", asset_id: null,
      asset_type: "mmf", asset_name: "CIC MMF",
      event_type: "add", amount: 10000, quantity: null, note: "",
    });
    const list = portfolioEventsStorage.list();
    expect(list).toHaveLength(1);
    expect(list[0].event_type).toBe("add");
    expect(list[0].amount).toBe(10000);
    expect(list[0].user_id).toBe("demo");
  });

  it("records update and remove events in newest-first order", () => {
    portfolioEventsStorage.record({
      portfolio_holding_id: "h1", asset_id: null,
      asset_type: "mmf", asset_name: "CIC MMF",
      event_type: "add", amount: 10000, quantity: null, note: "",
    });
    portfolioEventsStorage.record({
      portfolio_holding_id: "h1", asset_id: null,
      asset_type: "mmf", asset_name: "CIC MMF",
      event_type: "remove", amount: null, quantity: null, note: "",
    });
    const list = portfolioEventsStorage.list();
    expect(list[0].event_type).toBe("remove");
    expect(list[1].event_type).toBe("add");
  });

  it("returns empty when no history exists (legacy users)", () => {
    expect(portfolioEventsStorage.list()).toEqual([]);
  });

  it("ignores corrupt storage payloads without throwing", () => {
    localStorage.setItem("kff_demo_portfolio_events_v1", "{not json");
    expect(portfolioEventsStorage.list()).toEqual([]);
  });
});
