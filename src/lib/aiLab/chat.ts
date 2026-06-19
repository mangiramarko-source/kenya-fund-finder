// Phase 11A — in-memory chat message model and deterministic helpers.
// No LLM, no persistence, no prompt enrichment from session context.

import type { RouterResult } from "./router";
import { STANDARD_DISCLAIMER, detectAdviceIntent, FORBIDDEN_PATTERNS } from "./safety";
import { SAFE_ALTERNATIVES } from "./safety";
import { UNKNOWN_FALLBACK_SUGGESTIONS } from "./routerTypes";
import { isGenericStockTerm, isPortfolioSplitIntent } from "./portfolioSplitParse";

export type AiLabChatRole = "user" | "assistant" | "system";

export type AiLabChatStatus =
  | "sent"
  | "answered"
  | "refused"
  | "unknown"
  | "clarifying"
  | "error";

export interface AiLabChatMessage {
  id: string;
  role: AiLabChatRole;
  text: string;
  createdAt: string;
  result?: RouterResult;
  status?: AiLabChatStatus;
  contextNote?: string;
}

export interface AiLabSessionContext {
  lastAmount?: number;
  lastAssetQuery?: string;
  lastYieldPct?: number;
  lastCurrency?: string;
  lastScenarioKind?: string;
}

export interface ClarifyingResponse {
  text: string;
  disclaimer: string;
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
];

const AMOUNT_RE =
  /(?:kes|ksh|kshs|sh)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)(?:\s*(k|m)\b)?(?!\s*%)/i;
const YIELD_RE = /([0-9]+(?:\.[0-9]+)?)\s*%/;
const FUND_CONTEXT_RE =
  /\b(mmf|money market|unit trust|mutual fund|money market fund)\b/i;
const NAMED_STOCK_PATTERN =
  /\b(scom|eqty|kcb|scbk|safaricom|equity group|kcb group|britam|eabl|kengen|ncba|co-op)\b/i;
const CURRENCY_RE = /\b(usd|eur|gbp|chf|cad|aud|jpy|cny)\b/i;

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
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${messageCounter}`;
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

function isAmountOnlyPrompt(prompt: string): boolean {
  const amount = parseAmount(prompt);
  if (amount == null) return false;
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
  if (result.kind === "refusal" || result.kind === "unknown") {
    return result.message;
  }
  return result.summary;
}

export function buildClarifyingResponse(
  prompt: string,
  sessionContext?: AiLabSessionContext,
): ClarifyingResponse | null {
  if (detectAdviceIntent(prompt)) return null;

  if (needsSplitClarification(prompt)) {
    return {
      text:
        "I can model a split scenario, but I need a named stock and a yield assumption. Try: \"Split 100k between MMF and SCOM at 11% yield.\"",
      disclaimer: STANDARD_DISCLAIMER,
    };
  }

  if (isAmountOnlyPrompt(prompt)) {
    const amount = parseAmount(prompt) ?? sessionContext?.lastAmount;
    const amountPhrase = amount != null ? formatKesAmount(amount) : "that amount";
    return {
      text: `What would you like to test with ${amountPhrase}? You can ask for an MMF scenario, stock exposure, FX conversion, or split scenario.`,
      disclaimer: STANDARD_DISCLAIMER,
    };
  }

  return null;
}

export function buildFollowUpSuggestions(result?: RouterResult): string[] {
  if (!result) {
    return WELCOME_EXAMPLE_CATEGORIES.slice(0, 4).map((c) => c.prompt);
  }

  if (result.kind === "refusal") {
    return ["Show me a neutral scenario instead", ...SAFE_ALTERNATIVES.slice(0, 2)];
  }

  if (result.kind === "unknown") {
    return UNKNOWN_FALLBACK_SUGGESTIONS.slice(0, 3);
  }

  switch (result.kind) {
    case "stock-amount":
      return [
        "What happens if a stock falls 10% on KES 100,000?",
        "Compare SCOM vs EQTY",
      ];
    case "mmf":
    case "mmf-yield-change":
      return [
        "Split 100k between MMF and SCOM at 11% yield",
        "Explain withholding tax",
      ];
    case "fx-conversion":
      return ["What happens if USD/KES rises 5%?"];
    case "compare":
      return ["KES 10,000 in SCOM", "Explain dividend yield"];
    case "portfolio-split":
      return ["Compare SCOM vs EQTY", "Explain liquidity"];
    case "news-summary":
      return ["KES 10,000 in SCOM", "Latest news about Safaricom"];
    default:
      return WELCOME_EXAMPLE_CATEGORIES.slice(0, 3).map((c) => c.prompt);
  }
}

/** Test helper — clarifying text must not contain forbidden advisory phrases. */
export function clarifyingTextIsSafe(text: string): boolean {
  return !FORBIDDEN_PATTERNS.some((re) => re.test(text));
}
