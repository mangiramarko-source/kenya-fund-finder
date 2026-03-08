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
      // Fetch active ads for a placement
      const { data, error } = await client
        .from("ads")
        .select("id, title, description, media_type, media_url, click_url, start_date, end_date, placement")
        .eq("is_active", true)
        .eq("placement", placement)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Filter by date
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
      // Track impression or click
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
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
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
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
