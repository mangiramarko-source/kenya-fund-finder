import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  "https://kenya-fund-finder.lovable.app",
  "https://kenyafundfinder.com",
  "https://www.kenyafundfinder.com",
  "https://id-preview--e72d5937-d879-434f-ab8d-95e8c43f9adf.lovable.app",
  "https://e72d5937-d879-434f-ab8d-95e8c43f9adf.lovableproject.com",
];

const ALLOWED_EVENTS = [
  "CompleteRegistration",
  "Lead",
  "PortfolioAssetAdded",
  "WatchlistItemAdded",
  "PriceAlertCreated",
  "PageView",
] as const;

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const matched = ALLOWED_ORIGINS.find((o) => origin.startsWith(o));
  return {
    "Access-Control-Allow-Origin": matched || "",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-client-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const origin = req.headers.get("origin") || "";
  if (origin && !ALLOWED_ORIGINS.some((o) => origin.startsWith(o))) {
    return new Response(JSON.stringify({ error: "Forbidden origin" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { event_name, event_id, event_time, event_source_url, user_data, custom_data } = body;

    // 1. Strict Event Name Validation
    if (!event_name || !ALLOWED_EVENTS.includes(event_name)) {
      return new Response(
        JSON.stringify({ error: "Invalid or unsupported event_name", allowed_events: ALLOWED_EVENTS }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Event ID Validation (for deduplication)
    if (!event_id || typeof event_id !== "string" || event_id.length > 128) {
      return new Response(
        JSON.stringify({ error: "Invalid event_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pixelId = Deno.env.get("META_PIXEL_ID");
    const accessToken = Deno.env.get("META_CONVERSIONS_API_ACCESS_TOKEN");

    if (!pixelId || !accessToken) {
      // Graceful return if credentials are not yet provisioned in Supabase secrets
      return new Response(
        JSON.stringify({ ok: false, message: "Meta CAPI credentials not configured on server" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. User Data Normalization and Hashing
    const clientIp =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      user_data?.client_ip_address ||
      undefined;

    const userAgent = req.headers.get("user-agent") || user_data?.client_user_agent || undefined;

    const processedUserData: Record<string, any> = {
      client_ip_address: clientIp,
      client_user_agent: userAgent,
    };

    if (user_data?.em && typeof user_data.em === "string") {
      processedUserData.em = await sha256(user_data.em);
    }
    if (user_data?.ph && typeof user_data.ph === "string") {
      const cleanPhone = user_data.ph.replace(/[^0-9]/g, "");
      processedUserData.ph = await sha256(cleanPhone);
    }
    if (user_data?.external_id && typeof user_data.external_id === "string") {
      processedUserData.external_id = await sha256(user_data.external_id);
    }
    if (user_data?.fbp && typeof user_data.fbp === "string") {
      processedUserData.fbp = user_data.fbp.slice(0, 100);
    }
    if (user_data?.fbc && typeof user_data.fbc === "string") {
      processedUserData.fbc = user_data.fbc.slice(0, 100);
    }

    // 4. Build Meta Graph API payload
    const eventPayload = {
      data: [
        {
          event_name,
          event_time: event_time || Math.floor(Date.now() / 1000),
          event_id,
          event_source_url: event_source_url || origin,
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
        JSON.stringify({ ok: false, status: metaRes.status, error: metaData?.error?.message || "Meta API error" }),
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
