import { createClient } from "../_shared/supabase-client.ts";
import { getSupabasePublishableKey, getSupabaseSecretKey } from "../_shared/supabase-keys.ts";

type SerializedPushSubscription = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

const allowedOrigins = new Set(["https://kenyafundfinder.com", "https://www.kenyafundfinder.com", "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4180", "http://127.0.0.1:4180"]);
const headers = (request: Request) => ({ "Access-Control-Allow-Origin": allowedOrigins.has(request.headers.get("origin") ?? "") ? request.headers.get("origin")! : "https://kenyafundfinder.com", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json", Vary: "Origin" });
const response = (request: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: headers(request) });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(request) });
  if (request.method !== "POST") return response(request, { error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!url || !token) return response(request, { error: "Unauthorized" }, 401);
  const userClient = createClient(url, getSupabasePublishableKey(), { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: userData } = await userClient.auth.getUser(token);
  const user = userData.user;
  if (!user) return response(request, { error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => null) as { action?: string; subscription?: SerializedPushSubscription } | null;
  const admin = createClient(url, getSupabaseSecretKey(), { auth: { persistSession: false } });
  if (body?.action === "unsubscribe") {
    const results = await Promise.all([
      admin.from("push_subscriptions").update({ is_active: false, disabled_at: new Date().toISOString() }).eq("user_id", user.id).eq("is_active", true),
      admin.from("communication_preferences").update({ price_alert_push: false, price_alert_push_consented_at: null }).eq("user_id", user.id),
    ]);
    if (results.some(({ error }) => error)) return response(request, { error: "Unable to disable device notifications" }, 500);
    return response(request, { enabled: false });
  }
  const subscription = body?.subscription;
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (body?.action !== "subscribe" || !endpoint || !p256dh || !auth) return response(request, { error: "Invalid push subscription" }, 400);
  const { data: existing } = await admin.from("push_subscriptions").select("id,user_id").eq("endpoint", endpoint).maybeSingle();
  if (existing && existing.user_id !== user.id) return response(request, { error: "This device is already linked to another account" }, 409);
  const { error } = await admin.from("push_subscriptions").upsert({ user_id: user.id, endpoint, p256dh, auth, user_agent: request.headers.get("user-agent") ?? "", is_active: true, disabled_at: null }, { onConflict: "endpoint" });
  if (error) return response(request, { error: "Unable to save device notifications" }, 500);
  const { error: preferenceError } = await admin.from("communication_preferences").update({ price_alert_push: true, price_alert_push_consented_at: new Date().toISOString() }).eq("user_id", user.id);
  if (preferenceError) return response(request, { error: "Unable to save device notification consent" }, 500);
  return response(request, { enabled: true });
});
