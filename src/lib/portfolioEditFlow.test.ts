import { describe, it, expect, beforeEach } from "vitest";
import { portfolioStorage } from "./portfolioStorage";
import { portfolioEventsStorage } from "./portfolioEventsStorage";

describe("guest portfolio edit & remove with events", () => {
  beforeEach(() => localStorage.clear());

  const seed = () =>
    portfolioStorage.add({
      asset_type: "mmf",
      asset_name: "CIC MMF",
      ticker: "cic-mmf",
      asset_id: null,
      units: 10000,
      buy_price: 1,
      current_price: 1,
      current_yield: 15,
    });

  it("updates a guest holding and lets caller record an update event", () => {
    const rec = seed();
    const updated = portfolioStorage.update(rec.id, { units: 20000, notes: "Top-up" });
    expect(updated?.units).toBe(20000);
    expect(updated?.notes).toBe("Top-up");
    expect(updated?.updated_at).not.toBe(rec.updated_at);

    portfolioEventsStorage.record({
      portfolio_holding_id: rec.id,
      asset_id: null,
      asset_type: "mmf",
      asset_name: "CIC MMF",
      event_type: "update",
      amount: 20000,
      quantity: 20000,
      note: "Top-up",
    });

    const events = portfolioEventsStorage.list();
    expect(events[0].event_type).toBe("update");
    expect(events[0].amount).toBe(20000);
  });

  it("records a remove event with last-known amount before removal", () => {
    const rec = seed();
    portfolioEventsStorage.record({
      portfolio_holding_id: rec.id,
      asset_id: null,
      asset_type: "mmf",
      asset_name: "CIC MMF",
      event_type: "remove",
      amount: 10500,
      quantity: 10000,
      note: "",
    });
    portfolioStorage.remove(rec.id);

    expect(portfolioStorage.list()).toHaveLength(0);
    const events = portfolioEventsStorage.list();
    expect(events[0].event_type).toBe("remove");
    expect(events[0].amount).toBe(10500);
  });

  it("update on a missing holding returns null and does not throw", () => {
    expect(portfolioStorage.update("does-not-exist", { units: 5 })).toBeNull();
  });
});
