// Safety validator for Gemini educational output.
// Runs on the client BEFORE any Gemini text is rendered. Any failure means
// the caller must silently fall back to the deterministic unknown/explainer
// response — the user must never see rejected model output.

import { FORBIDDEN_PATTERNS } from "./safety";

export interface ValidationResult {
  ok: boolean;
  text: string;
  reason?: string;
}

const MAX_CHARS = 600;

// Numbers formatted as prices/yields/percentages.
const NUMERIC_MONEY_PATTERNS: RegExp[] = [
  /\b\d+(?:\.\d+)?\s*%/,
  /\bkes\s*\d/i,
  /\busd\s*\d/i,
  /\beur\s*\d/i,
  /\bgbp\s*\d/i,
  /\bksh\w*\s*\d/i,
  /\$\s?\d/,
];

// Advisory phrases (superset of safety.FORBIDDEN_PATTERNS + prediction wording).
const ADVISORY_PATTERNS: RegExp[] = [
  ...FORBIDDEN_PATTERNS,
  /\bwill (rise|fall|drop|go up|go down|increase|decrease)\b/i,
  /\bguarantee(d|s)?\b/i,
  /\bbest (fund|stock|investment|option|choice|mmf)\b/i,
  /\btop (fund|stock|investment|mmf)\b/i,
  /\bsafest (fund|stock|option)\b/i,
  /\brecommend(ed|s|ation)?\b/i,
  /\bshould (buy|sell|invest|put|hold)\b/i,
  /\byou (should|must) (buy|sell|invest)\b/i,
];

// URLs and citation-style prose.
const CITATION_PATTERNS: RegExp[] = [
  /https?:\/\//i,
  /www\.[a-z0-9-]+\.[a-z]{2,}/i,
  /\baccording to\b/i,
  /\bsource:\s*/i,
  /\bcited (from|in)\b/i,
];

// Ticker-like tokens: 3-5 uppercase letters. Allow a small English word list
// so common all-caps words (USA, ETF, NAV, MMF, CBK, KRA, NSE, CMA, KES, USD,
// EUR, GBP, IPO, GDP, IMF, TIP, ETC, FAQ, PAYE, KYC) don't false-positive.
const TICKER_ALLOWLIST = new Set([
  "USA", "UK", "EU", "AI", "OK", "TV", "PC", "IT",
  "ETF", "NAV", "MMF", "CBK", "KRA", "NSE", "CMA", "KES", "USD", "EUR",
  "GBP", "IPO", "GDP", "IMF", "TIP", "ETC", "FAQ", "KYC", "AML", "APR",
  "APY", "CFD", "CPI", "EPS", "PE", "PMI", "REIT", "ROI", "SME", "T-BILL",
  "TBILL", "PAYE", "VAT", "FX", "USD", "OK",
]);

function containsTickerLike(text: string): boolean {
  const tokens = text.match(/\b[A-Z]{3,5}\b/g);
  if (!tokens) return false;
  return tokens.some((t) => !TICKER_ALLOWLIST.has(t));
}

export function validateGeminiOutput(raw: string): ValidationResult {
  const text = (raw ?? "").trim();
  if (!text) return { ok: false, text: "", reason: "empty" };
  if (text.length > MAX_CHARS) {
    return { ok: false, text, reason: "too_long" };
  }
  if (text === "NOT_EDUCATIONAL") {
    return { ok: false, text, reason: "not_educational" };
  }
  if (NUMERIC_MONEY_PATTERNS.some((re) => re.test(text))) {
    return { ok: false, text, reason: "numeric_money" };
  }
  if (ADVISORY_PATTERNS.some((re) => re.test(text))) {
    return { ok: false, text, reason: "advisory_phrase" };
  }
  if (CITATION_PATTERNS.some((re) => re.test(text))) {
    return { ok: false, text, reason: "citation_or_url" };
  }
  if (containsTickerLike(text)) {
    return { ok: false, text, reason: "ticker_like" };
  }
  return { ok: true, text };
}
