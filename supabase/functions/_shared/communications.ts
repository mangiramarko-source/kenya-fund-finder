export type UnsubscribeScope = "market_brief" | "price_alert" | "all_email";

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(value: string): Uint8Array {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmac(secret: string, value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

export async function createUnsubscribeToken(
  secret: string,
  userId: string,
  scope: UnsubscribeScope,
  expiresAt: Date,
): Promise<string> {
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify({
    user_id: userId,
    scope,
    exp: Math.floor(expiresAt.getTime() / 1000),
  })));
  const signature = base64UrlEncode(await hmac(secret, payload));
  return `${payload}.${signature}`;
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return mismatch === 0;
}

export async function verifyUnsubscribeToken(
  secret: string,
  token: string,
  now = new Date(),
): Promise<{ user_id: string; scope: UnsubscribeScope } | null> {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const expected = await hmac(secret, payload);
  let actual: Uint8Array;
  try {
    actual = base64UrlDecode(signature);
  } catch {
    return null;
  }
  if (!constantTimeEqual(expected, actual)) return null;

  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as {
      user_id?: unknown;
      scope?: unknown;
      exp?: unknown;
    };
    if (typeof parsed.user_id !== "string" || !["market_brief", "price_alert", "all_email"].includes(String(parsed.scope))) {
      return null;
    }
    if (typeof parsed.exp !== "number" || parsed.exp < Math.floor(now.getTime() / 1000)) return null;
    return { user_id: parsed.user_id, scope: parsed.scope as UnsubscribeScope };
  } catch {
    return null;
  }
}

export function retryDelayMinutes(attempt: number): number {
  return Math.min(60, 5 * 2 ** Math.max(0, attempt - 1));
}
