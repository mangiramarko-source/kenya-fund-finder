import { describe, it, expect, beforeEach } from "vitest";
import { feedNavigationState } from "./feedNavigationState";

describe("feedNavigationState", () => {
  beforeEach(() => {
    feedNavigationState.clearState("/");
    feedNavigationState.clearState("/news");
  });

  it("returns null when no state is saved", () => {
    expect(feedNavigationState.getState("/")).toBeNull();
  });

  it("saves and retrieves scroll position and category for root and overview paths", () => {
    feedNavigationState.saveState("/", { scrollY: 1250, activeCategory: "Kenyan" });
    const saved = feedNavigationState.getState("/overview");
    expect(saved).not.toBeNull();
    expect(saved?.scrollY).toBe(1250);
    expect(saved?.activeCategory).toBe("Kenyan");
  });

  it("saves and retrieves state for /news", () => {
    feedNavigationState.saveState("/news", { scrollY: 820, activeCategory: "International" });
    const saved = feedNavigationState.getState("/news");
    expect(saved).not.toBeNull();
    expect(saved?.scrollY).toBe(820);
    expect(saved?.activeCategory).toBe("International");
  });

  it("clears state properly", () => {
    feedNavigationState.saveState("/news", { scrollY: 500, activeCategory: "Stocks" });
    feedNavigationState.clearState("/news");
    expect(feedNavigationState.getState("/news")).toBeNull();
  });
});
