// Phase 13B — deterministic safe response composer.
// No LLM. Conversational intros + context-aware follow-ups only.

import { UNKNOWN_FALLBACK_MSG, type RouterResult } from "./router";
import type { AiLabSessionContext } from "./chat";
import {
  findForbiddenSafetyIssue,
  hasResponseQualityIssue,
  REFUSAL_MESSAGE,
  RESPONSE_QUALITY_BANNED,
  SAFE_ALTERNATIVES,
  STANDARD_DISCLAIMER,
} from "./safety";
import {
  type MmfScenarioResult,
  type MmfYieldChangeScenarioResult,
  type PortfolioSplitScenarioResult,
  type StockAmountScenarioResult,
  type StockMoveScenarioResult,
} from "./scenarios";
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

const NOT_RECOMMENDATION_LINE =
  "This is not a recommendation to buy, sell, or choose this instrument.";

const STOCK_WHAT_COULD_CHANGE = [
  "Share price may change",
  "Fees, taxes, spreads, liquidity, settlement, or timing may affect the outcome",
  "Current data may differ from execution data",
];

const MMF_WHAT_COULD_CHANGE = [
  "MMF yields can change",
  "Fees and taxes may apply",
  "Future returns can vary",
];

function formatBulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function formatSection(title: string, body: string): string {
  return `${title}\n${body}`;
}

function composeStructuredAnswer(sections: {
  result: string;
  assumptions: string[];
  whatCouldChange: string[];
  important?: string;
}): string {
  const parts = [
    formatSection("Result", sections.result),
    formatSection("Assumptions", formatBulletList(sections.assumptions)),
    formatSection("What could change", formatBulletList(sections.whatCouldChange)),
  ];
  if (sections.important) {
    parts.push(formatSection("Important", sections.important));
  }
  parts.push(STANDARD_DISCLAIMER);
  const text = parts.join("\n\n");
  assertSafe(text);
  return text;
}

export { RESPONSE_QUALITY_BANNED };

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
  const issue = findForbiddenSafetyIssue(text);
  if (issue) {
    throw new Error(`Composer produced forbidden phrase: ${issue}`);
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


function rowForMovement(
  rows: StockAmountScenarioResult["rows"],
  movementPct: number,
): StockAmountScenarioResult["rows"][number] | undefined {
  return rows.find((r) => r.movementPct === movementPct);
}

function composeHypotheticalNarrative(result: RouterResult): string | null {
  switch (result.kind) {
    case "stock-amount": {
      const { inputs, approximateShares, rows } = result;
      const up5 = rowForMovement(rows, 5);
      const down5 = rowForMovement(rows, -5);
      const shareLabel = approximateShares.toLocaleString("en-KE", {
        maximumFractionDigits: 2,
      });
      let resultBody = `At an illustrative price of ${fmtKes(inputs.latestPrice)} per ${inputs.symbol} share, ${fmtKes(inputs.amount)} would represent approximately ${shareLabel} shares before fees, taxes, spreads, and settlement considerations.`;
      if (up5 && down5) {
        resultBody += ` If the share price moved up 5%, the position value would be about ${fmtKes(up5.estimatedValue)}; if it moved down 5%, about ${fmtKes(down5.estimatedValue)}.`;
      }
      return composeStructuredAnswer({
        result: resultBody,
        assumptions: [
          `Amount: ${fmtKes(inputs.amount)}`,
          `Instrument: ${inputs.symbol} (${inputs.name})`,
          `Price basis: ${fmtKes(inputs.latestPrice)} per share (latest available KenyaFundFinder price)`,
          "Period: current exposure snapshot (not a holding-period forecast)",
        ],
        whatCouldChange: STOCK_WHAT_COULD_CHANGE,
        important: NOT_RECOMMENDATION_LINE,
      });
    }

    case "stock-move": {
      const { inputs, newValue, delta } = result;
      const dir = inputs.priceChangePct >= 0 ? "up" : "down";
      const pct = Math.abs(inputs.priceChangePct);
      return composeStructuredAnswer({
        result: `If a ${fmtKes(inputs.amount)} position moved ${dir} by ${pct}%, the illustrative value would be about ${fmtKes(newValue)} (a ${delta >= 0 ? "gain" : "loss"} of ${fmtKes(Math.abs(delta))} before fees, taxes, spreads, and settlement considerations).`,
        assumptions: [
          `Amount: ${fmtKes(inputs.amount)}`,
          `Price movement: ${inputs.priceChangePct > 0 ? "+" : ""}${inputs.priceChangePct}%`,
          "Uses a simple percentage move on the stated amount",
          "Does not predict future prices",
        ],
        whatCouldChange: STOCK_WHAT_COULD_CHANGE,
        important: NOT_RECOMMENDATION_LINE,
      });
    }

    case "mmf": {
      const { inputs, grossYearly, monthlyEquivalent } = result as MmfScenarioResult;
      const yieldLabel = inputs.annualYieldPct.toFixed(1);
      return composeStructuredAnswer({
        result: `${fmtKes(inputs.amount)} at an illustrative ${yieldLabel}% annual yield equals about ${fmtKes(grossYearly)} per year, or about ${fmtKes(Math.round(monthlyEquivalent))} per month.`,
        assumptions: [
          `Amount: ${fmtKes(inputs.amount)}`,
          `Annual yield: ${yieldLabel}%`,
          `Period: ${inputs.months} month${inputs.months === 1 ? "" : "s"}`,
          "Monthly figure is a simple equivalent, not a fixed monthly payout",
        ],
        whatCouldChange: MMF_WHAT_COULD_CHANGE,
      });
    }

    case "mmf-yield-change": {
      const r = result as MmfYieldChangeScenarioResult;
      return composeStructuredAnswer({
        result: `If yield changed from ${r.inputs.fromYieldPct}% to ${r.inputs.toYieldPct}% on ${fmtKes(r.inputs.amount)}, gross yearly income would shift from about ${fmtKes(r.fromGrossYearly)} to ${fmtKes(r.toGrossYearly)} (a difference of ${fmtKes(Math.abs(r.deltaYearly))} per year).`,
        assumptions: [
          `Amount: ${fmtKes(r.inputs.amount)}`,
          `From yield: ${r.inputs.fromYieldPct}%`,
          `To yield: ${r.inputs.toYieldPct}%`,
          `Period: ${r.inputs.months} month${r.inputs.months === 1 ? "" : "s"} at each yield assumption`,
        ],
        whatCouldChange: MMF_WHAT_COULD_CHANGE,
      });
    }

    case "portfolio-split": {
      const r = result as PortfolioSplitScenarioResult;
      const flat = r.rows.find((row) => row.stockMovementPct === 0);
      let resultBody = `Using an illustrative split of ${r.inputs.mmfPercent}% MMF and ${r.inputs.stockPercent}% ${r.inputs.stockSymbol} on ${fmtKes(r.inputs.totalAmount)} at ${r.inputs.annualYieldPct}% yield, the MMF portion is about ${fmtKes(r.inputs.mmfAmount)} and the stock portion about ${fmtKes(r.inputs.stockAmount)}.`;
      if (flat) {
        resultBody += ` With no stock price movement, total value would be about ${fmtKes(flat.totalEstimatedValue)}.`;
      }
      return composeStructuredAnswer({
        result: resultBody,
        assumptions: [
          `Total amount: ${fmtKes(r.inputs.totalAmount)}`,
          `Split: ${r.inputs.mmfPercent}% MMF / ${r.inputs.stockPercent}% ${r.inputs.stockSymbol}`,
          `MMF yield assumption: ${r.inputs.annualYieldPct}%`,
          `Stock price basis: ${fmtKes(r.inputs.stockPrice)} per ${r.inputs.stockSymbol} share`,
          `Projection period: ${r.inputs.projectionMonths} month${r.inputs.projectionMonths === 1 ? "" : "s"}`,
        ],
        whatCouldChange: [
          ...MMF_WHAT_COULD_CHANGE,
          "Stock prices can rise or fall",
          "Fees, taxes, spreads, and transaction costs are not fully modeled",
        ],
        important: NOT_RECOMMENDATION_LINE,
      });
    }

    default:
      return null;
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
      // Router branches (compare, portfolio-split, stock-amount not-found, etc.)
      // often return a helpful, prompt-specific unknown message. Preserve it
      // instead of overwriting with the generic fallback text.
      if (
        result.message &&
        result.message.trim() &&
        result.message !== UNKNOWN_FALLBACK_MSG
      ) {
        return result.message;
      }
      return `I'm not sure I caught that. Try rephrasing with a specific amount, fund, or ticker (e.g. "10,000 in Britam MMF" or "SCOM at 5%"). The examples below also work.`;

    default:
      return "Based on available KenyaFundFinder data, here is the result below.";
  }
}

function followUpsForResult(result: RouterResult, prompt: string): string[] {
  switch (result.kind) {
    case "stock-amount":
      return capFollowUps([
        "What if the price changes by 10%?",
        "Compare this with an MMF scenario using the same amount.",
        "What can I ask?",
      ]);

    case "stock-move":
      return capFollowUps([
        "What if the price changes by 10%?",
        "Compare this with an MMF scenario using the same amount.",
        "What can I ask?",
      ]);

    case "mmf":
    case "mmf-yield-change":
      return capFollowUps([
        "What happens if yield drops from 11% to 9%?",
        "Explain withholding tax",
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
        "Compare this with an MMF scenario using the same amount.",
        "What can I ask?",
      ]);

    case "website-lookup":
      return followUpsForWebsiteLookup(result.entityType);

    case "refusal":
      return capFollowUps(
        result.kind === "refusal" && result.safeAlternatives?.length
          ? result.safeAlternatives
          : [...SAFE_ALTERNATIVES],
      );

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

  const narrative = composeHypotheticalNarrative(result);
  const intro =
    result.kind === "refusal"
      ? result.message || REFUSAL_MESSAGE
      : narrative ?? composeIntro(result, prompt);
  const includeDisclaimer =
    narrative != null || result.kind === "refusal" ? false : false;
  const text = withBubbleDisclaimer(intro, includeDisclaimer);
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
  return !hasResponseQualityIssue(combined);
}

export { isUnsupportedFilterLookupPrompt, isMmfYieldFilterPrompt } from "./websiteLookup";
