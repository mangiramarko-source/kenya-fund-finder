/**
 * Shared Gemini helper for KenyaFundFinder Edge Functions.
 *
 * Pure parsing helpers live in _shared/gemini-parse.ts (Deno-free, so Vitest
 * can import them). This file adds the Deno/network layer: direct Gemini REST
 * + optional Lovable Gateway fallback. Secrets are read from Deno.env only —
 * never exposed to the client.
 *
 * Provider migration (Option A): text/caption generation runs on direct Gemini
 * by default. Image generation stays on Lovable Gateway in the calling
 * functions and is intentionally NOT handled here.
 */

import {
  DEFAULT_GEMINI_TEXT_MODEL,
  parseModelJson,
  fallbackCaptionFromRaw,
  mergeGenerationMetadata,
} from "./gemini-parse.ts";

// Re-export the pure helpers so callers can import everything from gemini.ts.
export {
  DEFAULT_GEMINI_TEXT_MODEL,
  parseModelJson,
  fallbackCaptionFromRaw,
  mergeGenerationMetadata,
};

// ──────────────────────────────────────────────────────────────────────────
// Config / constants
// ──────────────────────────────────────────────────────────────────────────

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const LOVABLE_CHAT_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 60_000;

export type Provider = "gemini_direct" | "lovable_gateway";

export interface GenerateTextArgs {
  system: string;
  user: string;
  /** Override the text model (else GEMINI_TEXT_MODEL env, else default). */
  model?: string;
  timeoutMs?: number;
}

export interface GenerateTextResult {
  text: string;
  model: string;
  provider: Provider;
}

function truncate(s: string, n = 300): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

// ──────────────────────────────────────────────────────────────────────────
// Gemini text fetch (direct REST)
// ──────────────────────────────────────────────────────────────────────────

/**
 * Direct Gemini REST generateContent call for text.
 * Throws on missing key, timeout, or non-OK response (with truncated body).
 */
export async function geminiGenerateText(
  args: GenerateTextArgs,
): Promise<GenerateTextResult> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const model =
    args.model ?? Deno.env.get("GEMINI_TEXT_MODEL") ?? DEFAULT_GEMINI_TEXT_MODEL;
  const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const url = `${GEMINI_BASE_URL}/${model}:generateContent`;
  const bodyPayload = {
    systemInstruction: { parts: [{ text: args.system }] },
    contents: [{ role: "user", parts: [{ text: args.user }] }],
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyPayload),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const name = (e as Error)?.name;
    if (name === "TimeoutError" || name === "AbortError") {
      throw new Error(`Gemini request timed out after ${timeoutMs}ms`);
    }
    throw new Error(`Gemini request failed: ${truncate(String(e))}`);
  }

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Gemini text ${res.status}: ${truncate(t)}`);
  }

  const json = await res.json().catch(() => null);
  const text =
    json?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p?.text ?? "")
      .join("") ?? "";

  return { text, model, provider: "gemini_direct" };
}

// ──────────────────────────────────────────────────────────────────────────
// Lovable Gateway text fetch (fallback / explicit provider)
// ──────────────────────────────────────────────────────────────────────────

async function lovableGenerateText(
  args: GenerateTextArgs,
): Promise<GenerateTextResult> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const model = args.model ?? "google/gemini-2.5-flash";
  const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let res: Response;
  try {
    res = await fetch(LOVABLE_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const name = (e as Error)?.name;
    if (name === "TimeoutError" || name === "AbortError") {
      throw new Error(`Lovable request timed out after ${timeoutMs}ms`);
    }
    throw new Error(`Lovable request failed: ${truncate(String(e))}`);
  }

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Lovable text ${res.status}: ${truncate(t)}`);
  }

  const json = await res.json().catch(() => null);
  const text = json?.choices?.[0]?.message?.content ?? "";
  return { text, model, provider: "lovable_gateway" };
}

// ──────────────────────────────────────────────────────────────────────────
// Provider router
// ──────────────────────────────────────────────────────────────────────────

/**
 * Generate social text using the configured provider.
 *  - AI_PROVIDER (default "gemini_direct") chooses the primary provider.
 *  - If the primary is Gemini and it fails, AND AI_FALLBACK_PROVIDER is
 *    "lovable_gateway" with LOVABLE_API_KEY present, retry once on Lovable.
 */
export async function generateSocialText(
  args: GenerateTextArgs,
): Promise<GenerateTextResult> {
  const provider = (Deno.env.get("AI_PROVIDER") ?? "gemini_direct") as Provider;

  // #region agent log
  console.log("[social-debug 2026-06-22] generateSocialText route", JSON.stringify({
    location: "gemini.ts:generateSocialText",
    hypothesisId: "A,C",
    ai_provider_raw: Deno.env.get("AI_PROVIDER") ?? "(unset->gemini_direct)",
    resolved_provider: provider,
  }));
  // #endregion

  if (provider === "lovable_gateway") {
    // #region agent log
    console.log("[social-debug 2026-06-22] explicit lovable_gateway provider selected", JSON.stringify({
      location: "gemini.ts:generateSocialText", hypothesisId: "C",
    }));
    // #endregion
    return await lovableGenerateText(args);
  }

  // Primary: Gemini direct
  try {
    // #region agent log
    console.log("[social-debug 2026-06-22] attempting gemini_direct", JSON.stringify({
      location: "gemini.ts:generateSocialText", hypothesisId: "A,C",
      gemini_key_present: !!Deno.env.get("GEMINI_API_KEY"),
    }));
    // #endregion
    return await geminiGenerateText(args);
  } catch (primaryErr) {
    const fallback = Deno.env.get("AI_FALLBACK_PROVIDER");
    const hasLovable = !!Deno.env.get("LOVABLE_API_KEY");
    // #region agent log
    console.log("[social-debug 2026-06-22] gemini_direct failed", JSON.stringify({
      location: "gemini.ts:generateSocialText", hypothesisId: "C",
      error: truncate(String(primaryErr)),
      ai_fallback_provider: fallback ?? "(unset)",
      lovable_key_present: hasLovable,
      will_fallback: fallback === "lovable_gateway" && hasLovable,
    }));
    // #endregion
    if (fallback === "lovable_gateway" && hasLovable) {
      console.warn(
        "Gemini text generation failed, falling back to Lovable Gateway:",
        truncate(String(primaryErr)),
      );
      return await lovableGenerateText(args);
    }
    throw primaryErr;
  }
}
