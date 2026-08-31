import { describe, expect, it } from "vitest";
import { getPageLoadingMessage } from "./pageLoadingMessage";

describe("getPageLoadingMessage", () => {
  it.each([
    ["/treasury", "Loading latest Treasury data…"],
    ["/stocks", "Loading latest stock data…"],
    ["/funds", "Loading latest fund data…"],
    ["/commodities", "Loading latest commodity data…"],
    ["/rates", "Loading latest FX rate data…"],
    ["/stocks/", "Loading latest stock data…"],
    ["/stocks/KCB", "Loading stock details…"],
  ])("uses the page-specific message for %s", (pathname, expectedMessage) => {
    expect(getPageLoadingMessage(pathname)).toBe(expectedMessage);
  });

  it("keeps a generic fallback for unmapped routes", () => {
    expect(getPageLoadingMessage("/learn")).toBe("Loading page…");
  });
});
