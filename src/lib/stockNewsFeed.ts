import type { NewsFromDB, PublicStock } from "@/lib/api";
import type { FeedItem } from "@/hooks/useSocialFeed";
import { decodeHtmlEntities } from "@/lib/utils";
import { getNewsPresentation } from "../../supabase/functions/_shared/news-text";

export type NewsTab = "All" | "Stocks" | "Kenyan" | "International" | "Latest" | "Oldest";

const INTERNATIONAL_SOURCES = new Set([
  "Reuters Business", "Reuters Markets", "Reuters", "BBC Business", "BBC News",
  "Financial Times Africa", "Financial Times", "Bloomberg", "Al Jazeera",
  "CNBC World", "CNBC", "Investing.com", "MarketWatch", "Seeking Alpha",
  "African Business", "The Africa Report", "Further Africa",
]);

export const isInternationalArticle = (article: NewsFromDB) =>
  article.category === "International" || INTERNATIONAL_SOURCES.has(article.source);

export function filterNewsArticles(articles: NewsFromDB[], tab: NewsTab, query: string) {
  let result = articles.filter((article) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return true;
    return article.title.toLowerCase().includes(normalizedQuery)
      || (article.summary || "").toLowerCase().includes(normalizedQuery);
  });

  if (tab === "Stocks") result = result.filter((article) => Boolean(article.related_stock_id));
  if (tab === "Kenyan") result = result.filter((article) => !isInternationalArticle(article));
  if (tab === "International") result = result.filter(isInternationalArticle);

  const ascending = tab === "Oldest";
  return [...result].sort((left, right) => {
    const leftTime = new Date(left.created_at || left.date_published).getTime();
    const rightTime = new Date(right.created_at || right.date_published).getTime();
    return ascending ? leftTime - rightTime : rightTime - leftTime;
  });
}

export function buildNewsFeedItems(articles: NewsFromDB[], stocks: PublicStock[]): FeedItem[] {
  const stocksById = new Map(stocks.map((stock) => [stock.id, stock]));

  return articles.map((article) => {
    const stock = article.related_stock_id ? stocksById.get(article.related_stock_id) : undefined;
    const presentation = getNewsPresentation({
      title: decodeHtmlEntities(article.title),
      summary: decodeHtmlEntities(article.summary || ""),
      content: decodeHtmlEntities(article.content || ""),
      source: article.source,
    });
    const aiInsight = article.ai_insight ? decodeHtmlEntities(article.ai_insight) : null;
    return {
      id: `news-${article.id}`,
      type: "NEWS" as const,
      authorName: article.source || "Market News",
      authorLabel: article.category || "News",
      title: presentation.title,
      content: aiInsight || presentation.body,
      mediaUrl: article.image_url || undefined,
      mediaType: article.image_url ? ("image" as const) : undefined,
      timestamp: new Date(article.created_at || article.date_published || Date.now()),
      likes: article.likes || 0,
      comments: article.comments || 0,
      url: article.url || "#",
      rawItem: article,
      aiInsight,
      isHeadlineOnly: !aiInsight && presentation.isHeadlineOnly,
      relatedStock: stock ? {
        id: stock.id,
        symbol: stock.symbol,
        name: stock.name,
        price: Number(stock.price) || 0,
        previousPrice: stock.previous_price == null ? null : Number(stock.previous_price),
        changePercent: Number(stock.day_change_percent) || 0,
      } : null,
    };
  });
}
