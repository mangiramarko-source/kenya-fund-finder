// News context for AI Lab — deterministic matching against preloaded articles.
// Uses public-data gateway only; no content body fetch in Phase 8E.

import { useEffect, useState } from "react";
import { fetchPublicData } from "@/lib/gateway";
import { findAsset, type MarketContext } from "./marketContext";

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
  if (/\bshow news\b/.test(lower)) return true;
  if (/\bsummarize news\b/.test(lower)) return true;
  return false;
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
  const hit = findAsset(prompt, stocks);
  if (hit) {
    return {
      terms: [hit.symbol, hit.name, ...hit.aliases].filter(Boolean),
      relatedSymbol: hit.symbol,
    };
  }

  const tokens = [
    ...prompt.matchAll(/\b(scom|eqty|kcb|scbk|safaricom|equity group|kcb group)\b/gi),
  ].map((m) => m[1]);
  if (tokens.length) {
    const hitFromToken = findAsset(tokens[0], stocks);
    if (hitFromToken) {
      return {
        terms: [hitFromToken.symbol, hitFromToken.name, ...hitFromToken.aliases],
        relatedSymbol: hitFromToken.symbol,
      };
    }
    return { terms: [...new Set(tokens)], relatedSymbol: tokens[0]?.toUpperCase() };
  }

  const about = prompt.match(/\bnews about\s+(.+?)(?:\?|\.|$)/i);
  if (about?.[1]) {
    const q = about[1].trim();
    const hit2 = findAsset(q, stocks);
    if (hit2) {
      return {
        terms: [hit2.symbol, hit2.name, ...hit2.aliases],
        relatedSymbol: hit2.symbol,
      };
    }
    return { terms: [q] };
  }

  const related = prompt.match(/\bnews related to\s+(.+?)(?:\?|\.|$)/i);
  if (related?.[1]) {
    const q = related[1].trim();
    const hit3 = findAsset(q, stocks);
    if (hit3) {
      return {
        terms: [hit3.symbol, hit3.name, ...hit3.aliases],
        relatedSymbol: hit3.symbol,
      };
    }
    return { terms: [q], relatedSymbol: q.toUpperCase() };
  }

  const latest = prompt.match(/\blatest news about\s+(.+?)(?:\?|\.|$)/i);
  if (latest?.[1]) {
    const q = latest[1].trim();
    const hit4 = findAsset(q, stocks);
    if (hit4) {
      return {
        terms: [hit4.symbol, hit4.name, ...hit4.aliases],
        relatedSymbol: hit4.symbol,
      };
    }
    return { terms: [q] };
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
