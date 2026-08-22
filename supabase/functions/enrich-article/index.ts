// Enrich a news article: scrape with Firecrawl + summarize with Lovable AI, then cache to DB
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { authorizePrivilegedRequest } from "../_shared/privileged-auth.ts";
import { getSupabasePublishableKey, getSupabaseSecretKey } from "../_shared/supabase-keys.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/scrape";
const GEMINI_AI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authorization = await authorizePrivilegedRequest(req, {
    namedSecretKeysJson: Deno.env.get("SUPABASE_SECRET_KEYS"),
    secretName: "automations",
    verifyUser: async (accessToken) => {
      const userClient = createClient(supabaseUrl, getSupabasePublishableKey(), {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await userClient.auth.getUser(accessToken);
      return error ? null : data.user?.id ?? null;
    },
    isAdmin: async (userId) => {
      const adminClient = createClient(supabaseUrl, getSupabaseSecretKey(), {
        auth: { persistSession: false, autoRefreshToken: false },
      });
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

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const serviceKey = getSupabaseSecretKey();

    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const adminClient = createClient(supabaseUrl, serviceKey);
    
    const body = await req.json().catch(() => ({}));
    const articleId = typeof body?.articleId === "string" ? body.articleId : null;
    if (!articleId) {
      return new Response(JSON.stringify({ error: "articleId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = adminClient;

    // Fetch article
    const { data: article, error: fetchErr } = await supabase
      .from("news_articles")
      .select("id, title, summary, url, content")
      .eq("id", articleId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!article) {
      return new Response(JSON.stringify({ error: "Article not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already enriched (>200 chars) — return cached
    if (article.content && article.content.trim().length > 200) {
      return new Response(JSON.stringify({ content: article.content, cached: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!article.url || !/^https?:\/\//i.test(article.url)) {
      return new Response(JSON.stringify({ error: "Article has no source URL to enrich" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Scrape full article content
    const scrapeRes = await fetch(FIRECRAWL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: article.url,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });

    const scrapeData = await scrapeRes.json();
    if (!scrapeRes.ok) {
      console.error("Firecrawl error", scrapeRes.status, scrapeData);
      const status = scrapeRes.status === 402 ? 402 : 502;
      return new Response(
        JSON.stringify({ error: scrapeData?.error || "Failed to scrape article" }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const markdown: string =
      scrapeData?.data?.markdown || scrapeData?.markdown || "";
    if (!markdown || markdown.trim().length < 100) {
      return new Response(
        JSON.stringify({ error: "Source article content is unavailable (paywall or empty page)" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Trim to reasonable size before sending to LLM
    const trimmed = markdown.slice(0, 12000);

    // 2) Summarize with Gemini AI
    const systemPromptBase = article.url?.includes("tuko.co.ke")
      ? "You are a financial news editor for Kenyan investors. Rewrite the provided Tuko News article into an extensive, rich, and highly detailed 5-8 paragraph analysis (roughly 400-700 words) written entirely in your own words to ensure zero plagiarism. Extract every possible detail, nuance, and piece of extra information from the source text. Synthesize the key facts, deep context, numbers, and explicitly explain the broader implications for the Kenyan market and local investors."
      : "You are a financial news editor for Kenyan investors. Rewrite the provided article into a clear, neutral summary of 3-4 paragraphs (200-300 words total). Focus on facts: who, what, when, numbers, market impact.";

    const systemPrompt = `${systemPromptBase}
IMPORTANT: You MUST respond ONLY with a valid JSON object. Do not include markdown formatting or backticks.
The JSON object must follow this exact structure:
{
  "content": "Your generated paragraphs here. Plain paragraphs separated by a single blank line. No headings or bullet lists.",
  "event_label": "Tag story as Earnings, Dividend, Acquisition, Regulation, Leadership, Product launch, Macroeconomic, or similar (max 1)",
  "impact_horizon": "Immediate, Short term, or Long term",
  "what_happened": "A neutral, succinct 1-2 sentence summary of what actually occurred.",
  "verified_figures": ["Extract revenue, profit, dividend, deal value, dates, and percentages ONLY when those figures appear in the source. (e.g. 'Revenue: KSh 20M')", "Another figure..."],
  "factors_positive": ["What could help (factual bullish factor 1)", "What could help 2" (max 3)],
  "factors_negative": ["What to watch (factual bearish risk 1)", "What to watch 2" (max 3)],
  "source_facts": "A single succinct sentence summarizing the core factual event."
}`;

    const aiRes = await fetch(GEMINI_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Title: ${article.title}\n\nOriginal summary: ${article.summary}\n\nFull article:\n${trimmed}`,
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("Gemini AI error", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI rate limit reached, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ error: "AI summarization failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const enriched: string = aiData?.choices?.[0]?.message?.content?.trim() || "";

    if (!enriched || enriched.length < 50) {
      return new Response(JSON.stringify({ error: "Summarization returned empty result" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsedEnriched;
    try {
      parsedEnriched = JSON.parse(enriched);
    } catch (e) {
      console.error("Failed to parse AI JSON", enriched);
      return new Response(JSON.stringify({ error: "AI returned invalid JSON" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentHtml = parsedEnriched.content || "";

    // 3) Cache to DB
    const { error: updateErr } = await supabase
      .from("news_articles")
      .update({ content: contentHtml, ai_insight: enriched })
      .eq("id", articleId);

    if (updateErr) console.error("DB update failed", updateErr);

    return new Response(JSON.stringify({ content: contentHtml, ai_insight: enriched, cached: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich-article error", e);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
