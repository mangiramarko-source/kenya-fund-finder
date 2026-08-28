import { createClient } from "../_shared/supabase-client.ts";

const allowedOrigins = [
  "https://kenya-fund-finder.lovable.app",
  "https://kenyafundfinder.com",
  "https://www.kenyafundfinder.com",
  "https://id-preview--e72d5937-d879-434f-ab8d-95e8c43f9adf.lovable.app",
  "https://e72d5937-d879-434f-ab8d-95e8c43f9adf.lovableproject.com",
];

const CLIENT_KEY = "kff-v1-track";

const BOT_UA_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /slurp/i, /mediapartners/i,
  /wget/i, /curl/i, /python/i, /httpx/i, /axios/i, /node-fetch/i,
  /go-http-client/i, /java\//i, /libwww/i, /scrapy/i, /phantom/i,
  /headless/i, /puppeteer/i, /playwright/i, /selenium/i,
];

function isBot(ua: string | null): boolean {
  if (!ua || ua.length < 10) return true;
  return BOT_UA_PATTERNS.some((p) => p.test(ua));
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const matched = allowedOrigins.find((o) => origin.startsWith(o));
  return {
    "Access-Control-Allow-Origin": matched || "",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-client-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "salt"));
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Block non-browser origins
  const origin = req.headers.get("origin") || "";
  if (!origin || !allowedOrigins.some((o) => origin.startsWith(o))) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Require X-Client-Key header
  const clientKey = req.headers.get("x-client-key");
  if (clientKey !== CLIENT_KEY) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Block bots by User-Agent
  const ua = req.headers.get("user-agent");
  if (isBot(ua)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Rate limit: 8 req/min per IP
  const clientIp =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const ipHash = await hashIp(clientIp);

  const { data: allowed, error: rlError } = await supabaseAdmin.rpc("check_rate_limit", {
    p_ip_hash: ipHash,
    p_window_seconds: 60,
    p_max_requests: 8,
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

    const sanitizedPath = page_path.replace(/[^a-zA-Z0-9_/.-]/g, "").slice(0, 500);

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
