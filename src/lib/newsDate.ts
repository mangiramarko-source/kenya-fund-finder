export interface NewsDateFields {
  source_published_at?: string | null;
  date_published?: string | null;
  created_at?: string | null;
}

export function getNewsPublishedAt(article: NewsDateFields): string | null {
  return article.source_published_at || article.date_published || article.created_at || null;
}

export function getNewsPublishedTime(article: NewsDateFields): number {
  const value = getNewsPublishedAt(article);
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}
