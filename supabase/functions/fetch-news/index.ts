import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { parseFeed } from "https://deno.land/x/rss@0.5.8/mod.ts";
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
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

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
  { url: "https://african.business/feed", source: "African Business" },
  { url: "https://www.theafricareport.com/feed/", source: "The Africa Report" },
  { url: "https://furtherafrica.com/feed/", source: "Further Africa" },
  { url: "https://www.ft.com/world/africa?format=rss", source: "Financial Times Africa" },
  // Tech & Startups (Silicon Savannah)
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

interface ParsedArticle {
  title: string;
  url: string | null;
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
    const stripParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "ref", "mc_cid", "mc_eid"];
    stripParams.forEach((p) => u.searchParams.delete(p));
    u.hash = "";
    let normalized = `${u.protocol}//${u.host.toLowerCase()}${u.pathname.replace(/\/+$/, "")}`;
    const qs = u.searchParams.toString();
    if (qs) normalized += `?${qs}`;
    return normalized.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // strip punctuation
    .replace(/\s+/g, " ")
    .trim();
}

// Common English stopwords removed before fuzzy comparison
const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "in", "on", "at", "to", "for", "with", "by",
  "from", "as", "is", "are", "was", "were", "be", "been", "being", "it", "its", "this", "that",
  "these", "those", "has", "have", "had", "will", "would", "could", "should", "may", "can",
  "s", "t", "up", "down", "out", "over", "under", "after", "before", "into", "than",
  "new", "says", "said", "amid", "vs", "via",
]);

function tokenize(title: string): Set<string> {
  return new Set(
    normalizeTitle(title)
      .split(" ")
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection++;
  const union = a.size + b.size - intersection;
  return intersection / union;
}

// Two titles are "fuzzy duplicates" when they share ≥45% of significant tokens.
// Lowered from 0.7 to better catch reworded coverage of the same story across sources.
const FUZZY_THRESHOLD = 0.45;

function isFuzzyDuplicate(tokens: Set<string>, existingTokens: Set<string>[]): boolean {
  if (tokens.size < 3) return false; // too short to compare reliably
  for (const ex of existingTokens) {
    if (jaccardSimilarity(tokens, ex) >= FUZZY_THRESHOLD) return true;
  }
  return false;
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

async function fetchArticleContent(url: string): Promise<string | null> {
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

  // Fallback to standard fetch/cheerio
  try {
    console.log(`Using standard fetch for: ${url}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 KenyaFundFinder/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    
    // Remove unwanted noise elements
    $('script, style, nav, header, footer, iframe, aside, .ads, .sidebar, .comments').remove();
    
    const paragraphs: string[] = [];
    $('p').each((_, el) => {
      const text = $(el).text().trim();
      // Skip very short UI text elements
      if (text.length > 30) paragraphs.push(text);
    });
    
    return paragraphs.join('\n\n');
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
};

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
  } catch {}
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
    const items = xml.split(/<item[\s>]/i).slice(1);

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

    const feedResults = await Promise.allSettled(
      RSS_FEEDS.map((f) => fetchFeed(f.url, f.source))
    );
    const allArticles = feedResults
      .filter((r): r is PromiseFulfilledResult<ParsedArticle[]> => r.status === "fulfilled")
      .flatMap(r => r.value);

    const successCount = feedResults.filter(r => r.status === "fulfilled").length;
    const failCount = feedResults.filter(r => r.status === "rejected").length;

    if (allArticles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No matching articles found", inserted: 0, feeds: { success: successCount, failed: failCount } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existing } = await supabase
      .from("news_articles")
      .select("url, title")
      .order("created_at", { ascending: false })
      .limit(2000);

    const existingUrls = new Set(
      (existing || [])
        .map((e: { url: string | null }) => normalizeUrl(e.url))
        .filter((v): v is string => Boolean(v)),
    );
    const existingTitles = new Set(
      (existing || [])
        .map((e: { title: string }) => normalizeTitle(e.title || ""))
        .filter(Boolean),
    );
    // Pre-tokenize existing titles once for fuzzy comparison
    const existingTokenSets: Set<string>[] = (existing || [])
      .map((e: { title: string }) => tokenize(e.title || ""))
      .filter((s: Set<string>) => s.size >= 3);

    // Dedupe within this batch as well (cross-feed duplicates from Google News etc.)
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();
    const seenTokenSets: Set<string>[] = [];
    let fuzzySkipped = 0;
    const dedupedArticles = allArticles.filter((a) => {
      const nUrl = normalizeUrl(a.url);
      const nTitle = normalizeTitle(a.title);
      if (nUrl && existingUrls.has(nUrl)) return false;
      if (nTitle && existingTitles.has(nTitle)) return false;
      if (nUrl && seenUrls.has(nUrl)) return false;
      if (nTitle && seenTitles.has(nTitle)) return false;

      // Fuzzy title match against existing DB + this batch
      const tokens = tokenize(a.title);
      if (isFuzzyDuplicate(tokens, existingTokenSets) || isFuzzyDuplicate(tokens, seenTokenSets)) {
        fuzzySkipped++;
        return false;
      }

      if (nUrl) seenUrls.add(nUrl);
      if (nTitle) seenTitles.add(nTitle);
      if (tokens.size >= 3) seenTokenSets.push(tokens);
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
      
      const pass = isKenyanEntity || isKenyanFinance || isGlobalMacro;
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

    // Rewrite each new article in original words via Gemini AI (concurrent, with fallback)
    // Limit batch size to prevent Edge Function timeout (WORKER_RESOURCE_LIMIT)
    const MAX_BATCH_SIZE = 8;
    const processingArticles = newArticles.slice(0, MAX_BATCH_SIZE);
    if (newArticles.length > MAX_BATCH_SIZE) {
      console.log(`Limiting to ${MAX_BATCH_SIZE} out of ${newArticles.length} new articles to prevent timeout.`);
    }

    const aiKey = Deno.env.get("GROQ_API_KEY") || Deno.env.get("GEMINI_API_KEY");
    let rewrittenCount = 0;
    let rewrites: Array<RewrittenArticle | null> = [];

    if (aiKey) {
      for (const a of processingArticles) {
        let raw = `${a.summary || ""}\n\n${a.content || ""}`.trim();

        // If the RSS feed provided very little content, attempt to scrape the full article
        if (raw.length < 1000 && a.url) {
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
      const quality = evaluateNewsQuality({
        title: a.title,
        summary: summaryCandidate,
        content: contentCandidate,
        source: a.source,
        url: a.url,
        sourcePublishedAt: a.source_published_at,
      });
      return {
        title: quality.title,
        url: a.url,
        summary: quality.summary,
        content: quality.content,
        date_published: quality.datePublished,
        source_published_at: quality.sourcePublishedAt,
        source: a.source,
        image_url: a.image_url,
        category: quality.category,
        status: quality.status,
        quality_reasons: quality.reasons,
        quality_checked_at: new Date().toISOString(),
        classification_version: NEWS_CLASSIFICATION_VERSION,
        is_featured: false,
        read_time: estimateReadTime(quality.summary + " " + (quality.content || "")),
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
