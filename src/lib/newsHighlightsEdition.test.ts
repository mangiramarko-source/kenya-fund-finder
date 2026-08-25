import { describe, expect, it } from "vitest";
import {
  deterministicNewsHighlightInsights,
  newsHighlightsEditionWindow,
  selectNewsHighlightsArticles,
} from "../../supabase/functions/_shared/news-highlights-edition";

const window = newsHighlightsEditionWindow("2026-08-24");

const article = (id: string, category: string, publishedAt: string, overrides = {}) => ({
  id, title: `${category} headline ${id}`, summary: `${category} stored summary ${id}`,
  source: `Source ${id}`, url: `https://example.test/${id}`, category,
  source_published_at: publishedAt, ...overrides,
});

describe("News Highlights edition selection", () => {
  it("uses a fixed 06:00 EAT 24-hour window", () => {
    expect(window).toEqual({ start: "2026-08-23T03:00:00.000Z", end: "2026-08-24T03:00:00.000Z" });
  });

  it("filters incomplete and stale rows, then chooses diverse fresh stories deterministically", () => {
    const selected = selectNewsHighlightsArticles([
      article("late", "FX", "2026-08-24T03:00:00.000Z"),
      article("policy", "POLICY", "2026-08-24T02:50:00.000Z"),
      article("earnings", "EARNINGS", "2026-08-24T02:45:00.000Z"),
      article("fx", "FX", "2026-08-24T02:40:00.000Z"),
      article("another-fx", "FX", "2026-08-24T02:30:00.000Z"),
      article("market", "MARKET", "2026-08-24T02:20:00.000Z"),
      article("old", "MACRO", "2026-08-23T02:59:59.000Z"),
      article("incomplete", "BANKING", "2026-08-24T02:10:00.000Z", { url: null }),
    ], window);

    expect(selected.map((item) => item.id)).toEqual(["policy", "earnings", "fx", "market", "another-fx"]);
    expect(selected).toHaveLength(5);
    expect(selected.every((item) => item.summary && item.source && item.url && item.published_at)).toBe(true);
  });

  it("derives insights only from selected category/count facts", () => {
    const selected = selectNewsHighlightsArticles([
      article("a", "FX", "2026-08-24T02:40:00.000Z"),
      article("b", "POLICY", "2026-08-24T02:30:00.000Z"),
      article("c", "FX", "2026-08-24T02:20:00.000Z"),
    ], window);
    expect(deterministicNewsHighlightInsights(selected)).toEqual([
      { label: "FX COVERAGE", detail: "2 selected fx updates in this edition." },
      { label: "POLICY COVERAGE", detail: "1 selected policy update in this edition." },
    ]);
  });

  it("leaves a short selection for the coordinator to skip rather than inventing filler content", () => {
    const selected = selectNewsHighlightsArticles([
      article("a", "FX", "2026-08-24T02:40:00.000Z"),
      article("b", "POLICY", "2026-08-24T02:30:00.000Z"),
    ], window);
    expect(selected).toHaveLength(2);
  });
});
