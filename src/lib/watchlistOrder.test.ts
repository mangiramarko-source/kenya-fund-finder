import { describe, expect, it } from "vitest";
import { applyWatchlistOrder } from "./watchlistOrder";

describe("applyWatchlistOrder", () => {
  const items = [
    { id: "a", sort_order: 0 },
    { id: "b", sort_order: 1 },
    { id: "c", sort_order: 2 },
  ];

  it("returns an immutable, contiguous order", () => {
    expect(applyWatchlistOrder(items, ["c", "a", "b"])).toEqual([
      { id: "c", sort_order: 0 },
      { id: "a", sort_order: 1 },
      { id: "b", sort_order: 2 },
    ]);
    expect(items[0].sort_order).toBe(0);
  });

  it("rejects duplicate or missing ids", () => {
    expect(applyWatchlistOrder(items, ["a", "a", "b"])).toBeNull();
    expect(applyWatchlistOrder(items, ["a", "b"])).toBeNull();
  });
});
