import { supabase } from "@/integrations/supabase/client";
import {
  naturalLanguageIntentToFrame,
  validateQuerySemanticFrame,
  validateNaturalLanguageIntent,
  type NaturalLanguageIntent,
  type QuerySemanticFrameV1,
} from "../../../supabase/functions/_shared/ai-lab-intent";
import {
  validateQueryResolutionResult,
  type QueryResolutionResult,
} from "../../../supabase/functions/_shared/universal-query";
import type { AiLabSessionContext } from "./chat";
import type { MarketContext } from "./marketContext";
import { findAsset } from "./marketContext";
import { detectAdviceIntent } from "./safety";
import { isMarketNewsBriefResult } from "../../../supabase/functions/_shared/market-news-brief";
import { isDailyMarketSummaryResult } from "../../../supabase/functions/_shared/daily-market-summary";

export type { NaturalLanguageIntent } from "../../../supabase/functions/_shared/ai-lab-intent";
export {
  naturalLanguageIntentToFrame,
  validateNaturalLanguageIntent,
  validateQuerySemanticFrame,
} from "../../../supabase/functions/_shared/ai-lab-intent";

export interface NaturalLanguageInterpretationResult {
  ok: boolean;
  intent?: NaturalLanguageIntent;
  frame?: QuerySemanticFrameV1;
  resolution?: QueryResolutionResult;
  serverResult?: {
    kind: string;
    text: string;
    data?: Record<string, unknown>;
    freshness?: { fetchedAt: string; source: "server" };
  };
  clarification?: {
    question: string;
    choices: Array<{ id: string; kind: string; subtype?: string; label: string; description: string; sourceKey: string }>;
    continuationToken: string;
  };
  reason?: string;
}

export function isNaturalLanguageAssistEnabled(): boolean {
  const flag = import.meta.env?.VITE_AI_LAB_NATURAL_LANGUAGE_ENABLED;
  return flag == null || flag === "true" || flag === "1";
}

export function isServerAuthoritativeAiLabEnabled(): boolean {
  const value = import.meta.env?.VITE_AI_LAB_SERVER_AUTHORITATIVE;
  if (value == null) return import.meta.env?.MODE !== "test";
  return value === "true" || value === "1";
}

export async function interpretNaturalLanguage(
  prompt: string,
  ctx: MarketContext | null,
  session?: AiLabSessionContext,
  selectionId?: string,
): Promise<NaturalLanguageInterpretationResult> {
  if (!isNaturalLanguageAssistEnabled()) return { ok: false, reason: "disabled" };
  try {
    const { data, error } = await supabase.functions.invoke("ai-lab-assist", {
      body: {
        prompt: prompt.trim().slice(0, 1024),
        context: session
          ? {
              lastEntity: session.lastAssetQuery,
              lastIntent: session.lastScenarioKind,
              lastAmount: session.lastAmount,
              lastPercentage: session.lastYieldPct,
              lastFromYieldPct: session.lastFromYieldPct,
              lastToYieldPct: session.lastToYieldPct,
              lastCurrency: session.lastCurrency,
              continuationToken: session.pendingClarification?.continuationToken,
              selectionId,
            }
          : undefined,
      },
    });
    if (error) return { ok: false, reason: "invoke_error" };
    const payload = data as { ok?: boolean; intent?: unknown; frame?: unknown; resolution?: unknown; result?: unknown; clarification?: unknown; reason?: string } | null;
    if (!payload?.ok) return { ok: false, reason: payload?.reason ?? "empty_response" };
    const validated = validateNaturalLanguageIntent(payload.intent);
    if (!validated.ok) return { ok: false, reason: `validation:${validated.reason}` };
    const frame = payload.frame
      ? validateQuerySemanticFrame(payload.frame)
      : { ok: true as const, frame: naturalLanguageIntentToFrame(validated.intent) };
    if (!frame.ok) return { ok: false, reason: `frame_validation:${frame.reason}` };
    const resolution = payload.resolution ? validateQueryResolutionResult(payload.resolution) : undefined;
    if (payload.resolution && !resolution) return { ok: false, reason: "resolution_validation" };
    const serverResult = payload.result && typeof payload.result === "object" && typeof (payload.result as { text?: unknown }).text === "string"
      ? payload.result as NaturalLanguageInterpretationResult["serverResult"]
      : undefined;
    const routerResult = serverResult?.data?.routerResult;
    if (routerResult && typeof routerResult === "object" && (routerResult as { kind?: unknown }).kind === "market-news-brief" && !isMarketNewsBriefResult(routerResult)) {
      return { ok: false, reason: "server_result_validation" };
    }
    if (routerResult && typeof routerResult === "object" && (routerResult as { kind?: unknown }).kind === "daily-market-summary" && !isDailyMarketSummaryResult(routerResult)) {
      return { ok: false, reason: "server_result_validation" };
    }
    const clarification = payload.clarification && typeof payload.clarification === "object"
      ? payload.clarification as NaturalLanguageInterpretationResult["clarification"]
      : undefined;
    return { ok: true, intent: validated.intent, frame: frame.frame, resolution, serverResult, clarification };
  } catch {
    return { ok: false, reason: "network_error" };
  }
}

export function numberAppearsInPrompt(prompt: string, value: number | undefined): boolean {
  if (value == null) return true;
  const normalized = prompt.toLowerCase().replace(/,/g, "");
  const absolute = Math.abs(value);
  const candidates = [String(absolute)];
  if (absolute >= 1_000 && absolute % 1_000 === 0) candidates.push(`${absolute / 1_000}k`);
  if (absolute >= 1_000_000 && absolute % 1_000_000 === 0) candidates.push(`${absolute / 1_000_000}m`);
  return candidates.some((candidate) => normalized.includes(candidate.toLowerCase()));
}

/** Safe beginner education is distinct from asking the app to choose an investment. */
export function isGettingStartedPrompt(prompt: string): boolean {
  return (
    /\b(?:new|beginner|beginers?|starting|start|begin)\b.*\b(?:invest|investing|investmnt|invsting|shares?|stocks?)\b/i.test(prompt) ||
    /\b(?:how do i|how can i|where do)\s+(?:start|begin)\b.*\b(?:invest|investing)\b/i.test(prompt) ||
    /\bi (?:know|understand) (?:nothing|little) about (?:investing|shares?|stocks?)\b/i.test(prompt) ||
    /\bnataka kuanza\s+(?:ku)?invest/i.test(prompt)
  );
}

/** Fast, offline coverage for common conversational wording. Gemini handles the long tail. */
export function inferCommonNaturalLanguageIntent(
  prompt: string,
  ctx: MarketContext | null,
  session?: AiLabSessionContext,
): NaturalLanguageIntent | null {
  const lower = prompt.toLowerCase().trim();
  if (!lower) return null;
  if (isGettingStartedPrompt(prompt) && !detectAdviceIntent(prompt)) {
    return { intent: "explainer", confidence: "high", topic: "getting-started" };
  }
  if (detectAdviceIntent(prompt) || /\b(?:smart|wise|good idea)\b.*\b(?:buy|invest|put money)\b/i.test(prompt)) {
    return { intent: "refusal", confidence: "high" };
  }
  const contextualMove = lower.match(/^(?:and\s+)?(?:what\s+)?if\s+it\s+(drops?|falls?|rises?|gains?|goes\s+(?:up|down))\s+(\d+(?:\.\d+)?)\s*%/i);
  if (contextualMove && session?.lastAssetQuery) {
    const downward = /drop|fall|down/.test(contextualMove[1]);
    return {
      intent: "scenario",
      confidence: "high",
      assetKind: session.lastAssetKind,
      entity: session.lastAssetQuery,
      scenarioKind: session.lastAssetKind === "commodity"
        ? "commodity-move"
        : session.lastAssetKind === "fx"
          ? "fx-move"
          : "stock-move",
      percentage: Number(contextualMove[2]) * (downward ? -1 : 1),
      amount: session.lastAmount,
    };
  }
  const contextualHistory = lower.match(/\bhow (?:has|did) it (?:move|moved|perform|performed|do|done)(?:\s+over|\s+in|\s+for)?\s*(7|30|90|365)?\s*(?:days?|d|year)?/i);
  if (contextualHistory && session?.lastAssetQuery && session.lastAssetKind === "stock") {
    return {
      intent: "lookup",
      confidence: "high",
      assetKind: "stock",
      entity: session.lastAssetQuery,
      periodDays: Number(contextualHistory[1] || 30),
    };
  }
  const asset = findAsset(prompt, ctx?.assets ?? []);
  const conversationalOverview =
    /\b(?:help me (?:understand|learn about)|how (?:is|are|has|have).*(?:doing|performing|trading)|tell me (?:how|about)|break down|give me info|what'?s up with)\b/i.test(prompt) ||
    /\b(?:performance|share update|stock update|market update)\b/i.test(prompt) ||
    /\bshares?\s+za\b/i.test(prompt) ||
    /\b(?:nipe|nipa|kuhusu|iko aje|zinafanya aje|bei ya|elewa|iko ngapi)\b/i.test(prompt);
  if (asset && conversationalOverview) {
    return {
      intent: "overview",
      confidence: "high",
      assetKind: asset.kind,
      entity: asset.symbol,
    };
  }
  if (asset && /\b(?:price|value|rate|yield|details?|information)\b/i.test(prompt)) {
    return {
      intent: "lookup",
      confidence: "high",
      assetKind: asset.kind,
      entity: asset.symbol,
    };
  }
  return null;
}
