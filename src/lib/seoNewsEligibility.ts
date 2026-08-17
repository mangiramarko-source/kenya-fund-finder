import { stripHtml } from "./seoPrerender";

export interface SeoNewsArticleLike {
  id: string | null;
  title: string | null;
  summary: string | null;
  content?: string | null;
  status?: string | null;
  date_published?: string | null;
  source_published_at?: string | null;
  created_at?: string | null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIN_SUBSTANTIVE_CHARS = 80;
const MIN_SUBSTANTIVE_WORDS = 8;

function normalizeText(value: unknown): string {
  return stripHtml(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasValidDate(value: string | null | undefined): boolean {
  if (!value) return false;
  return Number.isFinite(new Date(value).getTime());
}

function isSubstantiveText(text: string, title: string): boolean {
  const cleaned = stripHtml(text);
  if (cleaned.length < MIN_SUBSTANTIVE_CHARS) return false;
  if (cleaned.split(/\s+/).filter(Boolean).length < MIN_SUBSTANTIVE_WORDS) return false;
  return normalizeText(cleaned) !== normalizeText(title);
}

export function isIndexableNewsArticle(article: SeoNewsArticleLike): boolean {
  if (!UUID_PATTERN.test(article.id || "")) return false;
  if (article.status && article.status !== "published") return false;

  const title = stripHtml(article.title);
  if (!title || title.length < 12) return false;

  const publishedAt = article.source_published_at || article.date_published || article.created_at;
  if (!hasValidDate(publishedAt)) return false;

  return isSubstantiveText(article.summary || "", title);
}
