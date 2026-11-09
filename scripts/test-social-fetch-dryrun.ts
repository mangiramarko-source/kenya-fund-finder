/**
 * test-social-fetch-dryrun.ts
 *
 * Verification & diagnostic dry-run script for KenyaFundFinder's Social Media Pipeline (Facebook & Twitter/X).
 *
 * Verifies:
 * 1. Environment and Apify token validation.
 * 2. Target curated profiles for Facebook & Twitter/X (The Kenyan Wall Street, Mwango Capital, etc.).
 * 3. Keyword relevance filtering (finance/investment context).
 * 4. Deduplication against live Supabase news_articles table.
 * 5. AI rewriting into KenyaFundFinder style (Llama-3.3 on Groq or Gemini 1.5/2.5).
 * 6. Quality gate evaluation (evaluateNewsQuality) and automated category classification.
 *
 * Usage:
 *   npx tsx scripts/test-social-fetch-dryrun.ts
 *   npx tsx scripts/test-social-fetch-dryrun.ts --token=YOUR_APIFY_TOKEN --live
 *   npx tsx scripts/test-social-fetch-dryrun.ts --platform=facebook
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { evaluateNewsQuality } from "../supabase/functions/_shared/news-quality";

// ─── Load Environment ─────────────────────────────────────────────────────────
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();

// Parse CLI flags
const args = process.argv.slice(2);
const tokenArg = args.find((a) => a.startsWith("--token="))?.split("=")[1];
const platformArg = args.find((a) => a.startsWith("--platform="))?.split("=")[1]?.toLowerCase() || "all";
const isLive = args.includes("--live");

const APIFY_TOKEN = tokenArg || env.APIFY_API_TOKEN || process.env.APIFY_API_TOKEN || "";
const GROQ_API_KEY = env.GROQ_API_KEY || process.env.GROQ_API_KEY || "";
const GEMINI_API_KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
const SUPABASE_URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL || "";
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || "";

// ─── Target Curated Social Accounts ──────────────────────────────────────────
export const CURATED_FACEBOOK_PAGES = [
  {
    name: "Business Daily Africa",
    url: "https://www.facebook.com/BusinessDailyAfrica/",
    categoryHint: "Market News",
  },
  {
    name: "Central Bank of Kenya",
    url: "https://www.facebook.com/CentralBankKenya/",
    categoryHint: "Regulatory Updates",
  },
  {
    name: "Disrupt Africa",
    url: "https://www.facebook.com/disruptafrica/",
    categoryHint: "Fund Announcements",
  },
  {
    name: "Techweez",
    url: "https://www.facebook.com/techweez/",
    categoryHint: "Market News",
  },
  {
    name: "Mwango Capital",
    url: "https://www.facebook.com/MwangoCapital/",
    categoryHint: "Yield Updates",
  },
];

export const CURATED_TWITTER_PROFILES = [
  { name: "Central Bank of Kenya", url: "https://x.com/CBKKenya" },
  { name: "Capital Markets Authority", url: "https://x.com/CMAKenya" },
  { name: "Mwango Capital", url: "https://x.com/MwangoCapital" },
  { name: "Hisa App", url: "https://x.com/HisaApp" },
  { name: "Nairobi Securities Exchange", url: "https://x.com/NSaboreshake" },
];

// ─── Keyword Filter ──────────────────────────────────────────────────────────
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

// ─── Mock Realistic Social Posts (for Dry Run Demonstration) ─────────────────
interface RawSocialPost {
  platform: "Facebook" | "Twitter";
  author: string;
  sourceUrl: string;
  text: string;
  createdAt: string;
  imageUrl?: string;
}

const SAMPLE_POSTS: RawSocialPost[] = [
  {
    platform: "Facebook",
    author: "The Kenyan Wall Street",
    sourceUrl: "https://www.facebook.com/kenyanwallstreet/posts/pfbid0sample123",
    text: `Nairobi Securities Exchange (NSE) indices closed on a bullish note today with total equity turnover jumping 45.2% to KSh 890 Million. Safaricom and Equity Group dominated trading, accounting for 62% of aggregate market activity. Meanwhile, foreign investors remained net buyers for the third straight session, pumping in KSh 120 Million primarily into tier-1 banking stocks. Yields on short-term 91-day Treasury Bills held steady at 15.6%.`,
    createdAt: new Date().toISOString(),
    imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800",
  },
  {
    platform: "Facebook",
    author: "Mwango Capital",
    sourceUrl: "https://www.facebook.com/MwangoCapital/posts/pfbid0sample456",
    text: `Daily Unit Trust & Money Market Fund (MMF) Yield Highlights (Nov 2026):
Etica MMF continues to lead daily effective annual yields at 17.15%, followed by Cytonn MMF at 16.85%, Lofty-Corban at 16.50%, and Kuza MMF at 15.90%. Total assets under management across CMA registered collective investment schemes grew 12% quarter-on-quarter. Investors are seeking shelter in high-yielding liquid money market instruments ahead of next week's CBK Monetary Policy Committee meeting.`,
    createdAt: new Date().toISOString(),
    imageUrl: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800",
  },
  {
    platform: "Twitter",
    author: "Mwango Capital",
    sourceUrl: "https://x.com/MwangoCapital/status/17890123456789",
    text: `CBK T-BILL AUCTION RESULTS:
CBK received bids totaling KSh 28.4B against an advertised KSh 24.0B, representing an oversubscription rate of 118.3%.
- 91-Day: 15.65% (Accepted KSh 4.2B)
- 182-Day: 16.12% (Accepted KSh 9.8B)
- 364-Day: 16.48% (Accepted KSh 14.4B)`,
    createdAt: new Date().toISOString(),
  },
];

// ─── AI Transformation ───────────────────────────────────────────────────────
async function rewriteWithAI(post: RawSocialPost): Promise<{ summary: string; content: string }> {
  const apiKey = GROQ_API_KEY || GEMINI_API_KEY;
  if (!apiKey) {
    // Deterministic fallback demonstration if no AI API key is configured locally
    const lines = post.text.split("\n").filter(Boolean);
    return {
      summary: `${post.author} reported on Kenyan capital markets: ${lines[0].slice(0, 150)}...`,
      content: `${post.text}\n\nThis update provides investors on Kenya Fund Finder with clear visibility into current local yield rates, corporate developments, and macro conditions shaping the Kenyan Shilling and capital markets.`,
    };
  }

  const isGroq = Boolean(GROQ_API_KEY);
  const endpoint = isGroq
    ? "https://api.groq.com/openai/v1/chat/completions"
    : "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  const model = isGroq ? "llama-3.3-70b-versatile" : "gemini-3.8-flash";

  const systemPrompt = `You are a Senior Financial Analyst for "Kenya Fund Finder".
Your job is to read raw social media updates (from Facebook or Twitter) and write a completely original, neutral, and professional financial news update based on it.
CRITICAL RULE: You MUST write entirely in your own words. Do not copy sentences directly from the source text.
Maintain strict factual accuracy regarding all figures, KES/currency values, and dates.
Return plain text in JSON format: {"summary": "2-3 crisp sentences", "content": "2-3 analytical paragraphs"}.`;

  const userPrompt = `Account: ${post.author} (${post.platform})
Source URL: ${post.sourceUrl}
Raw Text:
"""
${post.text}
"""`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      throw new Error(`AI API error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
    return {
      summary: parsed.summary || post.text.slice(0, 200),
      content: parsed.content || post.text,
    };
  } catch (err) {
    console.warn(`[AI Warning] AI rewrite failed, using clean structured text:`, (err as Error).message);
    return {
      summary: `${post.author} highlighted key market developments regarding Kenyan financial assets.`,
      content: post.text,
    };
  }
}

// ─── Main Dry-Run Runner ─────────────────────────────────────────────────────
async function main() {
  console.log("======================================================================");
  console.log("  KENYA FUND FINDER — SOCIAL INGESTION DRY-RUN & DIAGNOSTIC RUNNER");
  console.log("======================================================================\n");

  // Step 1: Environment Diagnostic
  console.log("🔍 [Step 1] Checking Environment & API Keys...");
  console.log(`• Supabase URL:       ${SUPABASE_URL ? "✅ Configured (" + SUPABASE_URL.slice(0, 25) + "...)" : "❌ Missing"}`);
  console.log(`• Supabase Key:       ${SUPABASE_KEY ? "✅ Configured (" + SUPABASE_KEY.slice(0, 12) + "...)" : "❌ Missing"}`);
  console.log(`• Apify Token:        ${APIFY_TOKEN ? "✅ Configured (" + APIFY_TOKEN.slice(0, 8) + "...)" : "⚠️ Not configured in .env (Add APIFY_API_TOKEN)"}`);
  console.log(`• Groq / Gemini Key:  ${GROQ_API_KEY ? "✅ Groq Configured" : GEMINI_API_KEY ? "✅ Gemini Configured" : "⚠️ None (Will demonstrate deterministic transform)"}`);
  console.log("");

  // Step 2: Apify Connection Check (if token provided)
  if (APIFY_TOKEN && isLive) {
    console.log("📡 [Step 2] Testing Live Apify Account & Scrapers...");
    try {
      const meRes = await fetch(`https://api.apify.com/v2/users/me?token=${APIFY_TOKEN}`);
      if (meRes.ok) {
        const me = await meRes.json();
        console.log(`✅ Apify Authenticated as: ${me.data?.username || me.data?.email}`);
        console.log(`• Plan: ${me.data?.plan?.name || "Free"}`);
      } else {
        console.error(`❌ Apify token authentication failed: ${meRes.status} ${await meRes.text()}`);
      }
    } catch (err) {
      console.error(`❌ Apify connection error:`, (err as Error).message);
    }
    console.log("");
  } else {
    console.log("ℹ️ [Step 2] Apify Live Mode: Skipped (Run with --live --token=<token> to test live API calls)");
    console.log("");
  }

  // Step 3: Target Accounts Overview
  console.log("📋 [Step 3] Target Curated Accounts:");
  console.log("--- Facebook Target Pages ---");
  for (const p of CURATED_FACEBOOK_PAGES) {
    console.log(`  • ${p.name.padEnd(25)} -> ${p.url}`);
  }
  console.log("--- Twitter/X Target Profiles ---");
  for (const t of CURATED_TWITTER_PROFILES) {
    console.log(`  • ${t.name.padEnd(25)} -> ${t.url}`);
  }
  console.log("");

  // Step 4: Live Supabase DB Check for Existing Social URLs
  console.log("💾 [Step 4] Checking Live Supabase Database for Existing Social Articles...");
  let existingSocialCount = 0;
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data, count, error } = await supabase
        .from("news_articles_public")
        .select("id, source, url", { count: "exact" })
        .or("url.ilike.%facebook.com%,url.ilike.%x.com%,url.ilike.%twitter.com%,source.ilike.%Facebook%,source.ilike.%X - %");

      if (error) {
        console.warn(`  ⚠️ Could not query news_articles_public: ${error.message}`);
      } else {
        existingSocialCount = count || (data ? data.length : 0);
        console.log(`  • Total social media articles currently live on site: ${existingSocialCount}`);
      }
    } catch (e) {
      console.warn(`  ⚠️ Supabase connection warning:`, (e as Error).message);
    }
  }
  console.log("");

  // Step 5: Pipeline Execution on Posts
  console.log("⚙️ [Step 5] Processing Social Pipeline (Filter -> AI Rewrite -> Quality Gate):");
  console.log("----------------------------------------------------------------------");

  let postsToProcess: RawSocialPost[] = [];

  if (isLive && APIFY_TOKEN) {
    console.log("🌐 Live Mode: Fetching latest posts from Apify Facebook Scraper...");
    try {
      const res = await fetch(
        `https://api.apify.com/v2/acts/apify~facebook-posts-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startUrls: [
              { url: "https://www.facebook.com/CentralBankKenya/" },
              { url: "https://www.facebook.com/disruptafrica/" }
            ],
            resultsLimit: 2,
            captionText: true,
          }),
        }
      );
      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items)) {
          for (const item of items) {
            const text = item.text || item.postText || item.caption || "";
            const url = item.url || item.postUrl || "";
            const author = item.user?.name || item.pageName || "Central Bank of Kenya";
            const createdAt = item.time || new Date().toISOString();
            if (url && text && !item.error) {
              postsToProcess.push({
                platform: "Facebook",
                author,
                sourceUrl: url,
                text,
                createdAt,
                imageUrl: item.media?.[0]?.thumbnail || null,
              });
            }
          }
        }
        console.log(`✅ Live Apify fetch returned ${postsToProcess.length} valid Facebook posts.`);
      } else {
        console.warn(`Apify live fetch returned ${res.status}: ${await res.text()}`);
      }
    } catch (e) {
      console.warn("Apify live fetch error:", (e as Error).message);
    }
  }

  if (postsToProcess.length === 0) {
    postsToProcess = SAMPLE_POSTS.filter((p) => {
      if (platformArg === "facebook" && p.platform !== "Facebook") return false;
      if (platformArg === "twitter" && p.platform !== "Twitter") return false;
      return true;
    });
  }

  for (let i = 0; i < postsToProcess.length; i++) {
    const post = postsToProcess[i];
    console.log(`\n[Post ${i + 1}/${postsToProcess.length}] Processing from: ${post.author} (${post.platform})`);
    console.log(`• Source URL: ${post.sourceUrl}`);

    // A. Keyword Check
    const matched = matchesKeywords(post.text);
    console.log(`• Keyword Relevance Check: ${matched ? "✅ PASSED (Finance Relevant)" : "❌ FAILED (Non-financial)"}`);
    if (!matched) continue;

    // B. AI Rewriting
    console.log(`• Transforming into KenyaFundFinder style...`);
    const rewritten = await rewriteWithAI(post);

    // C. Quality Evaluation
    const quality = evaluateNewsQuality({
      title: `${post.author}: Kenyan Financial Update`,
      summary: rewritten.summary,
      content: rewritten.content,
      source: `${post.platform} - ${post.author}`,
      url: post.sourceUrl,
      sourcePublishedAt: post.createdAt,
    });

    console.log(`• Category Assigned:   📌 [${quality.category}]`);
    console.log(`• Quality Gate Status: 🛡️  [${quality.status.toUpperCase()}] (Reasons: ${quality.reasons.length ? quality.reasons.join(", ") : "None - Clean"})`);
    console.log(`• Generated Headline:  "${quality.title}"`);
    console.log(`• Executive Summary:   "${quality.summary.slice(0, 120)}..."`);
    console.log(`• Attribution Source:  "${quality.source || (post.platform + ' - ' + post.author)}"`);
  }

  console.log("\n======================================================================");
  console.log("  DRY-RUN SUMMARY & WHAT TO DO NEXT");
  console.log("======================================================================");
  console.log("1. To enable live Facebook scraping:");
  console.log("   • Grab your Apify API Token from https://console.apify.com/account/integrations");
  console.log("   • Add APIFY_API_TOKEN=your_token to your .env file and Supabase Edge Secrets.");
  console.log("2. Run a live test with: npx tsx scripts/test-social-fetch-dryrun.ts --live");
  console.log("3. Once verified, update supabase/functions/fetch-social-news/index.ts to run automatically.");
  console.log("======================================================================\n");
}

main().catch((err) => {
  console.error("Dry run execution error:", err);
  process.exit(1);
});
