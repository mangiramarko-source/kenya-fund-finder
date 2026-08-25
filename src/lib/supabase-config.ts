/**
 * Canonical Supabase Frontend Configuration & Fail-Closed Validation
 *
 * Strict Rules:
 * 1. SUPABASE_URL must be a valid HTTPS URL pointing to Supabase (*.supabase.co).
 * 2. SUPABASE_PUBLISHABLE_KEY must be a modern publishable key starting with 'sb_publishable_'.
 * 3. SUPABASE_PROJECT_ID is derived directly from SUPABASE_URL (e.g. https://<project-ref>.supabase.co).
 *    If VITE_SUPABASE_PROJECT_ID is explicitly provided, it must match the project reference in the URL.
 * 4. Explicitly rejects:
 *    - empty or undefined values
 *    - legacy JWT keys starting with 'eyJ'
 *    - secret keys starting with 'sb_secret_' or containing 'service_role'
 *    - encrypted envelope blobs (e.g. starting with '{"v":' or base64 'eyJ2Ij')
 *    - malformed URLs or project ID mismatches
 * 5. Never echoes environment variable values in error messages.
 * 6. Uses exact static `import.meta.env.VITE_*` expressions so Vite AST transforms can statically inline them in production bundles.
 */

import { normalizeSupabaseUrl } from "./supabase-url";

export function validateSupabaseUrl(rawUrl: unknown): string {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) {
    throw new Error(
      "[Supabase Config] Missing VITE_SUPABASE_URL. A valid HTTPS Supabase URL is required."
    );
  }
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith("eyJ") || trimmed.includes('{"v":')) {
    throw new Error(
      "[Supabase Config] Invalid VITE_SUPABASE_URL: Received ciphertext or token instead of a URL."
    );
  }
  const normalized = normalizeSupabaseUrl(trimmed);
  if (!normalized || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(normalized)) {
    throw new Error(
      "[Supabase Config] Invalid VITE_SUPABASE_URL. Expected a valid HTTPS Supabase URL (e.g. https://<project>.supabase.co)."
    );
  }
  return normalized.replace(/\/$/, "");
}

export function extractProjectRefFromUrl(validatedUrl: string): string {
  const match = validatedUrl.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i);
  if (!match || !match[1]) {
    throw new Error(
      "[Supabase Config] Failed to extract project reference from Supabase URL."
    );
  }
  return match[1].toLowerCase();
}

export function validateSupabaseProjectId(rawProjectId: unknown, validatedUrl: string): string {
  const derivedRef = extractProjectRefFromUrl(validatedUrl);
  if (rawProjectId == null || rawProjectId === "" || (typeof rawProjectId === "string" && !rawProjectId.trim())) {
    return derivedRef;
  }
  if (typeof rawProjectId !== "string") {
    throw new Error(
      "[Supabase Config] Invalid VITE_SUPABASE_PROJECT_ID. Expected a string."
    );
  }
  const trimmed = rawProjectId.trim().toLowerCase();
  if (trimmed !== derivedRef) {
    throw new Error(
      "[Supabase Config] VITE_SUPABASE_PROJECT_ID mismatch: Supplied project ID does not match the project reference in VITE_SUPABASE_URL."
    );
  }
  return trimmed;
}

export function validateSupabasePublishableKey(rawKey: unknown): string {
  if (typeof rawKey !== "string" || !rawKey.trim()) {
    throw new Error(
      "[Supabase Config] Missing VITE_SUPABASE_PUBLISHABLE_KEY. An active publishable key is required."
    );
  }
  const trimmed = rawKey.trim();

  // Reject legacy JWTs and encrypted envelopes
  if (trimmed.startsWith("eyJ")) {
    throw new Error(
      "[Supabase Config] Rejected legacy JWT or encrypted envelope key. Supabase keys starting with 'eyJ' are disabled or malformed. Must use modern 'sb_publishable_*' key."
    );
  }

  // Reject secret / service role credentials
  if (
    trimmed.startsWith("sb_secret_") ||
    trimmed.toLowerCase().includes("service_role")
  ) {
    throw new Error(
      "[Supabase Config] Security violation: Service role or secret key detected in client code. NEVER expose secret keys to the browser."
    );
  }

  // Enforce modern publishable format
  if (!trimmed.startsWith("sb_publishable_")) {
    throw new Error(
      "[Supabase Config] Invalid publishable key format. Key must start with 'sb_publishable_'."
    );
  }

  return trimmed;
}

export function getValidatedSupabaseConfig() {
  const urlEnv = import.meta.env.VITE_SUPABASE_URL;
  const keyEnv = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const projectEnv = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  const url = validateSupabaseUrl(urlEnv);
  const publishableKey = validateSupabasePublishableKey(keyEnv);
  const projectId = validateSupabaseProjectId(projectEnv, url);

  return {
    supabaseUrl: url,
    supabasePublishableKey: publishableKey,
    supabaseProjectId: projectId,
  };
}
