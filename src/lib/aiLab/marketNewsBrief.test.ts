import { describe, expect, it } from "vitest";
import { isMarketNewsBriefResult } from "../../../supabase/functions/_shared/market-news-brief";

const validBrief = {
  kind: "market-news-brief",
  title: "Kenya Market Brief",
  reportDate: "2026-09-10",
  overview: "Stored market overview.",
  overviewUnavailable: false,
  articles: [{
    id: "article-1",
    category: "Market News",
    source: "KenyaFundFinder",
    publishedAt: "2026-09-10T07:00:00.000Z",
    title: "Stored article title",
    summary: "Stored article summary.",
    articlePath: "/news/article-1",
  }],
  disclaimer: "Data only. Not personal financial advice.",
};

describe("market news brief contract", () => {
  it("accepts a bounded server result", () => {
    expect(isMarketNewsBriefResult(validBrief)).toBe(true);
  });

  it("rejects external article URLs and more than ten articles", () => {
    expect(isMarketNewsBriefResult({
      ...validBrief,
      articles: [{ ...validBrief.articles[0], articlePath: "https://example.com/news" }],
    })).toBe(false);
    expect(isMarketNewsBriefResult({
      ...validBrief,
      articles: Array.from({ length: 11 }, (_, index) => ({ ...validBrief.articles[0], id: `article-${index}`, articlePath: `/news/article-${index}` })),
    })).toBe(false);
  });
});
