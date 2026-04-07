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
  siteUrl: string
): string {
  const watchlistRows = watchlistFunds
    .map((f) => {
      const changeColor = f.daily_yield >= 0 ? "#2d8a56" : "#dc2626";
      const arrow = f.daily_yield >= 0 ? "▲" : "▼";
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#1e293b;">${f.name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:600;color:#1e293b;text-align:right;">${f.annual_yield}${f.yield_unit === "%" ? "%" : ""}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;font-weight:600;color:${changeColor};text-align:right;">${arrow} ${Math.abs(f.daily_yield).toFixed(2)}${f.yield_unit === "%" ? "%" : ""}</td>
      </tr>`;
    })
    .join("");

  const topFundRows = topFunds
    .map(
      (f, i) =>
        `<tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#64748b;">${i + 1}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#1e293b;font-weight:500;">${f.name}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;font-weight:700;color:#2d8a56;text-align:right;">${f.annual_yield}%</td>
        </tr>`
    )
    .join("");

  const newsItems = news
    .map(
      (n) =>
        `<div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #e5e7eb;">
          <a href="${siteUrl}/news/${n.id}" style="font-size:15px;font-weight:600;color:#1e3a5f;text-decoration:none;line-height:1.4;">${n.title}</a>
          <p style="margin:6px 0 0;font-size:13px;color:#64748b;line-height:1.5;">${(n.summary || "").slice(0, 150)}…</p>
        </div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr>
          <td style="background:#1e3a5f;padding:28px 32px;">
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">📊 Market Update</h1>
            <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;">Kenya Fund Finder — Your Daily Digest</p>
          </td>
        </tr>

        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.6;">
            Hi ${displayName || "Investor"},<br/>Here's your personalised market update.
          </p>

          <!-- Watchlist Section -->
          ${
            watchlistFunds.length > 0
              ? `<h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #2d8a56;padding-bottom:8px;">⭐ Your Watchlist</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:28px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;letter-spacing:0.5px;">Fund</th>
                <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#64748b;letter-spacing:0.5px;">Annual</th>
                <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#64748b;letter-spacing:0.5px;">Daily Δ</th>
              </tr>
            </thead>
            <tbody>${watchlistRows}</tbody>
          </table>`
              : `<p style="font-size:14px;color:#64748b;background:#f8fafc;padding:16px;border-radius:8px;margin-bottom:28px;">You haven't added any funds to your watchlist yet. <a href="${siteUrl}" style="color:#2d8a56;font-weight:600;">Browse funds →</a></p>`
          }

          <!-- Top Performers -->
          <h2 style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #2d8a56;padding-bottom:8px;">🏆 Top Performers Today</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:28px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;width:30px;">#</th>
                <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;">Fund</th>
                <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#64748b;">Annual Yield</th>
              </tr>
            </thead>
            <tbody>${topFundRows}</tbody>
          </table>

          <!-- News Section -->
          ${
            news.length > 0
              ? `<h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #2d8a56;padding-bottom:8px;">📰 Latest Headlines</h2>
          ${newsItems}`
              : ""
          }

          <!-- CTA -->
          <div style="text-align:center;margin:28px 0 0;">
            <a href="${siteUrl}" style="display:inline-block;background:#2d8a56;color:#ffffff;padding:14px 32px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">View Full Dashboard →</a>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.5;">
              Kenya Fund Finder — Kenyan investment insights, simplified.<br/>
              <a href="${siteUrl}/profile" style="color:#2d8a56;text-decoration:none;">Manage email preferences</a>
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
        users = [{
          user_id: targetUserId,
          email: authUser.user.email!,
          display_name: profile?.display_name || authUser.user.email!.split("@")[0],
        }];
      }
    } else {
      // Batch mode: send to all users with weekly_summary enabled
      const { data: prefs } = await supabase
        .from("email_preferences")
        .select("user_id")
        .eq("weekly_summary", true);

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
      return new Response(
        JSON.stringify({ message: "No users to send to", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
        siteUrl
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
            from: "Kenya Fund Finder <onboarding@resend.dev>",
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
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-market-update error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
