export const QUERY_CONTRACT_VERSION = 1 as const;

export const QUERY_ACTIONS = [
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

export type QueryAction = (typeof QUERY_ACTIONS)[number];
export type CanonicalEntityKind =
  | "stock"
  | "fund"
  | "fx"
  | "commodity"
  | "brand"
  | "news_topic"
  | "calculator"
  | "portfolio"
  | "market_topic";

export interface QueryEntityMention {
  text: string;
  role: "primary" | "secondary" | "subject";
  expectedKinds?: CanonicalEntityKind[];
}

export interface QueryParameters {
  amount?: number;
  currency?: string;
  percentage?: number;
  secondPercentage?: number;
  periodDays?: number;
  periodMonths?: number;
  scenarioKind?: string;
}

export interface QuerySemanticFrameV1 {
  version: typeof QUERY_CONTRACT_VERSION;
  action: QueryAction;
  confidence: "high" | "medium" | "low";
  entityMentions: QueryEntityMention[];
  requestedMetrics: string[];
  parameters: QueryParameters;
  contextReferences: Array<"last_entity" | "last_amount" | "last_percentage" | "last_currency">;
  topic?: string;
  clarification?: string;
}

export interface CanonicalFinancialEntity {
  id: string;
  kind: CanonicalEntityKind;
  subtype?: string;
  displayLabel: string;
  shortLabel?: string;
  sourceKey: string;
  sourceId?: string;
  manager?: string;
  market?: string;
  aliases: string[];
  relationships?: Array<{ type: string; targetId: string }>;
}

export interface ResolutionCandidate {
  id: string;
  kind: CanonicalEntityKind;
  subtype?: string;
  label: string;
  description: string;
  sourceKey: string;
}

interface ContinuationStateV1 {
  version: 1;
  frame: QuerySemanticFrameV1;
  resolvedEntityIds: Array<string | null>;
  pendingMentionIndex: number;
  allowedCandidateIds: string[];
}

export type QueryResolutionResult =
  | {
      status: "resolved";
      frame: QuerySemanticFrameV1;
      entities: CanonicalFinancialEntity[];
      ready: boolean;
      missingEntityRole?: "primary" | "secondary";
      continuationToken?: string;
    }
  | {
      status: "ambiguous";
      frame: QuerySemanticFrameV1;
      mention: QueryEntityMention;
      mentionIndex: number;
      candidates: ResolutionCandidate[];
      reason: "brand_spans_products" | "multiple_close_matches";
      question: string;
      continuationToken: string;
    }
  | {
      status: "not_found";
      frame: QuerySemanticFrameV1;
      mention: QueryEntityMention;
      mentionIndex: number;
      normalizedMention: string;
    };

const ALLOWED_FRAME_KEYS = new Set([
  "version", "action", "confidence", "entityMentions", "requestedMetrics",
  "parameters", "contextReferences", "topic", "clarification",
]);
const ALLOWED_MENTION_KEYS = new Set(["text", "role", "expectedKinds"]);
const ALLOWED_PARAMETER_KEYS = new Set([
  "amount", "currency", "percentage", "secondPercentage", "periodDays",
  "periodMonths", "scenarioKind",
]);
const ENTITY_KINDS = new Set<CanonicalEntityKind>([
  "stock", "fund", "fx", "commodity", "brand", "news_topic", "calculator",
  "portfolio", "market_topic",
]);
const CONTEXT_REFS = new Set([
  "last_entity", "last_amount", "last_percentage", "last_currency",
]);

function shortString(value: unknown, max = 120): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function boundedNumber(value: unknown, min: number, max: number): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

export function validateQuerySemanticFrame(value: unknown):
  | { ok: true; frame: QuerySemanticFrameV1 }
  | { ok: false; reason: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, reason: "not_object" };
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => !ALLOWED_FRAME_KEYS.has(key))) return { ok: false, reason: "unknown_field" };
  if (row.version !== QUERY_CONTRACT_VERSION) return { ok: false, reason: "invalid_version" };
  if (!QUERY_ACTIONS.includes(row.action as QueryAction)) return { ok: false, reason: "invalid_action" };
  if (!new Set(["high", "medium", "low"]).has(row.confidence as string)) return { ok: false, reason: "invalid_confidence" };
  if (!Array.isArray(row.entityMentions) || row.entityMentions.length > 4) return { ok: false, reason: "invalid_entity_mentions" };
  for (const raw of row.entityMentions) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, reason: "invalid_entity_mention" };
    const mention = raw as Record<string, unknown>;
    if (Object.keys(mention).some((key) => !ALLOWED_MENTION_KEYS.has(key))) return { ok: false, reason: "unknown_mention_field" };
    if (!shortString(mention.text)) return { ok: false, reason: "invalid_mention_text" };
    if (!new Set(["primary", "secondary", "subject"]).has(mention.role as string)) return { ok: false, reason: "invalid_mention_role" };
    if (mention.expectedKinds != null) {
      if (!Array.isArray(mention.expectedKinds) || mention.expectedKinds.length === 0 || mention.expectedKinds.some((kind) => !ENTITY_KINDS.has(kind as CanonicalEntityKind))) {
        return { ok: false, reason: "invalid_expected_kinds" };
      }
    }
  }
  if (!Array.isArray(row.requestedMetrics) || row.requestedMetrics.length > 12 || row.requestedMetrics.some((v) => !shortString(v, 50))) {
    return { ok: false, reason: "invalid_requested_metrics" };
  }
  if (!row.parameters || typeof row.parameters !== "object" || Array.isArray(row.parameters)) return { ok: false, reason: "invalid_parameters" };
  const params = row.parameters as Record<string, unknown>;
  if (Object.keys(params).some((key) => !ALLOWED_PARAMETER_KEYS.has(key))) return { ok: false, reason: "unknown_parameter" };
  if (params.amount != null && !boundedNumber(params.amount, 1, 1_000_000_000_000)) return { ok: false, reason: "invalid_amount" };
  for (const key of ["percentage", "secondPercentage"] as const) {
    if (params[key] != null && !boundedNumber(params[key], -100, 1000)) return { ok: false, reason: `invalid_${key}` };
  }
  if (params.periodDays != null && !boundedNumber(params.periodDays, 1, 7305)) return { ok: false, reason: "invalid_period_days" };
  if (params.periodMonths != null && !boundedNumber(params.periodMonths, 1, 1200)) return { ok: false, reason: "invalid_period_months" };
  if (params.currency != null && !shortString(params.currency, 10)) return { ok: false, reason: "invalid_currency" };
  if (params.scenarioKind != null && !shortString(params.scenarioKind, 40)) return { ok: false, reason: "invalid_scenario_kind" };
  if (!Array.isArray(row.contextReferences) || row.contextReferences.length > 4 || row.contextReferences.some((ref) => !CONTEXT_REFS.has(ref as string))) {
    return { ok: false, reason: "invalid_context_references" };
  }
  if (row.topic != null && !shortString(row.topic)) return { ok: false, reason: "invalid_topic" };
  if (row.clarification != null && !shortString(row.clarification, 180)) return { ok: false, reason: "invalid_clarification" };
  return { ok: true, frame: row as unknown as QuerySemanticFrameV1 };
}

const QUERY_NOISE_WORDS = new Set([
  "a", "an", "the", "please", "show", "tell", "about", "compare", "with",
  "versus", "vs", "and", "to", "for", "me", "my", "current", "latest",
  "price", "value", "details", "information", "data", "of", "in",
]);

export function normalizeEntityMention(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token && !QUERY_NOISE_WORDS.has(token))
    .join(" ");
}

function normalizeLoose(raw: string): string {
  return raw.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function explicitKinds(mention: QueryEntityMention): Set<CanonicalEntityKind> | null {
  if (mention.expectedKinds?.length) return new Set(mention.expectedKinds);
  const text = normalizeLoose(mention.text);
  if (/\b(stock|stocks|share|shares|ticker|nse|equity shares)\b/.test(text)) return new Set(["stock"]);
  if (/\b(mmf|money market|balanced fund|fixed income|bond fund|equity fund|unit trust|fund)\b/.test(text)) return new Set(["fund"]);
  if (/\b(fx|forex|currency|exchange rate)\b/.test(text)) return new Set(["fx"]);
  if (/\b(commodity|gold|silver|oil|brent|coffee|tea)\b/.test(text)) return new Set(["commodity"]);
  if (/\b(calculator|calculate|paye|compound)\b/.test(text)) return new Set(["calculator"]);
  if (/\b(portfolio|holdings|watchlist)\b/.test(text)) return new Set(["portfolio"]);
  return null;
}

function requestedSubtype(text: string): string | null {
  const loose = normalizeLoose(text);
  if (/\b(mmf|money market)\b/.test(loose)) return "money_market";
  if (/\bbalanced\b/.test(loose)) return "balanced";
  if (/\bfixed income\b/.test(loose)) return "fixed_income";
  if (/\bbond\b/.test(loose)) return "bond";
  if (/\bequity fund\b/.test(loose)) return "equity";
  if (/\b(special|specialised|specialized|shariah|thematic)\b/.test(loose)) return "special";
  return null;
}

function entityIdentityQuery(mention: QueryEntityMention): string {
  const normalized = normalizeLoose(mention.text);
  if (!explicitKinds(mention) && !requestedSubtype(mention.text)) {
    return normalizeEntityMention(normalized);
  }
  return normalizeEntityMention(normalized.replace(
    /\b(?:stocks?|shares?|ticker|nse|mmfs?|money market(?: fund)?|balanced fund?|fixed income(?: fund)?|bond fund?|equity fund|special(?:ised|ized)? fund|shariah fund|unit trust|funds?)\b/g,
    " ",
  ));
}

function entityTerms(entity: CanonicalFinancialEntity): string[] {
  return [...new Set([
    entity.displayLabel,
    entity.shortLabel ?? "",
    entity.sourceKey,
    entity.manager ?? "",
    ...entity.aliases,
  ].map(normalizeEntityMention).filter(Boolean))];
}

function candidateScore(query: string, entity: CanonicalFinancialEntity): number {
  const terms = entityTerms(entity);
  const qTokens = query.split(/\s+/).filter(Boolean);
  let score = 0;
  if (normalizeEntityMention(entity.sourceKey) === query) score += 1200;
  if (normalizeEntityMention(entity.displayLabel) === query) score += 1100;
  if (terms.includes(query)) score += 900;
  if (terms.some((term) => term.startsWith(`${query} `) || query.startsWith(`${term} `))) score += 420;
  if (terms.some((term) => term.includes(query) || query.includes(term))) score += 240;
  const tokenHits = qTokens.filter((token) => terms.some((term) => term.split(/\s+/).includes(token))).length;
  score += tokenHits * 130;
  if (qTokens.length > 0 && tokenHits === qTokens.length) score += 180;
  return score;
}

function describeCandidate(entity: CanonicalFinancialEntity): string {
  if (entity.kind === "stock") return [entity.market ?? "NSE", "stock"].join(" · ");
  if (entity.kind === "fund") {
    const subtype = (entity.subtype ?? "unit trust").replace(/_/g, " ");
    const quoteUnit = entity.market && entity.market !== "%" ? `${entity.market} class` : undefined;
    return [subtype, quoteUnit, entity.manager].filter(Boolean).join(" · ");
  }
  if (entity.kind === "fx") return "FX rate";
  if (entity.kind === "commodity") return "Commodity";
  if (entity.kind === "brand") return "Provider or fund manager";
  if (entity.kind === "news_topic") return "News topic";
  if (entity.kind === "calculator") return "Calculator";
  if (entity.kind === "portfolio") return "Portfolio tool";
  return "Market topic";
}

function toCandidate(entity: CanonicalFinancialEntity): ResolutionCandidate {
  return {
    id: entity.id,
    kind: entity.kind,
    subtype: entity.subtype,
    label: entity.displayLabel,
    description: describeCandidate(entity),
    sourceKey: entity.sourceKey,
  };
}

function encodeToken(state: ContinuationStateV1): string {
  const json = JSON.stringify(state);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `uq1.${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")}`;
}

/** Creates a server-owned continuation for a missing non-entity parameter. */
export function createParameterContinuationToken(
  frame: QuerySemanticFrameV1,
  resolvedEntityIds: string[],
): string {
  return encodeToken({
    version: 1,
    frame,
    resolvedEntityIds,
    pendingMentionIndex: frame.entityMentions.length,
    allowedCandidateIds: [],
  });
}

export function decodeContinuationToken(token: string): ContinuationStateV1 | null {
  if (!token.startsWith("uq1.") || token.length > 12_000) return null;
  try {
    const encoded = token.slice(4).replace(/-/g, "+").replace(/_/g, "/");
    const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as ContinuationStateV1;
    const validFrame = validateQuerySemanticFrame(parsed?.frame);
    if (parsed?.version !== 1 || !validFrame.ok || !Array.isArray(parsed.resolvedEntityIds) || !Array.isArray(parsed.allowedCandidateIds)) return null;
    if (!Number.isInteger(parsed.pendingMentionIndex) || parsed.pendingMentionIndex < 0 || parsed.pendingMentionIndex > 4) return null;
    return { ...parsed, frame: validFrame.frame };
  } catch {
    return null;
  }
}

function requiredEntityCount(frame: QuerySemanticFrameV1): number {
  if (frame.action === "compare") return 2;
  // A daily market report is a market-wide overview, not a lookup for one
  // entity. It can execute directly against server market tables.
  if (frame.action === "overview" && frame.topic?.startsWith("daily-market-report:")) return 0;
  if (["overview", "lookup"].includes(frame.action)) return 1;
  return 0;
}

function buildChoiceQuestion(mention: QueryEntityMention): string {
  const cleaned = mention.text.trim().replace(/[?.!]+$/, "");
  return `Which ${cleaned} product do you mean?`;
}

function resolveMention(mention: QueryEntityMention, catalog: CanonicalFinancialEntity[]):
  | { status: "resolved"; entity: CanonicalFinancialEntity }
  | { status: "ambiguous"; candidates: CanonicalFinancialEntity[]; reason: "brand_spans_products" | "multiple_close_matches" }
  | { status: "not_found" } {
  const query = entityIdentityQuery(mention);
  const kinds = explicitKinds(mention);
  const subtype = requestedSubtype(mention.text);
  const eligible = catalog.filter((entity) => {
    if (kinds && !kinds.has(entity.kind)) return false;
    if (subtype && (entity.subtype ?? "").toLowerCase() !== subtype) return false;
    return true;
  });
  // Generic type-only mentions such as "an MMF" deliberately clarify among
  // authoritative products rather than selecting an arbitrary top match.
  if (!query) {
    if (subtype && eligible.length === 1) return { status: "resolved", entity: eligible[0] };
    if (subtype && eligible.length > 1) return { status: "ambiguous", candidates: eligible, reason: "multiple_close_matches" };
    return { status: "not_found" };
  }
  const scored = eligible
    .map((entity) => ({ entity, score: candidateScore(query, entity) }))
    .filter(({ score }) => score >= 240)
    .sort((a, b) => b.score - a.score || a.entity.displayLabel.localeCompare(b.entity.displayLabel));
  if (!scored.length) return { status: "not_found" };

  const direct = scored.filter(({ entity }) => entityTerms(entity).includes(query));
  const directKinds = new Set(direct.map(({ entity }) => entity.kind));
  if (!kinds && direct.length > 1 && directKinds.size > 1) {
    return { status: "ambiguous", candidates: direct.map(({ entity }) => entity), reason: "brand_spans_products" };
  }
  // A bare provider name must remain ambiguous even when one product owns the
  // exact ticker and the others use longer names (for example KCB vs KCB MMF).
  const brandFamily = scored.filter(({ entity }) => entityTerms(entity).some(
    (term) => term === query || term.startsWith(`${query} `),
  ));
  if (!kinds && brandFamily.length > 1) {
    const familyKinds = new Set(brandFamily.map(({ entity }) => entity.kind));
    return {
      status: "ambiguous",
      candidates: brandFamily.map(({ entity }) => entity),
      reason: familyKinds.size > 1 ? "brand_spans_products" : "multiple_close_matches",
    };
  }
  const top = scored[0];
  const close = scored.filter(({ score }) => top.score - score < 55);
  if (close.length > 1) return { status: "ambiguous", candidates: close.map(({ entity }) => entity), reason: "multiple_close_matches" };
  return { status: "resolved", entity: top.entity };
}

function resolveWithState(
  frame: QuerySemanticFrameV1,
  catalog: CanonicalFinancialEntity[],
  resolvedEntityIds: Array<string | null>,
): QueryResolutionResult {
  const resolved: CanonicalFinancialEntity[] = [];
  for (let index = 0; index < frame.entityMentions.length; index += 1) {
    const preResolvedId = resolvedEntityIds[index];
    if (preResolvedId) {
      const entity = catalog.find((item) => item.id === preResolvedId);
      if (!entity) return { status: "not_found", frame, mention: frame.entityMentions[index], mentionIndex: index, normalizedMention: normalizeEntityMention(frame.entityMentions[index].text) };
      resolved.push(entity);
      continue;
    }
    const result = resolveMention(frame.entityMentions[index], catalog);
    if (result.status === "not_found") {
      return { status: "not_found", frame, mention: frame.entityMentions[index], mentionIndex: index, normalizedMention: normalizeEntityMention(frame.entityMentions[index].text) };
    }
    if (result.status === "ambiguous") {
      const candidates = result.candidates.slice(0, 4).map(toCandidate);
      return {
        status: "ambiguous",
        frame,
        mention: frame.entityMentions[index],
        mentionIndex: index,
        candidates,
        reason: result.reason,
        question: buildChoiceQuestion(frame.entityMentions[index]),
        continuationToken: encodeToken({
          version: 1,
          frame,
          resolvedEntityIds: resolved.map((entity) => entity.id).concat(Array(frame.entityMentions.length - resolved.length).fill(null)),
          pendingMentionIndex: index,
          allowedCandidateIds: candidates.map((candidate) => candidate.id),
        }),
      };
    }
    resolved.push(result.entity);
  }

  const needed = requiredEntityCount(frame);
  if (resolved.length < needed) {
    const role = resolved.length === 0 ? "primary" : "secondary";
    return {
      status: "resolved",
      frame,
      entities: resolved,
      ready: false,
      missingEntityRole: role,
      continuationToken: encodeToken({
        version: 1,
        frame,
        resolvedEntityIds: resolved.map((entity) => entity.id),
        pendingMentionIndex: frame.entityMentions.length,
        allowedCandidateIds: [],
      }),
    };
  }
  return { status: "resolved", frame, entities: resolved, ready: true };
}

export function resolveQuery(frame: QuerySemanticFrameV1, catalog: CanonicalFinancialEntity[]): QueryResolutionResult {
  return resolveWithState(frame, catalog, Array(frame.entityMentions.length).fill(null));
}

export function continueQueryWithSelection(
  continuationToken: string,
  entityId: string,
  catalog: CanonicalFinancialEntity[],
): QueryResolutionResult | null {
  const state = decodeContinuationToken(continuationToken);
  if (!state || !state.allowedCandidateIds.includes(entityId)) return null;
  const selected = catalog.find((entity) => entity.id === entityId);
  if (!selected) return null;
  const nextResolved = [...state.resolvedEntityIds];
  nextResolved[state.pendingMentionIndex] = entityId;
  return resolveWithState(state.frame, catalog, nextResolved);
}

export function continueQueryWithText(
  continuationToken: string,
  text: string,
  catalog: CanonicalFinancialEntity[],
): QueryResolutionResult | null {
  const state = decodeContinuationToken(continuationToken);
  if (!state || !shortString(text)) return null;
  if (state.allowedCandidateIds.length > 0) {
    const allowed = catalog.filter((entity) => state.allowedCandidateIds.includes(entity.id));
    const pendingMention = state.frame.entityMentions[state.pendingMentionIndex];
    if (!pendingMention || !allowed.length) return null;
    const normalizedAnswer = normalizeLoose(text);
    const descriptorMatches = allowed.filter((entity) => [
      entity.kind,
      entity.subtype?.replace(/_/g, " ") ?? "",
      entity.market ?? "",
    ].some((descriptor) => descriptor && (normalizedAnswer === descriptor || normalizedAnswer.includes(descriptor))));
    if (descriptorMatches.length === 1) {
      const nextResolved = [...state.resolvedEntityIds];
      nextResolved[state.pendingMentionIndex] = descriptorMatches[0].id;
      return resolveWithState(state.frame, catalog, nextResolved);
    }
    const answer = resolveMention({ ...pendingMention, text }, allowed);
    if (answer.status !== "resolved") return null;
    const nextResolved = [...state.resolvedEntityIds];
    nextResolved[state.pendingMentionIndex] = answer.entity.id;
    return resolveWithState(state.frame, catalog, nextResolved);
  }
  const nextFrame: QuerySemanticFrameV1 = {
    ...state.frame,
    entityMentions: [
      ...state.frame.entityMentions,
      { text: text.trim().slice(0, 120), role: state.frame.entityMentions.length === 0 ? "primary" : "secondary" },
    ],
  };
  return resolveWithState(nextFrame, catalog, [...state.resolvedEntityIds, null]);
}

/** Continues a request that already resolved its entities but was missing
 * scenario parameters such as an amount. Explicit values from the follow-up
 * frame are merged into the original frame; the prompt is never reinterpreted
 * as a new product name. */
export function continueQueryWithParameters(
  continuationToken: string,
  followUpFrame: QuerySemanticFrameV1,
  catalog: CanonicalFinancialEntity[],
): QueryResolutionResult | null {
  const state = decodeContinuationToken(continuationToken);
  if (!state || state.allowedCandidateIds.length > 0) return null;
  // A compare continuation with one selected product is waiting for its
  // second entity, not for scenario inputs. A reply such as "10k USD" has
  // parameters, but USD must still be resolved as the comparison target.
  if (state.frame.action !== "scenario") return null;
  if (state.pendingMentionIndex !== state.frame.entityMentions.length) return null;
  const suppliedParameters = Object.fromEntries(
    Object.entries(followUpFrame.parameters).filter(([, value]) => value != null),
  );
  if (Object.keys(suppliedParameters).length === 0) return null;
  const mergedFrame: QuerySemanticFrameV1 = {
    ...state.frame,
    parameters: { ...state.frame.parameters, ...suppliedParameters },
    contextReferences: [
      ...new Set([...state.frame.contextReferences, ...followUpFrame.contextReferences]),
    ],
  };
  return resolveWithState(mergedFrame, catalog, state.resolvedEntityIds);
}

export function rankCanonicalEntities(
  query: string,
  catalog: CanonicalFinancialEntity[],
  limit = 25,
): CanonicalFinancialEntity[] {
  const normalized = normalizeEntityMention(query);
  if (!normalized) return catalog.slice(0, limit);
  return catalog
    .map((entity) => ({ entity, score: candidateScore(normalized, entity) }))
    .filter(({ score }) => score >= 130)
    .sort((a, b) => b.score - a.score || a.entity.displayLabel.localeCompare(b.entity.displayLabel))
    .slice(0, limit)
    .map(({ entity }) => entity);
}

function isCanonicalEntity(value: unknown): value is CanonicalFinancialEntity {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return shortString(row.id, 120) && ENTITY_KINDS.has(row.kind as CanonicalEntityKind) &&
    shortString(row.displayLabel, 160) && shortString(row.sourceKey, 160) &&
    Array.isArray(row.aliases) && row.aliases.length <= 40 && row.aliases.every((alias) => typeof alias === "string" && alias.length <= 160);
}

/** Network-boundary validator for resolver results returned by the Edge Function. */
export function validateQueryResolutionResult(value: unknown): QueryResolutionResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const frameResult = validateQuerySemanticFrame(row.frame);
  if (!frameResult.ok) return null;
  if (row.status === "resolved") {
    if (!Array.isArray(row.entities) || !row.entities.every(isCanonicalEntity) || typeof row.ready !== "boolean") return null;
    if (row.continuationToken != null && (typeof row.continuationToken !== "string" || !decodeContinuationToken(row.continuationToken))) return null;
    return { ...row, frame: frameResult.frame } as QueryResolutionResult;
  }
  if (row.status === "ambiguous") {
    if (!row.mention || typeof row.mention !== "object" || !Number.isInteger(row.mentionIndex) || !Array.isArray(row.candidates) || row.candidates.length < 2 || row.candidates.length > 4) return null;
    if (!shortString(row.question, 200) || typeof row.continuationToken !== "string" || !decodeContinuationToken(row.continuationToken)) return null;
    const candidatesValid = row.candidates.every((candidate) => {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return false;
      const item = candidate as Record<string, unknown>;
      return shortString(item.id, 120) && ENTITY_KINDS.has(item.kind as CanonicalEntityKind) && shortString(item.label, 160) && shortString(item.description, 200) && shortString(item.sourceKey, 160);
    });
    if (!candidatesValid || !new Set(["brand_spans_products", "multiple_close_matches"]).has(row.reason as string)) return null;
    return { ...row, frame: frameResult.frame } as QueryResolutionResult;
  }
  if (row.status === "not_found") {
    if (!row.mention || typeof row.mention !== "object" || !Number.isInteger(row.mentionIndex) || typeof row.normalizedMention !== "string") return null;
    return { ...row, frame: frameResult.frame } as QueryResolutionResult;
  }
  return null;
}
