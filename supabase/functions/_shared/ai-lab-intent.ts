export const AI_LAB_INTENT_TYPES = [
  "capabilities",
  "overview",
  "lookup",
  "scenario",
  "compare",
  "news",
  "explainer",
  "refusal",
  "clarification",
] as const;

export type NaturalLanguageIntentType = (typeof AI_LAB_INTENT_TYPES)[number];
export type NaturalLanguageAssetKind = "stock" | "fund" | "fx" | "commodity" | "market";
export type NaturalLanguageScenarioKind =
  | "asset-amount"
  | "stock-amount"
  | "stock-move"
  | "mmf-return"
  | "mmf-yield-change"
  | "fx-conversion"
  | "fx-move"
  | "commodity-move"
  | "portfolio-split"
  | "goal-projection";

export interface NaturalLanguageIntent {
  intent: NaturalLanguageIntentType;
  confidence: "high" | "medium" | "low";
  assetKind?: NaturalLanguageAssetKind;
  entity?: string;
  secondEntity?: string;
  topic?: string;
  scenarioKind?: NaturalLanguageScenarioKind;
  amount?: number;
  currency?: string;
  percentage?: number;
  secondPercentage?: number;
  periodDays?: number;
  periodMonths?: number;
  clarification?: string;
}

const ALLOWED_KEYS = new Set([
  "intent", "confidence", "assetKind", "entity", "secondEntity", "topic",
  "scenarioKind", "amount", "currency", "percentage", "secondPercentage",
  "periodDays", "periodMonths", "clarification",
]);
const ASSET_KINDS = new Set(["stock", "fund", "fx", "commodity", "market"]);
const CONFIDENCE = new Set(["high", "medium", "low"]);
const SCENARIOS = new Set([
  "asset-amount", "stock-amount", "stock-move", "mmf-return", "mmf-yield-change",
  "fx-conversion", "fx-move", "commodity-move", "portfolio-split",
  "goal-projection",
]);

function shortString(value: unknown, max = 100): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function boundedNumber(value: unknown, min: number, max: number): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

export function validateNaturalLanguageIntent(value: unknown):
  | { ok: true; intent: NaturalLanguageIntent }
  | { ok: false; reason: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: "not_object" };
  }
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => !ALLOWED_KEYS.has(key))) {
    return { ok: false, reason: "unknown_field" };
  }
  if (!AI_LAB_INTENT_TYPES.includes(row.intent as NaturalLanguageIntentType)) {
    return { ok: false, reason: "invalid_intent" };
  }
  if (!CONFIDENCE.has(row.confidence as string)) {
    return { ok: false, reason: "invalid_confidence" };
  }
  if (row.assetKind != null && !ASSET_KINDS.has(row.assetKind as string)) {
    return { ok: false, reason: "invalid_asset_kind" };
  }
  if (row.scenarioKind != null && !SCENARIOS.has(row.scenarioKind as string)) {
    return { ok: false, reason: "invalid_scenario_kind" };
  }
  for (const key of ["entity", "secondEntity", "topic", "currency"] as const) {
    if (row[key] != null && !shortString(row[key])) return { ok: false, reason: `invalid_${key}` };
  }
  if (row.clarification != null && !shortString(row.clarification, 180)) {
    return { ok: false, reason: "invalid_clarification" };
  }
  if (row.amount != null && !boundedNumber(row.amount, 1, 1_000_000_000_000)) {
    return { ok: false, reason: "invalid_amount" };
  }
  for (const key of ["percentage", "secondPercentage"] as const) {
    if (row[key] != null && !boundedNumber(row[key], -100, 1000)) {
      return { ok: false, reason: `invalid_${key}` };
    }
  }
  if (row.periodDays != null && !boundedNumber(row.periodDays, 1, 7305)) {
    return { ok: false, reason: "invalid_period_days" };
  }
  if (row.periodMonths != null && !boundedNumber(row.periodMonths, 1, 1200)) {
    return { ok: false, reason: "invalid_period_months" };
  }
  return { ok: true, intent: row as unknown as NaturalLanguageIntent };
}

/** Market facts are deliberately not part of this contract. */
export const FORBIDDEN_MODEL_FACT_FIELDS = [
  "price", "yield", "return", "marketCap", "volume", "answer", "summary",
] as const;

const ASSET_KIND_TO_ENTITY_KIND: Record<NaturalLanguageAssetKind, CanonicalEntityKind> = {
  stock: "stock",
  fund: "fund",
  fx: "fx",
  commodity: "commodity",
  market: "market_topic",
};

const ENTITY_KIND_TO_ASSET_KIND: Partial<Record<CanonicalEntityKind, NaturalLanguageAssetKind>> = {
  stock: "stock",
  fund: "fund",
  fx: "fx",
  commodity: "commodity",
  market_topic: "market",
};

/** Compatibility bridge while the existing scenario engine consumes its
 * established intent shape. The model-facing contract is QuerySemanticFrameV1. */
export function naturalLanguageIntentToFrame(intent: NaturalLanguageIntent): QuerySemanticFrameV1 {
  const mentions = [] as QuerySemanticFrameV1["entityMentions"];
  if (intent.entity) {
    mentions.push({
      text: intent.entity,
      role: "primary",
      expectedKinds: intent.assetKind ? [ASSET_KIND_TO_ENTITY_KIND[intent.assetKind]] : undefined,
    });
  }
  if (intent.secondEntity) mentions.push({ text: intent.secondEntity, role: "secondary" });
  return {
    version: QUERY_CONTRACT_VERSION,
    action: intent.intent,
    confidence: intent.confidence,
    entityMentions: mentions,
    requestedMetrics: [],
    parameters: {
      scenarioKind: intent.scenarioKind,
      amount: intent.amount,
      currency: intent.currency,
      percentage: intent.percentage,
      secondPercentage: intent.secondPercentage,
      periodDays: intent.periodDays,
      periodMonths: intent.periodMonths,
    },
    contextReferences: [],
    topic: intent.topic,
    clarification: intent.clarification,
  };
}

export function semanticFrameToNaturalLanguageIntent(
  frame: QuerySemanticFrameV1,
  entities: CanonicalFinancialEntity[] = [],
): NaturalLanguageIntent {
  const primary = entities[0];
  const secondary = entities[1];
  const firstMention = frame.entityMentions[0];
  const primaryKind = primary?.kind ?? firstMention?.expectedKinds?.[0];
  return {
    intent: frame.action,
    confidence: frame.confidence,
    assetKind: primaryKind ? ENTITY_KIND_TO_ASSET_KIND[primaryKind] : undefined,
    entity: primary ? (primary.kind === "fund" ? primary.displayLabel : primary.sourceKey) : firstMention?.text,
    secondEntity: secondary ? (secondary.kind === "fund" ? secondary.displayLabel : secondary.sourceKey) : frame.entityMentions[1]?.text,
    topic: frame.topic,
    scenarioKind: frame.parameters.scenarioKind as NaturalLanguageScenarioKind | undefined,
    amount: frame.parameters.amount,
    currency: frame.parameters.currency,
    percentage: frame.parameters.percentage,
    secondPercentage: frame.parameters.secondPercentage,
    periodDays: frame.parameters.periodDays,
    periodMonths: frame.parameters.periodMonths,
    clarification: frame.clarification,
  };
}

export { QUERY_CONTRACT_VERSION, validateQuerySemanticFrame };
export type { QuerySemanticFrameV1 };
import {
  QUERY_CONTRACT_VERSION,
  validateQuerySemanticFrame,
  type CanonicalEntityKind,
  type CanonicalFinancialEntity,
  type QuerySemanticFrameV1,
} from "./universal-query.ts";
