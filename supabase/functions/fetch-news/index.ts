import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

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
  // Kenyan business press
  { url: "https://www.businessdailyafrica.com/service/search/edp/21010-420078!/feed.rss", source: "Business Daily" },
  { url: "https://www.standardmedia.co.ke/rss/business.php", source: "Standard Media" },
  { url: "https://www.the-star.co.ke/rss/business", source: "The Star" },
  { url: "https://nation.africa/kenya/rss/business", source: "Nation" },
  { url: "https://www.capitalfm.co.ke/business/feed/", source: "Capital FM" },
  { url: "https://www.tuko.co.ke/rss/business.rss", source: "Tuko News" },
  { url: "https://citizen.digital/feed/business", source: "Citizen Digital" },
  { url: "https://www.kbc.co.ke/category/business/feed/", source: "KBC" },
  { url: "https://www.pd.co.ke/category/business/feed/", source: "People Daily" },
  { url: "https://kenyanwallstreet.com/feed/", source: "Kenyan Wall Street" },
  { url: "https://www.bizna.co.ke/feed/", source: "Bizna Kenya" },
  // Pan-African / regional
  { url: "https://african.business/feed", source: "African Business" },
  { url: "https://www.theafricareport.com/feed/", source: "The Africa Report" },
  { url: "https://furtherafrica.com/feed/", source: "Further Africa" },
  // International financial press
  { url: "https://feeds.reuters.com/reuters/businessNews", source: "Reuters Business" },
  { url: "https://feeds.reuters.com/news/wealth", source: "Reuters Markets" },
  { url: "https://feeds.bbci.co.uk/news/business/rss.xml", source: "BBC Business" },
  { url: "https://www.ft.com/world/africa?format=rss", source: "Financial Times Africa" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", source: "Al Jazeera" },
  { url: "https://www.cnbc.com/id/100727362/device/rss/rss.html", source: "CNBC World" },
  { url: "https://www.investing.com/rss/news_25.rss", source: "Investing.com" },
  { url: "https://www.marketwatch.com/rss/topstories", source: "MarketWatch" },
  { url: "https://seekingalpha.com/feed.xml", source: "Seeking Alpha" },
  // Free, no-key Google News RSS queries (auto-aggregates many sources)
  { url: "https://news.google.com/rss/search?q=Kenya+economy+OR+NSE+OR+CBK+when:7d&hl=en-KE&gl=KE&ceid=KE:en", source: "Google News" },
  { url: "https://news.google.com/rss/search?q=Kenya+shilling+OR+%22unit+trust%22+OR+%22money+market%22+when:7d&hl=en-KE&gl=KE&ceid=KE:en", source: "Google News" },
  { url: "https://news.google.com/rss/search?q=Africa+markets+OR+Eurobond+OR+%22emerging+markets%22+when:7d&hl=en&gl=US&ceid=US:en", source: "Google News" },
];

interface ParsedArticle {
  title: string;
  url: string | null;
  summary: string;
  content: string | null;
  date_published: string;
  source: string;
  image_url: string | null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
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

function parseDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  } catch { /* fall through */ }
  return new Date().toISOString().split("T")[0];
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

// Two titles are "fuzzy duplicates" when they share ≥70% of significant tokens
const FUZZY_THRESHOLD = 0.7;

function isFuzzyDuplicate(tokens: Set<string>, existingTokens: Set<string>[]): boolean {
  if (tokens.size < 3) return false; // too short to compare reliably
  for (const ex of existingTokens) {
    if (jaccardSimilarity(tokens, ex) >= FUZZY_THRESHOLD) return true;
  }
  return false;
}

function categorize(text: string): string {
  const lower = text.toLowerCase();
  if (/yield|return|interest rate|cbk|central bank|treasury bill|t-bill/.test(lower)) return "Yield Updates";
  if (/cma|regulator|compliance|policy|law|act|parliament/.test(lower)) return "Regulatory Updates";
  if (/fund manager|unit trust|money market|mutual fund|sacco|pension|ipo|rights issue/.test(lower)) return "Fund Announcements";
  if (/\b(fed|federal reserve|ecb|imf|world bank|wall street|s&p|nasdaq|ftse|dow jones|eurobond|brent|opec|emerging markets|global|us economy|china|europe)\b/.test(lower)) return "International";
  return "Market News";
}

// --- AI rewriting (summary + long-form body, in original words) ----------
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3-flash-preview";

interface RewrittenArticle {
  summary: string;
  content: string;
}

async function rewriteArticle(
  apiKey: string,
  title: string,
  source: string,
  rawText: string,
): Promise<RewrittenArticle | null> {
  const sourceText = rawText.slice(0, 6000);
  if (!sourceText || sourceText.length < 80) return null;

  const systemPrompt = `You are a financial journalist for "Kenya Fund Finder", a Kenyan markets website.
Rewrite the provided news item entirely in your own words to avoid plagiarism. Be factual, neutral and accurate.
Keep all named entities, numbers, dates, currencies and quotes truthful — never invent facts. If something is unclear, omit it.
Write in clean British/Kenyan English. Do NOT say things like "the article says" or reference the original source inside the body.
Return ONLY a JSON object that matches the schema — no markdown, no commentary.`;

  const userPrompt = `Title: ${title}
Original source: ${source}

Source text:
"""
${sourceText}
"""

Rewrite this as:
- "summary": a punchy 2-3 sentence standalone summary (max ~320 characters).
- "content": a richer 3-6 paragraph article (roughly 250-450 words) in your own words covering the key facts, context, numbers and implications for Kenyan investors. Use plain paragraphs separated by a blank line. No headings, no lists, no markdown.`;

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 25000);
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
                  summary: { type: "string", description: "2-3 sentence standalone summary, max ~320 chars" },
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

async function fetchFeed(feedUrl: string, source: string): Promise<ParsedArticle[]> {
  const articles: ParsedArticle[] = [];
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
      const title = stripHtml(extractTag(item, "title"));
      if (!title) continue;
      const link = extractTag(item, "link").trim();
      const descriptionRaw = extractTag(item, "description");
      const contentRaw = extractTag(item, "content:encoded") || extractTag(item, "content");
      const pubDate = extractTag(item, "pubDate") || extractTag(item, "dc:date");
      const summary = stripHtml(descriptionRaw).slice(0, 500);
      const fullText = `${title} ${summary} ${stripHtml(contentRaw)}`;
      if (!matchesKeywords(fullText)) continue;

      articles.push({
        title,
        url: link || null,
        summary: summary || title,
        content: contentRaw ? stripHtml(contentRaw).slice(0, 5000) : null,
        date_published: parseDate(pubDate),
        source,
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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

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
    const newArticles = allArticles.filter((a) => {
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
    if (fuzzySkipped > 0) console.log(`Fuzzy dedup skipped ${fuzzySkipped} near-duplicate articles`);

    if (newArticles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No new articles to insert", inserted: 0, feeds: { success: successCount, failed: failCount } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rewrite each new article in original words via Lovable AI (concurrent, with fallback)
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    let rewrittenCount = 0;
    let rewrites: Array<RewrittenArticle | null> = new Array(newArticles.length).fill(null);

    if (lovableKey) {
      rewrites = await mapWithConcurrency(newArticles, 4, async (a) => {
        const raw = `${a.summary || ""}\n\n${a.content || ""}`.trim();
        const out = await rewriteArticle(lovableKey, a.title, a.source, raw);
        if (out) rewrittenCount++;
        return out;
      });
    } else {
      console.warn("LOVABLE_API_KEY not configured — inserting feed text as-is");
    }

    const rows = newArticles.map((a, i) => {
      const rw = rewrites[i];
      const summary = rw?.summary || a.summary;
      const content = rw?.content || a.content;
      return {
        title: a.title,
        url: a.url,
        summary,
        content,
        date_published: a.date_published,
        source: a.source,
        image_url: a.image_url,
        category: categorize(`${a.title} ${summary}`),
        status: "published",
        is_featured: false,
        read_time: estimateReadTime(summary + " " + (content || "")),
      };
    });

    const { error } = await supabase.from("news_articles").insert(rows);
    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`Inserted ${rows.length} news articles from ${successCount} feeds (rewritten: ${rewrittenCount})`);
    return new Response(
      JSON.stringify({
        message: `Inserted ${rows.length} articles`,
        inserted: rows.length,
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
