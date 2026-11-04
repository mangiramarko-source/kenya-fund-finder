import { isFundsAndFixedIncomeArticle, type ArticleLikeForClassification } from "@/lib/fundsFixedIncomeNews";
import {
  isInternationalNews,
  FX_PATTERN,
  COMMODITIES_PATTERN,
  STOCK_MARKET_PATTERN,
} from "@/lib/newsTabMatching";

export type DisplayArticleCategory =
  | "Stocks"
  | "MMF"
  | "FX Rates"
  | "Commodities"
  | "International"
  | "Kenyan";

export interface ArticleLikeForCategory extends ArticleLikeForClassification {
  source?: string | null;
  authorLabel?: string | null;
  related_stock_id?: string | null;
  relatedStock?: any | null;
}

/**
 * Classifies an article into its primary user-facing topic title badge:
 * "Stocks", "MMF", "FX Rates", "Commodities", "International", or "Kenyan".
 */
export function classifyArticleCategory(article: ArticleLikeForCategory): DisplayArticleCategory {
  if (!article) return "Kenyan";

  // 1. Explicit authorLabel if already set to one of the canonical display titles
  const rawLabel = (article.authorLabel || "").trim().toLowerCase();
  if (rawLabel === "stocks" || rawLabel === "stock") return "Stocks";
  if (rawLabel === "international" || rawLabel === "global") return "International";
  if (rawLabel === "mmf" || rawLabel === "unit trusts" || rawLabel === "funds & fixed income" || rawLabel === "money market") return "MMF";
  if (rawLabel === "fx rates" || rawLabel === "fx" || rawLabel === "currency" || rawLabel === "forex") return "FX Rates";
  if (rawLabel === "commodities" || rawLabel === "commodity") return "Commodities";
  if (rawLabel === "kenyan" || rawLabel === "kenya") return "Kenyan";

  // 2. Explicit category in DB
  const rawCat = (article.category || "").trim().toLowerCase();
  if (rawCat === "stocks" || rawCat === "stock" || rawCat === "equities" || rawCat === "equity") return "Stocks";
  if (rawCat === "international" || rawCat === "global" || rawCat === "world") return "International";
  if (rawCat === "funds & fixed income" || rawCat === "mmf" || rawCat === "unit trusts" || rawCat === "money market") return "MMF";
  if (rawCat === "fx rates" || rawCat === "fx & currency" || rawCat === "fx" || rawCat === "currency" || rawCat === "forex") return "FX Rates";
  if (rawCat === "commodities" || rawCat === "commodity") return "Commodities";
  if (rawCat === "kenyan" || rawCat === "kenya") return "Kenyan";

  // 3. Stock association
  if (article.relatedStock || article.related_stock_id) {
    return "Stocks";
  }

  // 4. MMF / Collective Investment Schemes / Treasury securities / Fixed Income
  if (isFundsAndFixedIncomeArticle(article)) {
    return "MMF";
  }

  const fullText = [
    article.title,
    article.summary,
    article.content,
    article.category,
    article.source,
  ]
    .filter(Boolean)
    .join(" ");

  // 5. Stock market / NSE equities patterns
  if (STOCK_MARKET_PATTERN.test(fullText)) {
    return "Stocks";
  }

  // 6. FX / Currency
  if (FX_PATTERN.test(fullText)) {
    return "FX Rates";
  }

  // 7. Commodities
  if (COMMODITIES_PATTERN.test(fullText)) {
    return "Commodities";
  }

  // 8. International media or overseas market
  if (isInternationalNews({ category: article.category, source: article.source })) {
    return "International";
  }

  // 9. Default to Kenyan domestic business & market reporting
  return "Kenyan";
}

/**
 * Color dot for the category badge
 */
export function getCategoryDotColor(category: string): string {
  switch (category.toLowerCase()) {
    case "stocks":
    case "stock":
      return "bg-cyan-400";
    case "mmf":
    case "funds & fixed income":
    case "unit trusts":
      return "bg-teal-500";
    case "international":
      return "bg-blue-500";
    case "fx rates":
    case "currency":
    case "forex":
      return "bg-purple-500";
    case "commodities":
    case "commodity":
      return "bg-amber-500";
    case "kenyan":
    default:
      return "bg-emerald-500";
  }
}
