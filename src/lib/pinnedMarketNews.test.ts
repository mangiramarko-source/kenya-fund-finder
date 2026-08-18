import { describe, expect, it } from "vitest";
import { getPinnedMarketNewsBounds } from "./pinnedMarketNews";

describe("getPinnedMarketNewsBounds", () => {
  it("fills a narrow mobile viewport including the page gutters", () => {
    expect(getPinnedMarketNewsBounds({
      left: 16,
      width: 358,
      viewportWidth: 390,
      bleed: 16,
    })).toEqual({ left: 0, width: 390 });
  });

  it("includes the center-column bleed without covering desktop sidebars", () => {
    expect(getPinnedMarketNewsBounds({
      left: 378,
      width: 684,
      viewportWidth: 1440,
      bleed: 8,
    })).toEqual({ left: 370, width: 700 });
  });

  it("clamps both edges to the viewport after a resize", () => {
    expect(getPinnedMarketNewsBounds({
      left: 6,
      width: 410,
      viewportWidth: 400,
      bleed: 16,
    })).toEqual({ left: 0, width: 400 });
  });
});
