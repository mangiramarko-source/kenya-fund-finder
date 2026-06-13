import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import {
  buildRetentionBlock,
  NEUTRAL_DISCLAIMER_HTML,
  type SavedFundRow,
  type SavedStockRow,
  type PortfolioSummary,
} from "../_shared/weekly-email-sections.ts";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

interface WatchlistAsset {
  name: string;
  category: string; // e.g. "Money Market", "Banking", "USD/KES"
  value: string;    // formatted primary value
  change: string;   // formatted change badge
  changeColor: string;
  changeBg: string;
}

interface TopFund {
  name: string;
  annual_yield: number;
  slug: string;
}

interface NewsItem {
  title: string;
  summary: string;
  id: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatChange(val: number, suffix: string): { text: string; color: string; bg: string } {
  const isUp = val >= 0;
  return {
    text: `${isUp ? "▲" : "▼"} ${Math.abs(val).toFixed(2)}${suffix}`,
    color: isUp ? "#16a34a" : "#dc2626",
    bg: isUp ? "#f0fdf4" : "#fef2f2",
  };
}

// ── Email builder ────────────────────────────────────────────────────

function buildWatchlistGroup(title: string, emoji: string, assets: WatchlistAsset[]): string {
  if (assets.length === 0) return "";
  const rows = assets.map((a) =>
    `<tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;">
        <div style="font-size:14px;font-weight:600;color:#0f172a;line-height:1.3;">${a.name}</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:2px;text-transform:uppercase;letter-spacing:0.3px;">${a.category}</div>
      </td>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:right;vertical-align:middle;">
        <div style="font-size:15px;font-weight:700;color:#0f172a;">${a.value}</div>
        <div style="display:inline-block;font-size:11px;font-weight:600;color:${a.changeColor};background:${a.changeBg};padding:2px 6px;border-radius:4px;margin-top:3px;">${a.change}</div>
      </td>
    </tr>`
  ).join("");

  return `<div style="margin-bottom:12px;">
    <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;padding:0 0 6px;">${emoji} ${title}</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">${rows}</table>
  </div>`;
}

function buildEmailHtml(
  displayName: string,
  fundAssets: WatchlistAsset[],
  stockAssets: WatchlistAsset[],
  currencyAssets: WatchlistAsset[],
  topFunds: TopFund[],
  news: NewsItem[],
  siteUrl: string,
): string {
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const hasWatchlist = fundAssets.length + stockAssets.length + currencyAssets.length > 0;

  const watchlistHtml = hasWatchlist
    ? [
        buildWatchlistGroup("Unit Trusts", "📈", fundAssets),
        buildWatchlistGroup("Stocks", "📊", stockAssets),
        buildWatchlistGroup("Currencies", "💱", currencyAssets),
      ].join("")
    : `<div style="background:#f8fafc;border-radius:8px;padding:16px;text-align:center;margin-top:8px;border:1px dashed #cbd5e1;">
        <p style="margin:0;font-size:13px;color:#64748b;">No watchlist items yet.</p>
        <a href="${siteUrl}" style="display:inline-block;margin-top:8px;font-size:12px;color:#16a34a;font-weight:600;text-decoration:none;">+ Add assets to your watchlist</a>
      </div>`;

  const medals = ["🥇", "🥈", "🥉"];
  const topFundRows = topFunds.map((f, i) =>
    `<tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;width:36px;font-size:16px;vertical-align:middle;">${medals[i] || (i + 1)}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a;font-weight:500;vertical-align:middle;">${f.name}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:700;color:#16a34a;text-align:right;vertical-align:middle;">${f.annual_yield}%</td>
    </tr>`
  ).join("");

  const newsSection = news.map((n) =>
    `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td style="padding:12px 16px;background:#f8fafc;border-radius:8px;border-left:3px solid #1e3a5f;">
          <a href="${siteUrl}/news/${n.id}" style="font-size:14px;font-weight:600;color:#1e3a5f;text-decoration:none;line-height:1.4;display:block;">${n.title}</a>
          <p style="margin:4px 0 0;font-size:12px;color:#64748b;line-height:1.4;">${(n.summary || "").slice(0, 100)}${(n.summary || "").length > 100 ? "…" : ""}</p>
        </td>
      </tr>
    </table>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a5f 0%,#2a4a6f 100%);padding:24px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">📊 Market Update</h1>
                  <p style="margin:4px 0 0;font-size:12px;color:#cbd5e1;">${today}</p>
                </td>
                <td style="text-align:right;vertical-align:middle;">
                  <a href="${siteUrl}" style="display:inline-block;background:rgba(255,255,255,0.15);color:#ffffff;padding:6px 14px;border-radius:6px;font-size:11px;font-weight:600;text-decoration:none;border:1px solid rgba(255,255,255,0.25);">Open App</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:24px 28px 0;">
            <p style="margin:0;font-size:15px;color:#334155;line-height:1.5;">Hi <strong>${displayName || "Investor"}</strong>, here's your market snapshot.</p>
          </td>
        </tr>

        <!-- Watchlist -->
        <tr>
          <td style="padding:20px 28px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;">
              <tr>
                <td><h2 style="margin:0;font-size:14px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.5px;">⭐ Your Watchlist</h2></td>
                <td style="text-align:right;"><a href="${siteUrl}" style="font-size:12px;color:#16a34a;text-decoration:none;font-weight:600;">View all →</a></td>
              </tr>
            </table>
            <div style="margin-top:8px;">${watchlistHtml}</div>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:20px 28px 0;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"></td></tr>

        <!-- Top Performers -->
        <tr>
          <td style="padding:20px 28px 0;">
            <h2 style="margin:0 0 8px;font-size:14px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.5px;">🏆 Top Performers</h2>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">${topFundRows}</table>
          </td>
        </tr>

        ${news.length > 0 ? `
        <!-- Divider -->
        <tr><td style="padding:20px 28px 0;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;"></td></tr>

        <!-- News -->
        <tr>
          <td style="padding:20px 28px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;">
              <tr>
                <td><h2 style="margin:0;font-size:14px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.5px;">📰 Headlines</h2></td>
                <td style="text-align:right;"><a href="${siteUrl}/news" style="font-size:12px;color:#16a34a;text-decoration:none;font-weight:600;">All news →</a></td>
              </tr>
            </table>
            <div style="margin-top:8px;">${newsSection}</div>
          </td>
        </tr>` : ""}

        <!-- CTA -->
        <tr>
          <td style="padding:28px 28px 8px;text-align:center;">
            <a href="${siteUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;padding:12px 36px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;box-shadow:0 2px 4px rgba(22,163,74,0.25);">View Full Dashboard</a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 28px;border-top:1px solid #e2e8f0;margin-top:16px;">
            <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;line-height:1.6;">
              Kenya Fund Finder — Kenyan investment insights, simplified.<br/>
              Operated by Elyon Innovation LTD. © ${new Date().getFullYear()} All rights reserved.<br/>
              <a href="${siteUrl}/profile" style="color:#64748b;text-decoration:underline;">Manage preferences</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Per-user watchlist data fetching ─────────────────────────────────

async function fetchUserWatchlistAssets(supabase: any, userId: string) {
  // Fetch all watchlist items for the user in one query
  const { data: watchlist } = await supabase
    .from("user_watchlist")
    .select("item_id, item_name, item_type")
    .eq("user_id", userId);

  const fundIds = (watchlist || []).filter((w: any) => w.item_type === "fund").map((w: any) => w.item_id);
  const stockIds = (watchlist || []).filter((w: any) => w.item_type === "stock").map((w: any) => w.item_id);
  const currencyIds = (watchlist || []).filter((w: any) => w.item_type === "currency").map((w: any) => w.item_id);

  let fundAssets: WatchlistAsset[] = [];
  let stockAssets: WatchlistAsset[] = [];
  let currencyAssets: WatchlistAsset[] = [];

  // Fetch fund data
  if (fundIds.length > 0) {
    const { data: funds } = await supabase
      .from("funds")
      .select("name, annual_yield, daily_yield, yield_unit, fund_type")
      .in("id", fundIds);
    fundAssets = (funds || []).map((f: any) => {
      const suffix = f.yield_unit === "%" ? "%" : "";
      const chg = formatChange(Number(f.daily_yield), suffix);
      return {
        name: f.name,
        category: (f.fund_type || "fund").replace(/_/g, " "),
        value: `${f.annual_yield}${suffix}`,
        change: chg.text,
        changeColor: chg.color,
        changeBg: chg.bg,
      };
    });
  }

  // Fetch stock data
  if (stockIds.length > 0) {
    const { data: stocks } = await supabase
      .from("stocks")
      .select("name, symbol, price, day_change, day_change_percent, sector")
      .in("id", stockIds);
    stockAssets = (stocks || []).map((s: any) => {
      const chg = formatChange(Number(s.day_change_percent), "%");
      return {
        name: s.name,
        category: `${s.symbol} · ${s.sector}`,
        value: `KES ${Number(s.price).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        change: chg.text,
        changeColor: chg.color,
        changeBg: chg.bg,
      };
    });
  }

  // Fetch currency data
  if (currencyIds.length > 0) {
    const { data: currencies } = await supabase
      .from("exchange_rates")
      .select("currency_name, currency_code, rate, previous_rate")
      .in("id", currencyIds);
    currencyAssets = (currencies || []).map((c: any) => {
      const rate = Number(c.rate);
      const prev = Number(c.previous_rate || rate);
      const pctChange = prev !== 0 ? ((rate - prev) / prev) * 100 : 0;
      const chg = formatChange(pctChange, "%");
      return {
        name: c.currency_name,
        category: `${c.currency_code}/KES`,
        value: `KES ${rate.toFixed(2)}`,
        change: chg.text,
        changeColor: chg.color,
        changeBg: chg.bg,
      };
    });
  }

  return { fundAssets, stockAssets, currencyAssets };
}

// ── Main handler ─────────────────────────────────────────────────────

/** Decode JWT payload (signature checked upstream by Supabase). */
function parseJwtClaims(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const siteUrl = "https://kenya-fund-finder.lovable.app";

    // ── Auth gate ──────────────────────────────────────────────
    // Allow service-role callers (cron / check-price-alerts) OR admin users.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : "";
    const claims = parseJwtClaims(token);
    let authorized = claims?.role === "service_role";
    if (!authorized && token) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await userClient.auth.getUser();
      if (userData?.user) {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (roleRow) authorized = true;
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const body = await req.json().catch(() => ({}));
    const targetUserId = body.user_id as string | undefined;

    // Shared data: top funds + news
    const [{ data: topFundsRaw }, { data: latestNewsRaw }] = await Promise.all([
      supabase
        .from("funds")
        .select("name, annual_yield, daily_yield, slug")
        .eq("is_published", true)
        .eq("yield_unit", "%")
        .order("annual_yield", { ascending: false })
        .limit(3),
      supabase
        .from("news_articles")
        .select("id, title, summary")
        .eq("status", "published")
        .order("date_published", { ascending: false })
        .limit(3),
    ]);

    const topFunds: TopFund[] = (topFundsRaw || []).map((f: any) => ({
      name: f.name,
      annual_yield: Number(f.annual_yield),
      slug: f.slug,
    }));
    const news: NewsItem[] = (latestNewsRaw || []).map((n: any) => ({
      title: n.title,
      summary: n.summary,
      id: n.id,
    }));

    // Determine target users
    let users: { user_id: string; email: string; display_name: string }[] = [];

    if (targetUserId) {
      const { data: authUser } = await supabase.auth.admin.getUserById(targetUserId);
      if (authUser?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", targetUserId)
          .maybeSingle();
        users = [{
          user_id: targetUserId,
          email: authUser.user.email!,
          display_name: profile?.display_name || authUser.user.email!.split("@")[0],
        }];
      }
    } else {
      const { data: prefs } = await supabase.from("email_preferences").select("user_id").eq("weekly_summary", true);
      if (prefs && prefs.length > 0) {
        for (const pref of prefs) {
          const { data: authUser } = await supabase.auth.admin.getUserById(pref.user_id);
          if (authUser?.user?.email) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("user_id", pref.user_id)
              .maybeSingle();
            users.push({
              user_id: pref.user_id,
              email: authUser.user.email,
              display_name: profile?.display_name || authUser.user.email.split("@")[0],
            });
          }
        }
      }
    }

    if (users.length === 0) {
      return new Response(JSON.stringify({ message: "No users to send to", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const user of users) {
      const { fundAssets, stockAssets, currencyAssets } = await fetchUserWatchlistAssets(supabase, user.user_id);

      const html = buildEmailHtml(
        user.display_name,
        fundAssets,
        stockAssets,
        currencyAssets,
        topFunds,
        news,
        siteUrl,
      );

      try {
        const res = await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
          },
          body: JSON.stringify({
            from: "Kenya Fund Finder <alerts@kenyafundfinder.com>",
            to: [user.email],
            subject: "📊 Your Market Update — Kenya Fund Finder",
            html,
          }),
        });

        const result = await res.json();
        if (res.ok) {
          sentCount++;
        } else {
          errors.push(`${user.email}: ${JSON.stringify(result)}`);
        }
      } catch (err) {
        errors.push(`${user.email}: ${String(err)}`);
      }
    }

    console.log(`Market update sent to ${sentCount}/${users.length} users`);
    return new Response(
      JSON.stringify({
        message: `Sent to ${sentCount} user(s)`,
        sent: sentCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("send-market-update error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
