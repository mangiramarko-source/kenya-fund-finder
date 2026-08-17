import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { geminiGenerateText, parseModelJson } from "../_shared/gemini.ts";
import { matchStockWithEvidence } from "../_shared/stock-match.ts";

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

    const deterministicMatch = matchStockWithEvidence(
      {
        title: article.title,
        body: `${article.summary || ""}\n${article.content || ""}`,
      },
      stocks || [],
    );

    if (!deterministicMatch) {
      const { error: clearError } = await supabase
        .from("news_articles")
        .update({
          related_stock_id: null,
          ai_insight: null,
          stock_match_evidence: null,
        })
        .eq("id", articleId);
      if (clearError) throw clearError;
      return new Response(JSON.stringify({
        success: true,
        data: {
          related_stock_id: null,
          ai_insight: null,
          match_source: null,
          insight_status: "no_verified_stock_match",
        },
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build context for the AI
    const stockListText = stocks?.map(s => `ID: ${s.id} | Symbol: ${s.symbol} | Name: ${s.name}`).join("\n");
    const articleText = `Title: ${article.title}\nSummary: ${article.summary}\nContent: ${article.content?.substring(0, 5000) || ""}`;

    // 3) Call Gemini AI for source-grounded market interpretation
    const systemPrompt = `You are an expert financial AI for the Kenyan market (Nairobi Securities Exchange).
Your job is to read a news article that has already been deterministically linked to a listed company and explain how the story may matter to investors.

Grounding rules:
- Use only facts present in the supplied article text and the provided stock identity.
- Never invent revenue, profit, dividend, market share, customer numbers, trading volumes, dates, or price returns.
- If a fact is not in the article text, omit it.
- Do not give buy/sell/hold instructions. Use educational decision-support language.
- Clearly separate what happened, why it may matter, what could help, and what to watch.
- Write like a concise analyst note: useful, plain-English, and contextual, but not promotional.
- Build a mini story arc when the source text supports it: the immediate story, the business or market engine it touches, and the key uncertainty. Use short section headings, not hype.
- Split every answer into source-confirmed facts, cautious implications, and things the article does not confirm.
- Add decision_drivers for the business or market levers the article touches, such as Revenue, Costs, Regulation, Customer demand, Interest rates, Currency, Liquidity, Commodity prices, Dividends, or Strategy. Only include a driver when supported by the article text.
- Give a simple impact_score from 0 to 5 based on source evidence: 0 no market relevance, 1 weak sector relevance, 2 direct company/market mention with limited evidence, 3 direct relevance with some facts, 4 direct relevance with numbers or official context, 5 major confirmed event with clear financial implication.
- Add watch_next items that tell investors what to monitor next. Keep them specific but do not invent dates or future events.
- For every clearly related market, add one related_market_implications item explaining the connection in one grounded sentence.
- If the story clearly mentions interest rates, Treasury bills, CBK policy, liquidity, inflation, exchange rates, oil, fuel, gold, agriculture, or other listed companies, explain that broader market lens only from the supplied text.
- If the supplied text does not clearly support a market connection, say the connection is not proven instead of guessing.
- If the source text is too thin for analysis, return null for "content" and fill only "what_happened" with the safest factual sentence.

Return a JSON object with these exact keys:
{
  "content": "A concise 2-4 paragraph analyst-style explanation in plain text. No headings, no markdown. Null if source text is too thin.",
  "event_label": "One short label such as Earnings, Dividend, Product pricing, Regulation, Acquisition, Leadership, Expansion, or Market update",
  "impact_horizon": "Immediate relevance, Short-term relevance, Medium-term relevance, or Long-term relevance",
  "what_happened": "One neutral sentence describing the verified event.",
  "why_it_matters": "One or two sentences explaining the possible investment relevance without claiming causation.",
  "investor_takeaway": "One cautious sentence about what an investor should monitor next.",
  "market_lens": "One concise sentence connecting the story to Stocks, MMFs, FX, or Commodities only when the supplied text supports that connection.",
  "narrative_sections": [{"heading": "Short heading such as The story, The market link, The key uncertainty, What to watch", "body": "A concise source-grounded paragraph. No advice, no invented facts."}],
  "analyst_summary": "One concise analyst-note paragraph summarizing the story using only supplied facts.",
  "investment_context": "One concise paragraph explaining how this could fit into a stock, MMF, FX, or commodities decision, without advice.",
  "key_uncertainty": "One sentence naming the biggest thing the article does not prove.",
  "decision_drivers": [{"driver": "Revenue, Costs, Regulation, Customer demand, Interest rates, Currency, Liquidity, Commodity prices, Dividends, or Strategy", "direction": "positive, negative, mixed, or neutral", "explanation": "One source-grounded sentence explaining why this driver matters"}],
  "confirmed_facts": ["Facts directly confirmed by the supplied article text"],
  "inferred_implications": ["Cautious investor implications based only on confirmed facts"],
  "not_confirmed": ["Important impacts not proven by the supplied article, such as earnings impact or price causation"],
  "impact_score": 0,
  "impact_reason": "One sentence explaining the score using source evidence.",
  "watch_next": ["Specific source-grounded things an investor should monitor next"],
  "verified_figures": ["Only figures that appear in the supplied article text"],
  "factors_positive": ["What could help, factual and source-grounded", "Max 3"],
  "factors_negative": ["What to watch, factual and source-grounded", "Max 3"],
  "source_facts": "One concise sentence summarizing the core source-backed fact.",
  "related_markets": ["Stocks, MMFs, FX, or Commodities only when clearly supported by supplied article text"],
  "related_market_implications": [{"market": "Stocks, MMFs, FX, or Commodities", "implication": "One source-grounded sentence explaining the connection"}],
  "source_quality": "Source-linked",
  "confidence_label": "Source-grounded"
}

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

    const parsedResult = generated ? parseModelJson<Record<string, unknown>>(generated.text) : null;

    if (generated && !parsedResult) {
      console.error("Failed to parse JSON from AI", generated.text.slice(0, 500));
    } else if (aiError) {
      console.warn("AI insight unavailable; using deterministic stock match", String(aiError).slice(0, 500));
    }

    // 4) Update database with results
    const relatedStockId = deterministicMatch.stock.id;
    const normalizeString = (value: unknown, max = 1800) =>
      typeof value === "string" ? value.trim().slice(0, max) || null : null;
    const normalizeList = (value: unknown) =>
      Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim().slice(0, 240)).slice(0, 5)
        : [];
    const normalizeMarketImplications = (value: unknown) =>
      Array.isArray(value)
        ? value
            .map((item) => {
              if (!item || typeof item !== "object") return null;
              const market = normalizeString((item as Record<string, unknown>).market, 40);
              const implication = normalizeString((item as Record<string, unknown>).implication, 300);
              return market && implication ? { market, implication } : null;
            })
            .filter((item): item is { market: string; implication: string } => Boolean(item))
            .slice(0, 4)
        : [];
    const normalizeNarrativeSections = (value: unknown) =>
      Array.isArray(value)
        ? value
            .map((item) => {
              if (!item || typeof item !== "object") return null;
              const record = item as Record<string, unknown>;
              const heading = normalizeString(record.heading, 80);
              const body = normalizeString(record.body, 700);
              return heading && body ? { heading, body } : null;
            })
            .filter((item): item is { heading: string; body: string } => Boolean(item))
            .slice(0, 4)
        : [];
    const normalizeDecisionDrivers = (value: unknown) =>
      Array.isArray(value)
        ? value
            .map((item) => {
              if (!item || typeof item !== "object") return null;
              const record = item as Record<string, unknown>;
              const driver = normalizeString(record.driver, 60);
              const explanation = normalizeString(record.explanation, 300);
              const rawDirection = normalizeString(record.direction, 20)?.toLowerCase();
              const direction = ["positive", "negative", "mixed", "neutral"].includes(rawDirection || "")
                ? rawDirection
                : "neutral";
              return driver && explanation ? { driver, direction, explanation } : null;
            })
            .filter((item): item is { driver: string; direction: string; explanation: string } => Boolean(item))
            .slice(0, 4)
        : [];
    const structuredInsight = parsedResult ? {
      content: normalizeString(parsedResult.content, 3000),
      event_label: normalizeString(parsedResult.event_label, 80),
      impact_horizon: normalizeString(parsedResult.impact_horizon, 80),
      what_happened: normalizeString(parsedResult.what_happened, 500),
      why_it_matters: normalizeString(parsedResult.why_it_matters, 800),
      investor_takeaway: normalizeString(parsedResult.investor_takeaway, 500),
      market_lens: normalizeString(parsedResult.market_lens, 500),
      narrative_sections: normalizeNarrativeSections(parsedResult.narrative_sections),
      analyst_summary: normalizeString(parsedResult.analyst_summary, 900),
      investment_context: normalizeString(parsedResult.investment_context, 900),
      key_uncertainty: normalizeString(parsedResult.key_uncertainty, 500),
      decision_drivers: normalizeDecisionDrivers(parsedResult.decision_drivers),
      confirmed_facts: normalizeList(parsedResult.confirmed_facts),
      inferred_implications: normalizeList(parsedResult.inferred_implications),
      not_confirmed: normalizeList(parsedResult.not_confirmed),
      impact_score: typeof parsedResult.impact_score === "number" && Number.isFinite(parsedResult.impact_score)
        ? Math.min(5, Math.max(0, Math.round(parsedResult.impact_score)))
        : null,
      impact_reason: normalizeString(parsedResult.impact_reason, 500),
      watch_next: normalizeList(parsedResult.watch_next),
      verified_figures: normalizeList(parsedResult.verified_figures),
      factors_positive: normalizeList(parsedResult.factors_positive).slice(0, 3),
      factors_negative: normalizeList(parsedResult.factors_negative).slice(0, 3),
      source_facts: normalizeString(parsedResult.source_facts, 500),
      related_markets: normalizeList(parsedResult.related_markets),
      related_market_implications: normalizeMarketImplications(parsedResult.related_market_implications),
      source_quality: normalizeString(parsedResult.source_quality, 80) || "Source-linked",
      confidence_label: normalizeString(parsedResult.confidence_label, 80) || "Source-grounded",
    } : null;
    const hasStructuredInsight = Boolean(
      structuredInsight?.content
      || structuredInsight?.what_happened
      || structuredInsight?.why_it_matters
      || structuredInsight?.investor_takeaway
      || structuredInsight?.market_lens
    );
    const aiInsight = hasStructuredInsight ? JSON.stringify(structuredInsight) : null;

    const { error: updateErr } = await supabase
      .from("news_articles")
      .update({
        related_stock_id: relatedStockId,
        ai_insight: relatedStockId ? aiInsight : null,
        stock_match_evidence: deterministicMatch ? {
          kind: deterministicMatch.kind,
          evidence: deterministicMatch.evidence,
          score: deterministicMatch.score,
        } : null,
      })
      .eq("id", articleId);

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({
      success: true,
      data: {
        related_stock_id: relatedStockId,
        ai_insight: aiInsight,
        match_source: deterministicMatch ? "deterministic" : null,
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
