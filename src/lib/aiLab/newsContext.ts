// News context for AI Lab — deterministic matching against preloaded articles.
// Uses public-data gateway only; no content body fetch in Phase 8E.

import { useEffect, useState } from "react";
import { fetchPublicData } from "@/lib/gateway";
import { findAsset, type MarketContext } from "./marketContext";
import { resolveAssetMatch } from "./nameMatch";
import { STANDARD_DISCLAIMER } from "./safety";
import type { UnknownPayload } from "./routerTypes";

export const NEWS_TIMEZONE = "Africa/Nairobi";

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  datePublished: string;
  url: string | null;
  category: string;
}

export interface NewsContext {
  articles: NewsArticle[];
  fetchedAt: string;
}

export type NewsQueryKind =
  | "asset"
  | "market_today"
  | "nse_today"
  | "general"
  | "explain_news";

export interface NewsMatchResult {
  articles: NewsArticle[];
  queryKind: NewsQueryKind;
  queryLabel: string;
  relatedSymbol?: string;
}

interface NewsRow {
  id?: string | null;
  title?: string | null;
  summary?: string | null;
  source?: string | null;
  date_published?: string | null;
  url?: string | null;
  category?: string | null;
}

const MAX_ARTICLES = 50;
const MAX_RESULTS = 8;

export function isPublishedToday(
  datePublished: string,
  referenceDate: Date = new Date(),
  timezone: string = NEWS_TIMEZONE,
): boolean {
  const pub = new Date(datePublished);
  if (isNaN(pub.getTime())) return false;
  const fmt = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: timezone });
  return fmt(pub) === fmt(referenceDate);
}

function normalizeArticle(row: NewsRow): NewsArticle | null {
  if (!row.id || !row.title) return null;
  return {
    id: row.id,
    title: row.title,
    summary: row.summary ?? "",
    source: row.source ?? "",
    datePublished: row.date_published ?? "",
    url: row.url ?? null,
    category: row.category ?? "",
  };
}

export async function fetchNewsContext(): Promise<NewsContext> {
  const res = await fetchPublicData<NewsRow>("news", {
    limit: MAX_ARTICLES,
    order: "date_published.desc",
    select: [
      "id",
      "title",
      "summary",
      "source",
      "date_published",
      "url",
      "category",
    ],
  });

  const articles = (res.data ?? [])
    .map(normalizeArticle)
    .filter((a): a is NewsArticle => a != null);

  return {
    articles,
    fetchedAt: new Date().toISOString(),
  };
}

export function useNewsContext() {
  const [data, setData] = useState<NewsContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchNewsContext()
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e?.message ?? "Failed to load news context"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, error, loading };
}

export function isNewsLabPrompt(lower: string): boolean {
  if (/\bexplain this news\b/.test(lower) || /\bexplain the news\b/.test(lower)) return true;
  if (/\bsimple terms\b/.test(lower) && /\bnews\b/.test(lower)) return true;
  if (/\bsummarize\b/.test(lower) && /\b(market news|news)\b/.test(lower)) return true;
  if (/\btoday'?s?\b/.test(lower) && /\b(market news|news|nse)\b/.test(lower)) return true;
  if (/\bwhat happened to\b/.test(lower) && /\bnse\b/.test(lower)) return true;
  if (/\bnews related to\b/.test(lower)) return true;
  if (/\blatest news\b/.test(lower)) return true;
  if (/\bnews about\b/.test(lower)) return true;
  if (/\bnews on\b/.test(lower)) return true;
  if (/\blatest news on\b/.test(lower)) return true;
  if (/\bshow news\b/.test(lower)) return true;
  if (/\bsummarize news\b/.test(lower)) return true;
  if (/\bmarket news\b/.test(lower)) return true;
  if (/\btell me (?:the )?latest news\b/.test(lower)) return true;
  if (/\bwhat is happening (?:in the market|with)\b/.test(lower)) return true;
  if (/\bwhat happened today\b/.test(lower)) return true;
  if (/\bnews today\b/.test(lower)) return true;
  if (/\bwhy is .+ moving\b/.test(lower)) return true;
  if (/^\s*news\s*$/i.test(lower)) return true;
  return false;
}

export function isInstrumentNewsPrompt(lower: string): boolean {
  return (
    /\bnews on\b/.test(lower) ||
    /\blatest news on\b/.test(lower) ||
    /\bnews about\b/.test(lower) ||
    /\bnews related to\b/.test(lower) ||
    /\bwhat is happening with\b/.test(lower) ||
    /\bwhy is .+ moving\b/.test(lower)
  );
}

export function isGeneralNewsPrompt(lower: string): boolean {
  if (isInstrumentNewsPrompt(lower)) return false;
  return (
    /\blatest news\b/.test(lower) ||
    /\bmarket news\b/.test(lower) ||
    /\bwhat is happening in the market\b/.test(lower) ||
    /\bwhat happened today\b/.test(lower) ||
    /\bnews today\b/.test(lower) ||
    /\btell me (?:the )?latest news\b/.test(lower) ||
    /^\s*news\s*$/i.test(lower)
  );
}

export const NEWS_LIMITATION_MSG = [
  "I can help with news-style questions, but live internet news lookup is not enabled in AI Lab yet.",
  "",
  "What I can do now",
  "- Summarize news already available inside KenyaFundFinder",
  "- Explain market context from available site data",
  "- Look up a specific stock, fund, FX rate, or commodity in the current dataset",
  "- Show neutral scenarios for a specific amount",
  "",
  "Important",
  "I will not create or guess headlines that are not in the dataset.",
  "",
  STANDARD_DISCLAIMER,
].join("\n");

export const NEWS_GENERAL_FOLLOWUPS = [
  "Show latest available site news",
  "Summarize market context",
  "Look up Safaricom",
];

export const NEWS_INSTRUMENT_FOLLOWUPS = [
  "Look up this instrument",
  "Show available site news",
  "Compare with another instrument",
];

export function buildNewsLimitationFallback(_prompt: string, lower: string): UnknownPayload {
  return {
    kind: "unknown",
    message: NEWS_LIMITATION_MSG,
    suggestions: isInstrumentNewsPrompt(lower)
      ? [...NEWS_INSTRUMENT_FOLLOWUPS]
      : [...NEWS_GENERAL_FOLLOWUPS],
    disclaimer: STANDARD_DISCLAIMER,
  };
}

export function buildNewsUnavailableFallback(
  prompt: string,
  lower: string,
  newsCtx: NewsContext,
): UnknownPayload {
  if (isGeneralNewsPrompt(lower) && newsCtx.articles.length > 0) {
    const latest = newsCtx.articles.slice(0, 8);
    return {
      kind: "unknown",
      message:
        "I could not find today's-only news for that prompt, but KenyaFundFinder has other stored articles. Try a specific company/ticker or ask to summarize available site news.",
      suggestions: [
        "Summarize available site news",
        "Latest news on Safaricom",
        "Look up Safaricom",
      ],
      disclaimer: STANDARD_DISCLAIMER,
    };
  }

  if (isInstrumentNewsPrompt(lower)) {
    return {
      kind: "unknown",
      message:
        "I could not find matching news in available KenyaFundFinder data for that instrument. Try the full company name or ticker, or ask for a data lookup instead.",
      suggestions: [...NEWS_INSTRUMENT_FOLLOWUPS],
      disclaimer: STANDARD_DISCLAIMER,
    };
  }

  return buildNewsLimitationFallback(prompt, lower);
}

function articleMatchesTerms(article: NewsArticle, terms: string[]): boolean {
  const hay = `${article.title} ${article.summary}`.toLowerCase();
  return terms.some((t) => t.length >= 2 && hay.includes(t.toLowerCase()));
}

function resolveAssetTerms(prompt: string, marketCtx?: MarketContext | null): {
  terms: string[];
  relatedSymbol?: string;
} {
  const stocks = (marketCtx?.assets ?? []).filter((a) => a.kind === "stock");
  const hit = resolveAssetMatch(prompt, stocks);
  if (hit.status === "match" && hit.asset) {
    return {
      terms: [hit.asset.symbol, hit.asset.name, ...hit.asset.aliases].filter(Boolean),
      relatedSymbol: hit.asset.symbol,
    };
  }

  const assetPatterns = [
    /\bnews on\s+(.+?)(?:\?|\.|$)/i,
    /\blatest news on\s+(.+?)(?:\?|\.|$)/i,
    /\bnews about\s+(.+?)(?:\?|\.|$)/i,
    /\bnews related to\s+(.+?)(?:\?|\.|$)/i,
    /\bwhat is happening with\s+(.+?)(?:\?|\.|$)/i,
    /\bwhy is\s+(.+?)\s+moving\b/i,
  ];

  for (const re of assetPatterns) {
    const m = prompt.match(re);
    if (!m?.[1]) continue;
    const q = m[1].trim();
    const resolved = resolveAssetMatch(q, stocks);
    if (resolved.status === "match" && resolved.asset) {
      return {
        terms: [resolved.asset.symbol, resolved.asset.name, ...resolved.asset.aliases],
        relatedSymbol: resolved.asset.symbol,
      };
    }
    const legacy = findAsset(q, stocks);
    if (legacy) {
      return {
        terms: [legacy.symbol, legacy.name, ...legacy.aliases],
        relatedSymbol: legacy.symbol,
      };
    }
    return { terms: [q], relatedSymbol: q.toUpperCase() };
  }

  return { terms: [] };
}

function detectQueryKind(lower: string): NewsQueryKind {
  if (/\bexplain this news\b/.test(lower) || /\bexplain the news\b/.test(lower)) {
    return "explain_news";
  }
  if (/\bsimple terms\b/.test(lower) && /\bnews\b/.test(lower)) {
    return "explain_news";
  }
  if (/\bwhat happened to\b/.test(lower) && /\bnse\b/.test(lower)) {
    return "nse_today";
  }
  if (/\btoday'?s?\b/.test(lower) && /\bnse\b/.test(lower)) {
    return "nse_today";
  }
  if (/\bsummarize\b/.test(lower) && /\b(market news|news)\b/.test(lower)) {
    return "market_today";
  }
  if (/\btoday'?s?\b/.test(lower) && /\b(market news|news)\b/.test(lower)) {
    return "market_today";
  }
  if (isGeneralNewsPrompt(lower)) {
    return "general";
  }
  return "asset";
}

export function matchNewsForPrompt(
  prompt: string,
  newsCtx: NewsContext,
  marketCtx?: MarketContext | null,
  referenceDate: Date = new Date(),
): NewsMatchResult | null {
  const lower = prompt.toLowerCase();
  const queryKind = detectQueryKind(lower);
  const { articles } = newsCtx;

  if (queryKind === "explain_news") {
    const market = articles
      .filter((a) => a.category === "Market News" || a.category === "Regulatory Updates")
      .slice(0, MAX_RESULTS);
    const fallback = market.length ? market : articles.slice(0, 5);
    if (!fallback.length) return null;
    return {
      articles: fallback,
      queryKind,
      queryLabel: "Latest available market news",
    };
  }

  if (queryKind === "market_today") {
    const today = articles.filter((a) => isPublishedToday(a.datePublished, referenceDate));
    const marketToday = today.filter((a) => a.category === "Market News");
    const matched = (marketToday.length ? marketToday : today).slice(0, MAX_RESULTS);
    if (!matched.length) return null;
    return {
      articles: matched,
      queryKind,
      queryLabel: "Today's market news",
    };
  }

  if (queryKind === "nse_today") {
    const nseTerms = ["nse", "nairobi securities exchange", "nairobi stock exchange"];
    const today = articles.filter((a) => isPublishedToday(a.datePublished, referenceDate));
    const matched = today
      .filter((a) => articleMatchesTerms(a, nseTerms))
      .slice(0, MAX_RESULTS);
    if (!matched.length) return null;
    return {
      articles: matched,
      queryKind,
      queryLabel: "NSE news today",
    };
  }

  if (queryKind === "general") {
    const matched = articles.slice(0, MAX_RESULTS);
    if (!matched.length) return null;
    return {
      articles: matched,
      queryKind,
      queryLabel: "Latest available site news",
    };
  }

  const { terms, relatedSymbol } = resolveAssetTerms(prompt, marketCtx);
  if (!terms.length) return null;

  const matched = articles
    .filter((a) => articleMatchesTerms(a, terms))
    .slice(0, MAX_RESULTS);

  if (!matched.length) return null;

  return {
    articles: matched,
    queryKind: "asset",
    queryLabel: relatedSymbol ? `News related to ${relatedSymbol}` : "Matching news",
    relatedSymbol,
  };
}
