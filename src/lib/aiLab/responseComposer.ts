// Phase 13B — deterministic safe response composer.
// No LLM. Conversational intros + context-aware follow-ups only.

import type { RouterResult } from "./router";
import type { AiLabSessionContext } from "./chat";
import { FORBIDDEN_PATTERNS, STANDARD_DISCLAIMER } from "./safety";
import { isMmfYieldFilterPrompt, isUnsupportedFilterLookupPrompt } from "./websiteLookup";

const FILTER_LOOKUP_RE =
  /\b(show|list|find|filter|rank|sort)\b.*\b(mmf|mmfs|money market|fund|funds)\b.*\b(above|below|over|under|greater|less|highest|lowest|top|best)\b/i;

const YIELD_THRESHOLD_RE =
  /\b(mmf|mmfs|money market|fund|funds)\b.*\b(above|below|over|under)\s+\d+\s*%/i;

const SHOW_MMFS_ABOVE_RE = /\bshow\s+mmfs?\s+above\b/i;

const CAPABILITIES_RE =
  /\b(what can i ask|what can you do|what data do you have|what can you search|help me|^\s*help\s*$)\b/i;

const UNSUPPORTED_FOLLOWUP_RE =
  /\b(show mmfs above|above 10%|rank fund|best fund|top fund|safest fund|filter by|compare scom and kcb)\b/i;

const MAX_FOLLOW_UPS = 3;

export function isFilterLookupPrompt(prompt: string): boolean {
  return (
    FILTER_LOOKUP_RE.test(prompt) ||
    YIELD_THRESHOLD_RE.test(prompt) ||
    SHOW_MMFS_ABOVE_RE.test(prompt)
  );
}

export function isCapabilitiesPrompt(prompt: string): boolean {
  return CAPABILITIES_RE.test(prompt.trim());
}

function fmtKes(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);
}

function assertSafe(text: string): void {
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error(`Composer produced forbidden phrase: ${pattern}`);
    }
  }
}

function withBubbleDisclaimer(text: string, includeDisclaimer: boolean): string {
  assertSafe(text);
  if (!includeDisclaimer) return text;
  return `${text}\n\n${STANDARD_DISCLAIMER}`;
}

function filterSafeFollowUps(followUps: string[]): string[] {
  return followUps.filter((s) => !UNSUPPORTED_FOLLOWUP_RE.test(s.toLowerCase()));
}

export function capFollowUps(followUps: string[], max = MAX_FOLLOW_UPS): string[] {
  return filterSafeFollowUps(followUps).slice(0, max);
}

function followUpsForWebsiteLookup(entityType: string): string[] {
  switch (entityType) {
    case "stock":
      return capFollowUps([
        "Latest news about Safaricom",
        "What can I ask?",
        "KES 10,000 in SCOM",
      ]);
    case "fund":
      return capFollowUps([
        "Explain withholding tax",
        "Show CIC fund data",
        "What can I ask?",
      ]);
    case "fx":
      return capFollowUps([
        "What is the USD/KES rate?",
        "KES 100,000 to USD",
        "What can I ask?",
      ]);
    case "commodity":
      return capFollowUps([
        "Gold rises 5%",
        "What can I ask?",
        "KES 100,000 to USD",
      ]);
    default:
      return capFollowUps([
        "What is SCOM's current price?",
        "Show Etica MMF yield",
        "What can I ask?",
      ]);
  }
}

function composeIntro(result: RouterResult, prompt: string): string {
  switch (result.kind) {
    case "stock-amount":
      return `Here's a neutral stock exposure scenario using the latest available KenyaFundFinder data for ${result.inputs.symbol}. The table below shows possible values if the share price moves by the stated percentages. This is a data view, not a recommendation.`;

    case "stock-move": {
      const dir = result.inputs.priceChangePct >= 0 ? "rises" : "falls";
      const pct = Math.abs(result.inputs.priceChangePct);
      return `Here's a neutral price-move scenario for ${fmtKes(result.inputs.amount)} if the share price ${dir} by ${pct}%. This does not predict future prices.`;
    }

    case "mmf":
      return `Here's an MMF income scenario using the yield assumption shown (${result.inputs.annualYieldPct}%). It estimates gross income and does not predict future returns.`;

    case "mmf-yield-change":
      return `Here's a yield-change comparison for the same amount at ${result.inputs.fromYieldPct}% versus ${result.inputs.toYieldPct}%. It estimates gross income differences and does not predict future returns.`;

    case "goal-projection":
      return `Here's a savings goal projection based on the amount, contribution, and yield assumptions shown. It is an illustration, not a prediction of future returns.`;

    case "compare": {
      const names = result.assets.map((a) => a.symbol).join(" and ");
      return `Here's a side-by-side comparison of ${names} using available KenyaFundFinder data. This is not a recommendation.`;
    }

    case "explainer":
      return `Here's an educational explainer on "${result.title.replace(/\?$/, "")}". This is general information — not personal financial advice.`;

    case "fx-conversion":
      return `Here's an estimated currency conversion using the latest available FX rate shown in KenyaFundFinder (${result.inputs.rateLabel}). Actual provider rates may differ.`;

    case "fx-move":
      return `Here's a hypothetical FX move scenario for ${result.inputs.pair} if the rate moves by ${result.inputs.movementPct}%. It does not predict future exchange rates.`;

    case "commodity-move":
      return `Here's a hypothetical ${result.inputs.name} scenario if the value moves by ${result.inputs.movementPct}%. It does not predict future commodity prices.`;

    case "news-summary":
      return `Here are matching stored news items from KenyaFundFinder data${result.articles.length > 0 ? ` (${result.articles.length} article${result.articles.length === 1 ? "" : "s"})` : ""}. This does not predict price movement.`;

    case "portfolio-split":
      return `Here's an allocation scenario based on the stated split and yield assumption. It is not a recommendation.`;

    case "website-lookup":
      if (result.notFound && result.lookupMessage) {
        return result.lookupMessage;
      }
      if (result.lookupMode === "mmf-yield-filter") {
        return "Money market funds matching your yield filter from available KenyaFundFinder data. This is a data lookup, not a recommendation.";
      }
      if (result.lookupMode === "instrument-family-overview") {
        return "Matching instruments from available KenyaFundFinder data. This is a data lookup, not a recommendation.";
      }
      return `Here are matching records for ${result.entityName} from available KenyaFundFinder data. This is a data lookup, not a recommendation.`;

    case "refusal":
      return `AI Lab cannot tell you what to buy or sell. You can ask for a neutral scenario or a named data lookup instead.`;

    case "unknown":
      if (isUnsupportedFilterLookupPrompt(prompt)) {
        return `I can't filter funds by yield threshold yet. You can ask for a named fund's yield instead.`;
      }
      return `I couldn't find enough matching data or assumptions to answer that safely. Try one of the examples below.`;

    default:
      return "Based on available KenyaFundFinder data, here is the result below.";
  }
}

function followUpsForResult(result: RouterResult, prompt: string): string[] {
  switch (result.kind) {
    case "stock-amount":
      return capFollowUps([
        "Latest news about Safaricom",
        "What can I ask?",
        "KES 10,000 in SCOM",
      ]);

    case "stock-move":
      return capFollowUps([
        "KES 10,000 in SCOM",
        "What is SCOM's current price?",
        "What can I ask?",
      ]);

    case "mmf":
    case "mmf-yield-change":
      return capFollowUps([
        "Explain withholding tax",
        "Show CIC fund data",
        "What can I ask?",
      ]);

    case "goal-projection":
      return capFollowUps([
        "KES 10,000 in SCOM",
        "Show Etica MMF yield",
        "What can I ask?",
      ]);

    case "compare":
      return capFollowUps([
        "KES 10,000 in SCOM",
        "Show Etica MMF yield",
        "What can I ask?",
      ]);

    case "explainer":
      return capFollowUps([
        "KES 10,000 in SCOM",
        "Show Etica MMF yield",
        "What can I ask?",
      ]);

    case "fx-conversion":
      return capFollowUps([
        "What is the USD/KES rate?",
        "KES 100,000 to USD",
        "What can I ask?",
      ]);

    case "fx-move":
      return capFollowUps([
        "KES 100,000 to USD",
        "What is the USD/KES rate?",
        "What can I ask?",
      ]);

    case "commodity-move":
      return capFollowUps([
        "Gold rises 5%",
        "What can I ask?",
        "KES 100,000 to USD",
      ]);

    case "news-summary":
      return capFollowUps([
        "KES 10,000 in SCOM",
        "What is SCOM's current price?",
        "What can I ask?",
      ]);

    case "portfolio-split":
      return capFollowUps([
        "Explain liquidity",
        "Show Etica MMF yield",
        "What can I ask?",
      ]);

    case "website-lookup":
      return followUpsForWebsiteLookup(result.entityType);

    case "refusal":
      return capFollowUps([
        "What can I ask?",
        "Show Etica MMF yield",
        "KES 10,000 in SCOM",
      ]);

    case "unknown":
      return capFollowUps([
        "What can I ask?",
        "Show Etica MMF yield",
        "KES 10,000 in SCOM",
      ]);

    default:
      return capFollowUps([
        "What can I ask?",
        "KES 10,000 in SCOM",
        "Show Etica MMF yield",
      ]);
  }
}

export function composeFilterUnsupportedResponse(): { text: string; followUps: string[] } {
  const text = withBubbleDisclaimer(
    "I can't filter funds by yield threshold yet. You can ask for a named fund's yield or see what data is available.",
    false,
  );
  const followUps = capFollowUps([
    "Show Etica MMF yield",
    "Show CIC fund data",
    "What can I ask?",
  ]);
  return { text, followUps };
}

export function composeAssistantResponse(args: {
  prompt: string;
  result: RouterResult;
  sessionContext?: AiLabSessionContext;
}): { text: string; followUps: string[] } {
  const { prompt, result } = args;

  const text = withBubbleDisclaimer(composeIntro(result, prompt), false);
  const followUps = followUpsForResult(result, prompt);
  return { text, followUps };
}

export function composeCapabilitiesGuide(): { text: string; followUps: string[] } {
  const text = withBubbleDisclaimer(
    [
      "You can ask about:",
      "",
      "1. Data lookups",
      '• "What is SCOM\'s current price?"',
      '• "Show Etica MMF yield"',
      '• "What is the USD/KES rate?"',
      "",
      "2. Scenarios",
      '• "KES 10,000 in SCOM"',
      '• "Split 100k between MMF and SCOM at 11% yield"',
      "",
      "3. News and explainers",
      '• "Latest news about Safaricom"',
      '• "Explain dividend yield"',
      "",
      "4. Limits",
      "AI Lab cannot tell you what to buy or sell.",
    ].join("\n"),
    true,
  );

  const followUps = capFollowUps([
    "Show Etica MMF yield",
    "What is SCOM's current price?",
    "KES 10,000 in SCOM",
  ]);

  return { text, followUps };
}

export function composeClarifyingResponse(args: {
  text: string;
  followUps?: string[];
}): { text: string; followUps: string[] } {
  const followUps = capFollowUps(
    args.followUps ?? [
      "KES 10,000 in SCOM",
      "Model KES 100k in an MMF at 11%",
      "What can I ask?",
    ],
  );
  return {
    text: withBubbleDisclaimer(args.text, true),
    followUps,
  };
}

export function composedOutputIsSafe(text: string, followUps: string[]): boolean {
  const combined = [text, ...followUps].join(" ");
  return !FORBIDDEN_PATTERNS.some((re) => re.test(combined));
}

export { isUnsupportedFilterLookupPrompt, isMmfYieldFilterPrompt } from "./websiteLookup";
