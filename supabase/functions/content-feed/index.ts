import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, serviceKey);

    const { action, placement, ad_id, event_type, session_id, page_path } = await req.json();

    if (action === "fetch") {
      const { data, error } = await client
        .from("ads")
        .select("id, title, description, media_type, media_url, click_url, start_date, end_date, placement")
        .eq("is_active", true)
        .eq("placement", placement)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("content-feed fetch error:", error);
        return new Response(JSON.stringify({ error: "Failed to fetch content" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const today = new Date().toISOString().split("T")[0];
      const active = (data || []).filter((a: any) => {
        if (a.start_date && a.start_date > today) return false;
        if (a.end_date && a.end_date < today) return false;
        return true;
      });

      return new Response(JSON.stringify({ data: active }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "track") {
      if (!ad_id || !event_type || !["impression", "click"].includes(event_type)) {
        return new Response(JSON.stringify({ error: "Invalid tracking params" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await client.from("ad_events").insert({
        ad_id,
        event_type,
        session_id: session_id || null,
        page_path: page_path || null,
      });

      if (error) {
        console.error("content-feed track error:", error);
        return new Response(JSON.stringify({ error: "Failed to track event" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("content-feed error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
