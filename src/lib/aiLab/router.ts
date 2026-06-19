// Lightweight prompt router: parses a user prompt into a scenario request.
// No LLM call — Phase 1 keeps everything deterministic and offline.

import {
  calculateMmfScenario,
  calculateMmfYieldChangeScenario,
  calculateStockMoveScenario,
  calculateMonthlyContributionScenario,
  calculateStockAmountScenario,
  compareAssets,
  EXPLAINERS,
  STANDARD_DISCLAIMER,
  type ScenarioResult,
} from "./scenarios";
import { findAsset, type MarketContext } from "./marketContext";
import { buildRefusal, detectAdviceIntent, hasMmfYieldContext, type RefusalPayload } from "./safety";

export interface UnknownPayload {
  kind: "unknown";
  message: string;
  suggestions: string[];
  disclaimer: string;
}

export type RouterResult = ScenarioResult | RefusalPayload | UnknownPayload;

export const UNKNOWN_FALLBACK_MSG =
  "I could not confidently match that question to a supported scenario yet. Try a calculation, comparison, or explainer prompt.";

export const UNKNOWN_FALLBACK_SUGGESTIONS = [
  "KES 10,000 in SCOM",
  "If I invest KES 100,000 at 11% yield, what happens?",
  "Compare SCOM vs EQTY",
  "Explain liquidity",
  "Gross return vs net return",
];

const AMOUNT_RE = /(?:kes|ksh|kshs|sh)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|m)?(?!\s*%)/i;
const PERCENT_RE = /([0-9]+(?:\.[0-9]+)?)\s*%/;
const MONTHS_RE = /([0-9]+)\s*(?:months?|mo\b)/i;
const YEARS_RE = /([0-9]+)\s*(?:years?|yrs?)/i;
const COMPARE_RE = /^\s*compare\s+(.+?)\s+(?:vs\.?|versus|with|to|and|&)\s+(.+?)\s*$/i;

/** Router-only keyword list — do not surface "mutual fund" in user-facing copy. */
const FUND_CONTEXT_RE = /\b(mmf|money market|unit trust|mutual fund|money market fund)\b/i;

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

const ILLUSTRATIVE_AMOUNT = 100_000;
const ASSUMED_YIELD_NOTE =
  "Illustrative yield used where none was stated — replace with a figure from the fund factsheet.";
const ILLUSTRATIVE_AMOUNT_NOTE =
  "Illustrative amount of KES 100,000 used where none was stated.";

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

function resolveYieldPct(
  prompt: string,
  ctx?: MarketContext | null,
): { pct: number; assumed: boolean } {
  const explicit = parsePercent(prompt);
  if (explicit != null) return { pct: explicit, assumed: false };
  if (ctx?.avgAnnualYieldPct != null) return { pct: ctx.avgAnnualYieldPct, assumed: true };
  return { pct: 11, assumed: true };
}

function extractStockQuery(prompt: string): string | null {
  for (const re of STOCK_QUERY_RES) {
    const m = prompt.match(re);
    if (m?.[1]) {
      const q = m[1]
        .trim()
        .replace(/\b(what happens|worth|shares?|stock)\b/gi, "")
        .trim();
      if (FUND_CONTEXT_RE.test(q) || FUND_CONTEXT_RE.test(prompt)) return null;
      return q;
    }
  }
  return null;
}

function isStockAmountIntent(lower: string, prompt: string): boolean {
  if (FUND_CONTEXT_RE.test(lower) && !/\b(scom|eqty|kcb|safaricom|equity)\b/i.test(lower)) {
    return false;
  }
  if (hasMmfYieldContext(prompt) && FUND_CONTEXT_RE.test(lower)) return false;
  if (/\bshow possible outcomes\b/.test(lower)) return true;
  if (/\bhow much will i make if i (put|invest|buy)\b/.test(lower)) return true;
  if (/\bwhat happens if\b/.test(lower) && /\bin\b/.test(lower) && !FUND_CONTEXT_RE.test(lower)) return true;
  if (/\b(?:put|invest|buy)\b/.test(lower) && /\bin\b/.test(lower) && !FUND_CONTEXT_RE.test(lower)) return true;
  if (/\bworth of\b/.test(lower)) return true;
  if (/\bshillings?\b/.test(lower) && /\bin\b/.test(lower)) return true;
  if (/\bin\b/.test(lower) && !/\bvs\.?\b|\bversus\b/.test(lower) && !FUND_CONTEXT_RE.test(lower)) return true;
  return false;
}

function tryStockAmountRoute(
  prompt: string,
  lower: string,
  ctx?: MarketContext | null,
): RouterResult | null {
  if (!isStockAmountIntent(lower, prompt)) return null;
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

function tryMmfRoutes(
  prompt: string,
  lower: string,
  ctx?: MarketContext | null,
): RouterResult | null {
  const months = parseMonths(prompt) ?? 12;
  const extra: string[] = [];

  const yieldChange = prompt.match(
    /(?:yield\s+)?(?:drops?|falls?|changes?)\s+from\s+(\d+(?:\.\d+)?)\s*%\s+to\s+(\d+(?:\.\d+)?)\s*%/i,
  );
  if (yieldChange) {
    const amount = parseAmount(prompt) ?? ILLUSTRATIVE_AMOUNT;
    if (amount === ILLUSTRATIVE_AMOUNT && parseAmount(prompt) == null) {
      extra.push(ILLUSTRATIVE_AMOUNT_NOTE);
    }
    return calculateMmfYieldChangeScenario(
      amount,
      parseFloat(yieldChange[1]),
      parseFloat(yieldChange[2]),
      months,
    );
  }

  if (/monthly equivalent of\s+\d/i.test(lower) && /yield/.test(lower)) {
    const { pct, assumed } = resolveYieldPct(prompt, ctx);
    if (assumed) extra.push(ASSUMED_YIELD_NOTE);
    extra.push(ILLUSTRATIVE_AMOUNT_NOTE);
    return calculateMmfScenario(ILLUSTRATIVE_AMOUNT, pct, months, extra);
  }

  if (/how much per day/.test(lower)) {
    const amount = parseAmount(prompt);
    if (amount != null) {
      const { pct, assumed } = resolveYieldPct(prompt, ctx);
      if (assumed) extra.push(ASSUMED_YIELD_NOTE);
      return calculateMmfScenario(amount, pct, months, extra);
    }
  }

  if (/how much monthly income/.test(lower)) {
    const amount = parseAmount(prompt);
    if (amount != null) {
      const { pct, assumed } = resolveYieldPct(prompt, ctx);
      if (assumed) extra.push(ASSUMED_YIELD_NOTE);
      return calculateMmfScenario(amount, pct, months, extra);
    }
  }

  const mmfAmountIntent =
    /\bhow much do i get\b/.test(lower) ||
    /\bhow much would .+ make in (an? )?(mmf|money market)\b/.test(lower) ||
    (/\b(?:put|invest|save)\b/.test(lower) && FUND_CONTEXT_RE.test(lower)) ||
    (/\bhow much\b/.test(lower) && FUND_CONTEXT_RE.test(lower));

  if (mmfAmountIntent) {
    const amount = parseAmount(prompt);
    if (amount != null) {
      const { pct, assumed } = resolveYieldPct(prompt, ctx);
      if (assumed) extra.push(ASSUMED_YIELD_NOTE);
      return calculateMmfScenario(amount, pct, months, extra);
    }
  }

  if (
    (/(yield|mmf|money market|fund)/.test(lower) || hasMmfYieldContext(prompt)) &&
    parseAmount(prompt) != null
  ) {
    const amount = parseAmount(prompt)!;
    const explicitPct = parsePercent(prompt);
    if (explicitPct != null) {
      return calculateMmfScenario(amount, explicitPct, months, extra);
    }
    const { pct, assumed } = resolveYieldPct(prompt, ctx);
    if (assumed) extra.push(ASSUMED_YIELD_NOTE);
    return calculateMmfScenario(amount, pct, months, extra);
  }

  return null;
}

function routeExplainer(lower: string): ScenarioResult | null {
  const isExp = /explain|what is|what's|define/.test(lower);
  if (!isExp) return null;

  if (/(t-?bill|treasury bill)/.test(lower)) return EXPLAINERS["t-bills"];
  if (/withholding/.test(lower)) return EXPLAINERS["withholding-tax"];
  if (/dividend yield/.test(lower)) return EXPLAINERS["dividend-yield"];
  if (/\bnav\b|net asset value/.test(lower)) return EXPLAINERS.nav;
  if (/expense ratio/.test(lower)) return EXPLAINERS["expense-ratio"];
  if (/compound|compounding/.test(lower)) return EXPLAINERS.compounding;
  if (/unit trust/.test(lower)) return EXPLAINERS["unit-trust"];
  if (/\betf\b|exchange traded fund/.test(lower)) return EXPLAINERS.etf;
  if (/capital gain/.test(lower)) return EXPLAINERS["capital-gain"];
  if (/downside risk/.test(lower)) return EXPLAINERS["downside-risk"];
  if (/(fund fee|management fee|fees)/.test(lower)) return EXPLAINERS.fees;
  if (/liquidity/.test(lower)) return EXPLAINERS.liquidity;
  if (/volatil/.test(lower)) return EXPLAINERS.volatility;
  if (/(gross vs net|gross versus net|net vs gross|net versus gross|gross return vs net)/.test(lower)) {
    return EXPLAINERS["gross-vs-net"];
  }
  if (/(yield|mmf|money market)/.test(lower)) return EXPLAINERS["mmf-yield"];
  return null;
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

  const explainer = routeExplainer(lower);
  if (explainer) return explainer;

  const mmf = tryMmfRoutes(prompt, lower, ctx);
  if (mmf) return mmf;

  const stockAmount = tryStockAmountRoute(prompt, lower, ctx);
  if (stockAmount) return stockAmount;

  if (/monthly|every month|each month|per month|add.*month|save.*month/.test(lower)) {
    const amounts = [...prompt.matchAll(/([0-9][0-9,]*(?:\.[0-9]+)?)\s*(k|m)?/gi)]
      .map((m) => {
        let n = parseFloat(m[1].replace(/,/g, ""));
        if (m[2]?.toLowerCase() === "k") n *= 1_000;
        if (m[2]?.toLowerCase() === "m") n *= 1_000_000;
        return n;
      })
      .filter((n) => !isNaN(n) && n >= 1);
    const { pct } = resolveYieldPct(prompt, ctx);
    const monthsParsed = parseMonths(prompt) ?? 12;
    let start = 0;
    let monthly = 0;
    if (amounts.length >= 2) {
      [start, monthly] = amounts;
    } else if (amounts.length === 1) {
      monthly = amounts[0];
    }
    if (monthly > 0) {
      return calculateMonthlyContributionScenario(start, monthly, pct, monthsParsed);
    }
  }

  if (
    /(stock|share|price|safaricom|equity|equities)/.test(lower) ||
    /(up|down|rise|rises|fall|falls|drop|drops|gain|gains|lose|loses)\b/.test(lower)
  ) {
    const amount = parseAmount(prompt);
    const pct = parsePercent(prompt);
    if (amount != null && pct != null) {
      const negative = /(down|fall|falls|drop|drops|lose|loses|-)/.test(lower);
      const signed = negative && pct > 0 ? -pct : pct;
      return calculateStockMoveScenario(amount, signed);
    }
  }

  if (/(yield|mmf|money market|invest|fund)/.test(lower)) {
    const amount = parseAmount(prompt);
    const pct = parsePercent(prompt);
    const monthsParsed = parseMonths(prompt) ?? 12;
    if (amount != null && pct != null) {
      return calculateMmfScenario(amount, pct, monthsParsed);
    }
  }

  return {
    kind: "unknown",
    message: UNKNOWN_FALLBACK_MSG,
    suggestions: UNKNOWN_FALLBACK_SUGGESTIONS,
    disclaimer: STANDARD_DISCLAIMER,
  };
}
