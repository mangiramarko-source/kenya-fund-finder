export function isCronSecretAuthorized(body: Record<string, unknown>, serviceRoleKey: string) {
  const cronSecret = typeof body?.cron_secret === "string" ? body.cron_secret : "";
  return Boolean(serviceRoleKey && cronSecret && cronSecret === serviceRoleKey);
}

function decodeBase64Url(segment: string) {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

  return globalThis.atob(padded);
}

export function isLegacyCronAuthorization(authHeader: string) {
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;

  const parts = token.split(".");
  const payloadSegment = parts[1];
  if (!payloadSegment) return false;

  try {
    const payload = JSON.parse(decodeBase64Url(payloadSegment));
    const role = typeof payload?.role === "string" ? payload.role : "";
    return role === "anon" || role === "authenticated" || role === "service_role";
  } catch {
    return false;
  }
}
