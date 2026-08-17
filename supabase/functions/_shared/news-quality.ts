import {
  cleanNewsBody,
  cleanNewsTitle,
  isDuplicateNewsText,
} from "./news-text.ts";

export const NEWS_FRESHNESS_DAYS = 7;
export const NEWS_CLASSIFICATION_VERSION = "2026-08-17";

export type NewsQualityReason =
  | "invalid_url"
  | "invalid_publication_time"
  | "future_publication_time"
  | "stale_publication_time"
  | "empty_title"
  | "insufficient_content"
  | "duplicate_title_content";

export interface NewsQualityInput {
  title: string;
  summary?: string | null;
  content?: string | null;
  source?: string | null;
  url?: string | null;
  sourcePublishedAt?: string | null;
}

export interface NewsQualityResult {
  title: string;
  summary: string;
  content: string | null;
  sourcePublishedAt: string | null;
  datePublished: string | null;
  category: string;
  status: "published" | "pending_review";
  reasons: NewsQualityReason[];
}

function isValidHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseNewsPublicationTime(
  value: string | null | undefined,
  now = new Date(),
): { iso: string | null; date: string | null; reason: NewsQualityReason | null } {
  if (!value) return { iso: null, date: null, reason: "invalid_publication_time" };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { iso: null, date: null, reason: "invalid_publication_time" };
  }

  const futureToleranceMs = 6 * 60 * 60 * 1000;
  if (parsed.getTime() > now.getTime() + futureToleranceMs) {
    return { iso: parsed.toISOString(), date: parsed.toISOString().slice(0, 10), reason: "future_publication_time" };
  }

  const freshnessMs = NEWS_FRESHNESS_DAYS * 24 * 60 * 60 * 1000;
  if (now.getTime() - parsed.getTime() > freshnessMs) {
    return { iso: parsed.toISOString(), date: parsed.toISOString().slice(0, 10), reason: "stale_publication_time" };
  }

  return { iso: parsed.toISOString(), date: parsed.toISOString().slice(0, 10), reason: null };
}

export function isSubstantiveNewsText(value: string | null | undefined): boolean {
  const cleaned = cleanNewsBody(value || "");
  if (cleaned.length < 80) return false;
  return cleaned.split(/\s+/).filter(Boolean).length >= 12;
}

export function categorizeNews(text: string): string {
  const lower = cleanNewsBody(text).toLowerCase();
  const hasKenya = /\b(kenya|kenyan|nairobi|kes|ksh|shilling|nse|cbk|cma)\b/.test(lower);
  const hasMarketContext = /\b(market|investor|investment|listed|shares?|stock|bond|fund|yield|rate|price|trade|financial|economy|currency|commodity)\b/.test(lower);

  if (/\b(unit trust|money market fund|mmf|mutual fund|fund manager|collective investment scheme)\b/.test(lower)) {
    return "Fund Announcements";
  }
  if (/\b(forex|foreign exchange|exchange rate|currency pair|usd\/kes|eur\/kes|gbp\/kes)\b/.test(lower)
    || (hasKenya && /\b(shilling|currency)\b/.test(lower) && /\b(rate|weaken|strengthen|gain|lose|trade)\b/.test(lower))) {
    return "FX & Currency";
  }
  if (/\b(brent|crude oil|gold price|silver price|commodity prices?|coffee prices?|tea prices?|opec)\b/.test(lower)) {
    return "Commodities";
  }
  if (/\b(cma|capital markets authority|central bank of kenya|cbk|regulator|regulatory)\b/.test(lower)
    && /\b(rule|directive|approval|licen[cs]e|compliance|penalty|investigation|suspend|ban|gazette|regulation)\b/.test(lower)) {
    return "Regulatory Updates";
  }
  if (/\b(treasury bills?|t-?bills?|treasury bonds?|bond yields?|coupon rate|interest rates?|central bank rate)\b/.test(lower)) {
    return "Yield Updates";
  }
  if (!hasKenya && hasMarketContext
    && /\b(united states|u\.?s\.?|federal reserve|europe|ecb|china|global|international|world bank|imf|wall street|nasdaq|s&p 500|ftse)\b/.test(lower)) {
    return "International";
  }
  return "Market News";
}

export function evaluateNewsQuality(
  input: NewsQualityInput,
  options: { now?: Date; enforceFreshness?: boolean } = {},
): NewsQualityResult {
  const now = options.now || new Date();
  const enforceFreshness = options.enforceFreshness !== false;
  const title = cleanNewsTitle(input.title || "", input.source || "");
  const duplicateSummary = isDuplicateNewsText(input.title || title, input.summary, input.source || "");
  const duplicateContent = isDuplicateNewsText(input.title || title, input.content, input.source || "");
  const summary = duplicateSummary ? "" : cleanNewsBody(input.summary || "");
  const contentText = duplicateContent ? "" : cleanNewsBody(input.content || "");
  const publication = parseNewsPublicationTime(input.sourcePublishedAt, now);
  const reasons: NewsQualityReason[] = [];

  if (!isValidHttpUrl(input.url)) reasons.push("invalid_url");
  if (!title) reasons.push("empty_title");
  if (publication.reason && (enforceFreshness || publication.reason !== "stale_publication_time")) {
    reasons.push(publication.reason);
  }
  if (duplicateSummary && duplicateContent && (input.summary || input.content)) {
    reasons.push("duplicate_title_content");
  }
  if (!isSubstantiveNewsText(summary) && !isSubstantiveNewsText(contentText)) {
    reasons.push("insufficient_content");
  }

  return {
    title,
    summary,
    content: contentText || null,
    sourcePublishedAt: publication.iso,
    datePublished: publication.date,
    category: categorizeNews(`${title} ${summary} ${contentText}`),
    status: reasons.length ? "pending_review" : "published",
    reasons: [...new Set(reasons)],
  };
}
