import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { geminiGenerateText, parseModelJson } from "../_shared/gemini.ts";
import { matchStockDeterministically } from "../_shared/stock-match.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ENRICHMENT_WEBHOOK_SECRET = Deno.env.get("ENRICHMENT_WEBHOOK_SECRET") || "";

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Admin / Webhook gate ────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearerToken = authHeader.replace(/^Bearer\s+/i, "");
    const webhookSecret = req.headers.get("x-webhook-secret");

    // Check if it's the Service Role key (for Webhooks or internal cron)
    const isServiceRole = bearerToken === SUPABASE_SERVICE_ROLE_KEY;
    const isInternalWebhook = Boolean(
      ENRICHMENT_WEBHOOK_SECRET && webhookSecret === ENRICHMENT_WEBHOOK_SECRET
    );
    
    if (!isServiceRole && !isInternalWebhook) {
      if (!bearerToken) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const { data: roleRow } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
        
      if (!roleRow) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    
    // Handle direct `{ articleId: "..." }`, `{ article_id: "..." }`, or Supabase Webhook payload `{ type: "INSERT", record: { id: "..." } }`
    const articleId = typeof body?.articleId === "string" 
      ? body.articleId 
      : typeof body?.article_id === "string"
      ? body.article_id
      : (body?.record?.id ? body.record.id : null);
      
    if (!articleId) {
      return new Response(JSON.stringify({ error: "articleId or Webhook record.id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = adminClient;

    // 1) Fetch the article
    const { data: article, error: fetchErr } = await supabase
      .from("news_articles")
      .select("id, title, summary, content, related_stock_id, ai_insight")
      .eq("id", articleId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!article) {
      return new Response(JSON.stringify({ error: "Article not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Fetch available stocks to map against
    const { data: stocks, error: stocksErr } = await supabase
      .from("stocks")
      .select("id, symbol, name");
      
    if (stocksErr) throw stocksErr;

    const deterministicStock = matchStockDeterministically(
      `${article.title}\n${article.summary || ""}\n${article.content || ""}`,
      stocks || [],
    );

    // Build context for the AI
    const stockListText = stocks?.map(s => `ID: ${s.id} | Symbol: ${s.symbol} | Name: ${s.name}`).join("\n");
    const articleText = `Title: ${article.title}\nSummary: ${article.summary}\nContent: ${article.content?.substring(0, 5000) || ""}`;

    // 3) Call Gemini AI for tagging & insight generation
    const systemPrompt = `You are an expert financial AI for the Kenyan market (Nairobi Securities Exchange).
Your job is to read a news article and return a JSON object with exactly two keys:
1. "related_stock_id": The exact ID of the company this article is PRIMARILY about, from the provided list. If it does not match any company in the list, return null.
2. "ai_insight": A single, high-impact, 1-sentence financial insight or takeaway from the article (e.g., "Earnings grew by 15% YoY driven by M-Pesa growth."). If no strong insight exists, return null.

Available Stocks:
${stockListText}

IMPORTANT: You MUST respond ONLY with valid JSON. No markdown formatting, no code blocks, no other text.`;

    let generated: Awaited<ReturnType<typeof geminiGenerateText>> | null = null;
    let aiError: unknown = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        generated = await geminiGenerateText({
          system: systemPrompt,
          user: articleText,
          model: "gemini-2.5-flash",
        });
        break;
      } catch (error) {
        aiError = error;
        const isRateLimited = String(error).includes("Gemini text 429");
        if (!isRateLimited || attempt === 3) break;
        await new Promise((resolve) => setTimeout(resolve, [5_000, 15_000, 30_000][attempt]));
      }
    }

    const parsedResult = generated ? parseModelJson<{
      related_stock_id?: unknown;
      ai_insight?: unknown;
    }>(generated.text) : null;

    if (generated && !parsedResult) {
      console.error("Failed to parse JSON from AI", generated.text.slice(0, 500));
    } else if (aiError) {
      console.warn("AI insight unavailable; using deterministic stock match", String(aiError).slice(0, 500));
    }

    // 4) Update database with results
    const validStockIds = new Set((stocks || []).map((stock) => stock.id));
    const aiRelatedStockId = typeof parsedResult?.related_stock_id === "string"
      && validStockIds.has(parsedResult.related_stock_id)
      ? parsedResult.related_stock_id
      : null;
    const relatedStockId = deterministicStock?.id || aiRelatedStockId;
    const aiInsight = typeof parsedResult?.ai_insight === "string"
      ? parsedResult.ai_insight.trim().slice(0, 1000) || null
      : null;

    const { error: updateErr } = await supabase
      .from("news_articles")
      .update({
        related_stock_id: relatedStockId,
        ai_insight: aiInsight
      })
      .eq("id", articleId);

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({
      success: true,
      data: {
        related_stock_id: relatedStockId,
        ai_insight: aiInsight,
        match_source: deterministicStock ? "deterministic" : aiRelatedStockId ? "ai" : null,
        insight_status: aiInsight ? "generated" : "summary_fallback",
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich-stock-data error", e);
    const message = e instanceof Error ? e.message : String(e);
    const geminiStatus = message.match(/Gemini text (\d{3})/)?.[1];
    return new Response(
      JSON.stringify({
        error: geminiStatus ? "AI processing failed" : "Internal error",
        code: geminiStatus ? `gemini_${geminiStatus}` : "internal_error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
