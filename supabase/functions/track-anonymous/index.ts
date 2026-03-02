import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 30;

async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "salt"));
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // --- Database-backed rate limiting ---
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  const ipHash = await hashIp(clientIp);
  const windowStart = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();

  // Count recent hits and purge old ones in parallel
  const [countResult] = await Promise.all([
    supabaseAdmin
      .from("rate_limit_hits")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", windowStart),
    supabaseAdmin
      .from("rate_limit_hits")
      .delete()
      .lt("created_at", windowStart),
  ]);

  const hitCount = countResult.count ?? 0;

  if (hitCount >= MAX_REQUESTS) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(WINDOW_SECONDS),
      },
    });
  }

  // Record this hit
  const { error: hitError } = await supabaseAdmin.from("rate_limit_hits").insert({ ip_hash: ipHash });
  if (hitError) console.error("rate_limit insert error:", hitError);

  // --- Request handling ---
  try {
    const { type, page_path, session_id, source, action } = await req.json();

    if (type !== "page_view" && type !== "auth_gate_click") {
      return new Response(JSON.stringify({ error: "Invalid type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!page_path || typeof page_path !== "string" || page_path.length > 500) {
      return new Response(JSON.stringify({ error: "Invalid page_path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (session_id && (typeof session_id !== "string" || session_id.length > 100)) {
      return new Response(JSON.stringify({ error: "Invalid session_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sanitizedPath = page_path.replace(/[^a-zA-Z0-9\-_\/\.]/g, "").slice(0, 500);

    if (type === "page_view") {
      const { error } = await supabaseAdmin.from("page_views").insert({
        page_path: sanitizedPath,
        session_id: session_id || null,
        user_id: null,
      });
      if (error) throw error;
    }

    if (type === "auth_gate_click") {
      if (!source || typeof source !== "string" || source.length > 100) {
        return new Response(JSON.stringify({ error: "Invalid source" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const validActions = ["signup", "signin"];
      const safeAction = validActions.includes(action) ? action : "signup";

      const { error } = await supabaseAdmin.from("auth_gate_clicks").insert({
        page_path: sanitizedPath,
        session_id: session_id || null,
        source: source.slice(0, 100),
        action: safeAction,
      });
      if (error) throw error;
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("track-anonymous error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
