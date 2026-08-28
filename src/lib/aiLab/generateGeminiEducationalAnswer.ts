// Frontend helper — the ONLY caller of the ai-lab-explain edge function.
// Invoked only on the unknown/educational branch of the AI Lab router when
// the Gemini feature flag is on. Never used to rewrite deterministic scenario,
// comparison, MMF, stock, portfolio-split, refusal, news, or website output.

import { supabase } from "@/integrations/supabase/client";
import { STANDARD_DISCLAIMER } from "./safety";
import { validateGeminiOutput } from "./validateGeminiOutput";

export interface GeminiEducationalResult {
  ok: boolean;
  markdown?: string;
  reason?: string;
}

export function isGeminiEducationalEnabled(): boolean {
  const flag = import.meta.env?.VITE_AI_LAB_GEMINI_ENABLED;
  return flag === "true" || flag === "1";
}

export async function generateGeminiEducationalAnswer(
  prompt: string,
): Promise<GeminiEducationalResult> {
  if (!isGeminiEducationalEnabled()) return { ok: false, reason: "disabled" };
  if (!prompt || prompt.trim().length < 3) return { ok: false, reason: "empty" };

  try {
    const { data, error } = await supabase.functions.invoke("ai-lab-explain", {
      body: { prompt: prompt.trim().slice(0, 1024) },
    });

    if (error) {
      console.warn("[ai-lab] gemini invoke error", error.message);
      return { ok: false, reason: "invoke_error" };
    }

    const payload = data as { ok?: boolean; text?: string; reason?: string } | null;
    if (!payload?.ok || typeof payload.text !== "string") {
      return { ok: false, reason: payload?.reason ?? "empty_response" };
    }

    const validation = validateGeminiOutput(payload.text);
    if (!validation.ok) {
      console.warn("[ai-lab] gemini output rejected:", validation.reason);
      return { ok: false, reason: `validation:${validation.reason}` };
    }

    const markdown = `${validation.text.trim()}\n\n_${STANDARD_DISCLAIMER}_`;
    return { ok: true, markdown };
  } catch (err) {
    console.warn("[ai-lab] gemini fetch failed", err);
    return { ok: false, reason: "network_error" };
  }
}
