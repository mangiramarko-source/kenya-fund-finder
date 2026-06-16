// Safety guard for AI Scenario Assistant.
// Detects advisory intent and blocks forbidden recommendation wording.

export const FORBIDDEN_PATTERNS: RegExp[] = [
  /\byou should buy\b/i,
  /\byou should sell\b/i,
  /\bi recommend\b/i,
  /\bbest fund\b/i,
  /\btop fund\b/i,
  /\bsafest fund\b/i,
  /\bguaranteed returns?\b/i,
  /\brisk[-\s]?free\b/i,
  /\bput your money\b/i,
];

export const ADVICE_INTENT_PATTERNS: RegExp[] = [
  /\bwhich\b.*\b(fund|stock|share|mmf)\b.*\b(should|buy|pick|choose)\b/i,
  /\bshould i (buy|sell|hold|switch|invest in|put)\b/i,
  /\bwhere should i (put|invest)\b/i,
  /\bwhat('?s| is) the (best|top|safest)\b/i,
  /\brecommend (a|the|me)\b/i,
];

export interface RefusalPayload {
  kind: "refusal";
  message: string;
  safeAlternatives: string[];
  disclaimer: string;
}

export const REFUSAL_MESSAGE =
  "I can't tell you what to buy, sell, or invest in. I can help compare scenarios, yields, price movements, fees, liquidity, and recent data so you can understand the trade-offs.";

export const SAFE_ALTERNATIVES = [
  "Compare fund scenarios",
  "Run a 100k yield scenario",
  "Explain yield",
  "Show price movement impact",
];

export const STANDARD_DISCLAIMER = "Data only. Not personal financial advice.";

export function detectAdviceIntent(prompt: string): boolean {
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
