// Safety guard for AI Scenario Assistant.
// Detects advisory intent and blocks forbidden recommendation wording.

export const FORBIDDEN_PATTERNS: RegExp[] = [
  /\byou should buy\b/i,
  /\byou should sell\b/i,
  /\bi recommend\b/i,
  /\bbest fund\b/i,
  /\btop fund\b/i,
  /\bsafest fund\b/i,
  /\bbetter option\b/i,
  /\brecommended choice\b/i,
  /\bguaranteed returns?\b/i,
  /\brisk[-\s]?free\b/i,
  /\bput your money\b/i,
];

// Built via `new RegExp` so iOS Safari < 16.4 (e.g. iPhone 7, max iOS 15) does
// not throw a SyntaxError at module load on the lookbehind literal. Older
// WebKit engines fall back to the simpler pattern without lookbehind.
const GUARANTEED_RE: RegExp = (() => {
  try {
    return new RegExp("\\b(?<!not )guaranteed\\b", "i");
  } catch {
    return /\bguaranteed\b/i;
  }
})();

/** Used in tests to scan composed assistant output (stricter than runtime guards). */
export const RESPONSE_QUALITY_BANNED: RegExp[] = [
  ...FORBIDDEN_PATTERNS,
  /\bbest\b/i,
  /\btop\b/i,
  /\bsafest\b/i,
  GUARANTEED_RE,
  /\brecommended\b/i,
];


export const STOCK_AMOUNT_MAKE_SCENARIO_RE =
  /\bhow much will i make if i (put|invest|buy)\b/i;

export const MMF_GET_SCENARIO_RE = /\bhow much do i get\b/i;

export const MMF_MAKE_SCENARIO_RE =
  /\bhow much would .+ make in (an? )?(mmf|money market)\b/i;

/** Router-only: used to detect MMF/yield context without surfacing "mutual fund" in UI copy. */
export const MMF_CONTEXT_RE =
  /\b(mmf|money market|unit trust|mutual fund|money market fund|yield)\b/i;

export const NEWS_ADVICE_PATTERNS: RegExp[] = [
  /\bbecause of this news\b/i,
  /\bwill .* rise because\b/i,
  /\bgood news for buying\b/i,
  /\bshould i sell because\b/i,
  /\bwill nse go up\b/i,
  /\bwill .* go up today\b/i,
  /\bwill .* (rise|fall) because\b/i,
  /\bis this good news for buying\b/i,
];

export const PORTFOLIO_ADVICE_PATTERNS: RegExp[] = [
  /\bshould i split\b/i,
  /\bwhich split is better\b/i,
  /\bbest allocation\b/i,
  /\bbest split\b/i,
  /\boptimal allocation\b/i,
  /\bsafest allocation\b/i,
  /\bdo you recommend\b/i,
  /\bshould i put more in\b.*\b(mmf|money market|stock)/i,
  /\bshould i put more in mmf or stock/i,
];

export const ADVICE_INTENT_PATTERNS: RegExp[] = [
  /\bwhich\b.*\b(fund|stock|share|mmf|etf)\b.*\b(should|buy|pick|choose)\b/i,
  /\bshould i (buy|sell|hold|switch|invest in|put)\b/i,
  /\bwhere should i (put|invest|save)\b/i,
  /\bwhat should i invest in\b/i,
  /\bwhat('?s| is) the (best|top|safest)\b/i,
  /\brecommend (a|the|me)\b/i,
  /\bwill i make (money|profit)\b/i,
  /\bgood buy\b/i,
  /\bbest yield\b/i,
  /\bmake me the most\b/i,
  /\btop mmf\b/i,
];

export interface RefusalPayload {
  kind: "refusal";
  message: string;
  safeAlternatives: string[];
  disclaimer: string;
}

export const STANDARD_DISCLAIMER = "Data only. Not personal financial advice.";

export const REFUSAL_MESSAGE = [
  "I can't tell you what to buy, sell, or choose. I can't rank instruments or tell you what to pick. I can help you compare the available data neutrally.",
  "",
  "I can show:",
  "- recent price or yield movement",
  "- possible outcomes for a specific amount",
  "- liquidity, volatility, and fee considerations",
  "- assumptions behind a calculation",
  "",
  STANDARD_DISCLAIMER,
].join("\n");

export const SAFE_ALTERNATIVES = [
  "KES 100,000 in SCOM",
  "What would 100,000 earn at 11%?",
  "Explain stock vs MMF risk factors",
  "Show Etica MMF yield",
];

export function hasMmfYieldContext(prompt: string): boolean {
  return MMF_CONTEXT_RE.test(prompt);
}

export function detectNewsAdviceIntent(prompt: string): boolean {
  return NEWS_ADVICE_PATTERNS.some((re) => re.test(prompt));
}

export function detectPortfolioAdviceIntent(prompt: string): boolean {
  return PORTFOLIO_ADVICE_PATTERNS.some((re) => re.test(prompt));
}

export function detectAdviceIntent(prompt: string): boolean {
  if (STOCK_AMOUNT_MAKE_SCENARIO_RE.test(prompt)) return false;
  if (MMF_MAKE_SCENARIO_RE.test(prompt)) return false;
  if (MMF_GET_SCENARIO_RE.test(prompt) && hasMmfYieldContext(prompt)) return false;
  if (detectNewsAdviceIntent(prompt)) return true;
  if (detectPortfolioAdviceIntent(prompt)) return true;
  return ADVICE_INTENT_PATTERNS.some((re) => re.test(prompt));
}

export function buildRefusal(): RefusalPayload {
  return {
    kind: "refusal",
    message: REFUSAL_MESSAGE,
    safeAlternatives: [...SAFE_ALTERNATIVES],
    disclaimer: STANDARD_DISCLAIMER,
  };
}

/**
 * Final guard before any text is rendered to the user. Throws in dev so the
 * test suite catches accidental advisory wording; in production it strips the
 * offending phrase and logs a warning.
 */
export function sanitizeOutput(text: string): string {
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) {
      if (import.meta.env?.DEV) {
        throw new Error(`Forbidden advisory phrase detected: ${pattern}`);
      }
      // eslint-disable-next-line no-console
      console.warn("[ai-lab] stripped forbidden phrase", pattern);
      text = text.replace(pattern, "[redacted]");
    }
  }
  return text;
}
