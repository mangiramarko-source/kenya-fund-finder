import { isIndexableNewsArticle, type SeoNewsArticleLike } from "./seoNewsEligibility";

export const NEWS_ARCHIVE_PAGE_SIZE = 50;

export function getNewsArchivePageCount(articleCount: number): number {
  return Math.max(1, Math.ceil(articleCount / NEWS_ARCHIVE_PAGE_SIZE));
}

export function getNewsArchivePath(page: number): string {
  return page <= 1 ? "/news/archive" : `/news/archive/${page}`;
}

export function getNewsArchivePage<T extends SeoNewsArticleLike>(articles: T[], page: number): T[] {
  const eligible = articles.filter(isIndexableNewsArticle);
  const start = (Math.max(1, page) - 1) * NEWS_ARCHIVE_PAGE_SIZE;
  return eligible.slice(start, start + NEWS_ARCHIVE_PAGE_SIZE);
}

