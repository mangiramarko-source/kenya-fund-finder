// Deterministic portfolio split prompt parsing for AI Lab Phase 8F.

import { findAsset, type ComparableAsset, type MarketContext } from "./marketContext";

const FUND_CONTEXT_RE = /\b(mmf|money market(?:\s+fund)?|unit trust|mutual fund)\b/i;
const GENERIC_STOCK_RE = /^(stocks?|shares?|equities?)$/i;
const NAMED_STOCK_PATTERN =
  /\b(scom|eqty|kcb|scbk|safaricom|equity group|kcb group|britam|eabl|kengen|ncba|co-op)\b/i;
const NAMED_STOCK_RE =
  /\b(scom|eqty|kcb|scbk|safaricom|equity group|kcb group|britam|eabl|kengen|ncba|co-op)\b/gi;

export const PORTFOLIO_ILLUSTRATIVE_AMOUNT = 100_000;
export const PORTFOLIO_ILLUSTRATIVE_AMOUNT_NOTE =
  "No total amount was stated, so this scenario uses an illustrative KES 100,000.";
export const DEFAULT_PORTFOLIO_YIELD_PCT = 11;
export const PORTFOLIO_ASSUMED_YIELD_NOTE =
  "Illustrative yield used where none was stated — replace with a figure from the fund factsheet.";
export const PORTFOLIO_AVG_YIELD_NOTE =
  "Average MMF yield from available KenyaFundFinder data used where none was stated.";

export interface ParsedPortfolioSplit {
  totalAmount: number;
  mmfPercent: number;
  stockPercent: number;
  stockAsset: ComparableAsset;
  annualYieldPct: number;
  yieldAssumedFromContext: boolean;
  illustrativeAmount: boolean;
  extraAssumptions: string[];
}

function parseAmountFromMatch(m: RegExpMatchArray): number {
  let n = parseFloat(m[1].replace(/,/g, ""));
  if (m[2]?.toLowerCase() === "k") n *= 1_000;
  if (m[2]?.toLowerCase() === "m") n *= 1_000_000;
  return n;
}

function parseSingleAmount(text: string): number | null {
  const cleaned = text.replace(/[0-9][0-9,]*(?:\.[0-9]+)?\s*%/g, " ");
  const re = /(?:kes|ksh|kshs|sh)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)(?:\s*(k|m)\b)?(?!\s*%)/i;
  const m = cleaned.match(re);
  if (!m) return null;
  const n = parseAmountFromMatch(m);
  return n >= 1 ? n : null;
}

function parseAllAmounts(text: string): number[] {
  const cleaned = text
    .replace(/[0-9][0-9,]*(?:\.[0-9]+)?\s*%/g, " ")
    .replace(/\b([0-9]+)\s*(?:months?|mo\b|years?|yrs?)\b/gi, " ");
  const re = /(?:kes|ksh|kshs|sh)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)(?:\s*(k|m)\b)?/gi;
  return [...cleaned.matchAll(re)]
    .map((m) => parseAmountFromMatch(m))
    .filter((n) => !isNaN(n) && n >= 1);
}

export function isGenericStockTerm(term: string): boolean {
  return GENERIC_STOCK_RE.test(term.trim());
}

export function resolvePortfolioStock(
  prompt: string,
  lower: string,
  stocks: ComparableAsset[],
): ComparableAsset | null {
  const patterns: RegExp[] = [
    /\bbetween\s+(?:an?\s+)?(?:mmf|money market(?:\s+fund)?)[^,]+?\s+and\s+([a-z0-9\s.'&-]+?)(?:\?|\.|$|\bat\b)/i,
    /\bsplit\s+(?:kes\s+)?[0-9k,\s.]+\s+between\s+(?:mmf|money market(?:\s+fund)?)[^,]+?\s+and\s+([a-z0-9\s.'&-]+?)(?:\?|\.|$|\bat\b)/i,
    /(?:in|into)\s+(?:an?\s+)?(?:mmf|money market(?:\s+fund)?)[^,]+?\s+and\s+(?:kes\s+)?[0-9k,\s.]+\s*(?:in|into)\s+([a-z0-9\s.'&-]+?)(?:\?|\.|$|\bat\b)/i,
    /(\d+(?:\.\d+)?)\s*%\s*(scom|eqty|kcb|scbk|safaricom|equity group|kcb group|[a-z][a-z0-9\s.'&-]+?)(?:\?|\.|$|\bat\b)/i,
    /\bif\s+(scom|eqty|kcb|scbk|safaricom|equity group|kcb group|[a-z][a-z0-9\s.'&-]+?)\s+(?:falls?|rises?|drops?|drop)\b/i,
    /\bput\s+\d+(?:\.\d+)?\s*%\s+(?:in|into)\s+(?:mmf|money market(?:\s+fund)?)[^,]+?\s+and\s+\d+(?:\.\d+)?\s*%\s+(?:in|into)\s+([a-z0-9\s.'&-]+?)(?:\?|\.|$)/i,
  ];

  for (const re of patterns) {
    const m = prompt.match(re);
    if (!m?.[1]) continue;
    const query = m[m.length - 1].trim().replace(/\bat\s+\d.*$/i, "").trim();
    if (!query || isGenericStockTerm(query)) continue;
    const asset = findAsset(query, stocks);
    if (asset) return asset;
  }

  if (NAMED_STOCK_PATTERN.test(lower)) {
    const tokens = [...lower.matchAll(NAMED_STOCK_RE)].map((x) => x[1]);
    for (const token of tokens) {
      if (FUND_CONTEXT_RE.test(token)) continue;
      const asset = findAsset(token, stocks);
      if (asset) return asset;
    }
  }

  return null;
}

export function parsePortfolioYieldPct(prompt: string): number | null {
  const yieldPatterns = [
    /(?:at|with)\s+(\d+(?:\.\d+)?)\s*%\s*(?:annual\s+)?yield\b/i,
    /(?:mmf|money market(?:\s+fund)?)\s+(?:earn(?:s)?|yield(?:s)?|at)\s+(\d+(?:\.\d+)?)\s*%/i,
    /(?:earn(?:s)?|yield(?:s)?)\s+(\d+(?:\.\d+)?)\s*%/i,
    /\bbut\s+(?:mmf|money market(?:\s+fund)?)\s+(?:earn(?:s)?|yield(?:s)?)\s+(\d+(?:\.\d+)?)\s*%/i,
  ];
  for (const re of yieldPatterns) {
    const m = prompt.match(re);
    if (m) return parseFloat(m[1]);
  }
  return null;
}

function parseAllocationPercents(prompt: string, lower: string): { mmfPct: number; stockPct: number } | null {
  const dualPct =
    /(\d+(?:\.\d+)?)\s*%\s*([^,]+?)\s+and\s+(\d+(?:\.\d+)?)\s*%\s*([^,.?]+)/i.exec(prompt);
  if (!dualPct) return null;

  const firstPct = parseFloat(dualPct[1]);
  const firstCtx = dualPct[2].toLowerCase();
  const secondPct = parseFloat(dualPct[3]);
  const secondCtx = dualPct[4].toLowerCase();

  let mmfPct: number;
  let stockPct: number;

  const firstIsFund = FUND_CONTEXT_RE.test(firstCtx);
  const secondIsFund = FUND_CONTEXT_RE.test(secondCtx);

  if (firstIsFund && !secondIsFund) {
    mmfPct = firstPct;
    stockPct = secondPct;
  } else if (secondIsFund && !firstIsFund) {
    mmfPct = secondPct;
    stockPct = firstPct;
  } else if (firstIsFund && secondIsFund) {
    return null;
  } else if (FUND_CONTEXT_RE.test(lower.slice(0, lower.indexOf(String(secondPct))))) {
    mmfPct = firstPct;
    stockPct = secondPct;
  } else {
    return null;
  }

  if (Math.abs(mmfPct + stockPct - 100) > 0.01) return null;
  return { mmfPct, stockPct };
}

function parseDualAmounts(prompt: string): { mmfAmount: number; stockAmount: number } | null {
  const parts = prompt.split(/\band\b/i);
  if (parts.length < 2) return null;

  let mmfPart: string | null = null;
  let stockPart: string | null = null;
  for (const part of parts) {
    if (FUND_CONTEXT_RE.test(part) && /(?:in|into)\s/i.test(part)) {
      mmfPart = part;
    } else if (/(?:in|into)\s/i.test(part)) {
      stockPart = part;
    }
  }
  if (!mmfPart || !stockPart) return null;

  const mmfAmount = parseSingleAmount(mmfPart);
  const stockAmount = parseSingleAmount(stockPart);
  if (mmfAmount == null || stockAmount == null) return null;
  return { mmfAmount, stockAmount };
}

export function isPortfolioSplitIntent(lower: string, prompt: string): boolean {
  if (/\bwhat happens to\b.*\b(mmf|money market)\b.*\b(stocks?|shares?|equities?)\b/i.test(lower)) {
    return false;
  }
  if (/\b(mmf|money market)\b.*\bvs\.?\b.*\b(stocks?|shares?|equities?)\b/i.test(lower)) {
    return false;
  }

  if (/\bsplit\b/.test(lower) && FUND_CONTEXT_RE.test(lower)) return true;

  if (parseAllocationPercents(prompt, lower)) return true;

  if (
    /(?:in|into)\s*(?:an?\s+)?(?:mmf|money market)/i.test(lower) &&
    /\band\b/i.test(lower) &&
    /(?:in|into)\s/i.test(lower.slice(lower.indexOf("and")))
  ) {
    return true;
  }

  if (
    /\bif\b/.test(lower) &&
    FUND_CONTEXT_RE.test(lower) &&
    /(?:falls?|rises?|drops?|earn|yield)/i.test(lower)
  ) {
    if (/\b(stocks?|shares?|equities)\b/i.test(lower) && !NAMED_STOCK_PATTERN.test(lower)) {
      return true;
    }
    if (NAMED_STOCK_PATTERN.test(lower)) return true;
  }

  if (/\bwhat happens if i (?:split|put)\b/.test(lower) && FUND_CONTEXT_RE.test(lower)) {
    return true;
  }

  if (/\bwhat if i split\b/.test(lower) && FUND_CONTEXT_RE.test(lower)) {
    return true;
  }

  if (/\bput\s+\d+(?:\.\d+)?\s*%\s+(?:in|into)\s+(?:mmf|money market)/i.test(lower)) {
    return true;
  }

  return false;
}

function isHybridNamedStockPrompt(lower: string): boolean {
  return (
    /\bif\b/.test(lower) &&
    FUND_CONTEXT_RE.test(lower) &&
    /(?:falls?|rises?|drops?|earn|yield)/i.test(lower) &&
    NAMED_STOCK_PATTERN.test(lower) &&
    !(/\b(stocks?|shares?|equities)\b/i.test(lower) && !NAMED_STOCK_PATTERN.test(lower))
  );
}

function allowsIllustrativeAmount(
  lower: string,
  prompt: string,
  allocation: { mmfPct: number; stockPct: number } | null,
  dualAmounts: { mmfAmount: number; stockAmount: number } | null,
  stockAsset: ComparableAsset | null,
  yieldPct: number | null,
): boolean {
  if (!stockAsset || yieldPct == null) return false;
  if (dualAmounts) return false;
  if (allocation) return true;
  if (/\bsplit\b/.test(lower) && parseSingleAmount(prompt) != null) return false;
  if (isHybridNamedStockPrompt(lower)) return true;
  return false;
}

export function parsePortfolioSplit(
  prompt: string,
  ctx?: MarketContext | null,
): ParsedPortfolioSplit | null {
  const lower = prompt.toLowerCase();
  if (!isPortfolioSplitIntent(lower, prompt)) return null;

  const stocks = (ctx?.assets ?? []).filter((a) => a.kind === "stock");
  const stockAsset = resolvePortfolioStock(prompt, lower, stocks);
  if (!stockAsset || stockAsset.value <= 0) return null;

  if (
    /\b(stocks?|shares?|equities)\b/i.test(lower) &&
    !NAMED_STOCK_PATTERN.test(lower)
  ) {
    return null;
  }

  const extraAssumptions: string[] = [];

  let yieldPct = parsePortfolioYieldPct(prompt);
  let yieldAssumedFromContext = false;
  if (yieldPct == null) {
    if (ctx?.avgAnnualYieldPct != null) {
      yieldPct = ctx.avgAnnualYieldPct;
      yieldAssumedFromContext = true;
    } else {
      yieldPct = DEFAULT_PORTFOLIO_YIELD_PCT;
      yieldAssumedFromContext = true;
      extraAssumptions.push(PORTFOLIO_ASSUMED_YIELD_NOTE);
    }
  }
  if (yieldAssumedFromContext) extraAssumptions.push(PORTFOLIO_AVG_YIELD_NOTE);

  let mmfPercent = 50;
  let stockPercent = 50;
  let totalAmount: number | null = parseSingleAmount(prompt);
  let illustrativeAmount = false;

  const allocation = parseAllocationPercents(prompt, lower);
  const dualAmounts = parseDualAmounts(prompt);

  if (allocation) {
    mmfPercent = allocation.mmfPct;
    stockPercent = allocation.stockPct;
  } else if (dualAmounts) {
    totalAmount = dualAmounts.mmfAmount + dualAmounts.stockAmount;
    mmfPercent = Math.round((dualAmounts.mmfAmount / totalAmount) * 10000) / 100;
    stockPercent = 100 - mmfPercent;
  } else if (isHybridNamedStockPrompt(lower)) {
    mmfPercent = 50;
    stockPercent = 50;
  } else if (/\bsplit\b/.test(lower)) {
    mmfPercent = 50;
    stockPercent = 50;
  } else {
    return null;
  }

  if (totalAmount == null) {
    if (
      !allowsIllustrativeAmount(lower, prompt, allocation, dualAmounts, stockAsset, yieldPct)
    ) {
      return null;
    }
    totalAmount = PORTFOLIO_ILLUSTRATIVE_AMOUNT;
    illustrativeAmount = true;
    extraAssumptions.push(PORTFOLIO_ILLUSTRATIVE_AMOUNT_NOTE);
  }

  if (dualAmounts) {
    const allAmounts = parseAllAmounts(prompt);
    if (allAmounts.length >= 2) {
      const sum = allAmounts[0] + allAmounts[1];
      if (Math.abs(sum - totalAmount) > 1) return null;
    }
  }

  return {
    totalAmount,
    mmfPercent,
    stockPercent,
    stockAsset,
    annualYieldPct: yieldPct,
    yieldAssumedFromContext,
    illustrativeAmount,
    extraAssumptions,
  };
}
