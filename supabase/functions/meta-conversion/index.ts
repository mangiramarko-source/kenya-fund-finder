import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://kenya-fund-finder.lovable.app",
  "https://kenyafundfinder.com",
  "https://www.kenyafundfinder.com",
  "https://id-preview--e72d5937-d879-434f-ab8d-95e8c43f9adf.lovable.app",
  "https://e72d5937-d879-434f-ab8d-95e8c43f9adf.lovableproject.com",
];

// CAPI allowlist: ONLY authenticated-user events.
// Anonymous events (PageView, Lead) are browser Meta Pixel ONLY.
const ALLOWED_CAPI_EVENTS = [
  "CompleteRegistration",
  "PortfolioAssetAdded",
  "WatchlistItemAdded",
  "PriceAlertCreated",
] as const;

type AllowedCapiEvent = (typeof ALLOWED_CAPI_EVENTS)[number];

// Replay Protection: In-memory TTL cache for event_id (10-minute window)
const seenEventIds = new Map<string, number>();
const REPLAY_WINDOW_MS = 10 * 60 * 1000;

// Rate Limiting: In-memory tracker per authenticated userId (max 30 requests / minute)
const userRateLimits = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS_PER_WINDOW = 30;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function cleanupCaches() {
  const now = Date.now();
  for (const [id, expiry] of seenEventIds.entries()) {
    if (now > expiry) seenEventIds.delete(id);
  }
  for (const [userId, record] of userRateLimits.entries()) {
    if (now > record.resetAt) userRateLimits.delete(userId);
  }
}

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  let record = userRateLimits.get(userId);

  if (!record || now > record.resetAt) {
    record = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    userRateLimits.set(userId, record);
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count += 1;
  return true;
}

function getCorsHeaders(origin: string) {
  const isAllowed = ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-client-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req: Request) => {
  cleanupCaches();

  const origin = req.headers.get("origin") || "";
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. Strict Origin Validation (Exact Match, Missing Origin Rejected)
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(
      JSON.stringify({ error: "Forbidden origin: origin missing or unauthorized" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. Strict HTTP Method
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 3. Payload Size Limitation (Max 10KB)
  const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
  if (contentLength > 10240) {
    return new Response(
      JSON.stringify({ error: "Payload too large" }),
      { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // 4. Cryptographic Authentication Verification with Supabase Auth getUser()
  const authHeader = req.headers.get("authorization") || "";
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = tokenMatch?.[1]?.trim();

  if (!token) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid authorization header" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey =
    Deno.env.get("SUPABASE_ANON_KEY") ||
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const { data: userData, error: authError } = await userClient.auth.getUser(token);

  if (authError || !userData?.user?.id) {
    return new Response(
      JSON.stringify({ error: "Unauthorized: invalid or expired session token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const authenticatedUserId = userData.user.id;
  const userEmail = userData.user.email;

  // 5. Rate Limiting per Authenticated User
  if (!checkRateLimit(authenticatedUserId)) {
    return new Response(
      JSON.stringify({ error: "Too many conversion requests. Please slow down." }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      }
    );
  }

  try {
    const rawBody = await req.text();
    if (rawBody.length > 10240) {
      return new Response(
        JSON.stringify({ error: "Payload too large" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { event_name, event_id, event_time, event_source_url, user_data, custom_data } = body;

    // 6. Strict Event Name Allowlist Validation
    if (!event_name || !ALLOWED_CAPI_EVENTS.includes(event_name as AllowedCapiEvent)) {
      return new Response(
        JSON.stringify({
          error: "Invalid or unsupported event_name for CAPI",
          allowed_events: ALLOWED_CAPI_EVENTS,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Event ID Replay Protection & Validation
    if (!event_id || typeof event_id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(event_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid event_id format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = Date.now();
    if (seenEventIds.has(event_id)) {
      // Deduplicated / Replay protected: Gracefully accept without re-forwarding to Meta
      return new Response(
        JSON.stringify({
          ok: true,
          duplicate: true,
          message: "Event already processed (deduplicated)",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    seenEventIds.set(event_id, now + REPLAY_WINDOW_MS);

    // 8. Event Source URL Validation
    let cleanSourceUrl = origin;
    if (event_source_url && typeof event_source_url === "string") {
      const isAllowedUrl = ALLOWED_ORIGINS.some(
        (allowed) =>
          event_source_url === allowed || event_source_url.startsWith(`${allowed}/`)
      );
      if (isAllowedUrl && event_source_url.length <= 1000) {
        cleanSourceUrl = event_source_url;
      }
    }

    // 9. Meta Server-Side Secret Access
    const pixelId = Deno.env.get("META_PIXEL_ID");
    const accessToken = Deno.env.get("META_CONVERSIONS_API_ACCESS_TOKEN");

    if (!pixelId || !accessToken) {
      // Graceful return if server secrets are not yet added
      return new Response(
        JSON.stringify({
          ok: false,
          message: "Meta CAPI credentials not configured on server",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 10. User Data Normalization & SHA-256 Hashing
    const clientIp =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      user_data?.client_ip_address ||
      undefined;

    const userAgent =
      req.headers.get("user-agent") || user_data?.client_user_agent || undefined;

    const processedUserData: Record<string, any> = {
      client_ip_address: clientIp,
      client_user_agent: userAgent,
      external_id: await sha256(authenticatedUserId),
    };

    // Use verified Supabase auth email if available, or validated client payload
    const emailToHash = userEmail || user_data?.em;
    if (emailToHash && typeof emailToHash === "string") {
      processedUserData.em = await sha256(emailToHash);
    }

    if (user_data?.ph && typeof user_data.ph === "string") {
      const cleanPhone = user_data.ph.replace(/[^0-9]/g, "");
      if (cleanPhone.length >= 7) {
        processedUserData.ph = await sha256(cleanPhone);
      }
    }
    if (user_data?.fbp && typeof user_data.fbp === "string") {
      processedUserData.fbp = user_data.fbp.slice(0, 100);
    }
    if (user_data?.fbc && typeof user_data.fbc === "string") {
      processedUserData.fbc = user_data.fbc.slice(0, 100);
    }

    // 11. Dispatch Payload to Meta Graph API
    const eventPayload = {
      data: [
        {
          event_name,
          event_time: event_time || Math.floor(now / 1000),
          event_id,
          event_source_url: cleanSourceUrl,
          action_source: "website",
          user_data: processedUserData,
          custom_data: custom_data || {},
        },
      ],
    };

    const metaUrl = `https://graph.facebook.com/v20.0/${pixelId}/events?access_token=${encodeURIComponent(
      accessToken
    )}`;

    const metaRes = await fetch(metaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventPayload),
    });

    const metaData = await metaRes.json();

    if (!metaRes.ok) {
      console.warn("[MetaCAPI] Meta Graph API returned error:", metaRes.status, metaData);
      return new Response(
        JSON.stringify({
          ok: false,
          status: metaRes.status,
          error: metaData?.error?.message || "Meta API error",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, events_received: metaData?.events_received || 1 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[MetaCAPI] Exception processing conversion event:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
