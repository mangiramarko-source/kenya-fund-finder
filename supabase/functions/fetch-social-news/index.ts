import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
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

// ─── Curated Kenyan Finance Accounts (X / Twitter) ───────────────────────────
// These are the top accounts that regularly publish actionable financial content
// relevant to Kenyan investors. Add or remove as needed.
const TARGET_PROFILES = [
  "https://x.com/CBKKenya",       // Central Bank of Kenya – rates, policy, inflation
  "https://x.com/CMAKenya",       // Capital Markets Authority – regulations, IPOs
  "https://x.com/NSaboreshake",    // NSE – market data, listings
  "https://x.com/MwangoCapital",  // Mwango Capital – top financial research/analysis
  "https://x.com/HisaApp",        // Hisa – investing platform market updates
  "https://x.com/SafaricomPLC",   // Safaricom – major listed company, earnings
  "https://x.com/KikiMacharia",   // KCB Group – major bank, macro commentary
  "https://x.com/ABORESHAKE",     // Nairobi Securities Exchange official
];

// ─── Finance keyword filter ─────────────────────────────────────────────────
const KEYWORDS = [
  "unit trust", "money market", "cma", "nse", "shares", "dividend",
  "interest rates", "investment", "capital markets", "nairobi securities",
  "bond", "treasury bill", "equity fund", "fixed income", "mutual fund",
  "stock market", "central bank", "cbk", "inflation", "gdp",
  "ipo", "rights issue", "fund manager", "sacco", "pension",
  "kenya", "nairobi", "shilling", "kes", "east africa", "eac",
  "profit", "earnings", "results", "quarterly", "financials", "revenue",
  "forex", "currency", "yield", "return", "basis points",
];

function matchesKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return KEYWORDS.some((kw) => lower.includes(kw));
}

function estimateReadTime(text: string): string {
  const words = text.split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

// ─── AI rewriting ────────────────────────────────────────────────────────────
const AI_GATEWAY_URL = "https://api.groq.com/openai/v1/chat/completions";
const AI_MODEL = "llama-3.3-70b-versatile";

interface RewrittenPost {
  summary: string;
  content: string;
}

async function rewriteSocialPost(
  apiKey: string,
  author: string,
  sourceUrl: string,
  rawText: string,
  retries = 2,
): Promise<RewrittenPost | null> {
  const sourceText = rawText.slice(0, 3000);
  if (!sourceText || sourceText.length < 30) return null;

  const systemPrompt = `You are an expert Financial Analyst for "Kenya Fund Finder".
Your job is to read raw social media updates (e.g., from X/Twitter) and write a completely original, neutral, and professional financial news update based on it.
CRITICAL RULE: You MUST write entirely in your own words. Do not copy sentences from the source text. This ensures transformative Fair Use and avoids plagiarism.
Be factual, professional, analytical, and accurate. Keep all numbers, dates, and currencies truthful.
Do NOT include introductory labels like "Summary" or "Summary (10th-Grade Reader Level)".
Return ONLY a JSON object that matches the schema — no markdown, no commentary.`;

  const userPrompt = `Author/Account: ${author}
Original source URL: ${sourceUrl}

Source text:
"""
${sourceText}
"""

Rewrite this social media post into a professional analytical news update:
- "summary": a crisp, 2-3 sentence standalone summary (up to 600 characters). Do NOT include labels like "Summary" or "Summary (10th-Grade Reader Level)".
- "content": a detailed 2-4 paragraph professional news update (roughly 150-300 words) written entirely in your own words. Explain the context for the Kenyan market clearly and professionally. Avoid overly complex financial jargon, but maintain a professional Financial Analyst tone. Use plain paragraphs separated by a blank line. No headings, no lists, no hashtags, no markdown.`;

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15000);
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
              description: "Publish the rewritten social update",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string", description: "2-3 sentence standalone summary, max ~600 chars" },
                  content: { type: "string", description: "2-4 paragraph rewritten update, ~150-300 words" },
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
        console.warn(`AI rate limited (429) for "${author}", retrying in 3s... (${retries} retries left)`);
        await new Promise((r) => setTimeout(r, 3000));
        return rewriteSocialPost(apiKey, author, sourceUrl, rawText, retries - 1);
      }
      console.error(`AI rewrite failed [${res.status}] for "${author}"`);
      return null;
    }
    const data = await res.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = call?.function?.arguments;
    if (!argsStr) return null;
    const parsed = JSON.parse(argsStr) as Partial<RewrittenPost>;
    if (!parsed.summary || !parsed.content) return null;
    return { summary: parsed.summary.trim(), content: parsed.content.trim() };
  } catch (err) {
    console.error(`AI rewrite error for "${author}":`, err);
    return null;
  }
}

// ─── Apify Scraper ───────────────────────────────────────────────────────────
async function fetchFromApify(apifyToken: string): Promise<any[]> {
  console.log("Triggering Apify Twitter Scraper...");

  // Use a long timeout — Apify sync runs can take up to 60s.
  // Supabase Edge Functions allow up to 150s on paid plans.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const res = await fetch(
      "https://api.apify.com/v2/acts/apidojo~tweet-scraper/run-sync-get-dataset-items?token=" + apifyToken,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          startUrls: TARGET_PROFILES,
          maxItems: 12,
          sort: "Latest",
          customMapFunction: "(object) => { return {...object} }",
        }),
      },
    );
    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Apify error [${res.status}]:`, errText);
      return [];
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timeout);
    console.error("Apify fetch error:", err);
    return [];
  }
}

// ─── Main handler ────────────────────────────────────────────────────────────
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
    const aiKey = Deno.env.get("GROQ_API_KEY") || Deno.env.get("GEMINI_API_KEY");

    if (!apifyToken) {
      return new Response(JSON.stringify({ error: "Missing APIFY_API_TOKEN secret" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiKey) {
      return new Response(JSON.stringify({ error: "Missing GROQ_API_KEY secret" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      supabaseUrl,
      getSupabaseSecretKey(),
    );

    // 1) Fetch posts from Apify
    console.log("Fetching social posts from Apify...");
    const rawPosts = await fetchFromApify(apifyToken);
    console.log(`Fetched ${rawPosts.length} raw posts.`);

    if (!rawPosts || rawPosts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No posts fetched from Apify", newArticles: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2) Filter for finance keywords
    const financeRelevant = rawPosts.filter((post: any) => {
      const text = post.full_text || post.text || "";
      return text.length > 30 && matchesKeywords(text);
    });
    console.log(`${financeRelevant.length} posts matched finance keywords.`);

    if (financeRelevant.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No finance-relevant posts found", newArticles: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3) Batch-check which URLs already exist in DB
    const postUrls = financeRelevant
      .map((p: any) => p.url)
      .filter(Boolean);

    const { data: existingRows } = await supabase
      .from("news_articles")
      .select("url")
      .in("url", postUrls);

    const existingUrls = new Set(
      (existingRows || []).map((r: { url: string }) => r.url),
    );

    const newPosts = financeRelevant.filter((p: any) => p.url && !existingUrls.has(p.url));
    console.log(`${newPosts.length} new posts after dedup.`);

    if (newPosts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "All posts already ingested", newArticles: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4) Limit batch to prevent Edge Function timeout
    const MAX_BATCH = 5;
    const batch = newPosts.slice(0, MAX_BATCH);
    if (newPosts.length > MAX_BATCH) {
      console.log(`Limiting to ${MAX_BATCH} out of ${newPosts.length} new posts to prevent timeout.`);
    }

    let newCount = 0;

    for (const post of batch) {
      const text = post.full_text || post.text;
      const author = post.author?.name || post.user?.name || "Social Media";
      const sourceUrl = post.url;
      const createdAt = post.created_at;

      // Rewrite with AI
      console.log(`Rewriting post from ${author}...`);
      const rewritten = await rewriteSocialPost(aiKey, author, sourceUrl, text);
      if (!rewritten) {
        console.warn(`AI rewrite returned null for post from ${author}, skipping.`);
        continue;
      }

      // Build the title — use first ~80 chars of text as a more descriptive title
      const cleanText = text.replace(/https?:\/\/\S+/g, "").replace(/#\w+/g, "").trim();
      const title = cleanText.length > 20
        ? cleanText.slice(0, 80).trim() + (cleanText.length > 80 ? "…" : "")
        : `${author} on X`;

      const sourcePublishedAt = createdAt && !Number.isNaN(new Date(createdAt).getTime())
        ? new Date(createdAt).toISOString()
        : null;
      const quality = evaluateNewsQuality({
        title,
        summary: rewritten.summary,
        content: rewritten.content,
        source: `X - ${author}`,
        url: sourceUrl,
        sourcePublishedAt,
      });

      // Save to DB (matching the same schema as fetch-news)
      const combinedText = quality.summary + " " + (quality.content || "");
      const { error } = await supabase.from("news_articles").insert({
        title: quality.title,
        summary: quality.summary,
        content: quality.content,
        url: sourceUrl,
        source: `X - ${author}`,
        image_url: post.media?.[0]?.media_url_https || null,
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

      if (error) {
        console.error(`Failed to insert post ${sourceUrl}:`, error.message);
      } else {
        newCount++;
      }

      // Pause between AI calls to avoid rate limits
      await new Promise((r) => setTimeout(r, 2000));
    }

    console.log(`Done. Inserted ${newCount} social media articles.`);
    return new Response(
      JSON.stringify({ success: true, newArticles: newCount, processed: batch.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
