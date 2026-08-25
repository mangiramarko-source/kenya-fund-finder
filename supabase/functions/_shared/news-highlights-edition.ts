export interface StoredNewsHighlightArticle {
  id: string;
  title: string | null;
  summary: string | null;
  source: string | null;
  url: string | null;
  category: string | null;
  source_published_at: string | null;
  related_stock_id?: string | null;
}

export interface SelectedNewsHighlightArticle {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  category: string;
  published_at: string;
  related_stock_id: string | null;
}

export interface NewsHighlightsEditionWindow {
  start: string;
  end: string;
}

export interface NewsHighlightInsightFact {
  label: string;
  detail: string;
}

const POLICY_CATEGORIES = /policy|economy|macro|rate|treasury|currency|fx|inflation/i;

function isNairobiDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function categoryOf(value: string | null): string {
  const normalized = value?.trim();
  return normalized ? normalized : "MARKET NEWS";
}

/** Kenya does not observe daylight saving time, so 06:00 EAT is always 03:00 UTC. */
export function newsHighlightsEditionWindow(editionDate: string): NewsHighlightsEditionWindow {
  if (!isNairobiDate(editionDate)) throw new Error("editionDate must be YYYY-MM-DD");
  const end = new Date(`${editionDate}T03:00:00.000Z`);
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

function isQualifyingArticle(article: StoredNewsHighlightArticle, window: NewsHighlightsEditionWindow): boolean {
  if (!article.id || !article.title?.trim() || !article.summary?.trim() || !article.source?.trim() || !article.url?.trim() || !article.source_published_at) return false;
  const publishedAt = new Date(article.source_published_at);
  return Number.isFinite(publishedAt.getTime()) && publishedAt >= new Date(window.start) && publishedAt < new Date(window.end);
}

/**
 * Deterministically choose one fresh article per category before filling the
 * remaining slots by recency. Every emitted field comes directly from storage.
 */
export function selectNewsHighlightsArticles(
  articles: StoredNewsHighlightArticle[],
  window: NewsHighlightsEditionWindow,
): SelectedNewsHighlightArticle[] {
  const ordered = articles
    .filter((article) => isQualifyingArticle(article, window))
    .sort((left, right) => {
      const time = new Date(right.source_published_at!).getTime() - new Date(left.source_published_at!).getTime();
      return time || left.id.localeCompare(right.id);
    });
  const selected: StoredNewsHighlightArticle[] = [];
  const usedCategories = new Set<string>();
  const selectedIds = new Set<string>();

  for (const article of ordered) {
    const category = categoryOf(article.category).toLocaleLowerCase();
    if (usedCategories.has(category)) continue;
    selected.push(article);
    selectedIds.add(article.id);
    usedCategories.add(category);
    if (selected.length === 5) break;
  }
  for (const article of ordered) {
    if (selected.length === 5) break;
    if (selectedIds.has(article.id)) continue;
    selected.push(article);
    selectedIds.add(article.id);
  }

  return selected.map((article) => ({
    id: article.id,
    headline: article.title!.trim(),
    summary: article.summary!.trim(),
    source: article.source!.trim(),
    url: article.url!.trim(),
    category: categoryOf(article.category),
    published_at: article.source_published_at!,
    related_stock_id: article.related_stock_id ?? null,
  }));
}

/** These short rows disclose only the categories/counts already selected. */
export function deterministicNewsHighlightInsights(
  articles: SelectedNewsHighlightArticle[],
): NewsHighlightInsightFact[] {
  const counts = new Map<string, number>();
  for (const article of articles) counts.set(article.category, (counts.get(article.category) ?? 0) + 1);
  return [...counts.entries()].slice(0, 4).map(([category, count]) => ({
    label: `${category.toUpperCase()} COVERAGE`,
    detail: `${count} selected ${category.toLowerCase()} update${count === 1 ? "" : "s"} in this edition.`,
  }));
}

export function isPolicyNewsCategory(category: string): boolean {
  return POLICY_CATEGORIES.test(category);
}
