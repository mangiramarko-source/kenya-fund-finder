import { useMemo } from "react";
import { type NewsFromDB, type FundFromDB } from "@/lib/api";
import { type Stock, type ExchangeRate } from "@/components/home/MarketTicker";
import { decodeHtmlEntities } from "@/lib/utils";

export type FeedItemType = "NEWS" | "STOCK_INSIGHT" | "FUND_MILESTONE" | "FX_ALERT" | "EDUCATION";

export interface FeedItem {
  id: string;
  type: FeedItemType;
  authorName: string;
  authorLabel: string;
  authorAvatar?: string;
  title: string;
  content: string;
  mediaUrl?: string;
  mediaType?: "image" | "chart_stock" | "metric_callout" | "video";
  metricValue?: string;
  metricLabel?: string;
  timestamp: Date; 
  likes: number;
  comments: number;
  url?: string;
  rawItem?: any;
  relatedSymbols?: string[];
  relatedStocks?: Array<{
    id: string;
    symbol: string;
    name: string;
    price: number | null;
    change: number | null;
    changePercent: number | null;
  }>;
  aiInsight?: string;
}

function getHashNumber(id: string, min: number, max: number) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const range = max - min + 1;
  return min + (Math.abs(hash) % range);
}

function getPastTime(minutesAgo: number) {
  const d = new Date();
  d.setMinutes(d.getMinutes() - minutesAgo);
  return d;
}

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const safeNum = (val: any) => {
  if (val == null) return 0;
  const num = parseFloat(String(val).replace(/[^\d.-]/g, ''));
  return isNaN(num) ? 0 : num;
};

function cleanTitleText(rawTitle: string): string {
  if (!rawTitle) return "";
  return rawTitle
    .replace(/\s*[-–|]\s*[a-z0-9.-]+\.[a-z]{2,}$/i, '')
    .replace(/\s*[-–|]\s*(Business Daily|Nation|The Star|Standard|Capital FM|TechCabal|TechWeez|Kenyan Wall Street|Citizen Digital|KBC|People Daily)\s*$/i, '')
    .trim();
}

function cleanContentText(title: string, rawContent: string): string {
  if (!rawContent) return "";
  let content = rawContent.trim();
  
  const baseTitle = cleanTitleText(title);
  if (baseTitle) {
    const normTitle = baseTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normContent = content.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (normTitle.length >= 15 && normContent.startsWith(normTitle)) {
      // Find the index in 'content' where the matching alphanumeric characters end
      let matchCount = 0;
      let splitIndex = 0;
      for (let i = 0; i < content.length; i++) {
        if (/[a-z0-9]/i.test(content[i])) {
          matchCount++;
        }
        if (matchCount === normTitle.length) {
          splitIndex = i + 1;
          break;
        }
      }

      let remainder = content.slice(splitIndex).trim();
      remainder = remainder.replace(/^[^a-z0-9]+/i, '').trim(); 
      remainder = remainder.replace(/^[a-z0-9.-]+\.[a-z]{2,}\s*/i, '').trim();
      
      if (remainder.length > 0) {
        content = remainder;
      } else {
        content = "";
      }
    }
  }

  content = content.replace(/^[a-z0-9.-]+\.[a-z]{2,}\s*[-–|]?\s*/i, '').trim();
  return content;
}

export function useSocialFeed(
  news: NewsFromDB[],
  stocks: Stock[],
  funds: FundFromDB[],
  fxRates: ExchangeRate[],
  commodities: any[] = []
) {
  return useMemo(() => {
    const feed: FeedItem[] = [];

    // 1. Process News Articles with real summaries
    (news || []).forEach((n: any) => {
      // Use created_at if available (when it landed on our site), otherwise fallback to date_published
      const timeSource = n.created_at || n.date_published;
      const newsDate = timeSource ? new Date(timeSource) : new Date();
      const rawTitle = decodeHtmlEntities(n.title || "");
      const rawContent = decodeHtmlEntities(n.summary || n.content || "");
      
      const cleanedTitle = cleanTitleText(rawTitle);
      const cleanedContent = cleanContentText(rawTitle, rawContent);

      const knownSymbols = ["SCOM", "EQTY", "KCB", "EABL", "BAT", "COOP", "NCBA", "USD/KES", "EUR/KES", "GBP/KES", "Oil", "Gold"];
      const relatedSymbols: string[] = [];
      const relatedStocks: any[] = [];
      
      // First, check the new backend related_stock_id
      if (n.related_stock_id && stocks && stocks.length > 0) {
        const matchingStock = stocks.find((s: any) => s.id === n.related_stock_id);
        if (matchingStock) {
          relatedSymbols.push(matchingStock.symbol);
          relatedStocks.push({
            id: matchingStock.id,
            symbol: matchingStock.symbol,
            name: matchingStock.name,
            price: matchingStock.price,
            change: matchingStock.day_change,
            changePercent: matchingStock.day_change_percent,
          });
        }
      }

      // Fallback extraction if no explicit backend related_stock_id yet
      if (relatedSymbols.length === 0) {
        const textUpper = `${cleanedTitle} ${cleanedContent}`.toUpperCase();

        // 1. Check against passed stocks list dynamically (matching symbol or name)
        if (stocks && stocks.length > 0) {
          for (const stock of stocks) {
            const sym = (stock.symbol || "").toUpperCase();
            const name = (stock.name || "").toUpperCase();
            
            // Clean common corporate suffixes for better matching (e.g. "SAFARICOM PLC" -> "SAFARICOM")
            const cleanName = name.replace(/\s+(PLC|LIMITED|LTD|GROUP|HOLDINGS)$/i, "").trim();

            if (
              (sym.length >= 3 && textUpper.includes(sym)) ||
              (cleanName.length >= 4 && textUpper.includes(cleanName)) ||
              (sym === "SCOM" && textUpper.includes("SAFARICOM"))
            ) {
              relatedSymbols.push(stock.symbol);
              relatedStocks.push({
                id: stock.id,
                symbol: stock.symbol,
                name: stock.name,
                price: stock.price,
                change: stock.day_change,
                changePercent: stock.day_change_percent,
              });
              break;
            }
          }
        }

        // 2. Hardcoded fallback dictionary if stocks list is empty or missed
        if (relatedSymbols.length === 0) {
          const dict: Record<string, string[]> = {
            SCOM: ["SAFARICOM", "SCOM", "M-PESA"],
            EQTY: ["EQUITY BANK", "EQUITY GROUP", "EQTY"],
            KCB: ["KCB BANK", "KCB GROUP", "KCB"],
            EABL: ["EABL", "EAST AFRICAN BREWERIES"],
            BAT: ["BAT KENYA", "BRITISH AMERICAN TOBACCO"],
            COOP: ["COOP BANK", "CO-OPERATIVE BANK", "CO-OP BANK"],
            NCBA: ["NCBA BANK", "NCBA GROUP"],
          };

          for (const [sym, keywords] of Object.entries(dict)) {
            if (keywords.some((kw) => textUpper.includes(kw))) {
              relatedSymbols.push(sym);
              break;
            }
          }
        }
      }
      
      feed.push({
        id: `news-${n.id}`,
        type: "NEWS",
        authorName: n.source || "Market News",
        authorLabel: n.category || "News",
        title: cleanedTitle,
        content: cleanedContent,
        mediaUrl: n.image_url || undefined,
        mediaType: n.image_url ? "image" : undefined,
        timestamp: newsDate,
        likes: n.likes || 0,
        comments: n.comments || 0,
        url: n.url,
        rawItem: n,
        relatedSymbols: relatedSymbols.length > 0 ? relatedSymbols : undefined,
        relatedStocks: relatedStocks.length > 0 ? relatedStocks : undefined,
        aiInsight: n.ai_insight || undefined,
      });
    });

    // (Removed Market Insights and KenyaFundFinder Academy feed items as requested)
    return feed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [news, stocks, funds, fxRates, commodities]);
}
