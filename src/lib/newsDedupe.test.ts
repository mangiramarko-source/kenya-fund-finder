import { describe, expect, it } from "vitest";
import { canonicalNewsUrl, dedupeNewsByUrl } from "./newsDedupe";

describe("news URL deduplication", () => {
  it("removes tracking data without changing meaningful query parameters", () => {
    expect(canonicalNewsUrl("https://Example.com/story/?utm_source=rss&edition=ke#section"))
      .toBe("https://example.com/story?edition=ke");
  });

  it("keeps the first copy of a story and retains articles without a URL", () => {
    const articles = [
      { id: "first", url: "https://news.example/story?utm_source=rss" },
      { id: "duplicate", url: "https://news.example/story" },
      { id: "no-url", url: null },
    ];

    expect(dedupeNewsByUrl(articles).map((article) => article.id)).toEqual(["first", "no-url"]);
  });
});
