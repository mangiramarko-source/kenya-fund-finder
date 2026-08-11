import { describe, expect, it } from "vitest";
import type { NewsFromDB, PublicStock } from "@/lib/api";
import { buildNewsFeedItems, filterNewsArticles } from "./stockNewsFeed";

const article = (overrides: Partial<NewsFromDB> = {}): NewsFromDB => ({
  id: "article-1",
  title: "Safaricom reports stronger earnings",
  summary: "Summary fallback",
  content: null,
  source: "Business Daily",
  date_published: "2026-08-10T08:00:00.000Z",
  created_at: "2026-08-10T09:00:00.000Z",
  url: "https://example.com/article",
  category: "Stocks",
  read_time: "3 min read",
  is_featured: false,
  status: "published",
  image_url: null,
  related_stock_id: "stock-1",
  ai_insight: "Profit growth was driven by M-PESA.",
  ...overrides,
});

const stock: PublicStock = {
  id: "stock-1",
  symbol: "SCOM",
  name: "Safaricom PLC",
  price: 25.4,
  previous_price: 25,
  day_change_percent: 1.6,
};

describe("stock news feed", () => {
  it("joins an article to normalized live stock data", () => {
    const [item] = buildNewsFeedItems([article()], [stock]);
    expect(item.relatedStock).toEqual({
      id: "stock-1",
      symbol: "SCOM",
      name: "Safaricom PLC",
      price: 25.4,
      previousPrice: 25,
      changePercent: 1.6,
    });
    expect(item.content).toBe("Profit growth was driven by M-PESA.");
  });

  it("uses the summary while an AI insight is unavailable", () => {
    const [item] = buildNewsFeedItems([article({ ai_insight: null })], [stock]);
    expect(item.content).toBe("Summary fallback");
  });

  it("does not render legacy RSS markup in a summary", () => {
    const summary = '<a href="https://news.google.com">EABL stake sale</a> <font>Business Daily</font>';
    const [item] = buildNewsFeedItems([article({ ai_insight: null, summary })], [stock]);
    expect(item.content).toBe("EABL stake sale Business Daily");
  });

  it("does not fabricate a relation when the stock is missing", () => {
    const [item] = buildNewsFeedItems([article()], []);
    expect(item.relatedStock).toBeNull();
  });

  it("filters the Stocks tab and keeps newest-first ordering", () => {
    const unrelated = article({ id: "article-2", related_stock_id: null, created_at: "2026-08-11T09:00:00.000Z" });
    expect(filterNewsArticles([unrelated, article()], "Stocks", "").map((item) => item.id)).toEqual(["article-1"]);
  });
});
