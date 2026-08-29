import { createClient } from "../_shared/supabase-client.ts";
import { normalizeEmail } from "../_shared/communications.ts";
import { getSupabasePublishableKey, getSupabaseSecretKey } from "../_shared/supabase-keys.ts";

const allowedOrigins = new Set([
  "https://kenyafundfinder.com",
  "https://www.kenyafundfinder.com",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function responseHeaders(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://kenyafundfinder.com",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(request) });
}

type PreferencePatch = {
  market_brief_email?: unknown;
  price_alert_email?: unknown;
  email_welcome_completed?: unknown;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: responseHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) return json(request, { error: "Server configuration error" }, 500);
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) return json(request, { error: "Unauthorized" }, 401);

  const userClient = createClient(supabaseUrl, getSupabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userResult, error: userError } = await userClient.auth.getUser(token);
  const user = userResult.user;
  if (userError || !user?.id || !user.email) return json(request, { error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => null) as PreferencePatch | null;
  if (!body || typeof body !== "object") return json(request, { error: "Invalid preference request" }, 400);
  const keys = ["market_brief_email", "price_alert_email", "email_welcome_completed"] as const;
  const supplied = keys.filter((key) => Object.prototype.hasOwnProperty.call(body, key));
  if (supplied.length === 0 || supplied.some((key) => typeof body[key] !== "boolean")) {
    return json(request, { error: "Email choices must be boolean values" }, 400);
  }

  const admin = createClient(supabaseUrl, getSupabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: saved, error: saveError } = await admin.rpc("update_communication_preferences_service", {
    p_user_id: user.id,
    p_email_normalized: normalizeEmail(user.email),
    p_market_brief_email: typeof body.market_brief_email === "boolean" ? body.market_brief_email : null,
    p_price_alert_email: typeof body.price_alert_email === "boolean" ? body.price_alert_email : null,
    p_email_welcome_completed: typeof body.email_welcome_completed === "boolean" ? body.email_welcome_completed : null,
  });
  if (saveError || !saved) return json(request, { error: "Unable to save email choices" }, 500);

  return json(request, { preferences: saved });
});
