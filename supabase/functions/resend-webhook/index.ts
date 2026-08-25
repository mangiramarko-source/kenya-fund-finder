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
    type?: string;
    data?: {
      email_id?: string;
      to?: string[];
      bounce?: { type?: string };
    };
  };
  const providerMessageId = event.data?.email_id;
  if (!providerMessageId) return new Response(JSON.stringify({ received: true, ignored: "missing_email_id" }), { headers });

  const supabase = createClient(supabaseUrl, getSupabaseSecretKey(), { auth: { persistSession: false, autoRefreshToken: false } });
  const eventType = event.type ?? "";
  const deliveryStatus = eventType === "email.delivered"
    ? "delivered"
    : eventType === "email.bounced"
    ? "bounced"
    : eventType === "email.complained"
    ? "complained"
    : null;
  if (!deliveryStatus) return new Response(JSON.stringify({ received: true, ignored: eventType }), { headers });

  await supabase.from("communication_outbox").update({
    delivery_status: deliveryStatus,
    delivered_at: deliveryStatus === "delivered" ? new Date().toISOString() : null,
    failure_reason: deliveryStatus === "delivered" ? null : eventType,
  }).eq("provider_message_id", providerMessageId);

  const shouldSuppress = deliveryStatus === "complained"
    || (deliveryStatus === "bounced" && event.data?.bounce?.type !== "soft");
  if (shouldSuppress) {
    const reason = deliveryStatus === "complained" ? "complaint" : "hard_bounce";
    for (const rawEmail of event.data?.to ?? []) {
      const email = normalizeEmail(rawEmail);
      const { data: existing } = await supabase.from("communication_suppressions").select("id").eq("email_normalized", email).eq("scope", "all_email").is("lifted_at", null).maybeSingle();
      if (!existing) await supabase.from("communication_suppressions").insert({ email_normalized: email, scope: "all_email", reason, source: "resend_webhook" });
    }
  }

  return new Response(JSON.stringify({ received: true }), { headers });
});
