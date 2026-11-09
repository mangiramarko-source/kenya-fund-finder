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
import { geminiGenerateText } from "../_shared/gemini.ts";
import { parseModelJson } from "../_shared/gemini-parse.ts";

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

// ─── AI Rewriting (Option A: Transformative Fair Dealing Multi-Provider) ─────
async function rewriteSocialPost(
  groqKey: string | null,
  geminiKey: string | null,
  post: NormalizedSocialPost,
  retries = 1,
): Promise<RewrittenPost> {
  const rawText = post.text.slice(0, 3000).trim();
  const author = post.author;

  if (rawText.length < 25) {
    return generateDeterministicFallback(post);
  }

  const systemPrompt = `You are a Senior Financial Analyst & Institutional News Editor for "Kenya Fund Finder" (kenyafundfinder.com).
Your objective is to review public news teasers, social announcements, and article metadata, and produce a high-value, original institutional briefing for Kenyan investors, business owners, and savers.

LEGAL & FAIR DEALING RULES:
1. Transformative synthesis: Extract the key public facts (percentages, KES/USD amounts, dates, policy shifts, corporate deals) and write entirely in your own professional words. Never duplicate full sentences from the source.
2. Contextualization: Explain the practical significance for Kenyan capital markets, borrowing costs, currency stability, or the sector involved.
3. Factual integrity: Keep all figures truthful to the source; do not invent or extrapolate numbers that were not present.

OUTPUT FORMAT:
Return strictly a valid JSON object:
{
  "summary": "A crisp, 2-3 sentence executive briefing (max 400 characters).",
  "content": "A well-structured 2-3 paragraph institutional analysis (roughly 160-260 words total). Separate paragraphs with a blank line."
}`;

  const userPrompt = `Source: ${author} (${post.platform})
Source Link: ${post.url}

Public Briefing & Metadata:
"""
${rawText}
"""

Synthesize this briefing into an original, institutional financial update for Kenyan investors. Output strictly JSON.`;

  // 1) Try Groq (ultra-fast GPT-OSS 120B / 20B on Groq LPU)
  if (groqKey) {
    for (const model of ["openai/gpt-oss-120b", "openai/gpt-oss-20b"]) {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 16000);
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
          }),
        });
        clearTimeout(t);

        if (res.ok) {
          const data = await res.json();
          const contentStr = data?.choices?.[0]?.message?.content;
          if (contentStr) {
            const parsed = parseModelJson<Partial<RewrittenPost>>(contentStr);
            if (parsed?.summary && parsed?.content) {
              return {
                summary: parsed.summary.trim(),
                content: parsed.content.trim(),
              };
            }
          }
        } else {
          console.warn(`Groq (${model}) returned [${res.status}], trying next provider...`);
        }
      } catch (err) {
        console.warn(`Groq (${model}) exception:`, (err as Error).message);
      }
    }
  }

  // 2) Seamless Fallback to Gemini (gemini-3.8-flash direct REST)
  if (geminiKey) {
    for (const model of ["gemini-3.8-flash", "gemini-flash-latest"]) {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 18000);
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: "user", parts: [{ text: userPrompt }] }],
              generationConfig: { responseMimeType: "application/json" },
            }),
          },
        );
        clearTimeout(t);

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = parseModelJson<Partial<RewrittenPost>>(text);
            if (parsed?.summary && parsed?.content) {
              return {
                summary: parsed.summary.trim(),
                content: parsed.content.trim(),
              };
            }
          }
        }
      } catch (err) {
        console.warn(`Gemini (${model}) exception:`, (err as Error).message);
      }
    }
  }

  // 3) Deterministic fallback if both AI providers are unavailable
  return generateDeterministicFallback(post);
}

function generateDeterministicFallback(post: NormalizedSocialPost): RewrittenPost {
  const clean = post.text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[#@]\w+/g, "")
    .trim();
  const paragraphs = clean.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const firstSentence = paragraphs[0]?.split(/[.?!]/)[0] || clean.slice(0, 160);
  const summary = `${post.author} reported: ${firstSentence.trim()}.`;
  const body = paragraphs.length > 1
    ? paragraphs.join("\n\n")
    : `${clean}\n\nFurther updates and context on this development will be tracked by Kenya Fund Finder for Kenyan investor portfolios.`;

  return {
    summary,
    content: body,
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
      const rawCaption = (item.text || item.postText || item.caption || item.message || "").trim();
      const previewTitle = (item.previewTitle || "").trim();
      const previewDesc = (item.previewDescription || item.previewSubtitle || "").trim();
      const externalLink = item.link || item.previewTarget?.external_url || null;
      const facebookPostUrl = item.url || item.postUrl || item.canonicalUrl || item.facebookUrl || "";
      const url = externalLink || facebookPostUrl;

      // Option A: Combine public post caption + OpenGraph preview metadata into a rich composite briefing
      const textParts: string[] = [];
      if (rawCaption) textParts.push(rawCaption);
      if (previewTitle && previewTitle.toLowerCase() !== rawCaption.toLowerCase()) {
        textParts.push(previewTitle);
      }
      if (
        previewDesc &&
        previewDesc.toLowerCase() !== rawCaption.toLowerCase() &&
        previewDesc.toLowerCase() !== previewTitle.toLowerCase()
      ) {
        textParts.push(previewDesc);
      }
      const compositeText = textParts.join("\n\n").trim();

      const author = item.user?.name || item.pageName || item.ownerName || "Business Daily Africa";
      const createdAt = item.time || item.timestamp || item.date || item.createdAt;
      const imageUrl = item.media?.[0]?.thumbnail || item.imageUrl || item.attachedImage || null;

      if (url && compositeText && compositeText.length > 25) {
        posts.push({
          platform: "Facebook",
          author,
          url,
          text: compositeText,
          createdAt,
          imageUrl,
          rawItem: item,
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

      // Clean author & publisher name (e.g. "BUSINESS DAILY AFRICA" -> "Business Daily Africa", strip "(Official)")
      let cleanAuthor = post.author
        .replace(/\s*\(Official\)/i, "")
        .replace(/^(?:Facebook|X)\s*-\s*/i, "")
        .trim();
      if (cleanAuthor === "BUSINESS DAILY AFRICA") {
        cleanAuthor = "Business Daily Africa";
      }

      // Build clean title — prefer link headline if available, otherwise first sentence/line
      const previewTitle = (post.rawItem?.previewTitle || "").trim();
      const cleanText = post.text
        .replace(/https?:\/\/\S+/g, "")
        .replace(/[#@]\w+/g, "")
        .trim();
      const firstLine = cleanText.split("\n")[0] || cleanText;

      let title = previewTitle && previewTitle.length > 15
        ? previewTitle
        : firstLine.length > 20
          ? firstLine.slice(0, 85).trim() + (firstLine.length > 85 ? "…" : "")
          : cleanAuthor;

      title = title
        .replace(/\s*(?:on|via)\s+facebook\b/gi, "")
        .replace(/\[facebook\]/gi, "")
        .trim();

      const sourcePublishedAt = post.createdAt && !Number.isNaN(new Date(post.createdAt).getTime())
        ? new Date(post.createdAt).toISOString()
        : null;

      // Source is the clean publisher name; source link is available via post.url
      const sourceLabel = cleanAuthor;
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
