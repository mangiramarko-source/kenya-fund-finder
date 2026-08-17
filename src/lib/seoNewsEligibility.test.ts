import { describe, expect, it } from "vitest";
import { isIndexableNewsArticle, type SeoNewsArticleLike } from "./seoNewsEligibility";

const baseArticle = (overrides: Partial<SeoNewsArticleLike> = {}): SeoNewsArticleLike => ({
  id: "33c83fb2-d020-4e29-9611-aec61e2bef1a",
  title: "Africa Blockchain Festival returns to Nairobi in October",
  summary:
    "The three-day event will run from October 15 to 17 at the Sarit Expo Centre, bringing together founders, investors and policy leaders.",
  content: null,
  status: "published",
  source_published_at: "2026-08-14T09:00:00+03:00",
  date_published: "2026-08-14",
  created_at: "2026-08-14T09:10:00+03:00",
  ...overrides,
});

describe("isIndexableNewsArticle", () => {
  it("accepts published news with a valid UUID, publication date, and substantive summary", () => {
    expect(isIndexableNewsArticle(baseArticle())).toBe(true);
  });

  it("rejects content-only articles with an empty public summary", () => {
    expect(
      isIndexableNewsArticle(
        baseArticle({
          id: "97650f25-7680-46a7-9c34-1932854a5162",
          title: "Tanzania's corporate leaders",
          summary: "",
          content:
            "A long article body can be useful inside the app, but it should not enter the XML sitemap without a substantive public summary.",
        }),
      ),
    ).toBe(false);
  });

  it("rejects hidden, invalid, undated, or duplicate-title articles", () => {
    expect(isIndexableNewsArticle(baseArticle({ status: "pending_review" }))).toBe(false);
    expect(isIndexableNewsArticle(baseArticle({ id: "not-a-uuid" }))).toBe(false);
    expect(isIndexableNewsArticle(baseArticle({ source_published_at: null, date_published: null, created_at: null }))).toBe(false);
    expect(isIndexableNewsArticle(baseArticle({ summary: "Africa Blockchain Festival returns to Nairobi in October" }))).toBe(false);
  });
});

