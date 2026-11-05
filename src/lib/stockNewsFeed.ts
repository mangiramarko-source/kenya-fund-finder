import { getNewsAiAnalysisDisplayText, parseNewsAiAnalysis, type NewsFromDB, type PublicStock } from "@/lib/api";
import type { FeedItem } from "@/hooks/useSocialFeed";
import { decodeHtmlEntities } from "@/lib/utils";
import { getNewsPresentation } from "../../supabase/functions/_shared/news-text";
import { getNewsPublishedAt, getNewsPublishedTime } from "@/lib/newsDate";
import { classifyArticleCategory } from "@/lib/articleCategoryClassifier";

export type NewsTab = "All" | "Stocks" | "Kenyan" | "International" | "Latest" | "Oldest";

const INTERNATIONAL_SOURCES = new Set([
  "Reuters Business", "Reuters Markets", "Reuters", "BBC Business", "BBC News",
  "Financial Times Africa", "Financial Times", "Bloomberg", "Al Jazeera",
  "CNBC World", "CNBC", "Investing.com", "MarketWatch", "Seeking Alpha",
  "African Business", "The Africa Report", "Further Africa",
]);

export const isInternationalArticle = (article: NewsFromDB) =>
  article.category === "International" || INTERNATIONAL_SOURCES.has(article.source);

function stockAliases(stock: PublicStock): string[] {
  const name = stock.name || "";
  const cleanName = name.replace(/\b(Group|Holdings|Plc|Ltd|Limited|Company|Kenya)\b/gi, "").replace(/\s+/g, " ").trim();
  const aliases = [stock.symbol, name];
  if (cleanName.length > 3) aliases.push(cleanName);
  const lower = cleanName.toLowerCase();
  if (lower === "equity") aliases.push("Equity Bank");
  if (lower === "co-operative" || lower === "co-operative bank of") aliases.push("Co-op Bank", "Co-operative Bank");
  if (stock.symbol === "SCOM") aliases.push("Safaricom");
  return aliases.filter((alias): alias is string => Boolean(alias) && alias.length > 1);
}

/** Finds the listed stock an article is about (explicit link first, then name/ticker mention). */
export function findMentionedStock(article: NewsFromDB, stocks: PublicStock[]): PublicStock | undefined {
  if (article.related_stock_id) {
    const linked = stocks.find((stock) => stock.id === article.related_stock_id);
    if (linked) return linked;
  }
  const searchableText = `${article.title} ${article.summary || ""}`;
  return stocks.find((candidate) =>
    stockAliases(candidate).some((alias) =>
      new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(searchableText),
    ),
  );
}

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
    const leftTime = getNewsPublishedTime(left);
    const rightTime = getNewsPublishedTime(right);
    return ascending ? leftTime - rightTime : rightTime - leftTime;
  });
}

export function buildNewsFeedItems(articles: NewsFromDB[], stocks: PublicStock[]): FeedItem[] {
  const stocksById = new Map(stocks.map((stock) => [stock.id, stock]));

  return articles.map((article) => {
    const stock = (article.related_stock_id ? stocksById.get(article.related_stock_id) : undefined)
      || findMentionedStock(article, stocks);
    const presentation = getNewsPresentation({
      title: decodeHtmlEntities(article.title),
      summary: decodeHtmlEntities(article.summary || ""),
      content: decodeHtmlEntities(article.content || ""),
      source: article.source,
    });
    const parsedAnalysis = article.parsed_ai_analysis || parseNewsAiAnalysis(article.ai_insight);
    const aiInsight = getNewsAiAnalysisDisplayText(parsedAnalysis) || (article.ai_insight && !parsedAnalysis ? decodeHtmlEntities(article.ai_insight) : null);
    return {
      id: `news-${article.id}`,
      type: "NEWS" as const,
      authorName: article.source || "Market News",
      authorLabel: classifyArticleCategory({
        title: presentation.title,
        summary: presentation.body,
        content: article.content,
        category: article.category,
        source: article.source,
        relatedStock: stock,
        related_stock_id: article.related_stock_id,
      }),
      title: presentation.title,
      content: aiInsight || presentation.body,
      mediaUrl: article.image_url || undefined,
      mediaType: article.image_url ? ("image" as const) : undefined,
      timestamp: new Date(getNewsPublishedAt(article) || Date.now()),
      likes: article.likes || 0,
      comments: article.comments || 0,
      url: article.url || "#",
      rawItem: { ...article, parsed_ai_analysis: parsedAnalysis },
      aiInsight,
      isHeadlineOnly: !aiInsight && presentation.isHeadlineOnly,
      relatedStock: stock ? {
        id: stock.id,
        symbol: stock.symbol,
        name: stock.name,
        ...(stock.logo_url ? { logoUrl: stock.logo_url } : {}),
        sector: stock.sector ?? null,
        price: Number(stock.price) || 0,
        previousPrice: stock.previous_price == null ? null : Number(stock.previous_price),
        changePercent: Number(stock.day_change_percent) || 0,
        peRatio: stock.pe_ratio ?? null,
        dividendYield: stock.dividend_yield ?? null,
        yearLow: stock.year_low ?? null,
        yearHigh: stock.year_high ?? null,
        marketCap: stock.market_cap ?? null,
      } : null,
    };
  });
}
