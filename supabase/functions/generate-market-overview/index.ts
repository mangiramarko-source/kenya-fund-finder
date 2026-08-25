import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { geminiGenerateText, parseModelJson } from "../_shared/gemini.ts";
import {
  MARKET_OVERVIEW_PAYLOAD_VERSION,
  MIN_STOCK_COVERAGE,
  calculateMarketBreadth,
  deterministicMarketSummary,
  evaluateCoreReadiness,
  localDateInNairobi,
  selectDiverseStoredNews,
  validateAiNarrative,
} from "../_shared/market-overview.ts";
import { authorizePrivilegedRequest } from "../_shared/privileged-auth.ts";
import { getSupabaseSecretKey } from "../_shared/supabase-keys.ts";

const jsonHeaders = { "Content-Type": "application/json" };

function nairobiHour(date: Date): number {
  return Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    hour: "2-digit",
    hour12: false,
  }).format(date));
}

function ageMinutes(value: string, now: Date): number {
  return (now.getTime() - new Date(value).getTime()) / 60_000;
}

function daysBetween(left: string, right: string): number {
  return Math.floor((new Date(`${left}T00:00:00Z`).getTime() - new Date(`${right}T00:00:00Z`).getTime()) / 86_400_000);
}

function number(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers: jsonHeaders });
  }

  const supabase = createClient(supabaseUrl, getSupabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const authorization = await authorizePrivilegedRequest(request, {
    namedSecretKeysJson: Deno.env.get("SUPABASE_SECRET_KEYS"),
    secretName: "automations",
    verifyUser: async (token) => {
      const { data } = await supabase.auth.getUser(token);
      return data.user?.id ?? null;
    },
    isAdmin: async (userId) => {
      const { data } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      return Boolean(data);
    },
  });
  if (!authorization.ok) {
    return new Response(JSON.stringify({ error: authorization.status === 401 ? "Unauthorized" : "Forbidden" }), {
      status: authorization.status,
      headers: jsonHeaders,
    });
  }

  const body = await request.json().catch(() => ({})) as {
    market_date?: string;
    use_ai?: boolean;
    enforce_after_close?: boolean;
  };
  const now = new Date();
  const marketDate = body.market_date ?? localDateInNairobi(now);
  const useAi = body.use_ai !== false;
  const enforceAfterClose = body.enforce_after_close !== false;

  try {
    const [stocksResult, fxResult, commodityResult, treasuryResult, fundSnapshotResult, newsResult] = await Promise.all([
      supabase.from("stocks").select("id,symbol,name,price,previous_price,updated_at,is_active").eq("is_active", true),
      supabase.from("exchange_rates").select("id,currency_code,currency_name,rate,previous_rate,updated_at,is_active").eq("is_active", true).in("currency_code", ["USD", "EUR", "GBP"]),
      supabase.from("commodities").select("id,name,symbol,price,previous_price,unit,updated_at,is_active").eq("is_active", true).order("sort_order").limit(2),
      supabase.from("treasury_bill_auctions").select("tenor_days,auction_date,accepted_average_rate,previous_rate,retrieved_at").order("auction_date", { ascending: false }).limit(3),
      supabase.from("fund_yield_snapshots").select("fund_id,annual_yield,snapshot_date,funds(name,fund_type,is_published)").order("snapshot_date", { ascending: false }).limit(100),
      supabase.from("news_articles").select("id,title,summary,source,url,category,date_published,source_published_at,related_stock_id").eq("status", "published").not("quality_checked_at", "is", null).gte("date_published", new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10)).order("source_published_at", { ascending: false, nullsFirst: false }).limit(20),
    ]);

    for (const result of [stocksResult, fxResult, commodityResult, treasuryResult, fundSnapshotResult, newsResult]) {
      if (result.error) throw result.error;
    }

    const stocks = stocksResult.data ?? [];
    const breadth = calculateMarketBreadth(stocks, marketDate);
    const fx = fxResult.data ?? [];
    const usd = fx.find((row) => row.currency_code === "USD");
    const usdRate = number(usd?.rate);
    const blockedReasons = evaluateCoreReadiness({
      breadth,
      marketDate,
      now,
      usdRate,
      usdUpdatedAt: usd?.updated_at ?? null,
      beforeFinalRefresh: enforceAfterClose && marketDate === localDateInNairobi(now) && nairobiHour(now) < 17,
    });

    const fxSnapshot = Object.fromEntries(fx.map((row) => {
      const rate = number(row.rate);
      const previous = number(row.previous_rate);
      return [row.currency_code, {
        fact_id: `fx:${row.currency_code}:KES`,
        currency_code: row.currency_code,
        currency_name: row.currency_name,
        rate,
        previous_rate: previous,
        change_percent: rate !== null && previous
          ? Number((((rate - previous) / previous) * 100).toFixed(2))
          : null,
        as_of: row.updated_at,
      }];
    }));

    const optionalMarkets: Record<string, unknown> = {};
    const freshCommodities = (commodityResult.data ?? []).filter((row) => ageMinutes(row.updated_at, now) <= 24 * 60);
    if (freshCommodities.length > 0) {
      optionalMarkets.commodities = freshCommodities.map((row) => ({
        fact_id: `commodity:${row.id}`,
        id: row.id,
        name: row.name,
        symbol: row.symbol,
        price: number(row.price),
        previous_price: number(row.previous_price),
        unit: row.unit,
        as_of: row.updated_at,
      }));
    }

    const treasury = (treasuryResult.data ?? []).filter((row) => daysBetween(marketDate, row.auction_date) <= 14);
    if (treasury.length > 0) {
      optionalMarkets.treasury_bills = treasury.map((row) => ({
        fact_id: `treasury_bill:${row.tenor_days}:${row.auction_date}`,
        tenor_days: row.tenor_days,
        auction_date: row.auction_date,
        accepted_average_rate: number(row.accepted_average_rate),
        previous_rate: number(row.previous_rate),
        retrieved_at: row.retrieved_at,
      }));
    }

    const newestFundDate = (fundSnapshotResult.data ?? [])[0]?.snapshot_date as string | undefined;
    if (newestFundDate && daysBetween(marketDate, newestFundDate) <= 14) {
      optionalMarkets.money_market_funds = (fundSnapshotResult.data ?? [])
        .filter((row) => {
          const fund = Array.isArray(row.funds) ? row.funds[0] : row.funds;
          return row.snapshot_date === newestFundDate && fund?.is_published && fund?.fund_type === "money_market";
        })
        .slice(0, 3)
        .map((row) => {
          const fund = Array.isArray(row.funds) ? row.funds[0] : row.funds;
          return {
            fact_id: `fund:${row.fund_id}:yield:${row.snapshot_date}`,
            fund_id: row.fund_id,
            name: fund?.name,
            annual_yield: number(row.annual_yield),
            as_of: row.snapshot_date,
          };
        });
    }

    const newsItems = selectDiverseStoredNews(newsResult.data ?? []);
    if (newsItems.length < 3) {
      blockedReasons.push({ code: "insufficient_quality_news", found: newsItems.length, required: 3 });
    }

    const deterministicSummary = usdRate === null
      ? null
      : deterministicMarketSummary(breadth, usdRate);
    const breadthFactId = `breadth:${marketDate}`;
    const sourceFacts = {
      payload_version: MARKET_OVERVIEW_PAYLOAD_VERSION,
      market_date: marketDate,
      facts: [
        {
          fact_id: breadthFactId,
          direction: breadth.direction,
          gainers: breadth.gainers,
          losers: breadth.losers,
          unchanged: breadth.unchanged,
          validated: breadth.validated,
        },
        ...breadth.topGainers,
        ...breadth.topLosers,
        ...Object.values(fxSnapshot),
        ...newsItems,
      ],
    };

    let aiSummary: string | null = null;
    let aiMetadata: Record<string, unknown> = { attempted: false };
    if (blockedReasons.length === 0 && useAi && deterministicSummary) {
      try {
        const generated = await geminiGenerateText({
          system: "You write neutral Kenya market-data summaries. Use only supplied facts. Do not calculate, recommend, speculate, or add facts. Return JSON only: {\"summary\":\"2-3 short sentences\",\"fact_ids\":[\"...\"]}.",
          user: JSON.stringify(sourceFacts),
          timeoutMs: 20_000,
        });
        const parsed = parseModelJson<{ summary?: unknown; fact_ids?: unknown }>(generated.text);
        const allowedFactIds = new Set((sourceFacts.facts as Array<{ fact_id: string }>).map((fact) => fact.fact_id));
        if (parsed && validateAiNarrative(parsed.summary, parsed.fact_ids, allowedFactIds, sourceFacts)) {
          aiSummary = parsed.summary as string;
        }
        aiMetadata = {
          attempted: true,
          accepted: Boolean(aiSummary),
          provider: generated.provider,
          model: generated.model,
          prompt_version: "market-overview-v1",
        };
      } catch (error) {
        aiMetadata = {
          attempted: true,
          accepted: false,
          prompt_version: "market-overview-v1",
          error: error instanceof Error ? error.message.slice(0, 300) : "AI generation failed",
        };
      }
    }

    const status = blockedReasons.length > 0 ? "blocked" : "ready";
    const generatedAt = now.toISOString();
    const stocksFreshAt = stocks.map((row) => row.updated_at).sort().at(-1) ?? null;
    const fxFreshAt = fx.map((row) => row.updated_at).sort().at(-1) ?? null;
    const coreAsOf = [stocksFreshAt, usd?.updated_at]
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(0) ?? null;
    const overview = {
      market_date: marketDate,
      status,
      payload_version: MARKET_OVERVIEW_PAYLOAD_VERSION,
      generated_at: generatedAt,
      source_as_of: coreAsOf,
      stocks_fresh_at: stocksFreshAt,
      fx_fresh_at: fxFreshAt,
      breadth_direction: breadth.direction,
      gainers_count: breadth.gainers,
      losers_count: breadth.losers,
      unchanged_count: breadth.unchanged,
      validated_stock_count: breadth.validated,
      top_gainers: breadth.topGainers,
      top_losers: breadth.topLosers,
      fx_snapshot: fxSnapshot,
      optional_markets: optionalMarkets,
      news_items: newsItems,
      deterministic_summary: deterministicSummary,
      ai_summary: aiSummary,
      narrative: aiSummary ?? deterministicSummary,
      source_facts: sourceFacts,
      validation_warnings: breadth.warnings,
      blocked_reasons: blockedReasons,
      generation_metadata: {
        generator_version: "market-overview-v1",
        timezone: "Africa/Nairobi",
        minimum_stock_coverage: MIN_STOCK_COVERAGE,
        ai: aiMetadata,
      },
    };

    const { data, error } = await supabase
      .from("market_overviews")
      .upsert(overview, { onConflict: "market_date" })
      .select("id,market_date,status,generated_at,blocked_reasons")
      .single();
    if (error) throw error;

    return new Response(JSON.stringify({ overview: data }), { headers: jsonHeaders });
  } catch (error) {
    console.error("generate-market-overview failed", error);
    await supabase.from("market_overviews").upsert({
      market_date: marketDate,
      status: "failed",
      payload_version: MARKET_OVERVIEW_PAYLOAD_VERSION,
      blocked_reasons: [{ code: "generation_error" }],
      generation_metadata: {
        generator_version: "market-overview-v1",
        error: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
      },
    }, { onConflict: "market_date" });
    return new Response(JSON.stringify({ error: "Overview generation failed" }), { status: 500, headers: jsonHeaders });
  }
});
