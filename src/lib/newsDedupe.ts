/**
 * Multi-layer news deduplication, financial synonym normalization,
 * YouTube video ID extraction, and video+text story cluster merging.
 */

export interface NewsDedupeCandidate {
  id?: string;
  title?: string | null;
  summary?: string | null;
  content?: string | null;
  source?: string | null;
  url?: string | null;
  source_url?: string | null;
  video_url?: string | null;
  image_url?: string | null;
  date_published?: string | null;
  source_published_at?: string | null;
  created_at?: string | null;
  ai_insight?: string | null;
  parsed_ai_analysis?: {
    video_url?: string | null;
    [key: string]: unknown;
  } | null;
  related_stock_id?: string | null;
}

const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "ref",
  "mc_cid",
  "mc_eid",
  "feature",
  "si",
];

const PUBLISHER_SUFFIX_LABELS = [
  "Business Daily Africa",
  "Business Daily",
  "The Kenyan Wall Street",
  "Kenyan Wall Street",
  "The Kenyan Wallstreet",
  "Standard Media",
  "The Standard",
  "Daily Nation",
  "Nation Africa",
  "Nation",
  "Capital FM",
  "Capital Business",
  "Citizen Digital",
  "The Star",
  "People Daily",
  "KBC",
  "Tuko.co.ke",
  "Tuko News",
  "Tuko",
  "Bizna Kenya",
  "CNBC Africa",
  "Central Bank of Kenya",
  "Nairobi Securities Exchange",
  "CDSC Kenya",
  "Capital Markets Authority",
  "Ecofin Agency",
  "AllAfrica",
  "African Business",
  "The Africa Report",
  "Further Africa",
  "Financial Times Africa",
  "Financial Times",
  "TechCabal",
  "TechWeez",
  "Disrupt Africa",
];

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "in", "on", "at", "to", "for",
  "with", "by", "from", "as", "is", "are", "was", "were", "be", "been", "being",
  "it", "its", "this", "that", "these", "those", "has", "have", "had", "will",
  "would", "could", "should", "may", "can", "up", "down", "out", "over", "under",
  "after", "before", "into", "than", "new", "says", "said", "amid", "vs", "via",
  "how", "why", "what", "when", "where", "who", "kenya", "kenyan", "nairobi",
]);

const KNOWN_FINANCIAL_ENTITIES = new Set([
  "cbk",
  "cbr",
  "mpc",
  "nse",
  "cma",
  "kra",
  "epra",
  "cdsc",
  "tbills",
  "tbonds",
  "mmf",
  "safaricom",
  "kcb",
  "equitygroup",
  "coopbank",
  "eabl",
  "absa",
  "ncba",
  "stanbic",
  "stanchart",
  "kplc",
  "kengen",
  "batkenya",
  "imf",
  "worldbank",
  "fed",
  "ecb",
  "eurobond",
  "dhowcsd",
]);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Makes a story URL stable across tracking links, fragments, and harmless
 * trailing slashes so a transient duplicate row cannot be rendered twice.
 */
export function canonicalNewsUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "#") return null;

  try {
    const parsed = new URL(trimmed);
    for (const parameter of TRACKING_PARAMS) {
      parsed.searchParams.delete(parameter);
    }
    parsed.hash = "";
    const path = parsed.pathname.replace(/\/+$/, "") || "/";
    const search = parsed.searchParams.toString();
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${path}${search ? `?${search}` : ""}`.toLowerCase();
  } catch {
    return trimmed.toLowerCase() || null;
  }
}

/**
 * Extracts a verified 11-character YouTube video ID from a URL string or article record.
 * Strictly ignores YouTube Shorts (/shorts/) per anti-noise guardrails.
 */
export function extractYouTubeVideoId(
  input: string | NewsDedupeCandidate | null | undefined,
): string | null {
  if (!input) return null;

  const candidateUrls: Array<string | null | undefined> =
    typeof input === "string"
      ? [input]
      : [
          input.video_url,
          input.parsed_ai_analysis?.video_url,
          input.source_url,
          input.url,
          input.image_url,
        ];

  if (typeof input === "object" && input.ai_insight) {
    try {
      const parsed = JSON.parse(input.ai_insight);
      if (parsed && typeof parsed.video_url === "string") {
        candidateUrls.push(parsed.video_url);
      }
    } catch {
      // Non-JSON ai_insight; ignore
    }
  }

  for (const raw of candidateUrls) {
    if (!raw || typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // Guardrail 1: Never treat YouTube Shorts as video briefings
    if (/youtube\.com\/shorts\//i.test(trimmed) || /youtu\.be\/shorts\//i.test(trimmed)) {
      continue;
    }

    // Match standard watch?v=, embed/, v/, youtu.be/, or ytimg.com/vi/
    const watchMatch = trimmed.match(
      /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|v\/)|youtu\.be\/|ytimg\.com\/vi\/|img\.youtube\.com\/vi\/)([A-Za-z0-9_-]{11})(?:[?&/#]|$)/,
    );
    if (watchMatch && watchMatch[1]) {
      return watchMatch[1];
    }
  }

  return null;
}

/**
 * Strips trailing publisher labels (e.g. "- Business Daily", "| The Kenyan Wall Street")
 * and domain suffixes from article headlines.
 */
export function stripPublisherSuffix(title: string | null | undefined, source?: string | null): string {
  if (!title) return "";
  let cleaned = title.replace(/\s+/g, " ").trim();

  const labels = new Set<string>(PUBLISHER_SUFFIX_LABELS);
  if (source && source.trim()) {
    labels.add(source.replace(/^X\s*-\s*/i, "").trim());
  }

  // Sort longest first so "Business Daily Africa" matches before "Business Daily"
  const sortedLabels = [...labels].filter(Boolean).sort((a, b) => b.length - a.length);

  for (let pass = 0; pass < 2; pass++) {
    for (const label of sortedLabels) {
      cleaned = cleaned.replace(new RegExp(`\\s*[-–—|:]\\s*${escapeRegExp(label)}\\s*$`, "i"), "").trim();
    }
    cleaned = cleaned
      .replace(/\s*[-–—|]\s*(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}\s*$/i, "")
      .replace(/\s*[-–—|]\s*(?:home|latest news|business news|kenya news)\s*$/i, "")
      .trim();
  }

  return cleaned;
}

/**
 * Normalizes Kenyan and global financial synonyms into canonical single-token identifiers
 * so different media phrasings map to the same token space without multi-word inflation.
 */
export function normalizeFinancialText(text: string | null | undefined): string {
  if (!text) return "";
  let s = text.toLowerCase();

  // Normalize rate and currency expressions first
  s = s
    .replace(/(\d+(?:\.\d+)?)\s*(?:pc|per\s*cent|percent)\b/g, "$1%")
    .replace(/(\d+(?:\.\d+)?)\s*(?:basis\s+points?|bps)\b/g, "$1bps")
    .replace(/\b(?:central\s+bank\s+rate|cbr|benchmark\s+(?:lending\s+)?rate|base\s+(?:lending\s+)?rate|key\s+(?:lending\s+)?rate|policy\s+rate)\b/g, " cbr ")
    .replace(/\b(?:central\s+bank\s+of\s+kenya|central\s+bank|cbk)\b/g, " cbk ")
    .replace(/\b(?:monetary\s+policy\s+committee|mpc)\b/g, " mpc ")
    .replace(/\b(?:nairobi\s+securities\s+exchange|nairobi\s+bourse|nse)\b/g, " nse ")
    .replace(/\b(?:capital\s+markets\s+authority|cma)\b/g, " cma ")
    .replace(/\b(?:kenya\s+revenue\s+authority|kra)\b/g, " kra ")
    .replace(/\b(?:energy\s+and\s+petroleum\s+regulatory\s+authority|epra)\b/g, " epra ")
    .replace(/\b(?:central\s+depository(?:\s+and\s+settlement\s+corporation)?|cdsc)\b/g, " cdsc ")
    .replace(/\b(?:treasury\s+bills?|t-?bills?)\b/g, " tbills ")
    .replace(/\b(?:treasury\s+bonds?|t-?bonds?|infrastructure\s+bonds?)\b/g, " tbonds ")
    .replace(/\b(?:money\s+market\s+funds?|mmfs?|unit\s+trusts?)\b/g, " mmf ")
    .replace(/\b(?:kenya\s+shillings?|shillings?|kes|kshs?|shs)\s*(\d)/g, " kes $1")
    .replace(/\b(?:kenya\s+shillings?|shillings?|kes|kshs?|shs)\b/g, " kes ")
    .replace(/\b(?:safaricom\s+plc|safaricom|scom)\b/g, " safaricom ")
    .replace(/\b(?:kcb\s+group|kcb\s+bank|kcb)\b/g, " kcb ")
    .replace(/\b(?:equity\s+group(?:\s+holdings)?|equity\s+bank|eqty)\b/g, " equitygroup ")
    .replace(/\b(?:co-?operative\s+bank|co-?op\s+bank|coop\s+bank)\b/g, " coopbank ")
    .replace(/\b(?:east\s+african\s+breweries|eabl)\b/g, " eabl ")
    .replace(/\b(?:absa\s+bank(?:\s+kenya)?|absa\s+kenya|absa)\b/g, " absa ")
    .replace(/\b(?:ncba\s+group|ncba\s+bank|ncba)\b/g, " ncba ")
    .replace(/\b(?:stanbic\s+bank|stanbic\s+holdings|stanbic)\b/g, " stanbic ")
    .replace(/\b(?:standard\s+chartered(?:\s+bank)?|stanchart|scbk)\b/g, " stanchart ")
    .replace(/\b(?:kenya\s+power|kplc)\b/g, " kplc ")
    .replace(/\b(?:british\s+american\s+tobacco|bat\s+kenya)\b/g, " batkenya ")
    .replace(/\b(?:international\s+monetary\s+fund|imf)\b/g, " imf ")
    .replace(/\b(?:world\s+bank)\b/g, " worldbank ")
    .replace(/\b(?:federal\s+reserve|us\s+fed)\b/g, " fed ")
    .replace(/\b(?:european\s+central\s+bank|ecb)\b/g, " ecb ")
    .replace(/\b(?:dhow\s*csd)\b/g, " dhowcsd ");

  // Normalize headline action verbs
  s = s
    .replace(/\b(?:maintains|maintained|retains|retained|holds|held|keeps|kept|unchanged)\b/g, " holds ")
    .replace(/\b(?:cuts|cut|lowers|lowered|reduces|reduced|slashes|slashed|trims|trimmed)\b/g, " cuts ")
    .replace(/\b(?:raises|raised|hikes|hiked|increases|increased|lifts|lifted)\b/g, " hikes ");

  return s
    .replace(/[^\w\s.%]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeNewsText(text: string | null | undefined, source?: string | null): Set<string> {
  const stripped = stripPublisherSuffix(text || "", source);
  const normalized = normalizeFinancialText(stripped);
  if (!normalized) return new Set();

  const tokens = normalized
    .split(" ")
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));

  return new Set(tokens);
}

export function computeJaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function extractEntitiesAndMetrics(tokens: Set<string>): {
  entities: Set<string>;
  metrics: Set<string>;
} {
  const entities = new Set<string>();
  const metrics = new Set<string>();
  const calendarYears = new Set(["2023", "2024", "2025", "2026", "2027", "2028"]);

  for (const token of tokens) {
    if (KNOWN_FINANCIAL_ENTITIES.has(token)) {
      entities.add(token);
    }
    if (/^\d+(?:\.\d+)?(?:%|bps)?$/.test(token) && !calendarYears.has(token)) {
      metrics.add(token);
    }
  }

  return { entities, metrics };
}

function hasOverlap(a: Set<string>, b: Set<string>): boolean {
  for (const item of a) {
    if (b.has(item)) return true;
  }
  return false;
}

function parseArticleTimestampMs(article: NewsDedupeCandidate): number | null {
  const raw = article.source_published_at || article.date_published || article.created_at;
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return Number.isNaN(ms) ? null : ms;
}

const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;

function isWithinTimeWindow(a: NewsDedupeCandidate, b: NewsDedupeCandidate): boolean {
  const timeA = parseArticleTimestampMs(a);
  const timeB = parseArticleTimestampMs(b);
  if (timeA === null || timeB === null) return true;
  return Math.abs(timeA - timeB) <= SEVENTY_TWO_HOURS_MS;
}

export function getSourceAuthorityScore(source: string | null | undefined): number {
  const lower = (source || "").toLowerCase();
  if (
    lower.includes("central bank") ||
    lower.includes("cbk") ||
    lower.includes("capital markets authority") ||
    lower.includes("cma") ||
    lower.includes("nairobi securities exchange") ||
    lower.includes("nse") ||
    lower.includes("cdsc")
  ) {
    return 30;
  }
  if (
    lower.includes("business daily") ||
    lower.includes("kenyan wall street") ||
    lower.includes("cnbc africa") ||
    lower.includes("financial times") ||
    lower.includes("ecofin")
  ) {
    return 25;
  }
  if (
    lower.includes("standard") ||
    lower.includes("nation") ||
    lower.includes("capital fm") ||
    lower.includes("the star") ||
    lower.includes("citizen") ||
    lower.includes("allafrica") ||
    lower.includes("techcabal")
  ) {
    return 20;
  }
  return 10;
}

function scoreArticleTextDepth(article: NewsDedupeCandidate): number {
  const summaryLen = (article.summary || "").trim().length;
  const contentLen = (article.content || "").trim().length;
  const insightLen = (article.ai_insight || "").trim().length;
  const isSubstantive = summaryLen >= 120 || contentLen >= 200 || insightLen >= 150;
  const authority = getSourceAuthorityScore(article.source);
  return (isSubstantive ? 500 : 0) + authority * 5 + Math.min(400, (summaryLen + contentLen + insightLen) * 0.2);
}

/**
 * Merges two articles belonging to the same story cluster.
 * Guardrail 4: Preserves the richer substantive text body + AI analysis while
 * attaching the YouTube video_url (if either entry is a video) so the resulting
 * card has both inline video playback and deep written analysis.
 */
export function mergeClusteredArticles<T extends NewsDedupeCandidate>(existing: T, incoming: T): T {
  const existingScore = scoreArticleTextDepth(existing);
  const incomingScore = scoreArticleTextDepth(incoming);

  const primary = incomingScore > existingScore ? incoming : existing;
  const secondary = incomingScore > existingScore ? existing : incoming;

  const videoId = extractYouTubeVideoId(primary) || extractYouTubeVideoId(secondary);
  const resolvedVideoUrl =
    primary.video_url ||
    secondary.video_url ||
    primary.parsed_ai_analysis?.video_url ||
    secondary.parsed_ai_analysis?.video_url ||
    (videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined);

  const merged: T = {
    ...primary,
    summary:
      (primary.summary && primary.summary.trim().length >= (secondary.summary || "").trim().length
        ? primary.summary
        : secondary.summary || primary.summary) ?? primary.summary,
    content: primary.content || secondary.content,
    ai_insight: primary.ai_insight || secondary.ai_insight,
    parsed_ai_analysis: primary.parsed_ai_analysis || secondary.parsed_ai_analysis,
    related_stock_id: primary.related_stock_id || secondary.related_stock_id,
    image_url:
      primary.image_url ||
      secondary.image_url ||
      (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : primary.image_url),
  };

  if (resolvedVideoUrl) {
    merged.video_url = resolvedVideoUrl;
    if (merged.parsed_ai_analysis && typeof merged.parsed_ai_analysis === "object") {
      merged.parsed_ai_analysis = {
        ...merged.parsed_ai_analysis,
        video_url: resolvedVideoUrl,
      };
    }
  }

  return merged;
}

export interface DuplicateMatchAssessment {
  isDuplicate: boolean;
  reason: "exact_url" | "youtube_video_id" | "exact_title" | "title_jaccard" | "entity_metric_cluster" | null;
  similarity: number;
}

/**
 * Evaluates whether two articles represent the same news story.
 * Guardrail 4: Entity+Metric matches within 72h also require a minimum
 * headline/summary token Jaccard similarity (>= 0.30) after synonym normalization.
 */
export function assessNewsDuplicate(
  a: NewsDedupeCandidate,
  b: NewsDedupeCandidate,
): DuplicateMatchAssessment {
  const urlA = canonicalNewsUrl(a.url);
  const urlB = canonicalNewsUrl(b.url);
  if (urlA && urlB && urlA === urlB) {
    return { isDuplicate: true, reason: "exact_url", similarity: 1 };
  }

  const videoA = extractYouTubeVideoId(a);
  const videoB = extractYouTubeVideoId(b);
  if (videoA && videoB && videoA === videoB) {
    return { isDuplicate: true, reason: "youtube_video_id", similarity: 1 };
  }

  const titleA = stripPublisherSuffix(a.title, a.source);
  const titleB = stripPublisherSuffix(b.title, b.source);
  if (!titleA || !titleB) {
    return { isDuplicate: false, reason: null, similarity: 0 };
  }

  const normTitleA = normalizeFinancialText(titleA);
  const normTitleB = normalizeFinancialText(titleB);
  if (normTitleA && normTitleA === normTitleB) {
    return { isDuplicate: true, reason: "exact_title", similarity: 1 };
  }

  if (!isWithinTimeWindow(a, b)) {
    return { isDuplicate: false, reason: null, similarity: 0 };
  }

  const titleTokensA = tokenizeNewsText(titleA, a.source);
  const titleTokensB = tokenizeNewsText(titleB, b.source);
  const titleSimilarity = computeJaccardSimilarity(titleTokensA, titleTokensB);

  if (titleTokensA.size >= 3 && titleTokensB.size >= 3 && titleSimilarity >= 0.40) {
    return { isDuplicate: true, reason: "title_jaccard", similarity: titleSimilarity };
  }

  // Guarded 72h Entity + Metric Cluster check (requires entity overlap + metric overlap + >= 0.30 Jaccard)
  const combinedTokensA = tokenizeNewsText(`${titleA} ${a.summary || ""}`, a.source);
  const combinedTokensB = tokenizeNewsText(`${titleB} ${b.summary || ""}`, b.source);
  const metaA = extractEntitiesAndMetrics(combinedTokensA);
  const metaB = extractEntitiesAndMetrics(combinedTokensB);

  if (hasOverlap(metaA.entities, metaB.entities) && hasOverlap(metaA.metrics, metaB.metrics)) {
    const combinedSimilarity = Math.max(
      titleSimilarity,
      computeJaccardSimilarity(combinedTokensA, combinedTokensB),
    );
    if (combinedSimilarity >= 0.30) {
      return {
        isDuplicate: true,
        reason: "entity_metric_cluster",
        similarity: combinedSimilarity,
      };
    }
  }

  return { isDuplicate: false, reason: null, similarity: titleSimilarity };
}

/**
 * Deduplicates news articles across URLs, publisher-stripped headlines,
 * normalized financial synonyms, and guarded entity+metric clusters,
 * merging video + text records in the same story cluster.
 */
export function dedupeNewsArticles<T extends NewsDedupeCandidate>(articles: T[]): T[] {
  const clusters: T[] = [];

  for (const article of articles) {
    let matchedIndex = -1;
    for (let i = 0; i < clusters.length; i++) {
      const assessment = assessNewsDuplicate(clusters[i], article);
      if (assessment.isDuplicate) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex === -1) {
      clusters.push(article);
    } else {
      clusters[matchedIndex] = mergeClusteredArticles(clusters[matchedIndex], article);
    }
  }

  return clusters;
}

export function dedupeNewsByUrl<T extends NewsDedupeCandidate>(articles: T[]): T[] {
  return dedupeNewsArticles(articles);
}
