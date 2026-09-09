import { parseCompareSides } from "./nameMatch";
import { buildCanonicalCatalog } from "./canonicalCatalog";
import type { MarketContext } from "./marketContext";
import {
  QUERY_CONTRACT_VERSION,
  continueQueryWithSelection,
  continueQueryWithText,
  resolveQuery,
  type QueryResolutionResult,
  type QuerySemanticFrameV1,
  type ResolutionCandidate,
} from "../../../supabase/functions/_shared/universal-query";

export interface QueryClarification {
  kind: "entity-choice" | "missing-entity";
  question: string;
  continuationToken: string;
  choices: ResolutionCandidate[];
  originalQuery: string;
}

export function isUniversalQueryResolverEnabled(): boolean {
  const value = import.meta.env?.VITE_UNIVERSAL_QUERY_RESOLVER_ENABLED;
  return value == null || value === "true" || value === "1";
}

export function isUniversalQueryShadowMode(): boolean {
  const value = import.meta.env?.VITE_UNIVERSAL_QUERY_RESOLVER_SHADOW;
  return value === "true" || value === "1";
}

function frame(action: QuerySemanticFrameV1["action"], mentions: QuerySemanticFrameV1["entityMentions"]): QuerySemanticFrameV1 {
  return {
    version: QUERY_CONTRACT_VERSION,
    action,
    confidence: "high",
    entityMentions: mentions,
    requestedMetrics: [],
    parameters: {},
    contextReferences: [],
  };
}

function stripLookupLead(prompt: string): string {
  return prompt
    .trim()
    .replace(/^(?:please\s+)?(?:show(?: me)?|tell me about|give me (?:details|information|info) (?:on|about)|what(?:'s| is) (?:the )?(?:price|yield|rate) (?:of|for)?|lookup)\s+/i, "")
    .replace(/[?.!]+$/, "")
    .trim();
}

/** Cheap, deterministic semantic framing for the high-value cases that should
 * never depend on model availability. The model handles the language long tail. */
export function inferLocalSemanticFrame(prompt: string): QuerySemanticFrameV1 | null {
  const compare = parseCompareSides(prompt);
  if (compare) {
    return frame("compare", [
      { text: compare.left, role: "primary" },
      { text: compare.right, role: "secondary" },
    ]);
  }

  const incompleteCompare = prompt.trim().match(/^compare\s+(.+?)\s*[?.!]*$/i);
  if (incompleteCompare?.[1] && !/\b(?:with|versus|vs\.?|and|to|&)\b/i.test(incompleteCompare[1])) {
    return frame("compare", [{ text: incompleteCompare[1].trim(), role: "primary" }]);
  }

  const entityText = stripLookupLead(prompt);
  const wordCount = entityText.split(/\s+/).filter(Boolean).length;
  const looksLikeEntityLookup = wordCount > 0 && wordCount <= 7 && (
    entityText.toLowerCase() === prompt.trim().replace(/[?.!]+$/, "").toLowerCase() ||
    /^(?:please\s+)?(?:show|tell|give|what|lookup)\b/i.test(prompt)
  );
  if (
    !looksLikeEntityLookup ||
    /\b(?:explain|why|how|if|when|should|would|could|can|best|recommend|smart|wise|buy|sell|hold|grab|grabbing|invest|put|allocate|convert|kes|ksh|kshs|bob)\b/i.test(entityText) ||
    /\d/.test(entityText)
  ) return null;
  return frame("lookup", [{ text: entityText, role: "primary" }]);
}

export function preflightUniversalQuery(prompt: string, ctx: MarketContext | null): QueryResolutionResult | null {
  const semanticFrame = inferLocalSemanticFrame(prompt);
  if (!semanticFrame) return null;
  const resolution = resolveQuery(semanticFrame, buildCanonicalCatalog(ctx));
  if (resolution.status === "not_found") return null;
  return resolution;
}

export function selectClarificationCandidate(
  continuationToken: string,
  entityId: string,
  ctx: MarketContext | null,
): QueryResolutionResult | null {
  return continueQueryWithSelection(continuationToken, entityId, buildCanonicalCatalog(ctx));
}

export function continueMissingEntity(
  continuationToken: string,
  text: string,
  ctx: MarketContext | null,
): QueryResolutionResult | null {
  return continueQueryWithText(continuationToken, text, buildCanonicalCatalog(ctx));
}

export function clarificationFromResolution(
  resolution: QueryResolutionResult,
  originalQuery: string,
): QueryClarification | null {
  if (resolution.status === "ambiguous") {
    return {
      kind: "entity-choice",
      question: resolution.question,
      continuationToken: resolution.continuationToken,
      choices: resolution.candidates,
      originalQuery,
    };
  }
  if (resolution.status === "resolved" && !resolution.ready && resolution.continuationToken) {
    const known = resolution.entities[0]?.displayLabel;
    const question = resolution.frame.action === "compare"
      ? `What would you like to compare${known ? ` ${known}` : " it"} with?`
      : "Which product do you mean?";
    return {
      kind: "missing-entity",
      question,
      continuationToken: resolution.continuationToken,
      choices: [],
      originalQuery,
    };
  }
  return null;
}
