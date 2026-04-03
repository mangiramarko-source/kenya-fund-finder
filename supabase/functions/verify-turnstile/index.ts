import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, honeypot, formLoadedAt } = await req.json();

    // 1. Honeypot check – bots fill hidden fields
    if (honeypot && typeof honeypot === "string" && honeypot.length > 0) {
      console.warn("Honeypot triggered");
      // Return success to not reveal detection to bots
      return json({ success: true });
    }

    // 2. Timing check – reject submissions completed in under 2 seconds
    if (formLoadedAt && typeof formLoadedAt === "number") {
      const elapsed = Date.now() - formLoadedAt;
      if (elapsed < 2000) {
        console.warn(`Form submitted too quickly: ${elapsed}ms`);
        return json({ success: false, error: "Please take your time filling out the form" }, 429);
      }
    }

    // 3. Rate limiting – 5 requests per minute per IP, 10-minute block
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                     req.headers.get("cf-connecting-ip") || "unknown";
    // Simple hash for privacy
    const encoder = new TextEncoder();
    const data = encoder.encode(clientIp + (Deno.env.get("CLOUDFLARE_TURNSTILE_SECRET") || "salt"));
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const ipHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check rate limit: 5 requests per 60 seconds
    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      p_ip_hash: ipHash,
      p_max_requests: 5,
      p_window_seconds: 600, // 10-minute window after limit exceeded
    });

    if (allowed === false) {
      console.warn(`Rate limited: ${ipHash.slice(0, 8)}...`);
      return json({ success: false, error: "Too many attempts. Please try again in 10 minutes." }, 429);
    }

    // 4. Turnstile token validation
    if (!token || typeof token !== "string") {
      return json({ success: false, error: "Missing token" }, 400);
    }

    const secret = Deno.env.get("CLOUDFLARE_TURNSTILE_SECRET");
    if (!secret) {
      console.error("CLOUDFLARE_TURNSTILE_SECRET not set");
      return json({ success: false, error: "Server misconfiguration" }, 500);
    }

    const formData = new FormData();
    formData.append("secret", secret);
    formData.append("response", token);

    const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });

    const outcome = await result.json();

    return json({ success: outcome.success }, outcome.success ? 200 : 403);
  } catch (e) {
    console.error("Turnstile verification error:", e);
    return json({ success: false, error: "Verification failed" }, 500);
  }
});
