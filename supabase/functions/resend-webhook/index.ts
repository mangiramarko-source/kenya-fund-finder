import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { normalizeEmail } from "../_shared/communications.ts";
import { getSupabaseSecretKey } from "../_shared/supabase-keys.ts";

const headers = { "Content-Type": "application/json" };

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) mismatch |= (left[index] ?? 0) ^ (right[index] ?? 0);
  return mismatch === 0;
}

async function validSignature(request: Request, body: string, secret: string): Promise<boolean> {
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signatureHeader = request.headers.get("svix-signature");
  if (!id || !timestamp || !signatureHeader) return false;
  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > 300) return false;

  const encodedSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let secretBytes: Uint8Array;
  try {
    secretBytes = decodeBase64(encodedSecret);
  } catch {
    return false;
  }
  const keyBytes = new Uint8Array(secretBytes.byteLength);
  keyBytes.set(secretBytes);
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${body}`)));
  return signatureHeader.split(" ").some((part) => {
    const [version, encoded] = part.split(",");
    if (version !== "v1" || !encoded) return false;
    try {
      return constantTimeEqual(expected, decodeBase64(encoded));
    } catch {
      return false;
    }
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!webhookSecret || !supabaseUrl) return new Response(JSON.stringify({ error: "Webhook not configured" }), { status: 503, headers });
  const rawBody = await request.text();
  if (!(await validSignature(request, rawBody, webhookSecret))) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers });
  }

  const event = JSON.parse(rawBody) as {
    created_at?: string;
    type?: string;
    data?: {
      email_id?: string;
      to?: string[];
      bounce?: { type?: string };
    };
  };
  const webhookEventId = request.headers.get("svix-id");
  const providerMessageId = event.data?.email_id;
  if (!webhookEventId || !providerMessageId) {
    return new Response(JSON.stringify({ received: true, ignored: "missing_event_identity" }), { headers });
  }

  const supabase = createClient(supabaseUrl, getSupabaseSecretKey(), { auth: { persistSession: false, autoRefreshToken: false } });
  const eventType = event.type ?? "";
  const supported = new Set([
    "email.sent", "email.delivered", "email.delivery_delayed", "email.failed",
    "email.bounced", "email.complained", "email.suppressed",
  ]);
  if (!supported.has(eventType)) return new Response(JSON.stringify({ received: true, ignored: eventType }), { headers });
  const headerTimestamp = Number(request.headers.get("svix-timestamp"));
  const eventCreatedAt = event.created_at && Number.isFinite(Date.parse(event.created_at))
    ? new Date(event.created_at).toISOString()
    : new Date(headerTimestamp * 1000).toISOString();
  const { data: recorded, error: recordError } = await supabase.rpc("record_communication_delivery_event", {
    p_webhook_event_id: webhookEventId,
    p_provider_message_id: providerMessageId,
    p_event_type: eventType,
    p_event_created_at: eventCreatedAt,
    p_failure_reason: eventType,
  });
  if (recordError) {
    console.error("Unable to persist Resend webhook", recordError);
    return new Response(JSON.stringify({ error: "Webhook persistence failed" }), { status: 500, headers });
  }

  const recipientEmail = normalizeEmail(recorded?.[0]?.recipient_email ?? event.data?.to?.[0] ?? "");
  const shouldSuppress = eventType === "email.complained" || eventType === "email.suppressed"
    || (eventType === "email.bounced" && event.data?.bounce?.type !== "soft");
  if (shouldSuppress) {
    if (!recipientEmail) return new Response(JSON.stringify({ error: "Suppression recipient unavailable" }), { status: 500, headers });
    const reason = eventType === "email.complained" ? "complaint"
      : eventType === "email.suppressed" ? "provider_suppression" : "hard_bounce";
    const { data: existing, error: suppressionReadError } = await supabase.from("communication_suppressions")
      .select("id").eq("email_normalized", recipientEmail).eq("scope", "all_email").is("lifted_at", null).maybeSingle();
    if (suppressionReadError) return new Response(JSON.stringify({ error: "Suppression persistence failed" }), { status: 500, headers });
    if (!existing) {
      const { error: suppressionInsertError } = await supabase.from("communication_suppressions").insert({
        email_normalized: recipientEmail, scope: "all_email", reason, source: "resend_webhook",
      });
      if (suppressionInsertError && suppressionInsertError.code !== "23505") {
        return new Response(JSON.stringify({ error: "Suppression persistence failed" }), { status: 500, headers });
      }
    }
  }

  return new Response(JSON.stringify({ received: true, duplicate: recorded?.[0]?.event_inserted === false }), { headers });
});
