// Removes OAuth token parameters from the URL fragment before analytics or
// session recording read the address. The Supabase implicit flow returns
// access_token, refresh_token, and provider_token in the URL hash. If those
// stay in the address, the session recorder captures them in `start_url`.

const AUTH_TOKEN_HASH_PATTERN =
  /(access_token|refresh_token|provider_token|provider_refresh_token|id_token)=/;

let capturedAuthHash = "";

/**
 * Move any OAuth token fragment out of the URL and into memory. Runs
 * synchronously at startup, before the Supabase client, analytics, or session
 * recording read the address. Uses history.replaceState so the token never
 * enters the browser history.
 */
export function scrubAuthTokensFromUrl(): void {
  if (typeof window === "undefined" || !window.location) return;

  const hash = window.location.hash;
  if (!hash || !AUTH_TOKEN_HASH_PATTERN.test(hash)) return;

  capturedAuthHash = hash;
  const cleanUrl = window.location.pathname + window.location.search;
  window.history.replaceState(window.history.state, "", cleanUrl);
}

/**
 * Return the OAuth token fragment captured at startup so the auth flow can
 * still establish the session. Falls back to the live URL hash when the scrub
 * did not run.
 */
export function getCapturedAuthHash(): string {
  if (capturedAuthHash) return capturedAuthHash;
  if (typeof window !== "undefined" && window.location) return window.location.hash;
  return "";
}

/** Test helper to clear the captured fragment between cases. */
export function _resetCapturedAuthHashForTesting(): void {
  capturedAuthHash = "";
}
