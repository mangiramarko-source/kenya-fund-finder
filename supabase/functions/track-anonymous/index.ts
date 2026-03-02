import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// --- In-memory sliding-window rate limiter (per IP) ---
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 30; // max 30 requests per window per IP
const ipHits = new Map<string, number[]>();

// Cleanup stale entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of ipHits) {
    const valid = timestamps.filter((t) => now - t < WINDOW_MS);
    if (valid.length === 0) ipHits.delete(ip);
    else ipHits.set(ip, valid);
  }
}, 300_000);

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_REQUESTS) {
    ipHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit by IP
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  if (isRateLimited(clientIp)) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": "60",
      },
    });
  }

  try {
    const { type, page_path, session_id, source, action } = await req.json();

    // Validate type
    if (type !== "page_view" && type !== "auth_gate_click") {
      return new Response(JSON.stringify({ error: "Invalid type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate required fields
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

    // Sanitize page_path to only allow valid URL paths
    const sanitizedPath = page_path.replace(/[^a-zA-Z0-9\-_\/\.]/g, "").slice(0, 500);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
