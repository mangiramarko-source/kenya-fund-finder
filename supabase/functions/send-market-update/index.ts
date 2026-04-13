import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

interface WatchlistFund {
  name: string;
  annual_yield: number;
  daily_yield: number;
  yield_unit: string;
  fund_type: string;
}

interface TopFund {
  name: string;
  annual_yield: number;
  daily_yield: number;
  slug: string;
}

interface NewsItem {
  title: string;
  summary: string;
  url: string | null;
  id: string;
}

function buildEmailHtml(
  displayName: string,
  watchlistFunds: WatchlistFund[],
  topFunds: TopFund[],
  news: NewsItem[],
  siteUrl: string,
): string {
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Watchlist: compact card-style rows
  const watchlistSection = watchlistFunds.length > 0
    ? watchlistFunds.map((f) => {
        const isUp = f.daily_yield >= 0;
        const changeColor = isUp ? "#16a34a" : "#dc2626";
        const changeBg = isUp ? "#f0fdf4" : "#fef2f2";
        const arrow = isUp ? "▲" : "▼";
        const yieldSuffix = f.yield_unit === "%" ? "%" : "";
        return `<tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;">
            <div style="font-size:14px;font-weight:600;color:#0f172a;line-height:1.3;">${f.name}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;text-transform:uppercase;letter-spacing:0.3px;">${f.fund_type.replace(/_/g, " ")}</div>
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;vertical-align:middle;">
            <div style="font-size:15px;font-weight:700;color:#0f172a;">${f.annual_yield}${yieldSuffix}</div>
            <div style="display:inline-block;font-size:11px;font-weight:600;color:${changeColor};background:${changeBg};padding:2px 6px;border-radius:4px;margin-top:3px;">${arrow} ${Math.abs(f.daily_yield).toFixed(2)}${yieldSuffix}</div>
          </td>
        </tr>`;
      }).join("")
    : "";

  // Top performers: numbered with medal emojis
  const medals = ["🥇", "🥈", "🥉"];
  const topFundRows = topFunds.map((f, i) =>
    `<tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;width:36px;font-size:16px;vertical-align:middle;">${medals[i] || (i + 1)}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#0f172a;font-weight:500;vertical-align:middle;">${f.name}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:700;color:#16a34a;text-align:right;vertical-align:middle;">${f.annual_yield}%</td>
    </tr>`
  ).join("");

  // News: tight headline + one-line summary
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
            ${watchlistSection
              ? `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-top:8px;">${watchlistSection}</table>`
              : `<div style="background:#f8fafc;border-radius:8px;padding:16px;text-align:center;margin-top:8px;border:1px dashed #cbd5e1;">
                  <p style="margin:0;font-size:13px;color:#64748b;">No watchlist items yet.</p>
                  <a href="${siteUrl}" style="display:inline-block;margin-top:8px;font-size:12px;color:#16a34a;font-weight:600;text-decoration:none;">+ Add funds to your watchlist</a>
                </div>`
            }
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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const siteUrl = "https://kenya-fund-finder.lovable.app";

    // Parse request body for optional user_id (single user) or send to all opted-in users
    const body = await req.json().catch(() => ({}));
    const targetUserId = body.user_id as string | undefined;

    // Get top 3 performing funds
    const { data: topFunds } = await supabase
      .from("funds")
      .select("name, annual_yield, daily_yield, slug")
      .eq("is_published", true)
      .eq("yield_unit", "%")
      .order("annual_yield", { ascending: false })
      .limit(3);

    // Get latest 3 news articles
    const { data: latestNews } = await supabase
      .from("news_articles")
      .select("id, title, summary, url")
      .eq("status", "published")
      .order("date_published", { ascending: false })
      .limit(3);

    // Determine target users
    let users: { user_id: string; email: string; display_name: string }[] = [];

    if (targetUserId) {
      // Single user mode (for instant alerts)
      const { data: authUser } = await supabase.auth.admin.getUserById(targetUserId);
      if (authUser?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", targetUserId)
          .maybeSingle();
        users = [
          {
            user_id: targetUserId,
            email: authUser.user.email!,
            display_name: profile?.display_name || authUser.user.email!.split("@")[0],
          },
        ];
      }
    } else {
      // Batch mode: send to all users with weekly_summary enabled
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
      // Get user's watchlist funds
      const { data: watchlist } = await supabase
        .from("user_watchlist")
        .select("item_id, item_name")
        .eq("user_id", user.user_id)
        .eq("item_type", "fund");

      let watchlistFunds: WatchlistFund[] = [];
      if (watchlist && watchlist.length > 0) {
        const fundIds = watchlist.map((w) => w.item_id);
        const { data: funds } = await supabase
          .from("funds")
          .select("id, name, annual_yield, daily_yield, yield_unit, fund_type")
          .in("id", fundIds);
        watchlistFunds = (funds || []).map((f) => ({
          name: f.name,
          annual_yield: Number(f.annual_yield),
          daily_yield: Number(f.daily_yield),
          yield_unit: f.yield_unit,
          fund_type: f.fund_type,
        }));
      }

      const html = buildEmailHtml(
        user.display_name,
        watchlistFunds,
        (topFunds || []).map((f) => ({
          name: f.name,
          annual_yield: Number(f.annual_yield),
          daily_yield: Number(f.daily_yield),
          slug: f.slug,
        })),
        (latestNews || []).map((n) => ({
          title: n.title,
          summary: n.summary,
          url: n.url,
          id: n.id,
        })),
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
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
