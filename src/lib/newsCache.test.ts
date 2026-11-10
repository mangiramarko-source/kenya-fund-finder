import { describe, it, expect, beforeEach } from "vitest";
import { newsCache } from "./newsCache";
import type { NewsFromDB } from "@/lib/api";

const mockArticle: NewsFromDB = {
  id: "test-news-1",
  title: "NSE 20 Index Climbs on Strong Banking Performance",
  summary: "Commercial bank results boost benchmark equities index in Nairobi.",
  content: "Full content text here",
  source: "Business Daily",
  date_published: new Date().toISOString(),
  source_published_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  url: "https://example.com/nse",
  category: "Stocks",
  read_time: "2 min read",
  is_featured: false,
  status: "published",
  image_url: null,
  related_stock_id: null,
  ai_insight: null,
};

describe("newsCache", () => {
  beforeEach(() => {
    newsCache.clear();
  });

  it("returns null when cache is empty", () => {
    expect(newsCache.loadNews()).toBeNull();
  });

  it("saves and loads news articles", () => {
    newsCache.saveNews([mockArticle]);
    const cached = newsCache.loadNews();
    expect(cached).not.toBeNull();
    expect(cached?.articles).toHaveLength(1);
    expect(cached?.articles[0].id).toBe("test-news-1");
  });

  it("does not save empty arrays", () => {
    newsCache.saveNews([]);
    expect(newsCache.loadNews()).toBeNull();
  });
});
