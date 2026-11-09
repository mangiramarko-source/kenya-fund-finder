import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "../_shared/supabase-client.ts";
import { authorizePrivilegedRequest } from "../_shared/privileged-auth.ts";
import {
  getSupabasePublishableKey,
  getSupabaseSecretKey,
} from "../_shared/supabase-keys.ts";
import {
  evaluateNewsQuality,
  NEWS_CLASSIFICATION_VERSION,
} from "../_shared/news-quality.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Curated Kenyan Finance Pages (Facebook) ─────────────────────────────────
// High-authority public pages covering markets, startups, and macro finance.
const TARGET_FACEBOOK_PAGES = [
  "https://www.facebook.com/BusinessDailyAfrica/", // Business Daily Africa
  "https://www.facebook.com/CentralBankKenya/",    // Central Bank of Kenya
  "https://www.facebook.com/disruptafrica/",       // Disrupt Africa (Funding & Accelerators)
  "https://www.facebook.com/techweez/",            // Techweez (Tech/Fintech)
  "https://www.facebook.com/MwangoCapital/",       // Mwango Capital (Yields/Earnings)
];

// ─── Curated Kenyan Finance Accounts (X / Twitter) ───────────────────────────
const TARGET_TWITTER_PROFILES = [
  "https://x.com/CBKKenya",       // Central Bank of Kenya
  "https://x.com/CMAKenya",       // Capital Markets Authority
  "https://x.com/MwangoCapital",  // Mwango Capital
  "https://x.com/HisaApp",        // Hisa investing
  "https://x.com/NSaboreshake",   // Nairobi Securities Exchange
];

// ─── Finance & Funding keyword filter ───────────────────────────────────────
const KEYWORDS = [
  "unit trust", "money market", "cma", "nse", "shares", "dividend",
  "interest rates", "investment", "capital markets", "nairobi securities",
  "bond", "treasury bill", "equity fund", "fixed income", "mutual fund",
  "stock market", "central bank", "cbk", "inflation", "gdp",
  "ipo", "rights issue", "fund manager", "sacco", "pension",
  "kenya", "nairobi", "shilling", "kes", "east africa", "eac",
  "profit", "earnings", "results", "quarterly", "financials", "revenue",
  "forex", "currency", "yield", "return", "basis points",
  // Grants, startup funding & accelerators
  "grant", "funding", "accelerator", "incubator", "venture capital", "vc",
  "seed round", "series a", "pre-seed", "angel investor", "pitch competition",
  "founder", "sme financing", "credit facility",
];

function matchesKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return KEYWORDS.some((kw) => lower.includes(kw));
}

function estimateReadTime(text: string): string {
  const words = text.split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

// ─── Normalized Social Post ──────────────────────────────────────────────────
interface NormalizedSocialPost {
  platform: "Facebook" | "X";
  author: string;
  url: string;
  text: string;
  createdAt?: string;
  imageUrl?: string | null;
}

interface RewrittenPost {
  summary: string;
  content: string;
}

// ─── AI Rewriting (Groq Llama 3.3 or Gemini Flash with Fallback) ─────────────
async function rewriteSocialPost(
  groqKey: string | null,
  geminiKey: string | null,
  post: NormalizedSocialPost,
  retries = 2,
): Promise<RewrittenPost> {
  const rawText = post.text.slice(0, 3000);
  const author = post.author;

  // Use Groq if available; otherwise use Gemini
  const apiKey = groqKey || geminiKey;
  if (!apiKey || rawText.length < 30) {
    return generateDeterministicFallback(post);
  }

  const isGroq = Boolean(groqKey);
  const gatewayUrl = isGroq
    ? "https://api.groq.com/openai/v1/chat/completions"
    : "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  const modelName = isGroq ? "llama-3.3-70b-versatile" : "gemini-3.8-flash";

  const systemPrompt = `You are an expert Financial Analyst for "Kenya Fund Finder".
Your job is to read raw social media updates (e.g. from Facebook or X/Twitter) and write a completely original, neutral, and professional financial news update based on it.
CRITICAL RULE: You MUST write entirely in your own words. Do not copy sentences directly from the source text. This ensures transformative Fair Use and avoids plagiarism.
Be factual, professional, analytical, and accurate. Keep all numbers, dates, and currencies truthful.
Do NOT include labels like "Summary" or "Summary (10th-Grade Reader Level)".
Return plain text in JSON format: {"summary": "2-3 crisp sentences", "content": "2-3 analytical paragraphs"}.`;

  const userPrompt = `Account: ${author} (${post.platform})
Original URL: ${post.url}

Raw Post Text:
"""
${rawText}
"""

Rewrite this post into an institutional news update for Kenyan investors:
- "summary": a crisp, 2-3 sentence standalone executive summary (max 600 chars).
- "content": 2-3 paragraphs (150-300 words) written entirely in your own words, contextualizing the update for the Kenyan capital markets.`;

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 18000);
    const res = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    clearTimeout(t);

    if (!res.ok) {
      if ((res.status === 429 || res.status === 503) && retries > 0) {
        console.warn(`AI rate limited/unavailable [${res.status}] for "${author}", retrying in 2s...`);
        await new Promise((r) => setTimeout(r, 2000));
        return rewriteSocialPost(groqKey, geminiKey, post, retries - 1);
      }
      console.warn(`AI rewrite failed [${res.status}] for "${author}", using clean structured fallback.`);
      return generateDeterministicFallback(post);
    }

    const data = await res.json();
    const contentStr = data?.choices?.[0]?.message?.content;
    if (!contentStr) return generateDeterministicFallback(post);

    const parsed = JSON.parse(contentStr) as Partial<RewrittenPost>;
    if (!parsed.summary || !parsed.content) return generateDeterministicFallback(post);

    return {
      summary: parsed.summary.trim(),
      content: parsed.content.trim(),
    };
  } catch (err) {
    console.warn(`AI rewrite exception for "${author}":`, (err as Error).message);
    return generateDeterministicFallback(post);
  }
}

function generateDeterministicFallback(post: NormalizedSocialPost): RewrittenPost {
  const clean = post.text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[#@]\w+/g, "")
    .trim();
  const firstSentence = clean.split(/[.\n]/)[0] || clean.slice(0, 160);
  return {
    summary: `${post.author} reported on Kenyan capital markets: ${firstSentence.trim()}.`,
    content: `${clean}\n\nThis update was monitored from ${post.author} on ${post.platform} and indexed by Kenya Fund Finder for Kenyan investor tracking.`,
  };
}

// ─── Apify Scrapers ──────────────────────────────────────────────────────────

// 1. Facebook Posts Scraper (apify/facebook-posts-scraper)
async function fetchFacebookFromApify(apifyToken: string): Promise<NormalizedSocialPost[]> {
  console.log("Triggering Apify Facebook Posts Scraper...");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 65000);

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~facebook-posts-scraper/run-sync-get-dataset-items?token=${apifyToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          startUrls: TARGET_FACEBOOK_PAGES.map((url) => ({ url })),
          resultsLimit: 12,
          caption: true,
        }),
      },
    );
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`Apify Facebook scraper returned [${res.status}]:`, await res.text());
      return [];
    }

    const items = await res.json();
    if (!Array.isArray(items)) return [];

    const posts: NormalizedSocialPost[] = [];
    for (const item of items) {
      const text = item.text || item.postText || item.caption || item.message || "";
      const url = item.url || item.postUrl || item.canonicalUrl || "";
      const author = item.user?.name || item.pageName || item.ownerName || "The Kenyan Wall Street";
      const createdAt = item.time || item.timestamp || item.date || item.createdAt;
      const imageUrl = item.media?.[0]?.thumbnail || item.imageUrl || item.attachedImage || null;

      if (url && text && text.length > 25) {
        posts.push({
          platform: "Facebook",
          author,
          url,
          text,
          createdAt,
          imageUrl,
        });
      }
    }
    return posts;
  } catch (err) {
    clearTimeout(timeout);
    console.warn("Apify Facebook scraper error:", (err as Error).message);
    return [];
  }
}

// 2. Twitter Scraper (apidojo/tweet-scraper)
async function fetchTwitterFromApify(apifyToken: string): Promise<NormalizedSocialPost[]> {
  console.log("Triggering Apify Twitter Scraper...");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 65000);

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/apidojo~tweet-scraper/run-sync-get-dataset-items?token=${apifyToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          startUrls: TARGET_TWITTER_PROFILES,
          maxItems: 8,
          sort: "Latest",
        }),
      },
    );
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`Apify Twitter scraper returned [${res.status}]:`, await res.text());
      return [];
    }

    const items = await res.json();
    if (!Array.isArray(items)) return [];

    const posts: NormalizedSocialPost[] = [];
    for (const item of items) {
      const text = item.full_text || item.text || "";
      const url = item.url || "";
      const author = item.author?.name || item.user?.name || "Social Media";
      const createdAt = item.created_at;
      const imageUrl = item.media?.[0]?.media_url_https || null;

      if (url && text && text.length > 25) {
        posts.push({
          platform: "X",
          author,
          url,
          text,
          createdAt,
          imageUrl,
        });
      }
    }
    return posts;
  } catch (err) {
    clearTimeout(timeout);
    console.warn("Apify Twitter scraper error:", (err as Error).message);
    return [];
  }
}

// ─── Main Handler ────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
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

    const apifyToken = Deno.env.get("APIFY_API_TOKEN");
    const groqKey = Deno.env.get("GROQ_API_KEY") || null;
    const geminiKey = Deno.env.get("GEMINI_API_KEY") || null;

    if (!apifyToken) {
      return new Response(
        JSON.stringify({
          error: "Missing APIFY_API_TOKEN secret. Set it in Supabase Dashboard -> Edge Functions -> Secrets.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(supabaseUrl, getSupabaseSecretKey());

    // 1) Fetch posts in parallel from Facebook and Twitter
    console.log("Fetching social posts from Facebook & Twitter via Apify...");
    const [fbPosts, twitterPosts] = await Promise.all([
      fetchFacebookFromApify(apifyToken),
      fetchTwitterFromApify(apifyToken),
    ]);

    const allRawPosts = [...fbPosts, ...twitterPosts];
    console.log(`Fetched ${fbPosts.length} Facebook posts and ${twitterPosts.length} Twitter posts (Total: ${allRawPosts.length}).`);

    if (allRawPosts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No posts fetched from social scrapers. Verify Apify token or target pages.",
          facebookFetched: fbPosts.length,
          twitterFetched: twitterPosts.length,
          newArticles: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2) Filter for finance keywords
    const financeRelevant = allRawPosts.filter((post) => matchesKeywords(post.text));
    console.log(`${financeRelevant.length} posts matched Kenyan financial keywords.`);

    if (financeRelevant.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No finance-relevant posts found in current batch",
          totalFetched: allRawPosts.length,
          newArticles: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3) Deduplication against existing URLs
    const postUrls = financeRelevant.map((p) => p.url).filter(Boolean);
    const { data: existingRows } = await supabase
      .from("news_articles")
      .select("url")
      .in("url", postUrls);

    const existingUrls = new Set((existingRows || []).map((r: { url: string }) => r.url));
    const newPosts = financeRelevant.filter((p) => !existingUrls.has(p.url));
    console.log(`${newPosts.length} new posts after database deduplication.`);

    if (newPosts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "All fetched posts have already been ingested",
          newArticles: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4) Limit batch size to prevent Edge Function timeout
    const MAX_BATCH = 6;
    const batch = newPosts.slice(0, MAX_BATCH);
    let newCount = 0;

    for (const post of batch) {
      console.log(`Processing [${post.platform}] from ${post.author}...`);
      const rewritten = await rewriteSocialPost(groqKey, geminiKey, post);

      // Build clean title
      const cleanText = post.text
        .replace(/https?:\/\/\S+/g, "")
        .replace(/[#@]\w+/g, "")
        .trim();
      const title = cleanText.length > 20
        ? cleanText.slice(0, 80).trim() + (cleanText.length > 80 ? "…" : "")
        : `${post.author} on ${post.platform}`;

      const sourcePublishedAt = post.createdAt && !Number.isNaN(new Date(post.createdAt).getTime())
        ? new Date(post.createdAt).toISOString()
        : null;

      const sourceLabel = `${post.platform} - ${post.author}`;
      const quality = evaluateNewsQuality({
        title,
        summary: rewritten.summary,
        content: rewritten.content,
        source: sourceLabel,
        url: post.url,
        sourcePublishedAt,
      });

      const combinedText = quality.summary + " " + (quality.content || "");
      const { error: insertErr } = await supabase.from("news_articles").insert({
        title: quality.title,
        summary: quality.summary,
        content: quality.content,
        url: post.url,
        source: sourceLabel,
        image_url: post.imageUrl || null,
        date_published: quality.datePublished,
        source_published_at: quality.sourcePublishedAt,
        category: quality.category,
        status: quality.status,
        quality_reasons: quality.reasons,
        quality_checked_at: new Date().toISOString(),
        classification_version: NEWS_CLASSIFICATION_VERSION,
        is_featured: false,
        read_time: estimateReadTime(combinedText),
      });

      if (insertErr) {
        console.error(`Failed to insert post ${post.url}:`, insertErr.message);
      } else {
        newCount++;
      }

      // Small pause between items
      await new Promise((r) => setTimeout(r, 1000));
    }

    console.log(`Successfully inserted ${newCount} social media articles.`);
    return new Response(
      JSON.stringify({
        success: true,
        newArticles: newCount,
        processed: batch.length,
        facebookFetched: fbPosts.length,
        twitterFetched: twitterPosts.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unexpected error in fetch-social-news:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
