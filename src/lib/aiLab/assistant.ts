// Client contract for the signed-in, server-side AI Lab assistant. The model
// key and quota logic never reach the browser.
import { supabase } from "@/integrations/supabase/client";
import { findForbiddenSafetyIssue } from "./safety";

export type AiLabAnswerMode = "kff" | "ai" | "web";

export interface AiLabSource {
  title: string;
  url: string;
}

export type AiLabRemoteResult =
  | { kind: "kff_rewrite"; prompt: string }
  | { kind: "answer"; text: string }
  | { kind: "web_answer"; text: string; sources: AiLabSource[] }
  | { kind: "blocked" | "unavailable"; reason: string };

export interface AiLabHistoryTurn {
  role: "user" | "assistant";
  text: string;
}

const MAX_HISTORY = 12;
const MAX_TEXT = 900;

function normalizeSources(value: unknown): AiLabSource[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((item): AiLabSource[] => {
    if (!item || typeof item !== "object") return [];
    const title = (item as { title?: unknown }).title;
    const url = (item as { url?: unknown }).url;
    if (typeof title !== "string" || typeof url !== "string" || !/^https:\/\//i.test(url) || seen.has(url)) return [];
    seen.add(url);
    return [{ title: title.slice(0, 160), url }];
  }).slice(0, 6);
}

function unavailable(reason: string): AiLabRemoteResult {
  return { kind: "unavailable", reason };
}

export function isContextualFollowUp(prompt: string, hasHistory: boolean): boolean {
  if (!hasHistory) return false;
  return /^(?:and\b|what about\b|how about\b|make (?:it|that)\b|change (?:it|that)\b|for\s+\d+\s*(?:months?|years?)\b|explain (?:that|it)\b|what if\b|same (?:thing|amount)\b)/i.test(prompt.trim());
}

export async function askAiLabAssistant(
  prompt: string,
  history: AiLabHistoryTurn[],
): Promise<AiLabRemoteResult> {
  const cleanPrompt = prompt.trim().slice(0, MAX_TEXT);
  const cleanHistory = history.slice(-MAX_HISTORY).map((turn) => ({
    role: turn.role,
    text: turn.text.trim().slice(0, MAX_TEXT),
  }));
  if (!cleanPrompt) return unavailable("empty_prompt");

  try {
    const { data, error } = await supabase.functions.invoke("ai-lab-chat", {
      body: { prompt: cleanPrompt, history: cleanHistory },
    });
    if (error || !data || typeof data !== "object") return unavailable("provider_unavailable");
    const payload = data as Record<string, unknown>;
    const kind = payload.kind;
    if (kind === "kff_rewrite" && typeof payload.prompt === "string" && payload.prompt.trim()) {
      return { kind, prompt: payload.prompt.trim().slice(0, MAX_TEXT) };
    }
    if (kind === "answer" && typeof payload.text === "string" && payload.text.trim()) {
      const text = payload.text.trim();
      return findForbiddenSafetyIssue(text) ? unavailable("unsafe_answer") : { kind, text };
    }
    if (kind === "web_answer" && typeof payload.text === "string" && payload.text.trim()) {
      const text = payload.text.trim();
      const sources = normalizeSources(payload.sources);
      if (!sources.length || findForbiddenSafetyIssue(text)) return unavailable("web_sources_unavailable");
      return { kind, text, sources };
    }
    if ((kind === "blocked" || kind === "unavailable") && typeof payload.reason === "string") {
      return { kind, reason: payload.reason };
    }
    return unavailable("invalid_response");
  } catch {
    return unavailable("provider_unavailable");
  }
}

export function aiLabUnavailableMessage(reason: string): string {
  switch (reason) {
    case "sign_in_required": return "Please sign in to use the AI assistant.";
    case "sensitive_data": return "For privacy, please remove personal contact, account, ID, or payment details before using AI Lab.";
    case "financial_advice": return "I can explain information and model scenarios, but I can’t recommend what to buy, sell, or choose.";
    case "chat_rate_limited": return "You have reached the temporary AI Lab limit. Please try again in a few minutes.";
    case "user_web_limit": return "You have reached today’s free web-research limit. KFF data and calculators are still available.";
    case "global_web_limit": return "Today’s free web-research allowance has been reached. Please try again tomorrow; KFF data and calculators are still available.";
    case "web_sources_unavailable": return "I couldn’t verify this with web sources right now, so I won’t guess.";
    default: return "AI assistance is temporarily unavailable. KFF data and calculators are still available.";
  }
}
