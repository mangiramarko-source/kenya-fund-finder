// Central rule for when the Phase-1 Gemini educational assist may run.
// Every condition must be true. Any false → deterministic fallback silently.

import type { User } from "@supabase/supabase-js";
import { classifyEducational } from "./educationalClassifier";
import { isNewsLabPrompt } from "./newsContext";
import type { RouterResult } from "./router";

export type GeminiEligibilityInput = {
  user: User | null;
  prompt: string;
  resultKind: RouterResult["kind"];
  flagEnabled: boolean;
};

export function canUseGeminiEducationalAssist(
  input: GeminiEligibilityInput,
): boolean {
  if (!input.flagEnabled) return false;
  if (input.resultKind !== "unknown") return false;
  if (isNewsLabPrompt(input.prompt.toLowerCase())) return false;
  if (!classifyEducational(input.prompt)) return false;
  return true;
}
