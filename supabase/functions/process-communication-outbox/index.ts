import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import {
  createUnsubscribeToken,
  escapeHtml,
  normalizeEmail,
  retryDelayMinutes,
  type UnsubscribeScope,
} from "../_shared/communications.ts";
import { authorizePrivilegedRequest } from "../_shared/privileged-auth.ts";
import { getSupabaseSecretKey } from "../_shared/supabase-keys.ts";
import { renderNewsHighlightsEmail, type NewsHighlightsEmailData } from "../_shared/news-highlights-email.ts";

const headers = { "Content-Type": "application/json" };

interface OutboxRow {
  id: string;
  user_id: string | null;
  category: "market_brief" | "price_alert" | "news_highlights";
  idempotency_key: string;
  payload: Record<string, unknown>;
  attempts: number;
}

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

type ServiceClient = SupabaseClient<any, "public", "public", any, any>;

function formatNumber(value: unknown, digits = 2): string {
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString("en-KE", { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : "—";
}

function page(title: string, content: string, unsubscribeUrl: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f7f9;font-family:Arial,sans-serif;color:#172033">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #e3e8ef;border-radius:12px;overflow:hidden">
  <tr><td style="background:#153b2f;color:#fff;padding:22px 26px"><div style="font-size:20px;font-weight:700">KenyaFundFinder</div><div style="font-size:12px;opacity:.8;margin-top:4px">${escapeHtml(title)}</div></td></tr>
  <tr><td style="padding:26px">${content}<p style="font-size:11px;color:#778197;line-height:1.5;margin-top:26px">Market data update only — not investment advice.</p></td></tr>
  <tr><td style="border-top:1px solid #e3e8ef;padding:18px 26px;font-size:11px;color:#778197">You received this because email updates are enabled. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#376e5b">Unsubscribe</a>.</td></tr>
  </table></td></tr></table></body></html>`;
}

async function renderMarketBrief(
  supabase: ServiceClient,
  row: OutboxRow,
  unsubscribeUrl: string,
): Promise<EmailContent> {
  if (!row.user_id) throw new Error("Recipient user no longer exists");
  const overviewId = String(row.payload.overview_id ?? "");
  const [{ data: overview, error: overviewError }, { data: watchlist }, { data: notifications }] = await Promise.all([
    supabase.from("market_overviews").select("*").eq("id", overviewId).eq("status", "ready").single(),
    supabase.from("user_watchlist").select("item_type,item_id,item_name,sort_order").eq("user_id", row.user_id).order("sort_order").limit(12),
    supabase.from("notifications").select("title,message,created_at").eq("user_id", row.user_id).eq("type", "price_alert").gte("created_at", new Date(Date.now() - 86_400_000).toISOString()).order("created_at", { ascending: false }).limit(3),
  ]);
  if (overviewError || !overview) throw new Error("Ready overview not found");

  const items = watchlist ?? [];
  const stockIds = items.filter((item) => item.item_type === "stock").map((item) => item.item_id);
  const currencyIds = items.filter((item) => item.item_type === "currency").map((item) => item.item_id);
  const commodityIds = items.filter((item) => item.item_type === "commodity").map((item) => item.item_id);
  const fundIds = items.filter((item) => item.item_type === "fund").map((item) => item.item_id);
  const [stocks, currencies, commodities, funds] = await Promise.all([
    stockIds.length ? supabase.from("stocks").select("id,symbol,name,price,day_change_percent").in("id", stockIds) : Promise.resolve({ data: [] }),
    currencyIds.length ? supabase.from("exchange_rates").select("id,currency_code,currency_name,rate,previous_rate").in("id", currencyIds) : Promise.resolve({ data: [] }),
    commodityIds.length ? supabase.from("commodities").select("id,symbol,name,price,previous_price,unit").in("id", commodityIds) : Promise.resolve({ data: [] }),
    fundIds.length ? supabase.from("funds").select("id,name,annual_yield,yield_unit,fact_sheet_date").in("id", fundIds) : Promise.resolve({ data: [] }),
  ]);

  const resolved = new Map<string, { label: string; value: string; change: string }>();
  for (const stock of stocks.data ?? []) resolved.set(`stock:${stock.id}`, { label: `${stock.symbol} · ${stock.name}`, value: `KES ${formatNumber(stock.price)}`, change: `${Number(stock.day_change_percent) >= 0 ? "+" : ""}${formatNumber(stock.day_change_percent)}%` });
  for (const currency of currencies.data ?? []) {
    const rate = Number(currency.rate);
    const previous = Number(currency.previous_rate);
    const change = previous ? ((rate - previous) / previous) * 100 : 0;
    resolved.set(`currency:${currency.id}`, { label: `${currency.currency_code}/KES · ${currency.currency_name}`, value: `KES ${formatNumber(rate)}`, change: `${change >= 0 ? "+" : ""}${formatNumber(change)}%` });
  }
  for (const commodity of commodities.data ?? []) {
    const price = Number(commodity.price);
    const previous = Number(commodity.previous_price);
    const change = previous ? ((price - previous) / previous) * 100 : 0;
    resolved.set(`commodity:${commodity.id}`, { label: `${commodity.symbol} · ${commodity.name}`, value: `${formatNumber(price)} ${commodity.unit ?? ""}`.trim(), change: `${change >= 0 ? "+" : ""}${formatNumber(change)}%` });
  }
  for (const fund of funds.data ?? []) resolved.set(`fund:${fund.id}`, { label: fund.name, value: `${formatNumber(fund.annual_yield)}${fund.yield_unit ?? "%"}`, change: fund.fact_sheet_date ? `As of ${fund.fact_sheet_date}` : "Date unavailable" });

  const watchlistRows = items.flatMap((item) => {
    const asset = resolved.get(`${item.item_type}:${item.item_id}`);
    return asset ? [`<tr><td style="padding:9px 0;border-bottom:1px solid #edf0f4"><strong>${escapeHtml(asset.label)}</strong><br><span style="font-size:12px;color:#778197">${escapeHtml(asset.change)}</span></td><td align="right" style="padding:9px 0;border-bottom:1px solid #edf0f4">${escapeHtml(asset.value)}</td></tr>`] : [];
  }).join("");

  const moverRows = [...(overview.top_gainers ?? []), ...(overview.top_losers ?? [])]
    .map((mover: Record<string, unknown>) => `<li>${escapeHtml(mover.symbol)}: ${Number(mover.change_percent) >= 0 ? "+" : ""}${escapeHtml(formatNumber(mover.change_percent))}% at KES ${escapeHtml(formatNumber(mover.price))}</li>`)
    .join("");
  const newsRows = (overview.news_items ?? []).slice(0, 5)
    .map((article: Record<string, unknown>) => `<li style="margin-bottom:8px"><a href="${escapeHtml(article.url)}" style="color:#376e5b">${escapeHtml(article.title)}</a> <span style="color:#778197">— ${escapeHtml(article.source)}</span></li>`)
    .join("");
  const alertRows = (notifications ?? [])
    .map((notification) => `<li style="margin-bottom:8px"><strong>${escapeHtml(notification.title)}</strong><br><span style="color:#778197">${escapeHtml(notification.message)}</span></li>`)
    .join("");

  const body = `
    <h1 style="font-size:22px;margin:0 0 10px">Kenya Market Brief</h1>
    <p style="font-size:15px;line-height:1.6">${escapeHtml(overview.narrative)}</p>
    <p style="font-size:12px;color:#778197">As of ${escapeHtml(overview.source_as_of ?? overview.generated_at)} · breadth: ${escapeHtml(overview.breadth_direction)}</p>
    ${watchlistRows ? `<h2 style="font-size:16px;margin-top:24px">Your watchlist</h2><table role="presentation" width="100%">${watchlistRows}</table>` : ""}
    ${moverRows ? `<h2 style="font-size:16px;margin-top:24px">Validated market movers</h2><ul style="padding-left:20px;line-height:1.5">${moverRows}</ul>` : ""}
    ${alertRows ? `<h2 style="font-size:16px;margin-top:24px">Recent alerts</h2><ul style="padding-left:20px;line-height:1.5">${alertRows}</ul>` : ""}
    ${newsRows ? `<h2 style="font-size:16px;margin-top:24px">Financial news</h2><ul style="padding-left:20px;line-height:1.5">${newsRows}</ul>` : ""}`;

  return {
    subject: `Kenya Market Brief · ${overview.market_date}`,
    html: page("Kenya Market Brief", body, unsubscribeUrl),
    text: `${overview.narrative}\n\nAs of ${overview.source_as_of ?? overview.generated_at}\n\nUnsubscribe: ${unsubscribeUrl}`,
  };
}

function renderPriceAlert(row: OutboxRow, unsubscribeUrl: string): EmailContent {
  const payload = row.payload;
  const name = String(payload.stock_name ?? "Stock");
  const condition = String(payload.condition ?? "threshold");
  const current = formatNumber(payload.triggered_price);
  const target = formatNumber(payload.target_price);
  const content = `<h1 style="font-size:22px;margin:0 0 12px">Price alert</h1><p style="font-size:15px;line-height:1.6"><strong>${escapeHtml(name)}</strong> is now <strong>KES ${escapeHtml(current)}</strong>, meeting your ${escapeHtml(condition)} KES ${escapeHtml(target)} alert.</p><p style="font-size:12px;color:#778197">Observed ${escapeHtml(payload.observed_at)}</p>`;
  return {
    subject: `Price alert · ${name}`,
    html: page("Price alert", content, unsubscribeUrl),
    text: `${name} is now KES ${current}, meeting your ${condition} KES ${target} alert. Data update only — not investment advice.\n\nUnsubscribe: ${unsubscribeUrl}`,
  };
}

async function renderNewsHighlights(
  supabase: ServiceClient,
  row: OutboxRow,
  unsubscribeUrl: string,
): Promise<EmailContent> {
  const editionId = String(row.payload.edition_id ?? "");
  const { data: edition, error } = await supabase
    .from("news_highlights_editions")
    .select("edition_date,status,selected_articles,insights,company_watch,policy_watch,featured_story")
    .eq("id", editionId)
    .eq("status", "ready")
    .single();
  if (error || !edition) throw new Error("Ready News Highlights edition not found");
  const selected = Array.isArray(edition.selected_articles) ? edition.selected_articles : [];
  const featured = edition.featured_story && typeof edition.featured_story === "object"
    ? edition.featured_story
    : selected[0];
  if (!featured || selected.length < 3) throw new Error("News Highlights edition is incomplete");
  const data: NewsHighlightsEmailData = {
    date: String(edition.edition_date), demo: false,
    topStories: selected as NewsHighlightsEmailData["topStories"],
    whyItMatters: (Array.isArray(edition.insights) ? edition.insights : []) as NewsHighlightsEmailData["whyItMatters"],
    companyWatch: (Array.isArray(edition.company_watch) ? edition.company_watch : []) as NewsHighlightsEmailData["companyWatch"],
    policyWatch: (Array.isArray(edition.policy_watch) ? edition.policy_watch : []) as NewsHighlightsEmailData["policyWatch"],
    featuredStory: featured as NewsHighlightsEmailData["featuredStory"],
    ctaUrl: "https://kenyafundfinder.com/news",
    preferencesUrl: "https://kenyafundfinder.com/profile",
    unsubscribeUrl,
  };
  return renderNewsHighlightsEmail(data);
}

async function updateFailure(
  supabase: ServiceClient,
  row: OutboxRow,
  retryable: boolean,
  reason: string,
) {
  const canRetry = retryable && row.attempts < 3;
  await supabase.from("communication_outbox").update({
    status: canRetry ? "retry_wait" : "failed",
    next_attempt_at: canRetry
      ? new Date(Date.now() + retryDelayMinutes(row.attempts) * 60_000).toISOString()
      : new Date().toISOString(),
    lease_expires_at: null,
    failure_reason: reason.slice(0, 1000),
  }).eq("id", row.id).eq("status", "processing");
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers });
  const supabase = createClient(supabaseUrl, getSupabaseSecretKey(), { auth: { persistSession: false, autoRefreshToken: false } });
  const authorization = await authorizePrivilegedRequest(request, {
    namedSecretKeysJson: Deno.env.get("SUPABASE_SECRET_KEYS"),
    secretName: "automations",
    verifyUser: async (token) => (await supabase.auth.getUser(token)).data.user?.id ?? null,
    isAdmin: async (userId) => Boolean((await supabase.from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle()).data),
  });
  if (!authorization.ok) return new Response(JSON.stringify({ error: "Forbidden" }), { status: authorization.status, headers });

  const configuredSendMode = Deno.env.get("COMMUNICATION_SEND_MODE");
  const sendMode = configuredSendMode === "live" || configuredSendMode === "internal" || configuredSendMode === "disabled"
    ? configuredSendMode
    : "internal";
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const unsubscribeSecret = Deno.env.get("COMMUNICATION_UNSUBSCRIBE_SECRET");
  const from = Deno.env.get("COMMUNICATION_FROM_EMAIL");
  if (sendMode !== "disabled" && (!resendKey || !unsubscribeSecret || !from)) {
    return new Response(JSON.stringify({ error: "Email worker is not configured" }), { status: 503, headers });
  }

  const body = await request.json().catch(() => ({})) as { batch_size?: number; category?: "news_highlights" };
  const batchSize = Math.min(25, Math.max(1, Number(body.batch_size ?? 10)));
  const { data: claimed, error: claimError } = body.category === "news_highlights"
    ? await supabase.rpc("claim_communication_category_batch", { p_category: "news_highlights", p_limit: batchSize, p_lease_seconds: 120 })
    : await supabase.rpc("claim_communication_batch", { p_limit: batchSize, p_lease_seconds: 120 });
  if (claimError) return new Response(JSON.stringify({ error: "Unable to claim communications" }), { status: 500, headers });

  const allowlist = new Set((Deno.env.get("COMMUNICATION_EMAIL_ALLOWLIST") ?? "").split(",").map(normalizeEmail).filter(Boolean));
  const functionsBaseUrl = supabaseUrl.replace(/\/$/, "");
  const results: Array<Record<string, unknown>> = [];

  for (const row of (claimed ?? []) as OutboxRow[]) {
    try {
      if (!row.user_id) throw new Error("Recipient user no longer exists");
      const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(row.user_id);
      if (userError || !userResult.user?.email) throw new Error("Recipient has no email address");
      const email = normalizeEmail(userResult.user.email);
      const { data: preference } = await supabase.from("communication_preferences").select("market_brief_email,price_alert_email").eq("user_id", row.user_id).maybeSingle();
      const enabled = row.category === "market_brief" || row.category === "news_highlights"
        ? preference?.market_brief_email === true
        : preference?.price_alert_email !== false;
      const suppressionScope = row.category === "news_highlights" ? "market_brief" : row.category;
      const { data: suppressions } = await supabase.from("communication_suppressions").select("id").eq("email_normalized", email).is("lifted_at", null).in("scope", ["all_email", suppressionScope]).limit(1);

      if (!enabled || (suppressions?.length ?? 0) > 0) {
        await supabase.from("communication_outbox").update({ status: "cancelled", recipient_email: email, lease_expires_at: null, failure_reason: enabled ? "recipient_suppressed" : "preference_disabled" }).eq("id", row.id);
        results.push({ id: row.id, status: "cancelled" });
        continue;
      }
      if (sendMode === "internal" && !allowlist.has(email)) {
        await supabase.from("communication_outbox").update({ status: "cancelled", recipient_email: email, lease_expires_at: null, failure_reason: "internal_allowlist_blocked" }).eq("id", row.id);
        results.push({ id: row.id, status: "allowlist_blocked" });
        continue;
      }

      const scope = (row.category === "news_highlights" ? "market_brief" : row.category) as UnsubscribeScope;
      const unsubscribeUrl = sendMode === "disabled"
        ? `${functionsBaseUrl}/functions/v1/communication-unsubscribe?test=disabled`
        : `${functionsBaseUrl}/functions/v1/communication-unsubscribe?token=${encodeURIComponent(await createUnsubscribeToken(unsubscribeSecret!, row.user_id, scope, new Date(Date.now() + 365 * 86_400_000)))}`;
      const content = row.category === "market_brief"
        ? await renderMarketBrief(supabase, row, unsubscribeUrl)
        : row.category === "news_highlights"
        ? await renderNewsHighlights(supabase, row, unsubscribeUrl)
        : renderPriceAlert(row, unsubscribeUrl);
      if (sendMode === "disabled") {
        await supabase.from("communication_outbox").update({
          status: "cancelled", recipient_email: email, lease_expires_at: null,
          failure_reason: "send_mode_disabled", updated_at: new Date().toISOString(),
        }).eq("id", row.id).eq("status", "processing");
        results.push({ id: row.id, status: "cancelled", rendered: true });
        continue;
      }
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": row.idempotency_key,
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: content.subject,
          html: content.html,
          text: content.text,
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const responseBody = await response.json().catch(() => ({}));
      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500 || responseBody?.name === "concurrent_idempotent_requests";
        await updateFailure(supabase, row, retryable, `Resend ${response.status}: ${responseBody?.message ?? "send failed"}`);
        results.push({ id: row.id, status: retryable ? "retry_wait" : "failed" });
        continue;
      }

      await supabase.from("communication_outbox").update({
        status: "accepted",
        delivery_status: "accepted",
        recipient_email: email,
        provider_message_id: responseBody.id,
        sent_at: new Date().toISOString(),
        lease_expires_at: null,
        failure_reason: null,
      }).eq("id", row.id).eq("status", "processing");
      results.push({ id: row.id, status: "accepted", provider_message_id: responseBody.id });
    } catch (error) {
      await updateFailure(supabase, row, true, error instanceof Error ? error.message : "Worker failure");
      results.push({ id: row.id, status: row.attempts < 3 ? "retry_wait" : "failed" });
    }
  }

  return new Response(JSON.stringify({ send_mode: sendMode, claimed: claimed?.length ?? 0, results }), { headers });
});
