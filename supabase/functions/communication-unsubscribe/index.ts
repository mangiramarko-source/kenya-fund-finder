import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { normalizeEmail, verifyUnsubscribeToken } from "../_shared/communications.ts";
import { getSupabaseSecretKey } from "../_shared/supabase-keys.ts";

function html(status: number, title: string, message: string): Response {
  return new Response(`<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f5f7f9;color:#172033;padding:48px 18px"><main style="max-width:560px;margin:auto;background:#fff;border:1px solid #e3e8ef;border-radius:12px;padding:28px"><h1>${title}</h1><p>${message}</p><p><a href="https://kenyafundfinder.com/alerts?tab=settings">Manage communication preferences</a></p></main></body></html>`, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (request) => {
  if (!["GET", "POST"].includes(request.method)) return html(405, "Method not allowed", "This link only accepts unsubscribe requests.");
  const secret = Deno.env.get("COMMUNICATION_UNSUBSCRIBE_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!secret || !supabaseUrl) return html(503, "Temporarily unavailable", "Please use the communication preferences page instead.");

  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const verified = await verifyUnsubscribeToken(secret, token);
  if (!verified) return html(400, "Invalid or expired link", "This unsubscribe link is invalid or has expired.");

  const supabase = createClient(supabaseUrl, getSupabaseSecretKey(), { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userResult, error: userError } = await supabase.auth.admin.getUserById(verified.user_id);
  if (userError || !userResult.user?.email) return html(404, "Account not found", "No communication preference could be changed.");

  const preferencePatch = verified.scope === "market_brief"
    ? { market_brief_email: false, market_brief_email_consented_at: null }
    : verified.scope === "price_alert"
    ? { price_alert_email: false, price_alert_email_consented_at: null }
    : {
      market_brief_email: false, market_brief_email_consented_at: null,
      price_alert_email: false, price_alert_email_consented_at: null,
    };
  const { error: preferenceError } = await supabase
    .from("communication_preferences")
    .upsert({ user_id: verified.user_id, ...preferencePatch }, { onConflict: "user_id" });
  if (preferenceError) return html(500, "Unable to unsubscribe", "Please try again or use the preferences page.");

  const email = normalizeEmail(userResult.user.email);
  const { data: existing, error: suppressionReadError } = await supabase
    .from("communication_suppressions")
    .select("id")
    .eq("email_normalized", email)
    .eq("scope", verified.scope)
    .is("lifted_at", null)
    .maybeSingle();
  if (suppressionReadError) return html(500, "Unable to unsubscribe", "Please try again or use the preferences page.");
  if (!existing) {
    const { error: suppressionInsertError } = await supabase.from("communication_suppressions").insert({
      email_normalized: email,
      scope: verified.scope,
      reason: "unsubscribe",
      source: "one_click",
    });
    if (suppressionInsertError && suppressionInsertError.code !== "23505") {
      return html(500, "Unable to unsubscribe", "Please try again or use the preferences page.");
    }
  }

  return html(200, "You’re unsubscribed", verified.scope === "market_brief"
    ? "Market Brief emails have been disabled."
    : verified.scope === "price_alert"
    ? "Price alert emails have been disabled. In-app alerts are unchanged."
    : "All KenyaFundFinder communication emails have been disabled.");
});
