import { describe, expect, it } from "vitest";
import { classifyArticleCategory, getCategoryDotColor } from "./articleCategoryClassifier";

describe("classifyArticleCategory", () => {
  it("classifies general domestic Kenyan reporting as 'Kenyan'", () => {
    expect(
      classifyArticleCategory({
        source: "Tuko News",
        title: "Diaspora remittances reach record $4.2B as economy expands",
        summary: "Inflows from Kenyans living abroad supported domestic commerce.",
      })
    ).toBe("Kenyan");

    expect(
      classifyArticleCategory({
        source: "Daily Nation",
        title: "Government unveils new retail trade regulations in Nairobi",
      })
    ).toBe("Kenyan");
  });

  it("classifies international publishers and global topics as 'International'", () => {
    expect(
      classifyArticleCategory({
        source: "Reuters",
        title: "Federal Reserve keeps interest rates unchanged amid inflation cooling",
      })
    ).toBe("International");

    expect(
      classifyArticleCategory({
        source: "BBC Africa",
        title: "Global supply chains adjust to shipping lane changes",
      })
    ).toBe("International");
  });

  it("classifies money market funds and government securities as 'MMF'", () => {
    expect(
      classifyArticleCategory({
        source: "Business Daily",
        title: "Cytonn and Sanlam Money Market Funds post 14% effective annual yields",
        summary: "Unit trusts attract retail savers seeking daily compounding.",
      })
    ).toBe("MMF");

    expect(
      classifyArticleCategory({
        source: "Capital FM",
        title: "CBK 91-day Treasury bills auction yields 8.77% as bids hit 145%",
      })
    ).toBe("MMF");
  });

  it("classifies stock-linked and NSE equities as 'Stocks'", () => {
    expect(
      classifyArticleCategory({
        source: "Standard Digital",
        related_stock_id: "scom-123",
        title: "Safaricom customer numbers rise in latest quarterly report",
      })
    ).toBe("Stocks");

    expect(
      classifyArticleCategory({
        source: "Business Daily",
        title: "NSE equities turnover rises to KES 850M as banking shares rally",
      })
    ).toBe("Stocks");
  });

  it("classifies foreign exchange and currency articles as 'FX Rates'", () => {
    expect(
      classifyArticleCategory({
        source: "Kenyan Wallstreet",
        title: "Kenyan shilling appreciates to 128.50 against the US dollar",
      })
    ).toBe("FX Rates");
  });

  it("classifies commodity articles as 'Commodities'", () => {
    expect(
      classifyArticleCategory({
        source: "Daily Nation",
        title: "Mombasa tea auction records strong demand from Egypt and Pakistan",
      })
    ).toBe("Commodities");

    expect(
      classifyArticleCategory({
        source: "Standard",
        title: "Brent crude oil prices slide after OPEC production adjustments",
      })
    ).toBe("Commodities");
  });

  it("respects explicit category and authorLabel overrides", () => {
    expect(classifyArticleCategory({ authorLabel: "Kenyan" })).toBe("Kenyan");
    expect(classifyArticleCategory({ authorLabel: "International" })).toBe("International");
    expect(classifyArticleCategory({ authorLabel: "MMF" })).toBe("MMF");
    expect(classifyArticleCategory({ category: "Commodities" })).toBe("Commodities");
  });

  it("returns appropriate dot colors for each category", () => {
    expect(getCategoryDotColor("Stocks")).toBe("bg-cyan-400");
    expect(getCategoryDotColor("MMF")).toBe("bg-teal-500");
    expect(getCategoryDotColor("International")).toBe("bg-blue-500");
    expect(getCategoryDotColor("FX Rates")).toBe("bg-purple-500");
    expect(getCategoryDotColor("Commodities")).toBe("bg-amber-500");
    expect(getCategoryDotColor("Kenyan")).toBe("bg-emerald-500");
  });
});
