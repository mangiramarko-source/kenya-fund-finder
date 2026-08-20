import { describe, expect, it } from "vitest";
import {
  NEWS_ARCHIVE_PAGE_SIZE,
  getNewsArchivePage,
  getNewsArchivePageCount,
  getNewsArchivePath,
} from "./newsArchive";

const article = (index: number) => ({
  id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  title: `Kenya market article number ${index}`,
  summary: `This is a substantive summary for Kenyan investors with enough useful detail to qualify for the public news archive entry number ${index}.`,
  status: "published",
  source_published_at: "2026-08-20T08:00:00.000Z",
});

describe("news archive helpers", () => {
  it("uses stable, clean archive paths", () => {
    expect(getNewsArchivePath(1)).toBe("/news/archive");
    expect(getNewsArchivePath(3)).toBe("/news/archive/3");
  });

  it("paginates only indexable news articles", () => {
    const articles = Array.from({ length: NEWS_ARCHIVE_PAGE_SIZE + 1 }, (_, index) => article(index + 1));
    articles.splice(10, 0, { ...article(999), summary: "Too short" });

    expect(getNewsArchivePageCount(NEWS_ARCHIVE_PAGE_SIZE + 1)).toBe(2);
    expect(getNewsArchivePage(articles, 1)).toHaveLength(NEWS_ARCHIVE_PAGE_SIZE);
    expect(getNewsArchivePage(articles, 2)).toHaveLength(1);
  });
});

