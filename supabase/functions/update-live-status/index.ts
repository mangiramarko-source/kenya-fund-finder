import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sections that are automated. "funds" (MMF) is intentionally excluded — manual only.
const AUTO_SECTIONS = ["stocks", "rates", "commodities", "overview"] as const;

// Get current time in Africa/Nairobi (UTC+3, no DST).
function nairobiNow(): { hour: number; weekday: number; ymd: string } {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const nbo = new Date(utcMs + 3 * 60 * 60_000);
  return {
    hour: nbo.getHours(),
    weekday: nbo.getDay(), // 0=Sun..6=Sat
    ymd: `${nbo.getFullYear()}-${String(nbo.getMonth() + 1).padStart(2, "0")}-${String(nbo.getDate()).padStart(2, "0")}`,
  };
}

function lastWeekday(ymd: string): string {
  const date = new Date(`${ymd}T09:00:00Z`);
  const weekday = date.getUTCDay();
  if (weekday === 6) date.setUTCDate(date.getUTCDate() - 1);
  else if (weekday === 0) date.setUTCDate(date.getUTCDate() - 2);
  return date.toISOString().slice(0, 10);
}

function isGlobalMarketOpen(now: Date): boolean {
  const weekday = now.getUTCDay();
  const hour = now.getUTCHours();
  if (weekday >= 1 && weekday <= 4) return true;
  if (weekday === 5 && hour < 22) return true;
  return weekday === 0 && hour >= 22;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date();
    const { hour, weekday, ymd } = nairobiNow();
    const isWeekday = weekday >= 1 && weekday <= 5; // Mon–Fri
    const stockMarketLive = isWeekday && hour >= 9 && hour < 17;
    const globalMarketLive = isGlobalMarketOpen(now);
    const marketDate = lastWeekday(ymd);

    const { data } = await supabase
      .from("site_pages")
      .select("meta")
      .eq("slug", "live-status")
      .single();

    const existing = (data?.meta as Record<string, unknown>) ?? {};
    const sections = { ...((existing.sections as Record<string, { is_live: boolean; last_update_date: string | null }>) ?? {}) };

    const automaticLive = {
      stocks: stockMarketLive,
      overview: stockMarketLive,
      rates: globalMarketLive,
      commodities: globalMarketLive,
    };

    for (const key of AUTO_SECTIONS) {
      sections[key] = {
        is_live: automaticLive[key],
        last_update_date: marketDate,
      };
    }

    // Preserve funds (manual). Ensure key exists.
    if (!sections.funds) {
      sections.funds = { is_live: false, last_update_date: null };
    }

    const merged = {
      ...existing,
      sections,
      last_update_date: marketDate,
    };

    const { error } = await supabase
      .from("site_pages")
      .update({ meta: merged })
      .eq("slug", "live-status");

    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true, stockMarketLive, globalMarketLive, isWeekday, hour, ymd, marketDate }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
