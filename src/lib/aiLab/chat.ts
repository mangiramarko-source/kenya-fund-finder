// Phase 11A / 13 — in-memory chat message model and deterministic helpers.
// No LLM, no persistence, no prompt enrichment from session context.

import type { RouterResult } from "./router";
import { routePrompt } from "./router";
import { safeUUID } from "@/lib/safeUUID";
import { STANDARD_DISCLAIMER, detectAdviceIntent, FORBIDDEN_PATTERNS } from "./safety";
import { buildRefusal } from "./safety";
import { isGenericStockTerm, isPortfolioSplitIntent } from "./portfolioSplitParse";
import {
  composeAssistantResponse,
  composeClarifyingResponse,
  composeCapabilitiesGuide,
  composeFilterUnsupportedResponse,
  isCapabilitiesPrompt,
} from "./responseComposer";
import { isMmfYieldRankingPrompt, isUnsupportedFilterLookupPrompt } from "./websiteLookup";
import { applyLiveContext, findAsset, type MarketContext } from "./marketContext";
import type { NewsContext } from "./newsContext";
import { resolveStockPerformanceLookup, resolveWebsiteLookup } from "./websiteLookup";
import {
  interpretNaturalLanguage,
  inferCommonNaturalLanguageIntent,
  numberAppearsInPrompt,
  type NaturalLanguageIntent,
  type NaturalLanguageInterpretationResult,
} from "./naturalLanguageIntent";

export type AiLabChatRole = "user" | "assistant" | "system";

export type AiLabChatStatus =
  | "sent"
  | "answered"
  | "refused"
  | "unknown"
  | "clarifying"
  | "pending"
  | "error";

export interface AiLabChatMessage {
  id: string;
  role: AiLabChatRole;
  text: string;
  createdAt: string;
  result?: RouterResult;
  status?: AiLabChatStatus;
  contextNote?: string;
  followUps?: string[];
  feedback?: "helpful" | "not-helpful";
}

export interface AiLabSessionContext {
  lastAmount?: number;
  lastAssetQuery?: string;
  lastYieldPct?: number;
  lastCurrency?: string;
  lastScenarioKind?: string;
  lastAssetKind?: "stock" | "fund" | "fx" | "commodity";
}

export interface ClarifyingResponse {
  text: string;
  disclaimer: string;
  followUps: string[];
}

export interface WelcomeExampleCategory {
  label: string;
  prompt: string;
}

export const WELCOME_EXAMPLE_CATEGORIES: WelcomeExampleCategory[] = [
  { label: "Stocks", prompt: "KES 10,000 in SCOM" },
  { label: "MMFs", prompt: "Model KES 100k in an MMF at 11%" },
  { label: "FX", prompt: "KES 100,000 to USD" },
  { label: "Commodities", prompt: "Gold rises 5%" },
  { label: "Portfolio", prompt: "Split 100k between MMF and SCOM" },
  { label: "News", prompt: "Latest news about Safaricom" },
  { label: "Explain", prompt: "Explain dividend yield" },
  { label: "Start investing", prompt: "Help me get started with investing" },
];

const AMOUNT_RE =
  /(?:kes|ksh|kshs|sh)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)(?:\s*(k|m)\b)?(?!\s*%)/i;
const YIELD_RE = /([0-9]+(?:\.[0-9]+)?)\s*%/;
const FUND_CONTEXT_RE =
  /\b(mmf|money market|unit trust|mutual fund|money market fund)\b/i;
const NAMED_STOCK_PATTERN =
  /\b(scom|eqty|kcb|scbk|safaricom|equity group|kcb group|britam|eabl|kengen|ncba|co-op)\b/i;
const CURRENCY_RE = /\b(usd|eur|gbp|chf|cad|aud|jpy|cny)\b/i;

const EXPLICIT_LOOKUP_RE =
  /\b(?:show|what(?:'s| is)|current|latest|data for|details for|tell me about)\b.*\b(?:price|yield|rate|value|data|details?|information)\b/i;

const SCENARIO_SIGNAL_RES: RegExp[] = [
  FUND_CONTEXT_RE,
  /\b(stock|share|equity|ticker|nse)\b/i,
  NAMED_STOCK_PATTERN,
  /\bcompare\b/i,
  /\b(to|into)\s+(usd|eur|gbp|chf|cad|aud|jpy|cny)\b/i,
  CURRENCY_RE,
  /\b(fx|forex|currency|exchange rate)\b/i,
  /\bgold\b|\bbrent\b|\bcrude\b|\boil\b|\bcommodit/i,
  /\bnews\b|\bheadline\b|\barticle\b/i,
  /\bexplain\b|\bwhat is\b|\bwhat's\b/i,
  /\bsplit\b/i,
  /\bbetween\b.*\b(mmf|money market|stock|share)/i,
  /\b(falls?|rises?|drops?|increase|decrease|move)\b/i,
  /\byield\b/i,
  /\bmonthly\b|\bmonths?\b|\byears?\b/i,
  /\bif i\b/i,
  /\bhow much\b/i,
  /\bwhat happens\b/i,
  /\bprojection\b/i,
];

let messageCounter = 0;

function nextMessageId(): string {
  messageCounter += 1;
  return safeUUID();
}

function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[0-9][0-9,]*(?:\.[0-9]+)?\s*%/g, " ");
  const m = cleaned.match(AMOUNT_RE);
  if (!m) return null;
  let n = parseFloat(m[1].replace(/,/g, ""));
  if (isNaN(n)) return null;
  if (m[2]?.toLowerCase() === "k") n *= 1_000;
  if (m[2]?.toLowerCase() === "m") n *= 1_000_000;
  if (n < 1) return null;
  return n;
}

function parseYieldPct(text: string): number | null {
  const m = text.match(YIELD_RE);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return isNaN(n) ? null : n;
}

function formatKesAmount(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);
}

function hasScenarioSignal(prompt: string): boolean {
  return SCENARIO_SIGNAL_RES.some((re) => re.test(prompt));
}

function isAmountOnlyPrompt(prompt: string, ctx?: MarketContext | null): boolean {
  const amount = parseAmount(prompt);
  if (amount == null) return false;
  if (findAsset(prompt, ctx?.assets ?? [])) return false;
  if (hasScenarioSignal(prompt)) return false;
  return true;
}

function extractGenericStockTerm(prompt: string): string | null {
  const betweenMatch = prompt.match(
    /\bbetween\s+(?:an?\s+)?(?:mmf|money market(?:\s+fund)?)[^,]+?\s+and\s+([a-z0-9\s.'&-]+?)(?:\?|\.|$|\bat\b)/i,
  );
  if (betweenMatch?.[1]) {
    const term = betweenMatch[1].trim().replace(/\bat\s+\d.*$/i, "").trim();
    if (isGenericStockTerm(term)) return term;
  }

  const splitMatch = prompt.match(
    /\bsplit\s+(?:kes\s+)?[0-9k,\s.]+\s+between\s+(?:mmf|money market(?:\s+fund)?)[^,]+?\s+and\s+([a-z0-9\s.'&-]+?)(?:\?|\.|$|\bat\b)/i,
  );
  if (splitMatch?.[1]) {
    const term = splitMatch[1].trim().replace(/\bat\s+\d.*$/i, "").trim();
    if (isGenericStockTerm(term)) return term;
  }

  const genericMatch = prompt.match(/\b(stocks?|shares?|equities?)\b/i);
  if (
    genericMatch &&
    FUND_CONTEXT_RE.test(prompt) &&
    !NAMED_STOCK_PATTERN.test(prompt)
  ) {
    return genericMatch[1];
  }

  return null;
}

function needsSplitClarification(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  if (!FUND_CONTEXT_RE.test(lower)) return false;
  if (NAMED_STOCK_PATTERN.test(lower)) return false;

  const genericTerm = extractGenericStockTerm(prompt);
  if (genericTerm) return true;

  if (
    isPortfolioSplitIntent(lower, prompt) &&
    /\b(stocks?|shares?|equities?)\b/i.test(lower) &&
    !NAMED_STOCK_PATTERN.test(lower)
  ) {
    return true;
  }

  return false;
}

function statusFromResult(result?: RouterResult): AiLabChatStatus {
  if (!result) return "clarifying";
  if (result.kind === "refusal") return "refused";
  if (result.kind === "unknown") return "unknown";
  return "answered";
}

export function createUserMessage(text: string): AiLabChatMessage {
  return {
    id: nextMessageId(),
    role: "user",
    text,
    createdAt: new Date().toISOString(),
    status: "sent",
  };
}

export function createAssistantMessage(args: {
  text: string;
  result?: RouterResult;
  status?: AiLabChatStatus;
  contextNote?: string;
  followUps?: string[];
}): AiLabChatMessage {
  const status = args.status ?? statusFromResult(args.result);
  return {
    id: nextMessageId(),
    role: "assistant",
    text: args.text,
    createdAt: new Date().toISOString(),
    result: args.result,
    status,
    contextNote: args.contextNote,
    followUps: args.followUps,
  };
}

export function deriveSessionContext(
  messages: AiLabChatMessage[],
): AiLabSessionContext {
  const ctx: AiLabSessionContext = {};

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];

    if (msg.role === "assistant" && msg.result && !ctx.lastScenarioKind) {
      ctx.lastScenarioKind = msg.result.kind;
      if (msg.result.kind === "website-lookup") {
        ctx.lastAssetQuery = msg.result.entitySymbol ?? msg.result.entityName;
        ctx.lastAssetKind = msg.result.entityType;
      } else if (msg.result.kind === "stock-amount" || msg.result.kind === "stock-move") {
        ctx.lastAssetQuery = msg.result.inputs.symbol;
        ctx.lastAssetKind = "stock";
      } else if (msg.result.kind === "commodity-amount" || msg.result.kind === "commodity-move") {
        ctx.lastAssetQuery = msg.result.inputs.symbol;
        ctx.lastAssetKind = "commodity";
      } else if (msg.result.kind === "fx-conversion") {
        ctx.lastAssetQuery = msg.result.inputs.toCurrency;
        ctx.lastAssetKind = "fx";
      }
    }

    if (msg.role === "user") {
      if (ctx.lastAmount == null) {
        const amount = parseAmount(msg.text);
        if (amount != null) ctx.lastAmount = amount;
      }
      if (ctx.lastYieldPct == null) {
        const yieldPct = parseYieldPct(msg.text);
        if (yieldPct != null) ctx.lastYieldPct = yieldPct;
      }
      if (ctx.lastCurrency == null) {
        const currencyMatch = msg.text.match(CURRENCY_RE);
        if (currencyMatch) ctx.lastCurrency = currencyMatch[1].toUpperCase();
      }
    }
  }

  return ctx;
}

export function getAssistantTextFromResult(result: RouterResult): string {
  return composeAssistantResponse({ prompt: "", result }).text;
}

function needsMmfYieldClarification(prompt: string): boolean {
  if (!FUND_CONTEXT_RE.test(prompt)) return false;
  if (parseYieldPct(prompt) != null) return false;
  if (/\bhow much\b/i.test(prompt) && /\b(mmf|money market|yield)\b/i.test(prompt)) {
    return true;
  }
  if (/\b(at|with)\s+(an?\s+)?(mmf|money market)\b/i.test(prompt) && !YIELD_RE.test(prompt)) {
    return true;
  }
  return false;
}

export function buildClarifyingResponse(
  prompt: string,
  sessionContext?: AiLabSessionContext,
  ctx?: MarketContext | null,
): ClarifyingResponse | null {
  if (detectAdviceIntent(prompt)) return null;

  if (needsSplitClarification(prompt)) {
    const composed = composeClarifyingResponse({
      text:
        'I can model a split scenario, but I need a named stock and a yield assumption. Example: "Split 100k between MMF and SCOM at 11% yield."',
      followUps: [
        "Split 100k between MMF and SCOM at 11% yield",
        "KES 10,000 in SCOM",
        "What can I ask?",
      ],
    });
    return { ...composed, disclaimer: STANDARD_DISCLAIMER };
  }

  if (needsMmfYieldClarification(prompt)) {
    const composed = composeClarifyingResponse({
      text:
        "I can model an MMF scenario, but I need a yield assumption. Example: \"Model KES 100k in an MMF at 11%.\"",
      followUps: [
        "Model KES 100k in an MMF at 11%",
        "Show Etica MMF yield",
        "Explain withholding tax",
      ],
    });
    return { ...composed, disclaimer: STANDARD_DISCLAIMER };
  }

  if (isAmountOnlyPrompt(prompt, ctx)) {
    const amount = parseAmount(prompt) ?? sessionContext?.lastAmount;
    const amountPhrase = amount != null ? formatKesAmount(amount) : "that amount";
    const composed = composeClarifyingResponse({
      text: `I can model that, but I need one more detail: which stock, fund, FX pair, or scenario type should I use with ${amountPhrase}?`,
      followUps: [
        "KES 10,000 in SCOM",
        "Model KES 100k in an MMF at 11%",
        "KES 100,000 to USD",
      ],
    });
    return { ...composed, disclaimer: STANDARD_DISCLAIMER };
  }

  return null;
}

export function buildFollowUpSuggestions(
  result?: RouterResult,
  prompt?: string,
): string[] {
  if (!result) {
    return WELCOME_EXAMPLE_CATEGORIES.slice(0, 4).map((c) => c.prompt);
  }
  return composeAssistantResponse({ prompt: prompt ?? "", result }).followUps;
}

/** Test helper — clarifying text must not contain forbidden advisory phrases. */
export function clarifyingTextIsSafe(text: string): boolean {
  return !FORBIDDEN_PATTERNS.some((re) => re.test(text));
}

export type AiLabPromptRoute =
  | "capabilities"
  | "filter-unsupported"
  | "clarifying"
  | "website-lookup"
  | "natural-language"
  | "router";

export interface AiLabPromptOutput {
  route: AiLabPromptRoute;
  text: string;
  result?: RouterResult;
  followUps?: string[];
  contextNote?: string;
}

export interface AiLabPromptOptions {
  sessionContext?: AiLabSessionContext;
  naturalLanguage?: boolean;
  interpreter?: (
    prompt: string,
    ctx: MarketContext | null,
    session?: AiLabSessionContext,
  ) => Promise<NaturalLanguageInterpretationResult>;
}

function canonicalAmount(amount: number | undefined): string {
  return amount == null ? "" : `KES ${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function valueFromPromptOrContext(
  prompt: string,
  value: number | undefined,
  contextValue: number | undefined,
): number | undefined {
  if (value == null) return contextValue;
  return numberAppearsInPrompt(prompt, value) || value === contextValue ? value : undefined;
}

function contextualizeFollowUp(prompt: string, session?: AiLabSessionContext): string {
  if (!session?.lastAssetQuery || !/^(?:and\s+)?(?:what about|how about|what of)\b/i.test(prompt.trim())) {
    return prompt;
  }
  const entity = prompt.replace(/^(?:and\s+)?(?:what about|how about|what of)\s+/i, "").replace(/[?.!]+$/, "").trim();
  if (!entity) return prompt;
  const kind = session.lastAssetKind ? ` ${session.lastAssetKind}` : "";
  return `Tell me about ${entity}${kind}`;
}

function isExactKnownAssetPrompt(prompt: string, ctx: MarketContext | null): boolean {
  const asset = findAsset(prompt, ctx?.assets ?? []);
  if (!asset) return false;
  const normalized = prompt.trim().toLowerCase();
  return [asset.symbol, asset.name, ...asset.aliases].some((name) => name.toLowerCase() === normalized);
}

function isClearlyStructuredLookup(prompt: string, ctx: MarketContext | null): boolean {
  return isExactKnownAssetPrompt(prompt, ctx) || EXPLICIT_LOOKUP_RE.test(prompt) || isMmfYieldRankingPrompt(prompt);
}

function buildNaturalLanguageClarification() {
  return composeClarifyingResponse({
    text: "I can help with market data, news, a simple investing explanation, or a scenario. Which company, fund, currency, amount, or topic do you mean?",
    followUps: [
      "Help me get started with investing",
      "How is Safaricom doing?",
      "Show Etica MMF yield",
    ],
  });
}

async function executeNaturalLanguageIntent(
  prompt: string,
  intent: NaturalLanguageIntent,
  ctx: MarketContext | null,
  news: NewsContext | null,
  session?: AiLabSessionContext,
): Promise<AiLabPromptOutput | null> {
  if (intent.intent === "refusal") {
    const result = buildRefusal();
    const composed = composeAssistantResponse({ prompt, result, sessionContext: session });
    return { route: "natural-language", result, ...composed };
  }
  if (intent.intent === "capabilities") {
    const composed = composeCapabilitiesGuide();
    return { route: "natural-language", ...composed };
  }
  if (intent.intent === "clarification") {
    const composed = composeClarifyingResponse({
      text: intent.clarification ?? "I can help with that. Which company, fund, currency, or amount do you mean?",
    });
    return { route: "natural-language", ...composed };
  }

  let canonical = "";
  const entity = intent.entity ?? session?.lastAssetQuery;
  const amount = valueFromPromptOrContext(prompt, intent.amount, session?.lastAmount);
  const percentage = valueFromPromptOrContext(prompt, intent.percentage, session?.lastYieldPct);

  if (intent.intent === "overview" || intent.intent === "lookup") {
    if (!entity) return null;
    if (intent.assetKind === "stock" && intent.periodDays && ctx) {
      const allowedDays = [7, 30, 90, 365] as const;
      const nearest = allowedDays.reduce((best, days) =>
        Math.abs(days - intent.periodDays!) < Math.abs(best - intent.periodDays!) ? days : best,
      );
      const performance = await resolveStockPerformanceLookup(entity, ctx, nearest);
      if (performance) {
        const composed = composeAssistantResponse({ prompt, result: performance, sessionContext: session });
        return { route: "natural-language", result: performance, ...composed };
      }
    }
    canonical = `Tell me about ${entity}${intent.assetKind && intent.assetKind !== "market" ? ` ${intent.assetKind}` : ""}`;
    const lookup = await resolveWebsiteLookup(canonical, ctx);
    if (!lookup) return null;
    const composed = composeAssistantResponse({ prompt, result: lookup, sessionContext: session });
    return { route: "natural-language", result: lookup, ...composed };
  }
  if (intent.intent === "compare") {
    if (!entity || !intent.secondEntity) return null;
    canonical = `Compare ${entity} vs ${intent.secondEntity}`;
  } else if (intent.intent === "news") {
    canonical = `Latest news${entity ? ` about ${entity}` : ""}`;
  } else if (intent.intent === "explainer") {
    canonical = `Explain ${intent.topic ?? entity ?? "investing"}`;
  } else if (intent.intent === "scenario") {
    switch (intent.scenarioKind) {
      case "asset-amount":
        if (!entity || amount == null) return null;
        canonical = `${canonicalAmount(amount)} in ${entity}`;
        break;
      case "stock-amount":
        if (!entity || amount == null) return null;
        canonical = `${canonicalAmount(amount)} in ${entity}`;
        break;
      case "stock-move":
        if (!entity || percentage == null) return null;
        canonical = `${entity} ${percentage < 0 ? "drops" : "rises"} ${Math.abs(percentage)}%${amount ? ` on ${canonicalAmount(amount)}` : ""}`;
        break;
      case "mmf-return":
        if (amount == null || percentage == null) return null;
        canonical = `${canonicalAmount(amount)} in ${entity ?? "an MMF"} at ${percentage}% for ${intent.periodMonths ?? 12} months`;
        break;
      case "mmf-yield-change":
        {
          const secondPercentage = valueFromPromptOrContext(prompt, intent.secondPercentage, undefined);
          if (amount == null || percentage == null || secondPercentage == null) return null;
          canonical = `${canonicalAmount(amount)} yield drops from ${percentage}% to ${secondPercentage}%`;
        }
        break;
      case "fx-conversion":
        if (amount == null) return null;
        canonical = `${canonicalAmount(amount)} to ${intent.currency ?? entity ?? session?.lastCurrency ?? "USD"}`;
        break;
      case "fx-move":
        if (percentage == null) return null;
        canonical = `${intent.currency ?? entity ?? "USD"}/KES moves ${percentage}%`;
        break;
      case "commodity-move":
        if (!entity || percentage == null) return null;
        canonical = `${entity} ${percentage < 0 ? "drops" : "rises"} ${Math.abs(percentage)}%`;
        break;
      case "portfolio-split":
        if (!entity || amount == null) return null;
        canonical = `Split ${canonicalAmount(amount)} between MMF and ${entity}${percentage != null ? ` at ${percentage}% yield` : ""}`;
        break;
      case "goal-projection":
        if (amount == null || percentage == null || !intent.periodMonths) return null;
        canonical = `Save ${canonicalAmount(amount)} monthly at ${percentage}% for ${intent.periodMonths} months`;
        break;
      default:
        return null;
    }
  }
  if (!canonical) return null;
  const result = routePrompt(canonical, ctx, news);
  const composed = composeAssistantResponse({ prompt, result, sessionContext: session });
  return { route: "natural-language", result, ...composed };
}

/** Mirrors AiLabPage handleSubmit routing for integration tests and debugging. */
export async function processAiLabUserPrompt(
  prompt: string,
  ctx: MarketContext | null,
  news: NewsContext | null = null,
  options: AiLabPromptOptions = {},
): Promise<AiLabPromptOutput> {
  const sessionContext = options.sessionContext;
  const contextualPrompt = contextualizeFollowUp(prompt, sessionContext);
  if (detectAdviceIntent(prompt)) {
    const result = buildRefusal();
    const composed = composeAssistantResponse({ prompt, result, sessionContext });
    return { route: "router", result, ...composed };
  }
  if (isUnsupportedFilterLookupPrompt(prompt)) {
    const composed = composeFilterUnsupportedResponse();
    return { route: "filter-unsupported", ...composed };
  }

  // Standalone help is unambiguous. Handle it before generic lookup matching,
  // which otherwise mistakes ordinary words such as "ask" for an instrument.
  // Longer prompts (for example "help me understand Safaricom") do not match
  // isCapabilitiesPrompt and continue to the grounded lookup flow below.
  if (isCapabilitiesPrompt(prompt)) {
    const composed = composeCapabilitiesGuide();
    return { route: "capabilities", ...composed };
  }

  const clarifying = buildClarifyingResponse(contextualPrompt, sessionContext, ctx);
  if (clarifying) {
    return { route: "clarifying", text: clarifying.text, followUps: clarifying.followUps };
  }

  const { prompt: enriched, note } = applyLiveContext(contextualPrompt, ctx);
  const result = routePrompt(enriched, ctx, news);

  // Calculators, explainers, news, and explicit lookup requests are fast and
  // unambiguous, so keep them local and avoid a model request.
  if (result.kind !== "unknown") {
    const composed = composeAssistantResponse({ prompt, result, sessionContext });
    return { route: "router", result, contextNote: note ?? undefined, ...composed };
  }
  if (!options.naturalLanguage || isClearlyStructuredLookup(contextualPrompt, ctx)) {
    const lookup = await resolveWebsiteLookup(contextualPrompt, ctx);
    if (lookup) {
      const composed = composeAssistantResponse({ prompt, result: lookup, sessionContext });
      return { route: "website-lookup", result: lookup, ...composed };
    }
  }

  // Ambiguous natural wording gets interpretation before it can be mistaken
  // for an instrument lookup. The local matcher covers common cases without
  // cost; Gemini handles the long tail through the same validated contract.
  if (options.naturalLanguage) {
    const common = inferCommonNaturalLanguageIntent(contextualPrompt, ctx, sessionContext);
    const interpreted = common
      ? { ok: true, intent: common }
      : await (options.interpreter ?? interpretNaturalLanguage)(prompt, ctx, sessionContext);
    if (interpreted.ok && interpreted.intent) {
      const natural = await executeNaturalLanguageIntent(prompt, interpreted.intent, ctx, news, sessionContext);
      if (natural) return natural;
    }
  }

  const composed = buildNaturalLanguageClarification();
  return { route: "clarifying", contextNote: note ?? undefined, ...composed };
}
