// Lightweight prompt router: parses a user prompt into a scenario request.
// No LLM call — Phase 1 keeps everything deterministic and offline.

import {
  calculateMmfScenario,
  calculateStockMoveScenario,
  calculateMonthlyContributionScenario,
  EXPLAINERS,
  STANDARD_DISCLAIMER,
  type ScenarioResult,
} from "./scenarios";
import { buildRefusal, detectAdviceIntent, type RefusalPayload } from "./safety";

export interface UnknownPayload {
  kind: "unknown";
  message: string;
  suggestions: string[];
  disclaimer: string;
}

export type RouterResult = ScenarioResult | RefusalPayload | UnknownPayload;

const AMOUNT_RE = /(?:kes|ksh|kshs|sh)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|m)?(?!\s*%)/i;
const PERCENT_RE = /([0-9]+(?:\.[0-9]+)?)\s*%/;
const MONTHS_RE = /([0-9]+)\s*(?:months?|mo\b)/i;
const YEARS_RE = /([0-9]+)\s*(?:years?|yrs?)/i;

function parseAmount(text: string): number | null {
  const m = text.match(AMOUNT_RE);
  if (!m) return null;
  let n = parseFloat(m[1].replace(/,/g, ""));
  if (isNaN(n)) return null;
  if (m[2]?.toLowerCase() === "k") n *= 1_000;
  if (m[2]?.toLowerCase() === "m") n *= 1_000_000;
  if (n < 1) return null;
  return n;
}

function parsePercent(text: string): number | null {
  const m = text.match(PERCENT_RE);
  return m ? parseFloat(m[1]) : null;
}

function parseMonths(text: string): number | null {
  const m = text.match(MONTHS_RE);
  if (m) return parseInt(m[1], 10);
  const y = text.match(YEARS_RE);
  if (y) return parseInt(y[1], 10) * 12;
  return null;
}

export function routePrompt(rawPrompt: string): RouterResult {
  const prompt = rawPrompt.trim();
  if (!prompt) {
    return {
      kind: "unknown",
      message: "Ask a scenario question to get started.",
      suggestions: [],
      disclaimer: STANDARD_DISCLAIMER,
    };
  }

  if (detectAdviceIntent(prompt)) return buildRefusal();

  const lower = prompt.toLowerCase();

  // Explainers
  if (/explain|what is|what's|define/.test(lower) && /(yield|mmf|money market)/.test(lower)) {
    return EXPLAINERS["mmf-yield"];
  }

  // Monthly contribution scenario
  if (/monthly|every month|each month|per month|add.*month/.test(lower)) {
    // Two numbers: first = start (or 0), second = monthly. Fallback to single amount = monthly.
    const amounts = [...prompt.matchAll(/([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|m)?/gi)]
      .map((m) => {
        let n = parseFloat(m[1].replace(/,/g, ""));
        if (m[2]?.toLowerCase() === "k") n *= 1_000;
        if (m[2]?.toLowerCase() === "m") n *= 1_000_000;
        return n;
      })
      .filter((n) => !isNaN(n) && n >= 1);
    const yieldPct = parsePercent(prompt) ?? 11;
    const months = parseMonths(prompt) ?? 12;
    let start = 0;
    let monthly = 0;
    if (amounts.length >= 2) {
      [start, monthly] = amounts;
    } else if (amounts.length === 1) {
      monthly = amounts[0];
    }
    if (monthly > 0) {
      return calculateMonthlyContributionScenario(start, monthly, yieldPct, months);
    }
  }

  // Stock movement
  if (/(stock|share|price|safaricom|equity|equities)/.test(lower) || /(up|down|rise|rises|fall|falls|drop|drops|gain|gains|lose|loses)\b/.test(lower)) {
    const amount = parseAmount(prompt);
    const pct = parsePercent(prompt);
    if (amount != null && pct != null) {
      const negative = /(down|fall|falls|drop|drops|lose|loses|-)/.test(lower);
      const signed = negative && pct > 0 ? -pct : pct;
      return calculateStockMoveScenario(amount, signed);
    }
  }

  // MMF / yield scenario
  if (/(yield|mmf|money market|invest|fund)/.test(lower)) {
    const amount = parseAmount(prompt);
    const pct = parsePercent(prompt);
    const months = parseMonths(prompt) ?? 12;
    if (amount != null && pct != null) {
      return calculateMmfScenario(amount, pct, months);
    }
  }

  return {
    kind: "unknown",
    message:
      "I couldn't parse a scenario from that prompt. Try including an amount (e.g. KES 100,000) and a percentage (e.g. 11%).",
    suggestions: [
      "If I invest KES 100,000 at 11% yield, what happens?",
      "What happens if a stock falls 10%?",
      "Explain money market fund yield",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  };
}
