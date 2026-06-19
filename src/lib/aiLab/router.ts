// Lightweight prompt router: parses a user prompt into a scenario request.
// No LLM call — Phase 1 keeps everything deterministic and offline.

import {
  calculateMmfScenario,
  calculateStockMoveScenario,
  calculateMonthlyContributionScenario,
  calculateStockAmountScenario,
  compareAssets,
  EXPLAINERS,
  STANDARD_DISCLAIMER,
  type ScenarioResult,
} from "./scenarios";
import { findAsset, type MarketContext } from "./marketContext";
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
  // Strip any percentage expressions first so "10%" isn't mistaken for "10".
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

const COMPARE_RE = /^\s*compare\s+(.+?)\s+(?:vs\.?|versus|with|to|and|&)\s+(.+?)\s*$/i;

const STOCK_QUERY_RES = [
  /\b(?:in|into|of)\s+([A-Za-z][A-Za-z0-9\s.'&-]+?)(?:\?|\.|$)/i,
  /\bworth of\s+([A-Za-z][A-Za-z0-9\s.'&-]+?)(?:\?|\.|$)/i,
];

const STOCK_AMOUNT_UNKNOWN_MSG =
  "I could not confidently match that stock to available KenyaFundFinder data yet. Try a ticker or company name shown on the platform.";

const STOCK_AMOUNT_SUGGESTIONS = [
  "KES 10,000 in SCOM",
  "KES 10,000 in EQTY",
  "Compare SCOM vs EQTY",
];

function extractStockQuery(prompt: string): string | null {
  for (const re of STOCK_QUERY_RES) {
    const m = prompt.match(re);
    if (m?.[1]) {
      return m[1]
        .trim()
        .replace(/\b(what happens|worth|shares?|stock)\b/gi, "")
        .trim();
    }
  }
  return null;
}

function isStockAmountIntent(lower: string): boolean {
  if (/\bshow possible outcomes\b/.test(lower)) return true;
  if (/\bhow much will i make if i (put|invest|buy)\b/.test(lower)) return true;
  if (/\bwhat happens if\b/.test(lower) && /\bin\b/.test(lower)) return true;
  if (/\b(?:put|invest|buy)\b/.test(lower) && /\bin\b/.test(lower)) return true;
  if (/\bworth of\b/.test(lower)) return true;
  if (/\bshillings?\b/.test(lower) && /\bin\b/.test(lower)) return true;
  if (/\bin\b/.test(lower) && !/\bvs\.?\b|\bversus\b/.test(lower)) return true;
  return false;
}

function tryStockAmountRoute(
  prompt: string,
  lower: string,
  ctx?: MarketContext | null,
): RouterResult | null {
  if (!isStockAmountIntent(lower)) return null;
  const amount = parseAmount(prompt);
  const stockQuery = extractStockQuery(prompt);
  if (amount == null || !stockQuery) return null;

  const stocks = (ctx?.assets ?? []).filter((a) => a.kind === "stock");
  const asset = findAsset(stockQuery, stocks);
  if (!asset || asset.value <= 0) {
    return {
      kind: "unknown",
      message: STOCK_AMOUNT_UNKNOWN_MSG,
      suggestions: STOCK_AMOUNT_SUGGESTIONS,
      disclaimer: STANDARD_DISCLAIMER,
    };
  }
  return calculateStockAmountScenario(amount, asset);
}

export function routePrompt(rawPrompt: string, ctx?: MarketContext | null): RouterResult {
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

  // Compare two assets (stocks, funds, commodities, FX)
  const cmp = prompt.match(COMPARE_RE);
  if (cmp) {
    const assets = ctx?.assets ?? [];
    const a = findAsset(cmp[1], assets);
    const b = findAsset(cmp[2], assets);
    if (a && b && a.symbol !== b.symbol) {
      return compareAssets(a, b);
    }
    const missing: string[] = [];
    if (!a) missing.push(`"${cmp[1].trim()}"`);
    if (!b) missing.push(`"${cmp[2].trim()}"`);
    return {
      kind: "unknown",
      message:
        missing.length > 0
          ? `Couldn't find ${missing.join(" or ")} in the live market data. Try using a ticker (e.g. SCOM, USD, GOLD) or the full fund name.`
          : "Pick two different assets to compare.",
      suggestions: [
        "Compare SCOM vs EQTY",
        "Compare USD vs EUR",
        "Compare Gold vs Brent Crude",
        "Compare CIC Money Market Fund vs Sanlam Money Market Fund",
      ],
      disclaimer: STANDARD_DISCLAIMER,
    };
  }

  // Explainers (check specific topics before generic MMF yield)
  if (/explain|what is|what's|define/.test(lower) && /(t-?bill|treasury bill)/.test(lower)) {
    return EXPLAINERS["t-bills"];
  }
  if (/explain|what is|what's|define/.test(lower) && /withholding/.test(lower)) {
    return EXPLAINERS["withholding-tax"];
  }
  if (/explain|what is|what's|define/.test(lower) && /(fund fee|management fee|fees)/.test(lower)) {
    return EXPLAINERS.fees;
  }
  if (/explain|what is|what's|define/.test(lower) && /liquidity/.test(lower)) {
    return EXPLAINERS.liquidity;
  }
  if (/explain|what is|what's|define/.test(lower) && /volatil/.test(lower)) {
    return EXPLAINERS.volatility;
  }
  if (
    /explain|what is|what's|define/.test(lower) &&
    /(gross vs net|gross versus net|net vs gross|net versus gross)/.test(lower)
  ) {
    return EXPLAINERS["gross-vs-net"];
  }
  if (/explain|what is|what's|define/.test(lower) && /(yield|mmf|money market)/.test(lower)) {
    return EXPLAINERS["mmf-yield"];
  }

  const stockAmount = tryStockAmountRoute(prompt, lower, ctx);
  if (stockAmount) return stockAmount;

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
      "Explain treasury bills",
      "Explain withholding tax",
      "Explain gross vs net return",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  };
}
