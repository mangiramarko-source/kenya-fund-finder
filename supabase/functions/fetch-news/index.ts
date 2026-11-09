import { createClient } from "../_shared/supabase-client.ts";
import { authorizePrivilegedRequest } from "../_shared/privileged-auth.ts";
import {
  getSupabasePublishableKey,
  getSupabaseSecretKey,
} from "../_shared/supabase-keys.ts";
import { cleanNewsTitle, isDuplicateNewsText, sanitizeNewsText } from "../_shared/news-text.ts";
import {
  evaluateNewsQuality,
  parseNewsPublicationTime,
  NEWS_CLASSIFICATION_VERSION,
} from "../_shared/news-quality.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KEYWORDS = [
  // Kenyan / local
  "unit trust", "money market", "cma", "nse", "shares", "dividend",
  "interest rates", "investment", "capital markets", "nairobi securities",
  "bond", "treasury bill", "equity fund", "fixed income", "mutual fund",
  "stock market", "central bank", "cbk", "inflation", "gdp",
  "ipo", "rights issue", "fund manager", "sacco", "pension",
  "kenya", "nairobi", "shilling", "kes", "east africa", "eac",
  // International / macro relevant to Kenyan investors
  "federal reserve", "fed", "ecb", "imf", "world bank", "treasury",
  "yields", "yield curve", "sovereign bond", "eurobond", "currency",
  "forex", "fx", "dollar", "euro", "sterling", "oil", "brent", "crude",
  "gold", "commodities", "etf", "hedge fund", "private equity",
  "emerging markets", "africa", "frontier markets", "msci",
  "wall street", "s&p 500", "nasdaq", "ftse", "dow jones", "bond market",
];

const RSS_FEEDS = [
  // Primary Regulatory (Tier 1)
  { url: "https://www.centralbank.go.ke/feed/", source: "Central Bank of Kenya" },
  // Kenyan business press (Primary Focus)
  { url: "https://news.google.com/rss/search?q=site:businessdailyafrica.com+business+when:7d&hl=en-KE&gl=KE&ceid=KE:en", source: "Business Daily" },
  { url: "https://www.standardmedia.co.ke/rss/business.php", source: "Standard Media" },
  { url: "https://news.google.com/rss/search?q=site:the-star.co.ke+business+when:7d&hl=en-KE&gl=KE&ceid=KE:en", source: "The Star" },
  { url: "https://news.google.com/rss/search?q=site:nation.africa/kenya/business+when:7d&hl=en-KE&gl=KE&ceid=KE:en", source: "Nation" },
  { url: "https://www.capitalfm.co.ke/business/feed/", source: "Capital FM" },
  { url: "https://www.tuko.co.ke/rss/business.rss", source: "Tuko News" },
  { url: "https://news.google.com/rss/search?q=site:citizen.digital+business+when:7d&hl=en-KE&gl=KE&ceid=KE:en", source: "Citizen Digital" },
  { url: "https://www.kbc.co.ke/category/business/feed/", source: "KBC" },
  { url: "https://www.pd.co.ke/category/business/feed/", source: "People Daily" },
  { url: "https://news.google.com/rss/search?q=site:kenyanwallstreet.com+when:7d&hl=en-KE&gl=KE&ceid=KE:en", source: "Kenyan Wall Street" },
  { url: "https://news.google.com/rss/search?q=site:bizna.co.ke+when:7d&hl=en-KE&gl=KE&ceid=KE:en", source: "Bizna Kenya" },
  // Pan-African / Regional Context
  { url: "https://www.ecofinagency.com/finance?format=feed&type=rss", source: "Ecofin Agency" },
  { url: "https://allafrica.com/tools/headlines/rdf/kenya/headlines.rdf", source: "AllAfrica" },
  { url: "https://african.business/feed", source: "African Business" },
  { url: "https://www.theafricareport.com/feed/", source: "The Africa Report" },
  { url: "https://furtherafrica.com/feed/", source: "Further Africa" },
  { url: "https://www.ft.com/world/africa?format=rss", source: "Financial Times Africa" },
  // Tech & Startups (Silicon Savannah)
  { url: "https://techcabal.com/feed/", source: "TechCabal" },
  { url: "https://disrupt-africa.com/feed/", source: "Disrupt Africa" },
  { url: "https://news.google.com/rss/search?q=site:techcabal.com+when:7d&hl=en-KE&gl=KE&ceid=KE:en", source: "TechCabal" },
  { url: "https://news.google.com/rss/search?q=site:techweez.com+when:7d&hl=en-KE&gl=KE&ceid=KE:en", source: "TechWeez" },
  // Free Google News RSS queries strictly focused on Kenyan Markets
  { url: "https://news.google.com/rss/search?q=Kenya+economy+OR+NSE+OR+CBK+when:7d&hl=en-KE&gl=KE&ceid=KE:en", source: "Google News" },
  { url: "https://news.google.com/rss/search?q=Kenya+shilling+OR+%22unit+trust%22+OR+%22money+market%22+when:7d&hl=en-KE&gl=KE&ceid=KE:en", source: "Google News" },
  // Targeted Funds & Fixed Income Queries (Batch 1 Sourcing Expansion)
  { url: "https://news.google.com/rss/search?q=site:businessdailyafrica.com+(%22treasury+bill%22+OR+%22treasury+bills%22+OR+%22treasury+bond%22+OR+%22treasury+bonds%22+OR+%22infrastructure+bond%22+OR+%22corporate+bond%22+OR+%22money+market+fund%22+OR+%22unit+trust%22)+when:7d&hl=en-KE&gl=KE&ceid=KE:en", source: "Business Daily" },
  { url: "https://news.google.com/rss/search?q=site:kenyanwallstreet.com+(%22treasury+bill%22+OR+%22treasury+bills%22+OR+%22treasury+bond%22+OR+%22treasury+bonds%22+OR+%22corporate+bond%22+OR+%22money+market%22+OR+%22unit+trust%22)+when:7d&hl=en-KE&gl=KE&ceid=KE:en", source: "Kenyan Wall Street" },
  { url: "https://news.google.com/rss/search?q=site:standardmedia.co.ke+(%22treasury+bill%22+OR+%22treasury+bills%22+OR+%22treasury+bond%22+OR+%22treasury+bonds%22+OR+%22corporate+bond%22+OR+%22money+market%22+OR+%22unit+trust%22)+when:7d&hl=en-KE&gl=KE&ceid=KE:en", source: "Standard Media" },
  { url: "https://news.google.com/rss/search?q=Kenya+(%22treasury+bills%22+OR+%22treasury+bonds%22+OR+%22infrastructure+bond%22+OR+%22corporate+bond%22+OR+%22money+market+fund%22+OR+%22unit+trust%22+OR+%22DhowCSD%22)+when:7d&hl=en-KE&gl=KE&ceid=KE:en", source: "Google News" },
];

// Guardrail 1: Verified YouTube Channel IDs only (never guess UC... IDs)
const VERIFIED_YOUTUBE_FEEDS = [
  { channelId: "UCv_-B3iPYj2XQ2gQ_fyhHRw", source: "Central Bank of Kenya", requireMacroFilter: false },
  { channelId: "UCgrAIOyT2rROw4NRIx3b-Wg", source: "Kenyan Wall Street", requireMacroFilter: false },
  { channelId: "UCsba91UGiQLFOb5DN3Z_AdQ", source: "CNBC Africa", requireMacroFilter: true },
  { channelId: "UCfwsnnLRgJ5k2ir9IkU-Bqw", source: "CDSC Kenya", requireMacroFilter: false },
  { channelId: "UCual_P_eQvhLllXRvSdZtxw", source: "Nairobi Securities Exchange", requireMacroFilter: false },
];

interface ParsedArticle {
  title: string;
  url: string | null;
  video_url?: string | null;
  summary: string;
  content: string | null;
  source_published_at: string | null;
  source: string;
  image_url: string | null;
}

function stripHtml(html: string): string {
  return sanitizeNewsText(html);
}

function extractImageUrl(item: string): string | null {
  const mediaMatch = item.match(/<media:content[^>]+url=["']([^"']+)["']/);
  if (mediaMatch) return mediaMatch[1];
  const encMatch = item.match(/<enclosure[^>]+url=["']([^"']+)["']/);
  if (encMatch) return encMatch[1];
  const imgMatch = item.match(/<img[^>]+src=["']([^"']+)["']/);
  if (imgMatch) return imgMatch[1];
  const thumbMatch = item.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/);
  if (thumbMatch) return thumbMatch[1];
  return null;
}

function extractTag(xml: string, tag: string): string {
  const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i");
  const cdataMatch = xml.match(cdataRe);
  if (cdataMatch) return cdataMatch[1].trim();
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(re);
  return match ? match[1].trim() : "";
}

function parseSourcePublishedAt(dateStr: string): string | null {
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function estimateReadTime(text: string): string {
  const words = text.split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

function matchesKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return KEYWORDS.some((kw) => lower.includes(kw));
}

function normalizeUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    // Strip tracking params, fragment, trailing slash; lowercase host
    const stripParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "ref", "mc_cid", "mc_eid", "feature", "si"];
    stripParams.forEach((p) => u.searchParams.delete(p));
    u.hash = "";
    const host = u.host.toLowerCase();
    const path = u.pathname.replace(/\/+$/, "");
    // Preserve case-sensitive YouTube video IDs (?v=...)
    if (host.includes("youtube.com") && u.searchParams.has("v")) {
      const vid = u.searchParams.get("v");
      return `${u.protocol.toLowerCase()}//${host}${path}?v=${vid}`;
    }
    let normalized = `${u.protocol.toLowerCase()}//${host}${path}`;
    const qs = u.searchParams.toString();
    if (qs) normalized += `?${qs}`;
    return normalized.toLowerCase();
  } catch {
    return url.trim();
  }
}

function normalizeFinancialText(text: string): string {
  return (text || "")
    .toLowerCase()
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
    .replace(/\b(?:maintains|maintained|retains|retained|holds|held|keeps|kept|unchanged)\b/g, " holds ")
    .replace(/\b(?:cuts|cut|lowers|lowered|reduces|reduced|slashes|slashed|trims|trimmed)\b/g, " cuts ")
    .replace(/\b(?:raises|raised|hikes|hiked|increases|increased|lifts|lifted)\b/g, " hikes ")
    .replace(/[^\w\s.%]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(title: string): string {
  return normalizeFinancialText(cleanNewsTitle(title));
}

// Common English stopwords removed before fuzzy comparison
const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "in", "on", "at", "to", "for", "with", "by",
  "from", "as", "is", "are", "was", "were", "be", "been", "being", "it", "its", "this", "that",
  "these", "those", "has", "have", "had", "will", "would", "could", "should", "may", "can",
  "s", "t", "up", "down", "out", "over", "under", "after", "before", "into", "than",
  "new", "says", "said", "amid", "vs", "via", "kenya", "kenyan", "nairobi",
]);

const KNOWN_ENTITIES = new Set([
  "cbk", "cbr", "mpc", "nse", "cma", "kra", "epra", "cdsc", "tbills", "tbonds",
  "mmf", "safaricom", "kcb", "equitygroup", "coopbank", "eabl",
]);

function tokenize(title: string): Set<string> {
  return new Set(
    normalizeTitle(title)
      .split(" ")
      .map((w) => w.replace(/^\.+|\.+$/g, ""))
      .filter((w) => w.length >= 2 && !STOPWORDS.has(w)),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection++;
  const union = a.size + b.size - intersection;
  return intersection / union;
}

const FUZZY_THRESHOLD = 0.40;

function hasEntityAndMetricOverlap(a: Set<string>, b: Set<string>): boolean {
  let sharedEntity = false;
  let sharedMetric = false;
  const years = new Set(["2023", "2024", "2025", "2026", "2027", "2028"]);
  for (const token of a) {
    if (!b.has(token)) continue;
    if (KNOWN_ENTITIES.has(token)) sharedEntity = true;
    if (/^\d+(?:\.\d+)?(?:%|bps)?$/.test(token) && !years.has(token)) sharedMetric = true;
  }
  return sharedEntity && sharedMetric;
}

// Guardrail 4: Require >= 0.40 headline Jaccard OR (shared entity + shared metric + >= 0.30 Jaccard)
function isFuzzyDuplicate(tokens: Set<string>, existingTokens: Set<string>[]): boolean {
  if (tokens.size < 3) return false;
  for (const ex of existingTokens) {
    const sim = jaccardSimilarity(tokens, ex);
    if (sim >= FUZZY_THRESHOLD) return true;
    if (sim >= 0.30 && hasEntityAndMetricOverlap(tokens, ex)) return true;
  }
  return false;
}

function mergeClusteredParsedArticles(existing: ParsedArticle, incoming: ParsedArticle): ParsedArticle {
  const existingLen = (existing.summary?.length || 0) + (existing.content?.length || 0);
  const incomingLen = (incoming.summary?.length || 0) + (incoming.content?.length || 0);
  const existingSubstantive = (existing.summary?.length || 0) >= 120 || (existing.content?.length || 0) >= 200;
  const incomingSubstantive = (incoming.summary?.length || 0) >= 120 || (incoming.content?.length || 0) >= 200;

  const primary =
    incomingSubstantive && !existingSubstantive
      ? incoming
      : existingSubstantive && !incomingSubstantive
      ? existing
      : incomingLen > existingLen
      ? incoming
      : existing;
  const secondary = primary === existing ? incoming : existing;

  return {
    ...primary,
    summary:
      primary.summary && primary.summary.length >= (secondary.summary?.length || 0)
        ? primary.summary
        : secondary.summary || primary.summary,
    content: primary.content || secondary.content,
    video_url: primary.video_url || secondary.video_url || null,
    image_url: primary.image_url || secondary.image_url || null,
  };
}

// --- AI rewriting (summary + long-form body, in original words) ----------
const AI_GATEWAY_URL = "https://api.groq.com/openai/v1/chat/completions";
const AI_MODEL = "llama-3.3-70b-versatile";

interface RewrittenArticle {
  summary: string;
  content: string;
}

async function rewriteArticle(
  apiKey: string,
  title: string,
  source: string,
  rawText: string,
  retries = 2,
): Promise<RewrittenArticle | null> {
  const sourceText = rawText.slice(0, 6000);
  if (!sourceText || sourceText.length < 80) return null;

  const systemPrompt = `You are an expert Financial Analyst and journalist for "Kenya Fund Finder", a premium Kenyan markets platform.
Your job is to read raw news text and write a completely original, highly transformative financial analysis of the events. 
CRITICAL RULE: You MUST write entirely in your own words. Do not copy sentences or phrases from the source text. Synthesize the facts and present them as a new, insightful analytical article. This ensures transformative Fair Use and avoids plagiarism.
Be factual, professional, analytical, and accurate. Keep all named entities, numbers, dates, currencies and quotes truthful — never invent facts. 
If something is unclear, omit it. Write in clean British/Kenyan English. Do NOT say things like "the article says" or reference the original source inside the body. Do not include introductory labels like "Summary" or "Analysis".
Return ONLY a JSON object that matches the schema.`;

  let userPrompt = `Title: ${title}
Original source: ${source}

Source text:
"""
${sourceText}
"""

Rewrite this as a completely original professional financial analysis:
- "summary": a comprehensive, highly detailed 5-8 sentence standalone executive summary (up to 1200 characters) that gives readers the full picture and all key facts without forcing them to read the full article. Do NOT include labels like "Summary".
- "content": an engaging, insightful analysis (roughly 250-450 words) written entirely in your own words. Use MARKDOWN formatting to make it highly scannable. Include **bold takeaways**, bullet points for market impact or key numbers, and short paragraphs. Synthesize the facts and explicitly explain the implications for the Kenyan market and local investors. Do NOT include a main heading (like # Title) since the UI provides it.`;

  if (source.toLowerCase().includes("tuko")) {
    userPrompt = `Title: ${title}
Original source: ${source}

Source text:
"""
${sourceText}
"""

Rewrite this as a completely original, extended professional financial analysis:
- "summary": a comprehensive, highly detailed 6-10 sentence standalone executive summary (up to 1500 characters) that gives readers the full picture and all key facts. Do NOT include labels like "Summary".
- "content": an extensive, rich, and highly detailed analysis (roughly 400-700 words) written entirely in your own words to ensure zero plagiarism. Extract every possible detail, nuance, and piece of extra information from the source text. Synthesize the key facts, deep context, numbers, and explicitly explain the broader implications for the Kenyan market and local investors. Use MARKDOWN formatting to make it highly scannable (e.g., **bolding key metrics**, bulleted lists for implications). Do NOT include a main heading.`;
  }

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "publish_article",
              description: "Publish the rewritten article",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "Detailed 5-8 sentence standalone summary, max ~1200 chars" },
                  content: { type: "string", description: "3-6 paragraph rewritten article body, ~250-450 words" },
                },
                required: ["summary", "content"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "publish_article" } },
      }),
    });
    clearTimeout(t);

    if (!res.ok) {
      if (res.status === 429 && retries > 0) {
        console.warn(`AI rate limited (429) for "${title.slice(0, 40)}", retrying in 3s... (${retries} retries left)`);
        await new Promise((r) => setTimeout(r, 3000));
        return rewriteArticle(apiKey, title, source, rawText, retries - 1);
      }
      console.error(`AI rewrite failed [${res.status}] for "${title.slice(0, 60)}"`);
      return null;
    }
    const data = await res.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = call?.function?.arguments;
    if (!argsStr) return null;
    const parsed = JSON.parse(argsStr) as Partial<RewrittenArticle>;
    if (!parsed.summary || !parsed.content) return null;
    return { summary: parsed.summary.trim(), content: parsed.content.trim() };
  } catch (err) {
    console.error(`AI rewrite error for "${title.slice(0, 60)}":`, err);
    return null;
  }
}

function extractHtmlMetadataAndParagraphs(rawHtml: string): {
  metaDescription: string;
  ogImage: string | null;
  paragraphs: string[];
} {
  const html = rawHtml.slice(0, 180000);
  const ogDescMatch =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i) ||
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const ogImageMatch =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

  const cleaned = html.replace(/<(script|style|nav|header|footer|iframe|aside)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
  const paragraphs: string[] = [];
  const pRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null;
  while ((match = pRegex.exec(cleaned)) !== null && paragraphs.length < 12) {
    const text = stripHtml(match[1]).trim();
    if (text.length > 40) paragraphs.push(text);
  }

  return {
    metaDescription: ogDescMatch ? stripHtml(ogDescMatch[1]).trim() : "",
    ogImage: ogImageMatch ? ogImageMatch[1].trim() : null,
    paragraphs,
  };
}

async function fetchArticleContent(url: string): Promise<string | null> {
  if (/youtube\.com|youtu\.be/i.test(url)) return null;
  const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
  
  if (firecrawlKey) {
    try {
      console.log(`Using Firecrawl to scrape: ${url}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url,
          formats: ["markdown"]
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data && data.data.markdown) {
          return data.data.markdown;
        }
      } else {
        console.warn(`Firecrawl failed for ${url} with status ${res.status}`);
      }
    } catch (err) {
      console.error(`Firecrawl error for ${url}:`, err);
    }
  }

  // Fallback to lightweight regex extraction (avoids cheerio DOM CPU/memory spike)
  try {
    console.log(`Using standard fetch for: ${url}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 KenyaFundFinder/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    
    if (!res.ok) return null;
    const html = await res.text();
    const { paragraphs } = extractHtmlMetadataAndParagraphs(html);
    return paragraphs.join("\n\n");
  } catch (err) {
    console.error(`Failed to scrape ${url}:`, err);
    return null;
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

const TRUSTED_PUBLISHERS: Record<string, string> = {
  "business daily": "Business Daily",
  "businessdailyafrica.com": "Business Daily",
  "standard media": "Standard Media",
  "the standard": "Standard Media",
  "standardmedia.co.ke": "Standard Media",
  "kenyan wall street": "Kenyan Wall Street",
  "the kenyan wallstreet": "Kenyan Wall Street",
  "the kenyan wall street": "Kenyan Wall Street",
  "kenyanwallstreet.com": "Kenyan Wall Street",
  "capital fm": "Capital FM",
  "capital business": "Capital FM",
  "capitalfm.co.ke": "Capital FM",
  "nation": "Nation",
  "daily nation": "Nation",
  "nation.africa": "Nation",
  "the star": "The Star",
  "the-star.co.ke": "The Star",
  "tuko news": "Tuko News",
  "tuko.co.ke": "Tuko News",
  "people daily": "People Daily",
  "pd.co.ke": "People Daily",
  "citizen digital": "Citizen Digital",
  "citizen.digital": "Citizen Digital",
  "kbc": "KBC",
  "kbc.co.ke": "KBC",
  "bizna kenya": "Bizna Kenya",
  "bizna.co.ke": "Bizna Kenya",
  "african business": "African Business",
  "the africa report": "The Africa Report",
  "further africa": "Further Africa",
  "financial times": "Financial Times Africa",
  "ft.com": "Financial Times Africa",
  "techcabal": "TechCabal",
  "techweez": "TechWeez",
  "capital markets authority": "Capital Markets Authority",
  "cma.or.ke": "Capital Markets Authority",
  "cma": "Capital Markets Authority",
  "central bank of kenya": "Central Bank of Kenya",
  "centralbank.go.ke": "Central Bank of Kenya",
  "nairobi securities exchange": "Nairobi Securities Exchange",
  "nse.co.ke": "Nairobi Securities Exchange",
  "cdsc kenya": "CDSC Kenya",
  "cdsckenya.com": "CDSC Kenya",
  "cnbc africa": "CNBC Africa",
  "cnbcafrica.com": "CNBC Africa",
  "ecofin agency": "Ecofin Agency",
  "ecofinagency.com": "Ecofin Agency",
  "allafrica": "AllAfrica",
  "allafrica.com": "AllAfrica",
  "disrupt africa": "Disrupt Africa",
  "disrupt-africa.com": "Disrupt Africa",
};

function matchesKenyaOrMacroVideoFilter(text: string): boolean {
  const lower = text.toLowerCase();
  const isKenyaOrEac =
    /\b(kenya|kenyan|nairobi|shilling|kes|ksh|cbk|cma|nse|east africa|eac|safaricom|kcb|equity bank|co-op bank|eabl|dhowcsd|unit trust|money market|mmf)\b/.test(
      lower,
    );
  if (isKenyaOrEac) return true;

  // Exclude non-EAC single-country regional noise (Nigeria, Ghana, South Africa, etc.) when Kenya/EAC is not mentioned
  const isOtherAfricanCountryNoise =
    /\b(nigeria|nigerian|naira|ghana|ghanaian|cedi|south africa|johannesburg|jse|rand|zambia|zimbabwe|botswana|namibia|angola|mozambique|cote d'ivoire|senegal)\b/.test(
      lower,
    );
  if (isOtherAfricanCountryNoise) return false;

  const isGlobalMacro =
    /\b(federal reserve|us fed|ecb|brent|crude oil|opec|gold price|imf|world bank|eurobond)\b/.test(
      lower,
    );
  return isGlobalMacro;
}

async function fetchYouTubeFeed(
  channelId: string,
  source: string,
  requireMacroFilter: boolean,
): Promise<ParsedArticle[]> {
  const articles: ParsedArticle[] = [];
  const now = new Date();
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(feedUrl, {
      headers: { "User-Agent": "KenyaFundFinder/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.error(`YouTube feed ${source} returned ${res.status}`);
      return articles;
    }
    const xml = await res.text();
    const entries = xml.split(/<entry[\s>]/i).slice(1);

    for (const entry of entries) {
      const videoId = extractTag(entry, "yt:videoId");
      const rawTitle = stripHtml(extractTag(entry, "title"));
      if (!videoId || !rawTitle) continue;

      const linkMatch = entry.match(/<link[^>]+href=["']([^"']+)["']/i);
      const rawLink = linkMatch ? linkMatch[1] : `https://www.youtube.com/watch?v=${videoId}`;

      // Guardrail 1: Strictly filter out YouTube Shorts
      if (/\/shorts\//i.test(rawLink) || /#shorts\b/i.test(rawTitle)) {
        continue;
      }

      const published = extractTag(entry, "published") || extractTag(entry, "updated");
      const pubInfo = parseNewsPublicationTime(published, now);
      if (!pubInfo.iso || pubInfo.reason === "future_publication_time") {
        continue;
      }

      const descriptionRaw = extractTag(entry, "media:description") || extractTag(entry, "summary");
      const cleanDesc = stripHtml(descriptionRaw).slice(0, 1500);
      const combinedText = `${rawTitle} ${cleanDesc}`;

      if (requireMacroFilter && !matchesKenyaOrMacroVideoFilter(combinedText)) {
        continue;
      }
      if (!requireMacroFilter && !matchesKeywords(combinedText) && !matchesKenyaOrMacroVideoFilter(combinedText)) {
        continue;
      }

      const title = cleanNewsTitle(rawTitle, source);
      const canonicalVideoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const substantiveSummary =
        cleanDesc.length >= 80 && !isDuplicateNewsText(rawTitle, cleanDesc, source)
          ? cleanDesc.slice(0, 1000)
          : `${title}. Official video briefing from ${source} covering Kenyan financial markets, monetary policy, and key implications for local investors. ${cleanDesc}`.trim();

      articles.push({
        title,
        url: canonicalVideoUrl,
        video_url: canonicalVideoUrl,
        summary: substantiveSummary,
        content: cleanDesc || substantiveSummary,
        source_published_at: pubInfo.iso,
        source,
        image_url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      });
    }
  } catch (err) {
    console.error(`Error fetching YouTube feed ${source}:`, err);
  }
  return articles;
}

function parseGdeltSeenDate(seendate: string | undefined): string | null {
  if (!seendate) return null;
  // Format: YYYYMMDDTHHMMSSZ
  const m = seendate.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!m) return parseSourcePublishedAt(seendate);
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}.000Z`;
}

async function fetchGdeltArticles(): Promise<ParsedArticle[]> {
  const articles: ParsedArticle[] = [];
  const now = new Date();
  const gdeltUrl =
    'https://api.gdeltproject.org/api/v2/doc/doc?query=(sourcecountry:KE%20OR%20%22Central%20Bank%20of%20Kenya%22%20OR%20%22Nairobi%20Securities%20Exchange%22%20OR%20%22Kenya%20Shilling%22)&mode=artlist&format=json&maxrecords=30&timespan=48h';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(gdeltUrl, {
      headers: { "User-Agent": "KenyaFundFinder/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return articles;

    const data = await res.json();
    const rawList = Array.isArray(data?.articles) ? data.articles : [];
    const candidates: Array<{
      title: string;
      url: string;
      source: string;
      iso: string | null;
      image_url: string | null;
    }> = [];

    for (const item of rawList) {
      if (!item?.url || !item?.title) continue;
      if (item.language && item.language.toLowerCase() !== "english") continue;
      const trustedSource = resolveTrustedPublisher(item.domain || "", item.url);
      if (!trustedSource) continue;

      const iso = parseGdeltSeenDate(item.seendate);
      const pubInfo = parseNewsPublicationTime(iso, now);
      if (pubInfo.reason === "stale_publication_time" || pubInfo.reason === "future_publication_time") {
        continue;
      }

      const cleanTitle = cleanNewsTitle(stripHtml(item.title), trustedSource);
      if (!cleanTitle || !matchesKeywords(cleanTitle)) continue;

      candidates.push({
        title: cleanTitle,
        url: normalizeUrl(item.url) || item.url,
        source: trustedSource,
        iso: pubInfo.iso,
        image_url: item.socialimage || null,
      });
      if (candidates.length >= 6) break;
    }

    // HTML description fallback for GDELT records (since artlist JSON omits descriptions)
    await mapWithConcurrency(candidates, 3, async (cand) => {
      let summary = "";
      let content: string | null = null;
      let ogImage: string | null = cand.image_url;
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 6000);
        const pageRes = await fetch(cand.url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; KenyaFundFinder/1.0)",
          },
          signal: ctrl.signal,
        });
        clearTimeout(t);
        if (pageRes.ok) {
          const html = await pageRes.text();
          const { metaDescription, ogImage: parsedOgImage, paragraphs: paras } =
            extractHtmlMetadataAndParagraphs(html);
          if (!ogImage && parsedOgImage) {
            ogImage = parsedOgImage;
          }
          summary = metaDescription.slice(0, 1000);
          if (paras.length > 0) {
            content = paras.slice(0, 10).join("\n\n").slice(0, 5000);
            if (!summary) summary = paras[0].slice(0, 600);
          }
        }
      } catch {
        // Fallback if individual HTML scrape times out
      }

      if (summary || content) {
        articles.push({
          title: cand.title,
          url: cand.url,
          summary: summary || (content ? content.slice(0, 600) : ""),
          content,
          source_published_at: cand.iso,
          source: cand.source,
          image_url: ogImage,
        });
      }
    });
  } catch (err) {
    console.warn("GDELT fetch skipped:", err);
  }
  return articles;
}

function resolveTrustedPublisher(rawSource: string, link: string): string | null {
  const normRaw = (rawSource || "").toLowerCase().replace(/[^\w\s.-]/g, " ").trim();
  for (const [key, canonical] of Object.entries(TRUSTED_PUBLISHERS)) {
    if (normRaw.includes(key)) return canonical;
  }
  try {
    const host = new URL(link).hostname.toLowerCase().replace(/^www\./, "");
    for (const [key, canonical] of Object.entries(TRUSTED_PUBLISHERS)) {
      if (host.includes(key)) return canonical;
    }
  } catch {
    // Invalid article URLs are treated as untrusted publishers.
  }
  return null;
}

async function fetchFeed(feedUrl: string, source: string): Promise<ParsedArticle[]> {
  const articles: ParsedArticle[] = [];
  const now = new Date();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(feedUrl, {
      headers: { "User-Agent": "KenyaFundFinder/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) { console.error(`Feed ${source} returned ${res.status}`); return articles; }
    const xml = await res.text();
    const items = xml.split(/<item[\s>]/i).slice(1, 16);

    for (const item of items) {
      const rawTitle = stripHtml(extractTag(item, "title"));
      if (!rawTitle) continue;
      const link = extractTag(item, "link").trim();
      const pubDate = extractTag(item, "pubDate") || extractTag(item, "dc:date");

      // 1. Hard Freshness Gate (Rejects articles outside the 7-day window or future-dated)
      const pubInfo = parseNewsPublicationTime(pubDate, now);
      if (pubInfo.reason === "stale_publication_time" || pubInfo.reason === "future_publication_time") {
        continue;
      }

      // 2. Source-Authority Gate (For Google News aggregator feeds, require verified publisher)
      let resolvedSource = source;
      if (source === "Google News") {
        const rawSourceTag = stripHtml(extractTag(item, "source"));
        const matched = resolveTrustedPublisher(rawSourceTag, link);
        if (!matched) {
          continue; // Skip unapproved publisher
        }
        resolvedSource = matched;
      }

      const title = cleanNewsTitle(rawTitle, resolvedSource);
      const descriptionRaw = extractTag(item, "description");
      const contentRaw = extractTag(item, "content:encoded") || extractTag(item, "content");
      const summary = isDuplicateNewsText(rawTitle, descriptionRaw, resolvedSource)
        ? ""
        : stripHtml(descriptionRaw).slice(0, 1000);
      const sanitizedContent = isDuplicateNewsText(rawTitle, contentRaw, resolvedSource)
        ? ""
        : stripHtml(contentRaw).slice(0, 5000);
      const fullText = `${title} ${summary} ${sanitizedContent}`;
      if (!matchesKeywords(fullText)) continue;

      articles.push({
        title,
        // Store the same canonical URL used for duplicate detection. This makes
        // the database constraint effective even when feeds add tracking data.
        url: normalizeUrl(link) || null,
        summary,
        content: sanitizedContent || null,
        source_published_at: pubInfo.iso,
        source: resolvedSource,
        image_url: extractImageUrl(item),
      });
    }
  } catch (err) {
    console.error(`Error fetching ${source}:`, err);
  }
  return articles;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authorization = await authorizePrivilegedRequest(req, {
      namedSecretKeysJson: Deno.env.get("SUPABASE_SECRET_KEYS"),
      secretName: "automations",
      verifyUser: async (accessToken) => {
        const userClient = createClient(supabaseUrl, getSupabasePublishableKey());
        const { data, error } = await userClient.auth.getUser(accessToken);
        return error ? null : data.user?.id ?? null;
      },
      isAdmin: async (userId) => {
        const adminClient = createClient(supabaseUrl, getSupabaseSecretKey());
        const { data } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();
        return Boolean(data);
      },
    });

    if (!authorization.ok) {
      return new Response(
        JSON.stringify({ error: authorization.status === 401 ? "Unauthorized" : "Forbidden" }),
        {
          status: authorization.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(supabaseUrl, getSupabaseSecretKey());

    const [rssResults, youtubeResults, gdeltResult] = await Promise.all([
      Promise.allSettled(RSS_FEEDS.map((f) => fetchFeed(f.url, f.source))),
      Promise.allSettled(
        VERIFIED_YOUTUBE_FEEDS.map((yt) =>
          fetchYouTubeFeed(yt.channelId, yt.source, yt.requireMacroFilter)
        ),
      ),
      Promise.allSettled([fetchGdeltArticles()]),
    ]);

    const combinedResults = [...youtubeResults, ...gdeltResult, ...rssResults];
    const allArticles = combinedResults
      .filter((r): r is PromiseFulfilledResult<ParsedArticle[]> => r.status === "fulfilled")
      .flatMap((r) => r.value);

    const successCount = combinedResults.filter((r) => r.status === "fulfilled").length;
    const failCount = combinedResults.filter((r) => r.status === "rejected").length;

    if (allArticles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No matching articles found", inserted: 0, feeds: { success: successCount, failed: failCount } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const candidateUrls = Array.from(
      new Set(
        allArticles
          .map((a) => normalizeUrl(a.url))
          .filter((u): u is string => Boolean(u)),
      ),
    );

    const [{ data: existing }, { data: existingByUrl }] = await Promise.all([
      supabase
        .from("news_articles")
        .select("url, title")
        .order("created_at", { ascending: false })
        .limit(400),
      candidateUrls.length > 0
        ? supabase.from("news_articles").select("url, title").in("url", candidateUrls)
        : Promise.resolve({ data: [] as Array<{ url: string | null; title: string }> }),
    ]);

    const allExistingRows = [...(existing || []), ...(existingByUrl || [])];

    const existingUrls = new Set(
      allExistingRows
        .map((e: { url: string | null }) => normalizeUrl(e.url)?.toLowerCase())
        .filter((v): v is string => Boolean(v)),
    );
    const existingTitles = new Set(
      allExistingRows
        .map((e: { title: string }) => normalizeTitle(e.title || ""))
        .filter(Boolean),
    );
    // Pre-tokenize existing titles once for fuzzy comparison
    const existingTokenSets: Set<string>[] = allExistingRows
      .map((e: { title: string }) => tokenize(e.title || ""))
      .filter((s: Set<string>) => s.size >= 3);

    // Step 1: Cluster & merge within this batch (Guardrail 4: merge video + text clusters)
    const batchClusters: ParsedArticle[] = [];
    const batchTokenSets: Set<string>[] = [];
    for (const a of allArticles) {
      const tokens = tokenize(a.title);
      let matchedIdx = -1;
      for (let i = 0; i < batchClusters.length; i++) {
        const cUrl = normalizeUrl(batchClusters[i].url)?.toLowerCase();
        const aUrl = normalizeUrl(a.url)?.toLowerCase();
        if ((cUrl && aUrl && cUrl === aUrl) || isFuzzyDuplicate(tokens, [batchTokenSets[i]])) {
          matchedIdx = i;
          break;
        }
      }
      if (matchedIdx === -1) {
        batchClusters.push(a);
        batchTokenSets.push(tokens);
      } else {
        batchClusters[matchedIdx] = mergeClusteredParsedArticles(batchClusters[matchedIdx], a);
      }
    }

    // Step 2: Dedupe merged batch clusters against existing DB rows
    let fuzzySkipped = 0;
    const dedupedArticles = batchClusters.filter((a) => {
      const nUrl = normalizeUrl(a.url)?.toLowerCase();
      const nTitle = normalizeTitle(a.title);
      if (nUrl && existingUrls.has(nUrl)) return false;
      if (nTitle && existingTitles.has(nTitle)) return false;

      const tokens = tokenize(a.title);
      if (isFuzzyDuplicate(tokens, existingTokenSets)) {
        fuzzySkipped++;
        return false;
      }

      return true;
    });

    const dedupSkipped = allArticles.length - dedupedArticles.length;
    let rejectedCount = 0;

    const newArticles = dedupedArticles.filter((a) => {
      // Relevance Gate
      const titleLower = a.title.toLowerCase();
      const summaryLower = (a.summary || "").toLowerCase();
      const contentLower = (a.content || "").toLowerCase();
      const text = `${titleLower} ${summaryLower} ${contentLower}`;

      // 1. Explicit Kenyan financial entities/brands (always pass)
      const isKenyanEntity = /\b(cbk|cma|nse|safaricom|scom|kcb|equity bank|eqty|eabl|co-op bank|coop|epra|kra|treasury|nairobi securities exchange|capital markets authority|central bank of kenya)\b/i.test(text);
      
      // 2. Mention of Kenya/Nairobi + Financial context
      const mentionsKenya = /\b(kenya|kenyan|nairobi|shilling|kes|ksh|shs?)\b/i.test(text);
      const mentionsFinance = /\b(stock|equity|shares|dividend|earnings|profit|loss|revenue|tax|bond|yield|interest rate|inflation|cpi|gdp|economy|fund|mmf|unit trust|investment|investor|market|trade|export|import|price|commodity|gold|oil|agriculture|budget|deficit|debt|loan|mortgage|bank|banking|currency|forex|dollar|shilling)\b/i.test(text);
      const isKenyanFinance = mentionsKenya && mentionsFinance;

      // 3. Global macro events relevant to Kenya
      const isGlobalMacro = /\b(federal reserve|fed|ecb|brent|opec|us economy|global oil|global inflation)\b/i.test(text);
      
      const pass = Boolean(a.video_url) || isKenyanEntity || isKenyanFinance || isGlobalMacro;
      if (!pass) rejectedCount++;
      return pass;
    });

    console.log(`Fetched: ${allArticles.length}, Duplicates skipped: ${dedupSkipped}, Rejected by relevance: ${rejectedCount}, Accepted: ${newArticles.length}`);

    if (newArticles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No new articles to insert", inserted: 0, feeds: { success: successCount, failed: failCount } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sort new articles so video briefings and the newest articles are processed first
    newArticles.sort((a, b) => {
      const aVideo = a.video_url ? 1 : 0;
      const bVideo = b.video_url ? 1 : 0;
      if (aVideo !== bVideo) return bVideo - aVideo;
      const aTime = a.source_published_at ? new Date(a.source_published_at).getTime() : 0;
      const bTime = b.source_published_at ? new Date(b.source_published_at).getTime() : 0;
      return bTime - aTime;
    });

    // Rewrite each new article in original words via Gemini AI (concurrent, with fallback)
    // Limit batch size to prevent Edge Function timeout (WORKER_RESOURCE_LIMIT)
    const MAX_BATCH_SIZE = 5;
    const processingArticles = newArticles.slice(0, MAX_BATCH_SIZE);
    if (newArticles.length > MAX_BATCH_SIZE) {
      console.log(`Limiting to ${MAX_BATCH_SIZE} out of ${newArticles.length} new articles to prevent timeout.`);
    }

    const aiKey = Deno.env.get("GROQ_API_KEY") || Deno.env.get("GEMINI_API_KEY");
    let rewrittenCount = 0;
    const rewrites: Array<RewrittenArticle | null> = [];

    if (aiKey) {
      for (const a of processingArticles) {
        let raw = `${a.summary || ""}\n\n${a.content || ""}`.trim();

        // If the RSS feed provided very little content, attempt to scrape the full article
        if (raw.length < 1000 && a.url && !a.video_url) {
          console.log(`Text short (${raw.length} chars), scraping full content for: ${a.title}`);
          const scraped = await fetchArticleContent(a.url);
          if (scraped && scraped.length > 200) {
            raw = `${a.summary || ""}\n\n${scraped}`;
          }
        }

        const out = await rewriteArticle(aiKey, a.title, a.source, raw);
        if (out) rewrittenCount++;
        rewrites.push(out);

        // Pause 1.5 seconds between AI calls to avoid Groq concurrency / rate limits while fitting in 60s
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    } else {
      console.warn("GROQ_API_KEY not configured — inserting feed text as-is");
    }

    const rows = processingArticles.map((a, i) => {
      const rw = rewrites[i];
      const summaryCandidate = rw?.summary || a.summary;
      const contentCandidate = rw?.content || a.content;
      const quality = evaluateNewsQuality(
        {
          title: a.title,
          summary: summaryCandidate,
          content: contentCandidate,
          source: a.source,
          url: a.url,
          sourcePublishedAt: a.source_published_at,
        },
        { enforceFreshness: !a.video_url },
      );
      return {
        title: quality.title,
        url: a.url,
        summary: quality.summary,
        content: quality.content,
        date_published: quality.datePublished,
        source_published_at: quality.sourcePublishedAt,
        source: a.source,
        image_url: a.image_url,
        video_url: a.video_url || null,
        category: quality.category,
        status: quality.status,
        quality_reasons: quality.reasons,
        quality_checked_at: new Date().toISOString(),
        classification_version: NEWS_CLASSIFICATION_VERSION,
        is_featured: false,
        read_time: estimateReadTime(quality.summary + " " + (quality.content || "")),
        ...(a.video_url ? { ai_insight: JSON.stringify({ video_url: a.video_url }) } : {}),
      };
    });

    // The database constraint is the final, race-safe guard. Two concurrent
    // scheduled invocations can both finish the read-time check above, but only
    // one may persist a given source URL.
    const { data: insertedRows, error } = await supabase
      .from("news_articles")
      .upsert(rows, { onConflict: "source,url", ignoreDuplicates: true })
      .select("id");
    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const insertedCount = insertedRows?.length ?? 0;
    console.log(`Inserted ${insertedCount} news articles from ${successCount} feeds (rewritten: ${rewrittenCount})`);
    return new Response(
      JSON.stringify({
        message: `Inserted ${insertedCount} articles`,
        fetched: allArticles.length,
        rejected_by_relevance: rejectedCount,
        accepted: newArticles.length,
        inserted: insertedCount,
        duplicates_skipped: dedupSkipped,
        errors: failCount,
        rewritten: rewrittenCount,
        feeds: { success: successCount, failed: failCount },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
