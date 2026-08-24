import { describe, expect, it } from "vitest";
import { matchesNewsTab } from "./newsTabMatching";
import type { NewsFromDB } from "@/lib/api";

const article = (overrides: Partial<NewsFromDB>): NewsFromDB => ({
  id: "article-1", title: "Market update", summary: null, content: null, source: "Business Daily",
  date_published: "2026-08-25T00:00:00.000Z", source_published_at: null, created_at: "2026-08-25T00:00:00.000Z",
  url: "https://example.com", category: "Market News", read_time: null, is_featured: false, status: "published",
  image_url: null, related_stock_id: null, ai_insight: null, parsed_ai_analysis: null, ...overrides,
});

describe("matchesNewsTab", () => {
  it("uses article summaries and categories, not only titles", () => {
    expect(matchesNewsTab("FX Rates", article({ summary: "The Kenyan shilling held steady against the dollar." }), [])).toBe(true);
    expect(matchesNewsTab("Commodities", article({ summary: "Gold and Brent crude prices gained." }), [])).toBe(true);
    expect(matchesNewsTab("Stocks", article({ summary: "NSE shares rose in afternoon trading." }), [])).toBe(true);
    expect(matchesNewsTab("Stocks", article({ title: "Strong half-year performance", summary: "Results were announced today." }), [{ symbol: "KCB", name: "KCB Group" }])).toBe(false);
    expect(matchesNewsTab("Stocks", article({ title: "KCB Group reports strong half-year performance" }), [{ symbol: "KCB", name: "KCB Group" }])).toBe(true);
  });

  it("recognises international source variants", () => {
    expect(matchesNewsTab("International", article({ source: "Reuters Africa" }), [])).toBe(true);
  });
});
