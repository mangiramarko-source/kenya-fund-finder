import { afterEach, describe, expect, it } from "vitest";
import {
  clearMarketPageMemory,
  getMarketPageMemory,
  setMarketPageMemory,
} from "./marketPageMemory";

describe("market page memory", () => {
  afterEach(clearMarketPageMemory);

  it("retains a page's complete data for the current app session", () => {
    setMarketPageMemory("stocks", { count: 3 });

    expect(getMarketPageMemory<{ count: number }>("stocks")).toEqual({ count: 3 });
  });
});
