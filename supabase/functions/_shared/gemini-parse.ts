/**
 * Pure, dependency-free parsing helpers for Gemini model output.
 *
 * Kept free of Deno/network APIs (like _shared/weekly-email-sections.ts) so it
 * can be imported by both the Deno Edge Functions (via _shared/gemini.ts) and
 * Vitest tests (via relative import) without pulling in runtime globals.
 */

export const DEFAULT_GEMINI_TEXT_MODEL = "gemini-2.5-flash";

/**
 * Extract the first JSON object from raw model text.
 * Supports plain JSON and markdown-wrapped JSON (```json ... ```).
 * Returns null when nothing parseable is found.
 */
export function parseModelJson<T = unknown>(raw: string): T | null {
  if (!raw || typeof raw !== "string") return null;
  const candidates: string[] = [];
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1]);
  const brace = raw.match(/\{[\s\S]*\}/);
  if (brace?.[0]) candidates.push(brace[0]);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate.trim()) as T;
    } catch {
      // try next candidate
    }
  }
  return null;
}

/**
 * Strip code fences and return a safe trimmed caption.
 * If the raw text is empty/unusable, return the provided fallback.
 */
export function fallbackCaptionFromRaw(raw: string, fallback: string): string {
  if (!raw || typeof raw !== "string") return fallback;
  const cleaned = raw
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : fallback;
}

/**
 * Safely merge an existing source_data JSON value with generation metadata.
 * Tolerates `existing` being null/undefined/array/non-object.
 */
export function mergeGenerationMetadata(
  existing: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
  return { ...base, ...patch };
}
