import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  "https://kenya-fund-finder.lovable.app",
  "https://kenyafundfinder.com",
  "https://www.kenyafundfinder.com",
  "https://id-preview--e72d5937-d879-434f-ab8d-95e8c43f9adf.lovable.app",
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

// In-memory dedup cache
const recentEvents = new Map<string, number>();
const DEDUP_WINDOW_MS = 15_000;

function cleanDedup() {
  const cutoff = Date.now() - DEDUP_WINDOW_MS;
  for (const [key, ts] of recentEvents) {
    if (ts < cutoff) recentEvents.delete(key);
  }
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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action, placement, ad_id, event_type, session_id, page_path } = body;

    /* ── FETCH ADS ── */
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

    /* ── TRACK EVENT ── */
    if (action === "track") {
      if (!ad_id || !event_type || !["impression", "click"].includes(event_type)) {
        return new Response(JSON.stringify({ error: "Invalid tracking params" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (typeof ad_id !== "string" || ad_id.length > 50) {
        return new Response(JSON.stringify({ error: "Invalid ad_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (page_path && (typeof page_path !== "string" || page_path.length > 200)) {
        return new Response(JSON.stringify({ error: "Invalid page_path" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (session_id && (typeof session_id !== "string" || session_id.length > 64)) {
        return new Response(JSON.stringify({ error: "Invalid session_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Rate limiting: 8 req/min per IP
      const clientIp =
        req.headers.get("cf-connecting-ip") ||
        req.headers.get("x-real-ip") ||
        "unknown";
      const ipHash = await hashIp(clientIp);

      const { data: allowed, error: rlError } = await client.rpc("check_rate_limit", {
        p_ip_hash: ipHash,
        p_window_seconds: 60,
        p_max_requests: 8,
      });

      if (rlError) console.error("rate_limit rpc error:", rlError);

      if (allowed === false) {
        return new Response(JSON.stringify({ error: "Too many requests" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
        });
      }

      // Deduplication
      const dedupKey = `${session_id || ipHash}:${ad_id}:${event_type}:${page_path || ""}`;
      cleanDedup();
      if (recentEvents.has(dedupKey)) {
        return new Response(JSON.stringify({ ok: true, deduped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      recentEvents.set(dedupKey, Date.now());

      const sanitizedPath = page_path
        ? page_path.replace(/[^a-zA-Z0-9\-_\/\.]/g, "").slice(0, 200)
        : null;

      const { error } = await client.from("ad_events").insert({
        ad_id,
        event_type,
        session_id: session_id ? session_id.slice(0, 64) : null,
        page_path: sanitizedPath,
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
