import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import {
  deterministicNewsHighlightInsights,
  isPolicyNewsCategory,
  newsHighlightsEditionWindow,
  selectNewsHighlightsArticles,
} from "../_shared/news-highlights-edition.ts";
import {
  newsHighlightsEnqueueResult,
  newsHighlightsOutboxRows,
} from "../_shared/news-highlights-enqueue.ts";
import { normalizeEmail } from "../_shared/communications.ts";
import { authorizePrivilegedRequest } from "../_shared/privileged-auth.ts";
import { getSupabaseSecretKey } from "../_shared/supabase-keys.ts";

const headers = { "Content-Type": "application/json" };

function nairobiDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((value) => value.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function isWeekday(date: string): boolean {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return weekday >= 1 && weekday <= 5;
}

type ServiceClient = SupabaseClient<any, "public", "public", any, any>;

async function enqueueReadyEditionRecipients(
  supabase: ServiceClient,
  editionId: string,
) {
  const { data: preferences, error: preferenceError } = await supabase
    .from("communication_preferences")
    .select("user_id")
    .eq("market_brief_email", true);
  if (preferenceError) throw preferenceError;

  const eligibleUserIds: string[] = [];
  for (const preference of preferences ?? []) {
    const { data: userResult } = await supabase.auth.admin.getUserById(preference.user_id);
    const email = userResult.user?.email ? normalizeEmail(userResult.user.email) : "";
    if (!email) continue;
    const { data: suppression } = await supabase.from("communication_suppressions")
      .select("id")
      .eq("email_normalized", email)
      .in("scope", ["all_email", "market_brief"])
      .is("lifted_at", null)
      .limit(1);
    if ((suppression?.length ?? 0) > 0) continue;
    eligibleUserIds.push(preference.user_id);
  }

  const rows = newsHighlightsOutboxRows(editionId, eligibleUserIds);
  if (rows.length === 0) return newsHighlightsEnqueueResult(0, 0);
  const { data: inserted, error: enqueueError } = await supabase
    .from("communication_outbox")
    .upsert(rows, { onConflict: "idempotency_key", ignoreDuplicates: true })
    .select("id");
  if (enqueueError) throw enqueueError;
  return newsHighlightsEnqueueResult(rows.length, inserted?.length ?? 0);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers });
  const supabase = createClient(supabaseUrl, getSupabaseSecretKey(), { auth: { persistSession: false, autoRefreshToken: false } });
  const authorization = await authorizePrivilegedRequest(request, {
    namedSecretKeysJson: Deno.env.get("SUPABASE_SECRET_KEYS"), secretName: "automations",
    verifyUser: async (token) => (await supabase.auth.getUser(token)).data.user?.id ?? null,
    isAdmin: async (userId) => Boolean((await supabase.from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle()).data),
  });
  if (!authorization.ok) return new Response(JSON.stringify({ error: authorization.status === 401 ? "Unauthorized" : "Forbidden" }), { status: authorization.status, headers });

  const body = await request.json().catch(() => ({})) as { edition_date?: string; retry_failed_only?: boolean };
  const editionDate = body.edition_date ?? nairobiDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(editionDate)) return new Response(JSON.stringify({ error: "edition_date must be YYYY-MM-DD" }), { status: 400, headers });
  if (!isWeekday(editionDate)) return new Response(JSON.stringify({ edition_date: editionDate, status: "skipped", reason: "weekend" }), { headers });

  const window = newsHighlightsEditionWindow(editionDate);
  const { data: existing, error: existingError } = await supabase
    .from("news_highlights_editions")
    .select("id,status")
    .eq("edition_date", editionDate)
    .maybeSingle();
  if (existingError) return new Response(JSON.stringify({ error: "Unable to read edition state" }), { status: 500, headers });
  if (existing?.status === "skipped") return new Response(JSON.stringify({ edition_id: existing.id, edition_date: editionDate, status: existing.status, edition_created: false, newly_enqueued: 0 }), { headers });
  if (body.retry_failed_only && existing?.status !== "failed") return new Response(JSON.stringify({ edition_date: editionDate, status: existing?.status ?? "not_started", enqueued: 0 }), { headers });

  if (existing?.status === "ready") {
    try {
      const enqueue = await enqueueReadyEditionRecipients(supabase, existing.id);
      return new Response(JSON.stringify({
        edition_id: existing.id, edition_date: editionDate, status: existing.status, edition_created: false, ...enqueue,
      }), { headers });
    } catch (error) {
      console.error("run-news-highlights-edition enqueue failed", error);
      return new Response(JSON.stringify({ error: "News Highlights recipient enqueue failed" }), { status: 500, headers });
    }
  }

  try {
    await supabase.from("news_highlights_editions").upsert({
      edition_date: editionDate, status: "building", source_window_start: window.start, source_window_end: window.end,
      diagnostics: { source: "stored_news", retry_failed_only: Boolean(body.retry_failed_only) },
    }, { onConflict: "edition_date" });

    const { data: articles, error: articleError } = await supabase
      .from("news_articles")
      .select("id,title,summary,source,url,category,source_published_at,related_stock_id")
      .eq("status", "published")
      .not("quality_checked_at", "is", null)
      .gte("source_published_at", window.start)
      .lt("source_published_at", window.end)
      .order("source_published_at", { ascending: false })
      .limit(100);
    if (articleError) throw articleError;
    const selected = selectNewsHighlightsArticles(articles ?? [], window);
    if (selected.length < 3) {
      const { data: skipped, error } = await supabase.from("news_highlights_editions").upsert({
        edition_date: editionDate, status: "skipped", source_window_start: window.start, source_window_end: window.end,
        selected_articles: selected, diagnostics: { reason: "skipped_insufficient_articles", found: selected.length, required: 3 },
      }, { onConflict: "edition_date" }).select("id,status").single();
      if (error) throw error;
      return new Response(JSON.stringify({ edition_id: skipped.id, edition_date: editionDate, status: skipped.status, enqueued: 0 }), { headers });
    }

    const stockIds = [...new Set(selected.map((article) => article.related_stock_id).filter((id): id is string => Boolean(id)))];
    const { data: stocks, error: stockError } = stockIds.length
      ? await supabase.from("stocks").select("id,symbol,name").in("id", stockIds)
      : { data: [], error: null };
    if (stockError) throw stockError;
    const stockById = new Map((stocks ?? []).map((stock) => [stock.id, stock]));
    const companyWatch = selected.flatMap((article) => {
      const stock = article.related_stock_id ? stockById.get(article.related_stock_id) : null;
      return stock ? [{ company: stock.name, ticker: stock.symbol, summary: article.summary, tag: article.category }] : [];
    }).slice(0, 4);
    const policyWatch = selected.filter((article) => isPolicyNewsCategory(article.category)).slice(0, 3).map((article) => ({
      category: article.category, headline: article.headline, summary: article.summary,
    }));
    const edition = {
      edition_date: editionDate, status: "ready", source_window_start: window.start, source_window_end: window.end,
      selected_articles: selected, insights: deterministicNewsHighlightInsights(selected), company_watch: companyWatch,
      policy_watch: policyWatch, featured_story: selected[0], generated_at: new Date().toISOString(),
      diagnostics: { source: "stored_news", selected_count: selected.length, ai_used: false },
    };
    const { data: ready, error: readyError } = await supabase.from("news_highlights_editions")
      .upsert(edition, { onConflict: "edition_date" }).select("id,edition_date,status").single();
    if (readyError) throw readyError;

    const enqueue = await enqueueReadyEditionRecipients(supabase, ready.id);
    return new Response(JSON.stringify({
      edition_id: ready.id, edition_date: editionDate, status: ready.status, edition_created: true, ...enqueue,
    }), { headers });
  } catch (error) {
    await supabase.from("news_highlights_editions").upsert({
      edition_date: editionDate, status: "failed", source_window_start: window.start, source_window_end: window.end,
      diagnostics: { reason: "generation_error", retryable: true },
    }, { onConflict: "edition_date" });
    console.error("run-news-highlights-edition failed", error);
    return new Response(JSON.stringify({ error: "News Highlights edition failed" }), { status: 500, headers });
  }
});
