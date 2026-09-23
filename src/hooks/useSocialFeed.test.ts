import { describe, expect, it } from "vitest";
import { findExplicitMarketSymbols } from "./useSocialFeed";

describe("findExplicitMarketSymbols", () => {
  it("does not mistake ordinary words for a stock ticker", () => {
    expect(
      findExplicitMarketSymbols(
        "Inadequate facilities exacerbate delays at the border for informal traders.",
      ),
    ).not.toContain("BAT");
  });

  it("keeps explicitly written stock tickers", () => {
    expect(findExplicitMarketSymbols("BAT Kenya announced a dividend update.")).toContain("BAT");
  });

  it("keeps explicitly written FX pairs", () => {
    expect(findExplicitMarketSymbols("USD/KES moved slightly in afternoon trade.")).toContain("USD/KES");
  });
});
