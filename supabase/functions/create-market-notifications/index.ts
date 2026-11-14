import { createClient } from "../_shared/supabase-client.ts";
import { authorizePrivilegedRequest } from "../_shared/privileged-auth.ts";
import { getSupabaseSecretKey } from "../_shared/supabase-keys.ts";
import { nairobiDate } from "../_shared/portfolio-daily-summary.ts";

const headers = { "Content-Type": "application/json" };
const money = new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const kes = (value: number) => `KES ${money.format(value)}`;

type PreferenceRow = {
  user_id: string;
  watchlist_mover_inapp?: boolean | null;
  mmf_yield_inapp?: boolean | null;
  tbill_auction_inapp?: boolean | null;
  market_brief_inapp?: boolean | null;
  admin_broadcast_inapp?: boolean | null;
};

type CandidateNotification = {
  user_id: string;
  event_key: string;
  title: string;
  message: string;
  type: "watchlist_mover" | "mmf_yield_shift" | "tbill_auction" | "market_close_brief" | "admin_broadcast";
  metadata: Record<string, unknown>;
};

function isEnabled(flag: boolean | null | undefined): boolean {
  return flag !== false;
}

function asFiniteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nairobiDateForIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return nairobiDate(parsed);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers });
  }

  const supabase = createClient(supabaseUrl, getSupabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authorization = await authorizePrivilegedRequest(request, {
    namedSecretKeysJson: Deno.env.get("SUPABASE_SECRET_KEYS"),
    secretName: "automations",
    verifyUser: async (token) => (await supabase.auth.getUser(token)).data.user?.id ?? null,
    isAdmin: async (userId) =>
      Boolean((await supabase.from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle()).data),
  });
  if (!authorization.ok) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: authorization.status, headers });
  }

  try {
    const now = new Date();
    const today = nairobiDate(now);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 3_600_000).toISOString();

    const [
      prefsResult,
      watchlistResult,
      portfoliosResult,
      stocksResult,
      fundsResult,
      snapshotsResult,
      tbillsResult,
      overviewResult,
      adminPostsResult,
    ] = await Promise.all([
      supabase.from("communication_preferences").select("*"),
      supabase.from("user_watchlist").select("user_id,item_type,item_id,item_name").in("item_type", ["stock", "fund"]),
      supabase.from("mock_portfolios").select("user_id,asset_type,asset_id,asset_name,ticker").in("asset_type", ["stock", "mmf"]),
      supabase
        .from("stocks")
        .select("id,symbol,name,price,day_change,day_change_percent,updated_at")
        .eq("is_active", true),
      supabase
        .from("funds")
        .select("id,slug,name,manager,fund_type,yield_unit,annual_yield")
        .eq("is_published", true),
      supabase
        .from("fund_yield_snapshots")
        .select("fund_id,annual_yield,snapshot_date")
        .gte("snapshot_date", new Date(now.getTime() - 21 * 86_400_000).toISOString().slice(0, 10))
        .order("snapshot_date", { ascending: false })
        .limit(1000),
      supabase
        .from("treasury_bill_auctions")
        .select("tenor_days,issue_number,auction_date,accepted_average_rate,previous_rate,rate_change")
        .gte("auction_date", sevenDaysAgo)
        .order("auction_date", { ascending: false })
        .limit(12),
      supabase
        .from("market_overviews")
        .select("id,market_date,status,breadth_direction,gainers_count,losers_count,top_gainers,fx_snapshot,deterministic_summary")
        .eq("market_date", today)
        .eq("status", "ready")
        .maybeSingle(),
      supabase
        .from("admin_posts")
        .select("id,title,content,category,is_published,created_at,expires_at")
        .eq("is_published", true)
        .in("category", ["market_update", "platform_announcement"])
        .gte("created_at", twentyFourHoursAgo)
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

    for (const result of [
      prefsResult,
      watchlistResult,
      portfoliosResult,
      stocksResult,
      fundsResult,
      snapshotsResult,
      tbillsResult,
      overviewResult,
      adminPostsResult,
    ]) {
      if (result.error) throw result.error;
    }

    const prefsByUser = new Map<string, PreferenceRow>();
    for (const pref of (prefsResult.data ?? []) as PreferenceRow[]) {
      prefsByUser.set(pref.user_id, pref);
    }

    const allUsers = [...prefsByUser.keys()];
    const candidates: CandidateNotification[] = [];

    // 1. Watchlist & Portfolio Stock Movers (|day_change_percent| >= 3% updated today)
    type StockRow = NonNullable<typeof stocksResult.data>[number];
    const stockById = new Map<string, StockRow>();
    const stockByKey = new Map<string, StockRow>();
    for (const stock of stocksResult.data ?? []) {
      stockById.set(stock.id, stock);
      stockByKey.set(stock.id.toLowerCase(), stock);
      if (stock.symbol) stockByKey.set(stock.symbol.toLowerCase(), stock);
      if (stock.name) stockByKey.set(stock.name.toLowerCase(), stock);
    }

    const userStockIds = new Map<string, Set<string>>();
    const addUserStock = (userId: string, stockId: string) => {
      const set = userStockIds.get(userId) ?? new Set<string>();
      set.add(stockId);
      userStockIds.set(userId, set);
    };

    for (const item of watchlistResult.data ?? []) {
      if (item.item_type !== "stock") continue;
      const stock = stockById.get(item.item_id) ?? stockByKey.get(item.item_id.toLowerCase()) ?? stockByKey.get((item.item_name ?? "").toLowerCase());
      if (stock) addUserStock(item.user_id, stock.id);
    }
    for (const holding of portfoliosResult.data ?? []) {
      if (holding.asset_type !== "stock") continue;
      const keys = [holding.asset_id, holding.ticker, holding.asset_name].filter((v): v is string => Boolean(v));
      const stock = keys.map((k) => stockByKey.get(k.toLowerCase())).find(Boolean);
      if (stock) addUserStock(holding.user_id, stock.id);
    }

    for (const [userId, stockIds] of userStockIds) {
      if (!isEnabled(prefsByUser.get(userId)?.watchlist_mover_inapp)) continue;
      for (const stockId of stockIds) {
        const stock = stockById.get(stockId);
        if (!stock) continue;
        const pct = asFiniteNumber(stock.day_change_percent);
        const price = asFiniteNumber(stock.price);
        if (pct === null || price === null || Math.abs(pct) < 3.0) continue;
        if (nairobiDateForIso(stock.updated_at) !== today) continue;
        const sign = pct > 0 ? "+" : "";
        candidates.push({
          user_id: userId,
          event_key: `watchlist_mover:${userId}:${stock.id}:${today}`,
          title: `${stock.name} (${stock.symbol}) moved ${sign}${pct.toFixed(2)}%`,
          message: `${stock.name} is trading at ${kes(price)} (${sign}${pct.toFixed(2)}% today).`,
          type: "watchlist_mover",
          metadata: {
            asset_type: "stock",
            asset_id: stock.id,
            symbol: stock.symbol,
            asset_name: stock.name,
            price,
            day_change_percent: Number(pct.toFixed(2)),
            market_date: today,
            observed_at: stock.updated_at,
            route: `/stocks/${stock.symbol}`,
          },
        });
      }
    }

    // 2. MMF Yield Shifts (|latest - previous| >= 0.25% / 25 bps for watched or held funds)
    type FundRow = NonNullable<typeof fundsResult.data>[number];
    const fundById = new Map<string, FundRow>();
    const fundByKey = new Map<string, FundRow>();
    for (const fund of fundsResult.data ?? []) {
      fundById.set(fund.id, fund);
      fundByKey.set(fund.id.toLowerCase(), fund);
      if (fund.slug) fundByKey.set(fund.slug.toLowerCase(), fund);
      if (fund.name) fundByKey.set(fund.name.toLowerCase(), fund);
    }

    const snapshotsByFund = new Map<string, Array<{ annual_yield: number; snapshot_date: string }>>();
    for (const snap of snapshotsResult.data ?? []) {
      const annualYield = asFiniteNumber(snap.annual_yield);
      if (annualYield === null) continue;
      const list = snapshotsByFund.get(snap.fund_id) ?? [];
      if (!list.some((item) => item.snapshot_date === snap.snapshot_date)) {
        list.push({ annual_yield: annualYield, snapshot_date: snap.snapshot_date });
        snapshotsByFund.set(snap.fund_id, list);
      }
    }

    const userFundIds = new Map<string, Set<string>>();
    const addUserFund = (userId: string, fundId: string) => {
      const set = userFundIds.get(userId) ?? new Set<string>();
      set.add(fundId);
      userFundIds.set(userId, set);
    };

    for (const item of watchlistResult.data ?? []) {
      if (item.item_type !== "fund") continue;
      const fund = fundById.get(item.item_id) ?? fundByKey.get(item.item_id.toLowerCase()) ?? fundByKey.get((item.item_name ?? "").toLowerCase());
      if (fund) addUserFund(item.user_id, fund.id);
    }
    for (const holding of portfoliosResult.data ?? []) {
      if (holding.asset_type !== "mmf") continue;
      const keys = [holding.asset_id, holding.ticker, holding.asset_name].filter((v): v is string => Boolean(v));
      const fund = keys.map((k) => fundByKey.get(k.toLowerCase())).find(Boolean);
      if (fund) addUserFund(holding.user_id, fund.id);
    }

    for (const [userId, fundIds] of userFundIds) {
      if (!isEnabled(prefsByUser.get(userId)?.mmf_yield_inapp)) continue;
      for (const fundId of fundIds) {
        const fund = fundById.get(fundId);
        const snaps = snapshotsByFund.get(fundId);
        if (!fund || !snaps || snaps.length < 2) continue;
        const [latest, previous] = snaps;
        if (latest.snapshot_date < sevenDaysAgo) continue;
        const delta = latest.annual_yield - previous.annual_yield;
        if (Math.abs(delta) < 0.25) continue;
        const deltaBps = Math.round(delta * 100);
        const sign = delta > 0 ? "+" : "";
        candidates.push({
          user_id: userId,
          event_key: `mmf_yield_shift:${userId}:${fund.id}:${latest.snapshot_date}`,
          title: `${fund.name} yield ${delta > 0 ? "rose" : "dipped"} to ${latest.annual_yield.toFixed(2)}%`,
          message: `Annual yield moved ${sign}${deltaBps} bps (from ${previous.annual_yield.toFixed(2)}% to ${latest.annual_yield.toFixed(2)}% p.a.).`,
          type: "mmf_yield_shift",
          metadata: {
            asset_type: "fund",
            asset_id: fund.id,
            slug: fund.slug,
            asset_name: fund.name,
            annual_yield: latest.annual_yield,
            previous_yield: previous.annual_yield,
            delta_bps: deltaBps,
            snapshot_date: latest.snapshot_date,
            route: `/compare/${fund.slug}`,
          },
        });
      }
    }

    // 3. Weekly CBK T-Bill Auction Results (latest auction_date within 7 days)
    const tbillRows = tbillsResult.data ?? [];
    const latestAuctionDate = tbillRows[0]?.auction_date;
    if (latestAuctionDate) {
      const latestTenors = tbillRows.filter((row) => row.auction_date === latestAuctionDate);
      const rateFor = (tenor: number) => asFiniteNumber(latestTenors.find((row) => row.tenor_days === tenor)?.accepted_average_rate);
      const changeFor = (tenor: number) => asFiniteNumber(latestTenors.find((row) => row.tenor_days === tenor)?.rate_change);
      const rate91 = rateFor(91);
      const rate182 = rateFor(182);
      const rate364 = rateFor(364);
      const summaryParts = [
        rate91 !== null ? `91d: ${rate91.toFixed(2)}%` : null,
        rate182 !== null ? `182d: ${rate182.toFixed(2)}%` : null,
        rate364 !== null ? `364d: ${rate364.toFixed(2)}%` : null,
      ].filter(Boolean);

      if (summaryParts.length > 0) {
        for (const userId of allUsers) {
          if (!isEnabled(prefsByUser.get(userId)?.tbill_auction_inapp)) continue;
          candidates.push({
            user_id: userId,
            event_key: `tbill_auction:${userId}:${latestAuctionDate}`,
            title: "CBK T-Bill Auction Results",
            message: `${summaryParts.join(" · ")} (${latestAuctionDate}).`,
            type: "tbill_auction",
            metadata: {
              auction_date: latestAuctionDate,
              rate_91: rate91,
              rate_182: rate182,
              rate_364: rate364,
              change_91: changeFor(91),
              route: "/treasury",
            },
          });
        }
      }
    }

    // 4. Daily Market Close Brief (from ready market_overviews row for today)
    const overview = overviewResult.data;
    if (overview) {
      const fxSnapshot = (overview.fx_snapshot ?? {}) as Record<string, { rate?: number }>;
      const usdRate = asFiniteNumber(fxSnapshot.USD?.rate);
      const topGainers = Array.isArray(overview.top_gainers) ? (overview.top_gainers as Array<{ symbol?: string; change_percent?: number }>) : [];
      const topGainer = topGainers[0];
      const summaryText = overview.deterministic_summary
        ?? `NSE closed with ${overview.gainers_count} gainers and ${overview.losers_count} losers${usdRate !== null ? ` · USD/KES ${usdRate.toFixed(2)}` : ""}.`;

      for (const userId of allUsers) {
        if (!isEnabled(prefsByUser.get(userId)?.market_brief_inapp)) continue;
        candidates.push({
          user_id: userId,
          event_key: `market_close_brief:${userId}:${overview.market_date}`,
          title: "NSE Market Close Brief",
          message: summaryText,
          type: "market_close_brief",
          metadata: {
            market_date: overview.market_date,
            breadth_direction: overview.breadth_direction,
            gainers_count: overview.gainers_count,
            losers_count: overview.losers_count,
            usd_rate: usdRate,
            top_gainer_symbol: topGainer?.symbol ?? null,
            route: "/",
          },
        });
      }
    }

    // 5. Admin Broadcasts (published posts from last 24h)
    const activePosts = (adminPostsResult.data ?? []).filter(
      (post) => !post.expires_at || new Date(post.expires_at).getTime() > now.getTime(),
    );
    const latestPost = activePosts[0];
    if (latestPost) {
      const postTitle = latestPost.title?.trim() || "KenyaFundFinder Market Update";
      const postSummary = latestPost.content.replace(/\s+/g, " ").trim().slice(0, 140);
      for (const userId of allUsers) {
        if (!isEnabled(prefsByUser.get(userId)?.admin_broadcast_inapp)) continue;
        candidates.push({
          user_id: userId,
          event_key: `admin_broadcast:${userId}:${latestPost.id}`,
          title: postTitle,
          message: postSummary,
          type: "admin_broadcast",
          metadata: {
            post_id: latestPost.id,
            category: latestPost.category,
            route: "/updates",
          },
        });
      }
    }

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ evaluated: allUsers.length, inserted: 0, date: today }), { headers });
    }

    // Deduplicate against already-created event_keys in chunks before inserting
    const existingKeys = new Set<string>();
    const allKeys = candidates.map((c) => c.event_key);
    for (let i = 0; i < allKeys.length; i += 200) {
      const chunk = allKeys.slice(i, i + 200);
      const { data: existingRows, error: existingError } = await supabase
        .from("notifications")
        .select("event_key")
        .in("event_key", chunk);
      if (existingError) throw existingError;
      for (const row of existingRows ?? []) {
        if (row.event_key) existingKeys.add(row.event_key);
      }
    }

    const toInsert = candidates.filter((c) => !existingKeys.has(c.event_key));
    let inserted = 0;

    for (let i = 0; i < toInsert.length; i += 100) {
      const batch = toInsert.slice(i, i + 100);
      const { error: insertError } = await supabase.from("notifications").insert(batch);
      if (!insertError) {
        inserted += batch.length;
      } else if (insertError.code === "23505") {
        for (const row of batch) {
          const { error: singleError } = await supabase.from("notifications").insert(row);
          if (!singleError) inserted += 1;
          else if (singleError.code !== "23505") throw singleError;
        }
      } else {
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({
        evaluated_users: allUsers.length,
        candidates: candidates.length,
        inserted,
        date: today,
      }),
      { headers },
    );
  } catch (error) {
    console.error("create-market-notifications failed", error);
    return new Response(JSON.stringify({ error: "Market notifications failed" }), { status: 500, headers });
  }
});
