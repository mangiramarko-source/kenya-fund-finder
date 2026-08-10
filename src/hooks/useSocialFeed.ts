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
      const sliceLen = baseTitle.length;
      let remainder = content.slice(sliceLen).trim();
      remainder = remainder.replace(/^[a-z0-9.-]+\.[a-z]{2,}\s*/i, '').trim();
      if (remainder.length > 0) {
        content = remainder;
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
      const contentUpper = cleanedContent.toUpperCase();
      const titleUpper = cleanedTitle.toUpperCase();
      knownSymbols.forEach(sym => {
        if (titleUpper.includes(sym.toUpperCase()) || contentUpper.includes(sym.toUpperCase())) {
          relatedSymbols.push(sym);
        }
      });
      
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
      });
    });

    // (Removed Market Insights and KenyaFundFinder Academy feed items as requested)
    return feed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [news, stocks, funds, fxRates, commodities]);
}
