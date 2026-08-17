import { useMemo } from "react";
import { getNewsAiAnalysisDisplayText, parseNewsAiAnalysis, type NewsFromDB, type FundFromDB } from "@/lib/api";
import { type Stock, type ExchangeRate } from "@/components/home/MarketTicker";
import { decodeHtmlEntities } from "@/lib/utils";
import { getNewsPresentation } from "../../supabase/functions/_shared/news-text";
import { getNewsPublishedAt } from "@/lib/newsDate";
import { buildRelatedMarketLinks } from "@/lib/newsMarketLinks";

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
  aiInsight?: string | null;
  isHeadlineOnly?: boolean;
  relatedStock?: {
    id: string;
    symbol: string;
    name: string;
    price: number;
    previousPrice: number | null;
    changePercent: number;
  } | null;
  relatedMmf?: {
    id: string;
    name: string;
    yield: number;
    changePercent: number;
    slug?: string;
  } | null;
  relatedFx?: {
    id: string;
    pair: string;
    rate: number;
    changePercent: number;
  } | null;
  relatedCommodity?: {
    id: string;
    name: string;
    price: number;
    unit: string;
    changePercent: number;
  } | null;
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
      const timeSource = getNewsPublishedAt(n);
      const newsDate = timeSource ? new Date(timeSource) : new Date();
      const presentation = getNewsPresentation({
        title: decodeHtmlEntities(n.title || ""),
        summary: decodeHtmlEntities(n.summary || ""),
        content: decodeHtmlEntities(n.content || ""),
        source: n.source,
      });
      const cleanedTitle = presentation.title;
      const cleanedContent = presentation.body;
      const parsedAnalysis = n.parsed_ai_analysis || parseNewsAiAnalysis(n.ai_insight);
      const analysisText = getNewsAiAnalysisDisplayText(parsedAnalysis);

      const knownSymbols = ["SCOM", "EQTY", "KCB", "EABL", "BAT", "COOP", "NCBA", "USD/KES", "EUR/KES", "GBP/KES", "Oil", "Gold"];
      const relatedSymbols: string[] = [];
      const contentUpper = cleanedContent.toUpperCase();
      const titleUpper = cleanedTitle.toUpperCase();
      knownSymbols.forEach(sym => {
        if (titleUpper.includes(sym.toUpperCase()) || contentUpper.includes(sym.toUpperCase())) {
          relatedSymbols.push(sym);
        }
      });
      let relatedStock = null;
      if (n.related_stock_id) {
        relatedStock = stocks.find((s: any) => s.id === n.related_stock_id) || null;
      }
      if (!relatedStock && relatedSymbols.length > 0) {
        relatedStock = stocks.find((s: any) => s.symbol === relatedSymbols[0]) || null;
      }
      const marketLinks = buildRelatedMarketLinks(cleanedTitle, cleanedContent, funds, fxRates, commodities);
      
      feed.push({
        id: `news-${n.id}`,
        type: "NEWS",
        authorName: n.source || "Market News",
        authorLabel: n.category || "News",
        title: cleanedTitle,
        content: analysisText || cleanedContent,
        aiInsight: analysisText || null,
        isHeadlineOnly: presentation.isHeadlineOnly,
        mediaUrl: n.image_url || undefined,
        mediaType: n.image_url ? "image" : undefined,
        timestamp: newsDate,
        likes: n.likes || 0,
        comments: n.comments || 0,
        url: n.url,
        rawItem: { ...n, parsed_ai_analysis: parsedAnalysis },
        relatedSymbols: relatedSymbols.length > 0 ? relatedSymbols : undefined,
        relatedStock,
        ...marketLinks,
      });
    });

    // (Removed Market Insights and KenyaFundFinder Academy feed items as requested)
    const sortedFeed = feed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return sortedFeed;
  }, [news, stocks, funds, fxRates, commodities]);
}
