// Enrich a news article: scrape with Firecrawl + summarize with Lovable AI, then cache to DB
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/scrape";
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const articleId = typeof body?.articleId === "string" ? body.articleId : null;
    if (!articleId) {
      return new Response(JSON.stringify({ error: "articleId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    // 2) Summarize with Lovable AI
    const aiRes = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a financial news editor for Kenyan investors. Rewrite the provided article into a clear, neutral summary of 3-4 paragraphs (200-300 words total). Focus on facts: who, what, when, numbers, market impact. No headings, no bullet lists, no markdown. Plain paragraphs separated by a single blank line. Do not include disclaimers, source attributions, or 'read more' links. Do not invent facts.",
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
      console.error("Lovable AI error", aiRes.status, errText);
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

    if (!enriched || enriched.length < 100) {
      return new Response(JSON.stringify({ error: "Summarization returned empty result" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Cache to DB
    const { error: updateErr } = await supabase
      .from("news_articles")
      .update({ content: enriched })
      .eq("id", articleId);

    if (updateErr) console.error("DB update failed", updateErr);

    return new Response(JSON.stringify({ content: enriched, cached: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich-article error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
