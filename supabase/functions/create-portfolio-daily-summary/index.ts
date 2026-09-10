import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { authorizePrivilegedRequest } from "../_shared/privileged-auth.ts";
import { getSupabaseSecretKey } from "../_shared/supabase-keys.ts";
import { marketMovement, mmfValue, nairobiDate, type HoldingValue, type PortfolioHolding } from "../_shared/portfolio-daily-summary.ts";

const headers = { "Content-Type": "application/json" };
const money = new Intl.NumberFormat("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const kes = (value: number) => `KES ${money.format(value)}`;

type Quote = { value: number; annualYield?: number };

function quoteKeys(holding: PortfolioHolding) {
  return [holding.asset_id, holding.ticker, holding.asset_name]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());
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
  if (!authorization.ok) return new Response(JSON.stringify({ error: "Forbidden" }), { status: authorization.status, headers });

  try {
    const today = nairobiDate();
    const now = new Date();
    const { data: holdings, error: holdingsError } = await supabase.from("mock_portfolios")
      .select("id,user_id,asset_id,asset_type,asset_name,ticker,units,buy_price,buy_date").in("asset_type", ["stock", "fx", "commodity", "mmf"]);
    if (holdingsError) throw holdingsError;
    const activeHoldings = (holdings ?? []) as PortfolioHolding[];
    if (!activeHoldings.length) return new Response(JSON.stringify({ users: 0, notifications: 0 }), { headers });

    const [stocks, currencies, commodities, funds] = await Promise.all([
      supabase.from("stocks").select("id,name,symbol,price").eq("is_active", true),
      supabase.from("exchange_rates").select("id,currency_code,currency_name,rate").eq("is_active", true),
      supabase.from("commodities").select("id,name,symbol,price").eq("is_active", true),
      supabase.from("funds").select("id,name,slug,annual_yield").eq("is_published", true),
    ]);
    for (const result of [stocks, currencies, commodities, funds]) if (result.error) throw result.error;
    const quotes = new Map<string, Quote>();
    const addQuote = (keys: Array<string | null | undefined>, quote: Quote) => keys.filter((key): key is string => Boolean(key)).forEach((key) => quotes.set(key.toLowerCase(), quote));
    for (const item of stocks.data ?? []) addQuote([item.id, item.symbol, item.name], { value: Number(item.price) });
    for (const item of currencies.data ?? []) addQuote([item.id, item.currency_code, item.currency_name, `KES/${item.currency_code}`, `KES / ${item.currency_code}`], { value: Number(item.rate) });
    for (const item of commodities.data ?? []) addQuote([item.id, item.symbol, item.name], { value: Number(item.price) });
    for (const item of funds.data ?? []) addQuote([item.id, item.slug, item.name], { value: 1, annualYield: Number(item.annual_yield) });

    const byUser = new Map<string, PortfolioHolding[]>();
    activeHoldings.forEach((holding) => byUser.set(holding.user_id, [...(byUser.get(holding.user_id) ?? []), holding]));
    const userIds = [...byUser.keys()];
    const { data: snapshots, error: snapshotsError } = await supabase.from("portfolio_daily_snapshots")
      .select("id,user_id,snapshot_date").in("user_id", userIds).lt("snapshot_date", today).order("snapshot_date", { ascending: false });
    if (snapshotsError) throw snapshotsError;
    const latestByUser = new Map<string, { id: string; user_id: string }>();
    for (const snapshot of snapshots ?? []) if (!latestByUser.has(snapshot.user_id)) latestByUser.set(snapshot.user_id, snapshot);
    const priorIds = [...latestByUser.values()].map((snapshot) => snapshot.id);
    const { data: priorHoldings, error: priorError } = priorIds.length
      ? await supabase.from("portfolio_daily_holding_snapshots").select("snapshot_id,portfolio_holding_id,asset_name,units,value").in("snapshot_id", priorIds)
      : { data: [], error: null };
    if (priorError) throw priorError;
    const priorBySnapshot = new Map<string, typeof priorHoldings>();
    for (const holding of priorHoldings ?? []) priorBySnapshot.set(holding.snapshot_id, [...(priorBySnapshot.get(holding.snapshot_id) ?? []), holding]);

    let notifications = 0;
    for (const [userId, userHoldings] of byUser) {
      const valued: HoldingValue[] = [];
      let unavailable = false;
      for (const holding of userHoldings) {
        const quote = quoteKeys(holding).map((key) => quotes.get(key)).find(Boolean);
        const value = holding.asset_type === "mmf" ? mmfValue(holding, quote?.annualYield ?? Number.NaN, now) : quote?.value && quote.value > 0 ? holding.units * quote.value : null;
        if (value === null || !Number.isFinite(value)) { unavailable = true; break; }
        valued.push({ ...holding, value });
      }
      if (unavailable || !valued.length) continue;
      const { data: snapshot, error: snapshotError } = await supabase.from("portfolio_daily_snapshots")
        .upsert({ user_id: userId, snapshot_date: today, total_value: valued.reduce((sum, item) => sum + item.value, 0) }, { onConflict: "user_id,snapshot_date" })
        .select("id").single();
      if (snapshotError) throw snapshotError;
      const { error: holdingSnapshotError } = await supabase.from("portfolio_daily_holding_snapshots").upsert(
        valued.map((holding) => ({ snapshot_id: snapshot.id, portfolio_holding_id: holding.id, asset_name: holding.asset_name, units: holding.units, value: holding.value })),
        { onConflict: "snapshot_id,portfolio_holding_id" },
      );
      if (holdingSnapshotError) throw holdingSnapshotError;
      const prior = latestByUser.get(userId);
      if (!prior) continue;
      const movement = marketMovement(valued, (priorBySnapshot.get(prior.id) ?? []).map((item) => ({ portfolio_holding_id: item.portfolio_holding_id, asset_name: item.asset_name, units: Number(item.units), value: Number(item.value) })));
      if (!movement.comparable.length) continue;
      const direction = movement.change > 0.005 ? "up" : movement.change < -0.005 ? "down" : "unchanged";
      const movers = movement.movers.map((mover) => ({ asset_name: mover.assetName, change: mover.change }));
      const moverText = movers.length ? ` Top movers: ${movers.map((mover) => `${mover.asset_name} ${mover.change >= 0 ? "+" : ""}${kes(mover.change)}`).join(", ")}.` : "";
      const title = direction === "up" ? "Portfolio up today" : direction === "down" ? "Portfolio down today" : "Portfolio unchanged today";
      const message = direction === "unchanged"
        ? `Your comparable holdings closed at ${kes(movement.closingValue)}, unchanged from opening.${moverText}`
        : `Your comparable holdings moved ${movement.change >= 0 ? "+" : ""}${kes(movement.change)} (${movement.percentChange >= 0 ? "+" : ""}${movement.percentChange.toFixed(2)}%) from ${kes(movement.openingValue)} to ${kes(movement.closingValue)}.${moverText}`;
      const { error: notificationError } = await supabase.from("notifications").insert({
        user_id: userId, event_key: `portfolio_daily:${userId}:${today}`, title, message, type: "portfolio_daily",
        metadata: { snapshot_date: today, opening_value: movement.openingValue, closing_value: movement.closingValue, change: movement.change, percent_change: movement.percentChange, movers },
      }).select("id");
      if (notificationError && notificationError.code !== "23505") throw notificationError;
      if (!notificationError) notifications += 1;
    }
    return new Response(JSON.stringify({ users: userIds.length, notifications, snapshot_date: today }), { headers });
  } catch (error) {
    console.error("create-portfolio-daily-summary failed", error);
    return new Response(JSON.stringify({ error: "Portfolio daily summary failed" }), { status: 500, headers });
  }
});
