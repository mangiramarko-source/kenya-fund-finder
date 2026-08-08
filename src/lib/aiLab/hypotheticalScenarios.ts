// Natural-language hypothetical prompt handling for AI Lab.
// Turns broad, messy hypothetical questions into a neutral scenario-builder
// response (never advice) when the deterministic router can't produce a
// specific scenario. All output is deterministic — no LLM, no ranking, no
// recommendation language.

import type { UnknownPayload } from "./routerTypes";
import { STANDARD_DISCLAIMER } from "./safety";

export type HypotheticalKind =
  | "amount-open"
  | "income-goal"
  | "live-off-interest"
  | "rate-change"
  | "risk-preference"
  | "monthly-invest"
  | "scenario-buffet"
  | "none";

export interface HypotheticalClassification {
  kind: HypotheticalKind;
  amount?: number;
  monthlyTarget?: number;
}

const AMOUNT_RE =
  /(?:kes|ksh|kshs|sh)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)(?:\s*(k|m)\b)?(?!\s*%)/i;

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

function parseMonthlyTarget(prompt: string): number | null {
  // "earn 10k per month", "make 5,000 monthly", "10k a month"
  const re =
    /\b(?:earn|make|need|want|get)\b[^.?!]*?(?:kes|ksh)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|m)?\b[^.?!]*?\b(?:per month|monthly|a month|\/month|each month)\b/i;
  const m = prompt.match(re);
  if (!m) {
    const alt = prompt.match(
      /\b([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|m)?\b\s*(?:per month|monthly|a month|\/month|each month)\b/i,
    );
    if (!alt) return null;
    let n = parseFloat(alt[1].replace(/,/g, ""));
    if (alt[2]?.toLowerCase() === "k") n *= 1_000;
    if (alt[2]?.toLowerCase() === "m") n *= 1_000_000;
    return isNaN(n) || n < 1 ? null : n;
  }
  let n = parseFloat(m[1].replace(/,/g, ""));
  if (m[2]?.toLowerCase() === "k") n *= 1_000;
  if (m[2]?.toLowerCase() === "m") n *= 1_000_000;
  return isNaN(n) || n < 1 ? null : n;
}

const INCOME_GOAL_RE =
  /\b(how much (?:do i|would i|will i)?\s*need|how much (?:capital|money) (?:do i|would i)?\s*need|what would i need)\b/i;

const LIVE_OFF_RE =
  /\b(live off|survive on|retire on|income from) .*(interest|mmf|yield|dividend)\b/i;

const RATE_CHANGE_RE =
  /\b(if|when|what happens when|what happens if)\b[^.?!]*\b(rates?|yields?|interest rates?)\b[^.?!]*\b(go(?:es)? (?:down|up)|drop|drops|fall|falls|rise|rises|change|changes)\b/i;

const RISK_PREF_RE =
  /\b(safer than|less risky than|more stable than|lower risk than|something safer)\b/i;

const MONTHLY_INVEST_RE =
  /\b(?:invest|save|contribute|put)\s+(?:kes\s+)?(?:[0-9][0-9,]*(?:\.[0-9]+)?\s*(?:k|m)?\s+)?(?:each month|per month|monthly|a month)\b/i;

const SCENARIO_BUFFET_RE =
  /\b(show me scenarios|what scenarios|what can i (?:do|explore|model|try)|options for|explore .*with .*(?:k|000|000,000))\b/i;

/**
 * Detect broad hypothetical financial prompts that deserve a scenario-builder
 * response instead of a generic "I could not match that" fallback.
 *
 * IMPORTANT: this classifier is intentionally conservative — it only fires on
 * prompts that clearly have a financial hypothetical shape. Pure nonsense
 * prompts still fall through to the standard unknown fallback so existing
 * tests continue to pass.
 */
export function classifyHypotheticalPrompt(
  prompt: string,
): HypotheticalClassification {
  const trimmed = prompt.trim();
  if (!trimmed) return { kind: "none" };
  const lower = trimmed.toLowerCase();

  const amount = parseAmount(trimmed) ?? undefined;
  const monthlyTarget = parseMonthlyTarget(trimmed) ?? undefined;

  if (monthlyTarget != null || INCOME_GOAL_RE.test(lower)) {
    if (monthlyTarget != null) {
      return { kind: "income-goal", amount, monthlyTarget };
    }
  }

  if (LIVE_OFF_RE.test(lower)) {
    return { kind: "live-off-interest", amount };
  }

  if (RATE_CHANGE_RE.test(lower)) {
    return { kind: "rate-change", amount };
  }

  if (RISK_PREF_RE.test(lower)) {
    return { kind: "risk-preference" };
  }

  if (MONTHLY_INVEST_RE.test(lower)) {
    return { kind: "monthly-invest", amount };
  }

  if (SCENARIO_BUFFET_RE.test(lower) && amount != null) {
    return { kind: "scenario-buffet", amount };
  }

  // Broad amount + income intent: "I have 50k and want income"
  if (
    amount != null &&
    /\b(income|scenarios?|options|explore|what can i|what should)\b/i.test(lower)
  ) {
    return { kind: "scenario-buffet", amount };
  }

  return { kind: "none" };
}

function fmtKes(n: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(n);
}

const NOT_ADVICE =
  "This is not a recommendation to buy, sell, or choose any product.";

function buildScenarioBuffet(amount: number): UnknownPayload {
  const amt = fmtKes(amount);
  return {
    kind: "unknown",
    message: [
      "Result",
      `I can help turn this into a neutral scenario, but I need one or two details first.`,
      "",
      "What I understood",
      `You want to explore what could happen with ${amt}.`,
      "",
      "Useful ways to model it",
      "- MMF income scenario: estimate monthly and annual income from a stated yield",
      "- Stock movement scenario: estimate gain or loss from a stated price move",
      "- Split scenario: compare how different allocations behave under assumptions",
      "- Income target scenario: estimate the capital needed for a monthly income goal",
      "",
      "Important",
      NOT_ADVICE,
      "",
      STANDARD_DISCLAIMER,
    ].join("\n"),
    suggestions: [
      `What would ${amount.toLocaleString("en-KE")} earn at 11%?`,
      `What if I split ${amount.toLocaleString("en-KE")} between MMF and Safaricom?`,
      `What if Safaricom drops 10%?`,
      `How much would I need to earn 10,000 per month at 11%?`,
    ],
    disclaimer: STANDARD_DISCLAIMER,
  };
}

function buildIncomeGoal(monthlyTarget: number): UnknownPayload {
  const target = fmtKes(monthlyTarget);
  // Deterministic formula shown with a stated yield assumption.
  const example11 = Math.round((monthlyTarget * 12) / 0.11);
  const example9 = Math.round((monthlyTarget * 12) / 0.09);
  return {
    kind: "unknown",
    message: [
      "Result",
      `To generate about ${target} per month from a yield-bearing balance, the capital required depends on the yield you assume.`,
      "",
      "Formula",
      "- Required capital ≈ (monthly target × 12) ÷ annual yield",
      "",
      "Illustrative figures",
      `- At an illustrative 11% annual yield: about ${fmtKes(example11)}`,
      `- At an illustrative 9% annual yield: about ${fmtKes(example9)}`,
      "",
      "What could change",
      "- MMF yields can rise or fall",
      "- Withholding tax reduces net income",
      "- Fees and provider spreads may apply",
      "",
      "Important",
      NOT_ADVICE,
      "",
      STANDARD_DISCLAIMER,
    ].join("\n"),
    suggestions: [
      `How much capital is needed for ${monthlyTarget.toLocaleString("en-KE")} monthly income at 11%?`,
      `Model KES ${example11.toLocaleString("en-KE")} in an MMF at 11%`,
      `Explain withholding tax`,
      `Explain MMF yield`,
    ],
    disclaimer: STANDARD_DISCLAIMER,
  };
}

function buildLiveOffInterest(amount?: number): UnknownPayload {
  const suggestions = amount
    ? [
        `What would ${amount.toLocaleString("en-KE")} earn at 11%?`,
        `How much capital is needed for 10,000 monthly income at 11%?`,
        `Explain withholding tax`,
      ]
    : [
        `How much capital is needed for 10,000 monthly income at 11%?`,
        `What would 1,000,000 earn at 11%?`,
        `Explain withholding tax`,
      ];
  return {
    kind: "unknown",
    message: [
      "Result",
      "I can model the income side of this question, but it depends on the capital you assume and the yield you use.",
      "",
      "How to think about it",
      "- Monthly income ≈ (capital × annual yield) ÷ 12",
      "- Required capital ≈ (monthly target × 12) ÷ annual yield",
      "",
      "What could change",
      "- MMF yields can change",
      "- Withholding tax and fees reduce net income",
      "- Living costs and inflation shift the target over time",
      "",
      "Important",
      NOT_ADVICE,
      "",
      STANDARD_DISCLAIMER,
    ].join("\n"),
    suggestions,
    disclaimer: STANDARD_DISCLAIMER,
  };
}

function buildRateChange(amount?: number): UnknownPayload {
  const example = amount ?? 100_000;
  const at11 = Math.round((example * 0.11) / 12);
  const at9 = Math.round((example * 0.09) / 12);
  return {
    kind: "unknown",
    message: [
      "Result",
      "MMF and yield-based income moves with prevailing yields — if yields fall, illustrative income figures fall too.",
      "",
      "Illustrative example",
      `- ${fmtKes(example)} at 11% ≈ ${fmtKes(at11)} per month`,
      `- ${fmtKes(example)} at 9% ≈ ${fmtKes(at9)} per month`,
      "",
      "What could change",
      "- MMF yields track short-term interest rates",
      "- Actual fund yields differ between providers and periods",
      "- Withholding tax and fees affect the net figure",
      "",
      "Important",
      NOT_ADVICE,
      "",
      STANDARD_DISCLAIMER,
    ].join("\n"),
    suggestions: [
      `What if ${example.toLocaleString("en-KE")} yield drops from 11% to 9%?`,
      `Model KES ${example.toLocaleString("en-KE")} in an MMF at 11%`,
      `Explain MMF yield`,
    ],
    disclaimer: STANDARD_DISCLAIMER,
  };
}

function buildRiskPreference(): UnknownPayload {
  return {
    kind: "unknown",
    message: [
      "Result",
      "I can't tell you which instrument to pick, but I can explain the trade-offs neutrally.",
      "",
      "Neutral trade-offs",
      "- Money market funds: shorter duration, lower typical volatility, yield can change",
      "- Individual stocks: prices can rise or fall, dividends are not assured",
      "- Fixed income (e.g. T-bills): stated tenor and rate, subject to reinvestment risk",
      "- FX and commodities: exposure to global price and rate movements",
      "",
      "What could change",
      "- Yields, prices, spreads, fees, and taxes can all move",
      "- Past performance does not predict future outcomes",
      "",
      "Important",
      NOT_ADVICE,
      "",
      STANDARD_DISCLAIMER,
    ].join("\n"),
    suggestions: [
      "Explain MMF yield",
      "Explain volatility",
      "Explain liquidity",
      "Compare SCOM vs EQTY",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  };
}

function buildMonthlyInvest(amount?: number): UnknownPayload {
  const example = amount ?? 10_000;
  return {
    kind: "unknown",
    message: [
      "Result",
      "I can model a monthly-contribution projection, but I need a starting amount, a monthly amount, an assumed yield, and a period.",
      "",
      "Example shape",
      `- Start with KES 0, add ${fmtKes(example)} monthly at 11% for 24 months`,
      "",
      "What could change",
      "- Yields can rise or fall over the period",
      "- Fees and taxes reduce net returns",
      "- Contributions may be paused or changed",
      "",
      "Important",
      NOT_ADVICE,
      "",
      STANDARD_DISCLAIMER,
    ].join("\n"),
    suggestions: [
      `If I start with KES 0 and add KES ${example.toLocaleString("en-KE")} monthly at 11% for 24 months`,
      `Model KES 100k in an MMF at 11%`,
      `Explain compounding`,
    ],
    disclaimer: STANDARD_DISCLAIMER,
  };
}

/**
 * Build a scenario-builder response for a broad hypothetical prompt, or
 * return null when the prompt is not a recognised hypothetical shape.
 */
export function buildHypotheticalScenarioResponse(
  prompt: string,
): UnknownPayload | null {
  const c = classifyHypotheticalPrompt(prompt);
  switch (c.kind) {
    case "income-goal":
      return buildIncomeGoal(c.monthlyTarget!);
    case "live-off-interest":
      return buildLiveOffInterest(c.amount);
    case "rate-change":
      return buildRateChange(c.amount);
    case "risk-preference":
      return buildRiskPreference();
    case "monthly-invest":
      return buildMonthlyInvest(c.amount);
    case "scenario-buffet":
      return buildScenarioBuffet(c.amount!);
    default:
      return null;
  }
}

/**
 * True when the prompt is a hypothetical scenario shape — used by the Gemini
 * eligibility check to ensure scenario prompts never get rewritten by the
 * educational LLM branch.
 */
export function isHypotheticalScenarioPrompt(prompt: string): boolean {
  return classifyHypotheticalPrompt(prompt).kind !== "none";
}
