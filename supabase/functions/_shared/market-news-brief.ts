export interface MarketNewsBriefArticle {
  id: string;
  category: string;
  source: string;
  publishedAt: string | null;
  title: string;
  summary: string;
  articlePath: string;
}

export interface MarketNewsBriefResult {
  kind: "market-news-brief";
  title: string;
  reportDate: string | null;
  overview: string | null;
  overviewUnavailable: boolean;
  articles: MarketNewsBriefArticle[];
  disclaimer: string;
}

function isShortText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

export function isMarketNewsBriefResult(value: unknown): value is MarketNewsBriefResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  if (result.kind !== "market-news-brief" || !isShortText(result.title, 120) || !isShortText(result.disclaimer, 240)) return false;
  if (result.reportDate != null && !isShortText(result.reportDate, 40)) return false;
  if (result.overview != null && !isShortText(result.overview, 2_000)) return false;
  if (typeof result.overviewUnavailable !== "boolean" || !Array.isArray(result.articles) || result.articles.length > 10) return false;
  return result.articles.every((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const article = value as Record<string, unknown>;
    return isShortText(article.id, 100)
      && isShortText(article.category, 80)
      && isShortText(article.source, 120)
      && (article.publishedAt == null || isShortText(article.publishedAt, 40))
      && isShortText(article.title, 500)
      && isShortText(article.summary, 1_000)
      && typeof article.articlePath === "string"
      && /^\/news\/[^/]+$/.test(article.articlePath);
  });
}
