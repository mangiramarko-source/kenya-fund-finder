import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_AI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Admin / Webhook gate ────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearerToken = authHeader.replace(/^Bearer\s+/i, "");
    const webhookSecret = req.headers.get("x-webhook-secret");
    
    // Check if it's the Service Role key (for Webhooks or internal cron)
    const isServiceRole = bearerToken === SUPABASE_SERVICE_ROLE_KEY;
    const isInternalWebhook = webhookSecret === "internal-webhook-trigger";
    
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
          { role: "system", content: systemPrompt },
          { role: "user", content: articleText },
        ],
      }),
    });

    if (!aiRes.ok) {
      console.error("Gemini AI error", aiRes.status, await aiRes.text());
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const rawResult = aiData?.choices?.[0]?.message?.content?.trim() || "{}";
    
    let parsedResult;
    try {
      parsedResult = JSON.parse(rawResult);
    } catch (e) {
      console.error("Failed to parse JSON from AI", rawResult);
      return new Response(JSON.stringify({ error: "Invalid AI response format" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4) Update database with results
    const { error: updateErr } = await supabase
      .from("news_articles")
      .update({
        related_stock_id: parsedResult.related_stock_id || null,
        ai_insight: parsedResult.ai_insight || null
      })
      .eq("id", articleId);

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ success: true, data: parsedResult }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich-stock-data error", e);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
