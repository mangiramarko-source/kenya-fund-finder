import type { NewsFromDB } from "@/lib/api";

type StockReference = { id?: string; symbol?: string | null; name?: string | null };

export const INTERNATIONAL_SOURCE_PATTERN = /\b(reuters|bbc|financial times|bloomberg|al jazeera|cnbc|investing\.com|marketwatch|seeking alpha|african business|the africa report|further africa)\b/i;
export const FX_PATTERN = /\b(shilling|kes|usd\s*\/\s*kes|gbp\s*\/\s*kes|eur\s*\/\s*kes|forex|foreign exchange|currency|exchange rate)\b/i;
export const COMMODITIES_PATTERN = /\b(oil|crude( oil)?|brent|gold|silver|coffee|tea|cocoa|wheat|maize|fuel|agriculture|agricultural|opec|commodity|commodities|petroleum|diesel|petrol|epra|fertilizer|horticulture|avocado|macadamia|livestock|grains)\b/i;
export const STOCK_MARKET_PATTERN = /\b(nse|nairobi securities exchange|stock|stocks|share|shares|equity|equities|listed compan(?:y|ies)|dividend|earnings per share|market cap)\b/i;

const articleText = (article: NewsFromDB) => [
  article.title,
  article.summary,
  article.content,
  article.category,
  article.source,
].filter(Boolean).join(" ");

export const categoryIs = (article: { category?: string | null }, ...values: string[]) =>
  values.includes((article.category || "").trim().toLowerCase());

export const isInternationalNews = (article: { category?: string | null; source?: string | null; authorName?: string | null; authorLabel?: string | null }) => {
  const src = article.source || article.authorName || "";
  const cat = article.category || article.authorLabel || "";
  return (
    categoryIs({ category: cat }, "international", "global", "world") ||
    INTERNATIONAL_SOURCE_PATTERN.test(src) ||
    cat.toLowerCase().includes("international")
  );
};

export function matchesNewsTab(tab: string, article: NewsFromDB, stocks: StockReference[]): boolean {
  if (["All", "Latest", "Oldest", "Top Ranked", "Saved"].includes(tab)) return true;

  const text = articleText(article);
  if (tab === "Kenyan") return !isInternationalNews(article);
  if (tab === "International") return isInternationalNews(article);
  if (tab === "FX Rates") return categoryIs(article, "fx & currency", "fx", "forex", "currency") || Boolean((article as any).relatedFx) || FX_PATTERN.test(text);
  if (tab === "Commodities") return categoryIs(article, "commodities", "commodity") || Boolean((article as any).relatedCommodity) || COMMODITIES_PATTERN.test(text);
  if (tab !== "Stocks") return true;

  if (article.related_stock_id || categoryIs(article, "stocks", "stock", "equities", "equity")) return true;
  if (STOCK_MARKET_PATTERN.test(text)) return true;

  return stocks.some((stock) => {
    const name = stock.name || "";
    const cleanName = name.replace(/Group|Holdings|Plc|Ltd|Limited/gi, "").trim();
    const aliases = [stock.symbol, name, cleanName === "Equity" ? "Equity Bank" : undefined, cleanName === "Co-operative" ? "Co-op Bank" : undefined, stock.symbol === "SCOM" ? "Safaricom" : undefined]
      .filter((value): value is string => Boolean(value) && (value !== cleanName || cleanName.length > 3));
    return aliases.some((alias) => new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text));
  });
}
