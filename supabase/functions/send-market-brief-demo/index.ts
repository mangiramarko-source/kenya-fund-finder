import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { normalizeEmail } from "../_shared/communications.ts";
import { demoMarketBriefData, renderMarketBriefEmail } from "../_shared/market-brief-email.ts";
import { authorizePrivilegedRequest } from "../_shared/privileged-auth.ts";
import { getSupabaseSecretKey } from "../_shared/supabase-keys.ts";

const jsonHeaders = { "Content-Type": "application/json" };

async function fingerprint(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 12);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders });
  const body = await request.json().catch(() => ({})) as { confirm_demo?: unknown; preflight?: unknown };
  if (body.preflight !== true && body.confirm_demo !== true) return new Response(JSON.stringify({ error: "Explicit demo confirmation required" }), { status: 400, headers: jsonHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500, headers: jsonHeaders });
  const supabase = createClient(supabaseUrl, getSupabaseSecretKey(), { auth: { persistSession: false, autoRefreshToken: false } });
  const authorization = await authorizePrivilegedRequest(request, {
    verifyUser: async (token) => (await supabase.auth.getUser(token)).data.user?.id ?? null,
    isAdmin: async (userId) => Boolean((await supabase.from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle()).data),
  });
  if (!authorization.ok || authorization.kind !== "admin") return new Response(JSON.stringify({ error: "Forbidden" }), { status: authorization.ok ? 403 : authorization.status, headers: jsonHeaders });

  const sendMode = Deno.env.get("COMMUNICATION_SEND_MODE");
  const allowlist = [...new Set((Deno.env.get("COMMUNICATION_EMAIL_ALLOWLIST") ?? "").split(",").map(normalizeEmail).filter(Boolean))];
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("COMMUNICATION_FROM_EMAIL");
  if (sendMode !== "internal" || allowlist.length !== 1 || !resendKey || !from) {
    return new Response(JSON.stringify({ error: "Demo delivery safety gate failed" }), { status: 409, headers: jsonHeaders });
  }

  if (body.preflight === true) {
    return new Response(JSON.stringify({
      status: "ready",
      send_mode: "internal",
      allowlist_count: 1,
      demo_data_only: true,
    }), { headers: jsonHeaders });
  }

  const content = renderMarketBriefEmail(demoMarketBriefData);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: allowlist, subject: content.subject, html: content.html, text: content.text, tags: [{ name: "category", value: "market-brief-demo" }] }),
    signal: AbortSignal.timeout(20_000),
  });
  const result = await response.json().catch(() => ({})) as { id?: unknown; message?: unknown };
  if (!response.ok || typeof result.id !== "string") {
    return new Response(JSON.stringify({ error: "Resend rejected demo delivery", provider_status: response.status }), { status: 502, headers: jsonHeaders });
  }

  return new Response(JSON.stringify({
    status: "accepted",
    send_mode: "internal",
    recipient_count: 1,
    demo_data_only: true,
    provider_message_id_fingerprint: await fingerprint(result.id),
  }), { headers: jsonHeaders });
});
