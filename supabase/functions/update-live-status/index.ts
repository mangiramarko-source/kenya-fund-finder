import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sections that are automated. "funds" (Unit Trusts) is intentionally excluded — manual only.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { hour, weekday, ymd } = nairobiNow();
    const isWeekday = weekday >= 1 && weekday <= 5; // Mon–Fri
    const inMarketHours = hour >= 9 && hour < 19; // 9am–7pm Nairobi
    const shouldBeLive = isWeekday && inMarketHours;

    const { data } = await supabase
      .from("site_pages")
      .select("meta")
      .eq("slug", "live-status")
      .single();

    const existing = (data?.meta as Record<string, unknown>) ?? {};
    const sections = { ...((existing.sections as Record<string, { is_live: boolean; last_update_date: string | null }>) ?? {}) };

    for (const key of AUTO_SECTIONS) {
      const prev = sections[key] ?? { is_live: false, last_update_date: null };
      sections[key] = {
        is_live: shouldBeLive,
        // Only refresh the date on weekdays so weekend automation never bumps it.
        last_update_date: isWeekday ? ymd : prev.last_update_date,
      };
    }

    // Preserve funds (manual). Ensure key exists.
    if (!sections.funds) {
      sections.funds = { is_live: false, last_update_date: null };
    }

    const merged = {
      ...existing,
      sections,
      // Top-level last_update_date mirrors overview cadence (weekday-only).
      last_update_date: isWeekday ? ymd : (existing.last_update_date ?? null),
    };

    const { error } = await supabase
      .from("site_pages")
      .update({ meta: merged })
      .eq("slug", "live-status");

    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true, shouldBeLive, isWeekday, hour, ymd }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
