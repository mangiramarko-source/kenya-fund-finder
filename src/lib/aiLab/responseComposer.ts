// Phase 13 — deterministic safe response composer.
// No LLM. Conversational intros + context-aware follow-ups only.

import type { RouterResult } from "./router";
import type { AiLabSessionContext } from "./chat";
import { FORBIDDEN_PATTERNS, STANDARD_DISCLAIMER } from "./safety";

const FILTER_LOOKUP_RE =
  /\b(show|list|find|filter|rank|sort)\b.*\b(mmf|mmfs|money market|fund|funds)\b.*\b(above|below|over|under|greater|less|highest|lowest|top|best)\b/i;

const YIELD_THRESHOLD_RE =
  /\b(mmf|mmfs|money market|fund|funds)\b.*\b(above|below|over|under)\s+\d+\s*%/i;

const SHOW_MMFS_ABOVE_RE = /\bshow\s+mmfs?\s+above\b/i;

const CAPABILITIES_RE =
  /\b(what can i ask|what can you do|what data do you have|what can you search|help me|^\s*help\s*$)\b/i;

const UNSUPPORTED_FOLLOWUP_RE =
  /\b(show mmfs above|above 10%|rank fund|best fund|top fund|safest fund|filter by)\b/i;

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

function followUpsForWebsiteLookup(entityType: string): string[] {
  switch (entityType) {
    case "stock":
      return filterSafeFollowUps([
        "Model KES 10,000 in SCOM",
        "Compare SCOM and KCB",
        "Latest news about Safaricom",
      ]);
    case "fund":
      return filterSafeFollowUps([
        "Model KES 100k in an MMF at 11%",
        "Show CIC fund data",
        "Explain withholding tax",
      ]);
    case "fx":
      return filterSafeFollowUps([
        "KES 100,000 to USD",
        "USD/KES rises 5%",
        "What is the USD/KES rate?",
      ]);
    case "commodity":
      return filterSafeFollowUps([
        "Gold rises 5%",
        "What data do you have?",
        "KES 100,000 to USD",
      ]);
    default:
      return filterSafeFollowUps([
        "What is SCOM's current price?",
        "Show Etica MMF yield",
        "What data do you have?",
      ]);
  }
}

function composeIntro(result: RouterResult, prompt: string): string {
  switch (result.kind) {
    case "stock-amount":
      return `Here's a neutral stock exposure scenario using the latest available KenyaFundFinder data for ${result.inputs.symbol}. The table shows possible values if the share price moves by the stated percentages. This is a data view, not a recommendation.`;

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
      return `Here's a side-by-side comparison of ${names} using available KenyaFundFinder data. One neutral way to look at this is to compare the metrics shown — this is not a recommendation.`;
    }

    case "explainer":
      return `Here's an educational explainer on "${result.title.replace(/\?$/, "")}". This is general information from KenyaFundFinder — not personal financial advice.`;

    case "fx-conversion":
      return `Here's an estimated currency conversion using the latest available FX rate shown in KenyaFundFinder (${result.inputs.rateLabel}). Actual provider rates may differ.`;

    case "fx-move":
      return `Here's a hypothetical FX move scenario for ${result.inputs.pair} if the rate moves by ${result.inputs.movementPct}%. It does not predict future exchange rates.`;

    case "commodity-move":
      return `Here's a hypothetical ${result.inputs.name} scenario if the value moves by ${result.inputs.movementPct}%. It does not predict future commodity prices.`;

    case "news-summary":
      return `Here are matching stored news items from KenyaFundFinder data${result.articles.length > 0 ? ` (${result.articles.length} article${result.articles.length === 1 ? "" : "s"})` : ""}. This does not predict price movement.`;

    case "portfolio-split":
      return `Here's an allocation scenario based on the stated split and yield assumption. It is not a recommendation — it shows possible outcomes under the assumptions entered.`;

    case "website-lookup":
      return `Here are matching records for ${result.entityName} from available KenyaFundFinder data. This is a data lookup, not a recommendation.`;

    case "refusal":
      return `I can't tell you what to buy, sell, or choose. You can ask for a neutral scenario or a named data lookup instead.`;

    case "unknown":
      if (isFilterLookupPrompt(prompt)) {
        return `I can't filter funds by yield threshold yet. You can ask for a named fund's yield or ask what data is available.`;
      }
      return `I couldn't find enough matching data or assumptions to answer that safely. Try one of the examples below.`;

    default:
      return "Based on available KenyaFundFinder data, here is the result below.";
  }
}

function followUpsForResult(result: RouterResult, prompt: string): string[] {
  switch (result.kind) {
    case "stock-amount":
      return filterSafeFollowUps([
        "What happens if a stock falls 10% on KES 100,000?",
        "Compare SCOM and KCB",
        "Latest news about Safaricom",
      ]);

    case "stock-move":
      return filterSafeFollowUps([
        "KES 10,000 in SCOM",
        "Compare SCOM and KCB",
        "What is SCOM's current price?",
      ]);

    case "mmf":
    case "mmf-yield-change":
      return filterSafeFollowUps([
        "Model KES 100k in an MMF at 11%",
        "Show Etica MMF yield",
        "Explain withholding tax",
      ]);

    case "goal-projection":
      return filterSafeFollowUps([
        "Model KES 100k in an MMF at 11%",
        "KES 10,000 in SCOM",
        "What data do you have?",
      ]);

    case "compare":
      return filterSafeFollowUps([
        "KES 10,000 in SCOM",
        "Show Etica MMF yield",
        "Explain dividend yield",
      ]);

    case "explainer":
      return filterSafeFollowUps([
        "Model KES 100k in an MMF at 11%",
        "KES 10,000 in SCOM",
        "What data do you have?",
      ]);

    case "fx-conversion":
      return filterSafeFollowUps([
        "USD/KES rises 5%",
        "What is the USD/KES rate?",
        "KES 100,000 to USD",
      ]);

    case "fx-move":
      return filterSafeFollowUps([
        "KES 100,000 to USD",
        "What is the USD/KES rate?",
        "What data do you have?",
      ]);

    case "commodity-move":
      return filterSafeFollowUps([
        "Gold rises 5%",
        "What data do you have?",
        "KES 100,000 to USD",
      ]);

    case "news-summary":
      return filterSafeFollowUps([
        "KES 10,000 in SCOM",
        "What is SCOM's current price?",
        "Latest news about Safaricom",
      ]);

    case "portfolio-split":
      return filterSafeFollowUps([
        "Compare SCOM and KCB",
        "Explain liquidity",
        "Show Etica MMF yield",
      ]);

    case "website-lookup":
      return followUpsForWebsiteLookup(result.entityType);

    case "refusal":
      return filterSafeFollowUps([
        "Show me a neutral scenario",
        "Compare two assets using available data",
        "What is SCOM's current price?",
      ]);

    case "unknown":
      return filterSafeFollowUps([
        "What data do you have?",
        "Show Etica MMF yield",
        "What is SCOM's current price?",
        "KES 10,000 in SCOM",
      ]);

    default:
      return filterSafeFollowUps([
        "What data do you have?",
        "KES 10,000 in SCOM",
        "Show Etica MMF yield",
      ]);
  }
}

export function composeAssistantResponse(args: {
  prompt: string;
  result: RouterResult;
  sessionContext?: AiLabSessionContext;
}): { text: string; followUps: string[] } {
  const { prompt, result } = args;

  if (isFilterLookupPrompt(prompt)) {
    const text = withBubbleDisclaimer(
      "I can't filter funds by yield threshold yet. You can ask for a named fund's yield or ask what data is available.",
      false,
    );
    const followUps = filterSafeFollowUps([
      "What data do you have?",
      "Show Etica MMF yield",
      "What is SCOM's current price?",
      "KES 10,000 in SCOM",
    ]);
    return { text, followUps };
  }

  const text = withBubbleDisclaimer(composeIntro(result, prompt), false);
  const followUps = followUpsForResult(result, prompt);
  return { text, followUps };
}

export function composeCapabilitiesGuide(): { text: string; followUps: string[] } {
  const text = withBubbleDisclaimer(
    [
      "Here's what you can ask AI Lab, based on what is implemented today:",
      "",
      "Scenarios — Model MMF income, stock exposure, FX conversion, commodity moves, portfolio splits, and savings goals using stated assumptions.",
      "",
      "Website data lookup — Look up a named stock price (e.g. SCOM), a named fund's yield (e.g. Etica MMF), an FX rate (e.g. USD/KES), or a commodity value.",
      "",
      "News — Summarize matching stored news articles from KenyaFundFinder (no price prediction).",
      "",
      "Explainers — Ask about yield, fees, liquidity, withholding tax, and similar terms.",
      "",
      "Limits — AI Lab cannot tell you what to buy or sell. It does not rank funds, filter by yield threshold, or recommend allocations. List-style queries like \"show all MMFs above 10%\" are not supported yet — ask for a named fund instead.",
    ].join("\n"),
    true,
  );

  const followUps = filterSafeFollowUps([
    "Show Etica MMF yield",
    "What is SCOM's current price?",
    "What is the USD/KES rate?",
    "KES 10,000 in SCOM",
  ]);

  return { text, followUps };
}

export function composeClarifyingResponse(args: {
  text: string;
  followUps?: string[];
}): { text: string; followUps: string[] } {
  const followUps = filterSafeFollowUps(
    args.followUps ?? [
      "KES 10,000 in SCOM",
      "Model KES 100k in an MMF at 11%",
      "What data do you have?",
    ],
  );
  return {
    text: withBubbleDisclaimer(args.text, true),
    followUps,
  };
}

/** Test helper — scan composed text and follow-ups for forbidden advisory phrases. */
export function composedOutputIsSafe(text: string, followUps: string[]): boolean {
  const combined = [text, ...followUps].join(" ");
  return !FORBIDDEN_PATTERNS.some((re) => re.test(combined));
}
