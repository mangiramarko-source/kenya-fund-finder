import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

  // --- Database-backed rate limiting via RPC ---
  const clientIp =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  const ipHash = await hashIp(clientIp);

  const { data: allowed, error: rlError } = await supabaseAdmin.rpc("check_rate_limit", {
    p_ip_hash: ipHash,
    p_window_seconds: 60,
    p_max_requests: 30,
  });

  if (rlError) {
    console.error("rate_limit rpc error:", rlError);
  }

  if (allowed === false) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": "60",
      },
    });
  }

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
