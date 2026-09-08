// Lightweight prompt router: parses a user prompt into a scenario request.
// No LLM call — Phase 1 keeps everything deterministic and offline.

import {
  calculateMmfScenario,
  calculateMmfYieldChangeScenario,
  calculateStockMoveScenario,
  calculateGoalProjectionScenario,
  calculateStockAmountScenario,
  calculateFxConversionScenario,
  calculateFxMoveScenario,
  calculateCommodityMoveScenario,
  calculateCommodityAmountScenario,
  calculateNewsSummaryScenario,
  calculatePortfolioSplitScenario,
  compareAssets,
  EXPLAINERS,
  STANDARD_DISCLAIMER,
  type ScenarioResult,
} from "./scenarios";
import { findAsset, type ComparableAsset, type MarketContext } from "./marketContext";
import { buildRefusal, detectAdviceIntent, hasMmfYieldContext, type RefusalPayload } from "./safety";
import { buildUnknownFallback, PORTFOLIO_SPLIT_UNKNOWN_MSG, PORTFOLIO_SPLIT_SUGGESTIONS } from "./intent";
import {
  isPortfolioSplitIntent,
  parsePortfolioSplit,
} from "./portfolioSplitParse";
import {
  type UnknownPayload,
  UNKNOWN_FALLBACK_MSG,
  UNKNOWN_FALLBACK_SUGGESTIONS,
} from "./routerTypes";
import {
  formatAmbiguousMatchMessage,
  formatCompareNotFoundMessage,
  parseCompareSides,
  resolveAssetMatch,
} from "./nameMatch";
import {
  buildNewsLimitationFallback,
  buildNewsUnavailableFallback,
  isNewsLabPrompt,
  matchNewsForPrompt,
  type NewsContext,
} from "./newsContext";
import { buildHypotheticalScenarioResponse } from "./hypotheticalScenarios";

export type { UnknownPayload } from "./routerTypes";
export { UNKNOWN_FALLBACK_MSG, UNKNOWN_FALLBACK_SUGGESTIONS } from "./routerTypes";

export type RouterResult = ScenarioResult | RefusalPayload | UnknownPayload;

const AMOUNT_RE = /(?:kes|ksh|kshs|sh)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)(?:\s*(k|m)\b)?(?!\s*%)/i;
const PERCENT_RE = /([0-9]+(?:\.[0-9]+)?)\s*%/;

/** Router-only keyword list — do not surface "mutual fund" in user-facing copy. */
const FUND_CONTEXT_RE = /\b(mmf|money market|unit trust|mutual fund|money market fund)\b/i;

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
  const m = text.match(/\b([0-9]+)\s*months?\b/i);
  if (m) return parseInt(m[1], 10);
  const mo = text.match(/\b([0-9]+)\s*mo\b/i);
  if (mo) return parseInt(mo[1], 10);
  const y = text.match(/\b([0-9]+)\s*(?:years?|yrs?)\b/i);
  if (y) return parseInt(y[1], 10) * 12;
  return null;
}

function parseAllAmounts(text: string): number[] {
  const cleaned = text
    .replace(/[0-9][0-9,]*(?:\.[0-9]+)?\s*%/g, " ")
    .replace(/\b([0-9]+)\s*(?:months?|mo\b|years?|yrs?)\b/gi, " ");
  const re = /(?:kes|ksh|kshs|sh)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)(?:\s*(k|m)\b)?/gi;
  return [...cleaned.matchAll(re)]
    .map((m) => {
      let n = parseFloat(m[1].replace(/,/g, ""));
      if (isNaN(n)) return NaN;
      if (m[2]?.toLowerCase() === "k") n *= 1_000;
      if (m[2]?.toLowerCase() === "m") n *= 1_000_000;
      return n;
    })
    .filter((n) => !isNaN(n) && n >= 0);
}

const REVERSE_GOAL_RES = [
  /\bhow much (do i )?need\b.*\bmonthly\b.*\breach\b/i,
  /\bhow much should i (save|contribute|add)\b.*\bmonthly\b.*\breach\b/i,
  /\bhow long\b.*\breach\b/i,
];

export function isReverseGoalPrompt(lower: string): boolean {
  return REVERSE_GOAL_RES.some((re) => re.test(lower));
}

function unknownFallback(prompt: string, ctx?: MarketContext | null): UnknownPayload {
  return buildUnknownFallback(prompt, ctx);
}

function isGoalProjectionIntent(lower: string): boolean {
  if (/\bmonthly income\b/.test(lower)) return false;
  return (
    (/\bstart with\b/.test(lower) && /\bmonthly\b/.test(lower)) ||
    /\b(add|save)\b.*\bmonthly\b/.test(lower) ||
    (/\bmonthly\b/.test(lower) && /\bfor\s+\d/.test(lower))
  );
}

function tryGoalProjectionRoute(prompt: string, lower: string): RouterResult | null {
  if (!isGoalProjectionIntent(lower)) return null;

  const annualYieldPct = parsePercent(prompt);
  const months = parseMonths(prompt);
  if (annualYieldPct == null || months == null) return null;

  const amounts = parseAllAmounts(prompt);
  if (amounts.length === 0) return null;

  let startAmount = 0;
  let monthlyContribution = 0;

  if (/\bstart with\b/.test(lower) && amounts.length >= 2) {
    [startAmount, monthlyContribution] = amounts.slice(0, 2);
  } else {
    monthlyContribution = amounts[0];
  }

  if (monthlyContribution <= 0) return null;

  return calculateGoalProjectionScenario(
    startAmount,
    monthlyContribution,
    annualYieldPct,
    months,
  );
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

function isStockAmountIntent(lower: string, prompt: string): boolean {
  if (isPortfolioSplitIntent(lower, prompt)) return false;
  if (/\bsplit\b/.test(lower) && FUND_CONTEXT_RE.test(lower)) return false;
  if (FUND_CONTEXT_RE.test(lower) && /\d+\s*%\s*.*\band\s*\d+\s*%/.test(lower)) return false;
  if (FUND_CONTEXT_RE.test(lower)) return false;
  if (hasMmfYieldContext(prompt) && FUND_CONTEXT_RE.test(lower)) return false;
  if (/\bhow many\b.*\bshares\b/.test(lower)) return true;
  if (/\bshow possible outcomes\b/.test(lower)) return true;
  if (/\bhow much will i make if i (put|invest|buy)\b/.test(lower)) return true;
  if (/\bi have\b/.test(lower) && /\bput\b/.test(lower) && /\bin\b/.test(lower)) return true;
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
  if (amount == null) return null;

  const stocks = (ctx?.assets ?? []).filter((a) => a.kind === "stock");
  const match = resolveAssetMatch(prompt, stocks);
  if (match.status === "ambiguous") {
    return {
      kind: "unknown",
      message: formatAmbiguousMatchMessage("the stock", match.query, match.candidates),
      suggestions: STOCK_AMOUNT_SUGGESTIONS,
      disclaimer: STANDARD_DISCLAIMER,
    };
  }
  const asset = match.asset;
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

function isNeutralAmountAssetPrompt(prompt: string, lower: string): boolean {
  if (parseAmount(prompt) == null || isPortfolioSplitIntent(lower, prompt)) return false;
  return (
    /\b(?:put|invest|buy|allocate|spend)\b/.test(lower) ||
    /\b(?:in|into)\b/.test(lower) ||
    /\bhow many\b.*\bshares?\b/.test(lower)
  );
}

function commodityQuoteCurrency(valueLabel: string): string | null {
  const direct = valueLabel.match(/\b(KES|USD|EUR|GBP)\b/i)?.[1];
  if (direct) return direct.toUpperCase();
  if (/\bUS\$|\$\b/.test(valueLabel)) return "USD";
  return null;
}

function assetAmountUnknown(message: string): UnknownPayload {
  return {
    kind: "unknown",
    message,
    suggestions: [
      "KES 10,000 in SCOM",
      "KES 10,000 in Etica MMF",
      "KES 10,000 in USD",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  };
}

/** Resolve a neutral amount + named catalog asset without hard-coded tickers. */
function tryAssetAmountRoute(
  prompt: string,
  lower: string,
  ctx?: MarketContext | null,
): RouterResult | null {
  if (!isNeutralAmountAssetPrompt(prompt, lower)) return null;
  // An explicit yield is a distinct user assumption handled by the established
  // MMF route below; otherwise use the matched fund's published yield.
  if (parsePercent(prompt) != null && FUND_CONTEXT_RE.test(prompt)) return null;

  const amount = parseAmount(prompt);
  if (amount == null) return null;
  const assets = ctx?.assets ?? [];
  // A generic "MMF" is a fund category, not a candidate for cross-asset
  // matching. Resolve named fund wording only within the fund catalog so
  // unrelated short prose tokens cannot select an FX or commodity asset.
  const candidateAssets = FUND_CONTEXT_RE.test(prompt)
    ? assets.filter((asset) => asset.kind === "fund")
    : assets;
  const match = resolveAssetMatch(prompt, candidateAssets);
  if (FUND_CONTEXT_RE.test(prompt) && match.status !== "match") return null;
  if (match.status === "ambiguous") {
    return assetAmountUnknown(
      formatAmbiguousMatchMessage("the investment", match.query, match.candidates),
    );
  }
  const asset = match.asset;
  if (!asset || asset.value <= 0) return null;

  switch (asset.kind) {
    case "stock":
      return calculateStockAmountScenario(amount, asset);
    case "fund":
      return calculateMmfScenario(amount, asset.value, parseMonths(prompt) ?? 12, [
        `Uses ${asset.name}'s latest published annual yield from KenyaFundFinder.`,
      ]);
    case "fx":
      return calculateFxConversionScenario(amount, "KES", asset.symbol, asset.value, asset.valueLabel);
    case "commodity": {
      const quoteCurrency = commodityQuoteCurrency(asset.valueLabel);
      if (!quoteCurrency) {
        return assetAmountUnknown(
          `I found ${asset.name}, but I need its published quote currency before estimating units.`,
        );
      }
      const rate = quoteCurrency === "KES" ? null : findFxAsset(quoteCurrency, ctx)?.value ?? null;
      if (quoteCurrency !== "KES" && (!rate || rate <= 0)) {
        return assetAmountUnknown(
          `I found ${asset.name}, but I need the current ${quoteCurrency}/KES rate to estimate units from KES.`,
        );
      }
      return calculateCommodityAmountScenario(amount, asset, quoteCurrency, rate);
    }
  }
}

function tryMmfRoutes(
  prompt: string,
  lower: string,
  ctx?: MarketContext | null,
): RouterResult | null {
  if (isGoalProjectionIntent(lower)) return null;

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

  if (/\bearn\b/.test(lower) || /\bwhat would\b/.test(lower)) {
    const amount = parseAmount(prompt);
    const pct = parsePercent(prompt);
    if (amount != null && pct != null) {
      return calculateMmfScenario(amount, pct, months, extra);
    }
  }

  if (/\bwhat does\b.*\byield\b/.test(lower) && /\bmonthly\b/.test(lower)) {
    const { pct, assumed } = resolveYieldPct(prompt, ctx);
    if (assumed) extra.push(ASSUMED_YIELD_NOTE);
    const amount = parseAmount(prompt) ?? ILLUSTRATIVE_AMOUNT;
    if (amount === ILLUSTRATIVE_AMOUNT && parseAmount(prompt) == null) {
      extra.push(ILLUSTRATIVE_AMOUNT_NOTE);
    }
    return calculateMmfScenario(amount, pct, months, extra);
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

function portfolioSplitUnknown(): UnknownPayload {
  return {
    kind: "unknown",
    message: PORTFOLIO_SPLIT_UNKNOWN_MSG,
    suggestions: PORTFOLIO_SPLIT_SUGGESTIONS,
    disclaimer: STANDARD_DISCLAIMER,
  };
}


function stockMentionedInPrompt(lower: string, stocks: ComparableAsset[]): ComparableAsset | null {
  for (const asset of stocks) {
    const terms = [asset.symbol, asset.name, ...asset.aliases];
    for (const term of terms) {
      const t = term.trim().toLowerCase();
      if (t.length < 2) continue;
      if (lower.includes(t)) return asset;
    }
  }
  return null;
}

function tryStockMoveRoute(
  prompt: string,
  lower: string,
  ctx?: MarketContext | null,
): RouterResult | null {
  const pct = parsePercent(prompt);
  if (pct == null) return null;
  if (
    !/\b(what if|goes up|goes down|rise|rises|fall|falls|drop|drops|up|down)\b/.test(lower)
  ) {
    return null;
  }

  const stocks = (ctx?.assets ?? []).filter((a) => a.kind === "stock");
  const matched = stockMentionedInPrompt(lower, stocks);
  if (!matched && !/(stock|share|scom|eqty|kcb|safaricom)/.test(lower)) return null;

  let amount = parseAmount(prompt);
  const extraAssumptions: string[] = [];
  if (amount == null) {
    amount = ILLUSTRATIVE_AMOUNT;
    extraAssumptions.push(ILLUSTRATIVE_AMOUNT_NOTE);
  }

  const negative = /(down|fall|falls|drop|drops|goes down|lose|loses)/.test(lower);
  const signed = negative && pct > 0 ? -pct : pct;
  const result = calculateStockMoveScenario(amount, signed);
  if (extraAssumptions.length > 0) {
    result.assumptions = [...result.assumptions, ...extraAssumptions];
  }
  return result;
}

function tryPortfolioSplitRoute(
  prompt: string,
  lower: string,
  ctx?: MarketContext | null,
): RouterResult | null {
  if (!isPortfolioSplitIntent(lower, prompt)) return null;

  const parsed = parsePortfolioSplit(prompt, ctx);
  if (!parsed) return portfolioSplitUnknown();

  return calculatePortfolioSplitScenario(
    {
      totalAmount: parsed.totalAmount,
      mmfPercent: parsed.mmfPercent,
      stockPercent: parsed.stockPercent,
      stockSymbol: parsed.stockAsset.symbol,
      stockName: parsed.stockAsset.name,
      stockPrice: parsed.stockAsset.value,
      annualYieldPct: parsed.annualYieldPct,
    },
    parsed.extraAssumptions,
  );
}

const CURRENCY_ALIASES: Record<string, string> = {
  kes: "KES",
  ksh: "KES",
  kshs: "KES",
  shilling: "KES",
  shillings: "KES",
  usd: "USD",
  dollar: "USD",
  dollars: "USD",
  eur: "EUR",
  euro: "EUR",
  euros: "EUR",
  gbp: "GBP",
  pound: "GBP",
  pounds: "GBP",
};

function normalizeCurrency(token: string): string | null {
  const key = token.toLowerCase().trim();
  return CURRENCY_ALIASES[key] ?? (/^[A-Z]{3}$/.test(token.toUpperCase()) ? token.toUpperCase() : null);
}

function parseFxConversion(prompt: string, lower: string): { amount: number; from: string; to: string } | null {
  const amount = parseAmount(prompt);
  if (amount == null) return null;

  const patterns: RegExp[] = [
    /\b(kes|ksh|kshs|usd|eur|gbp|dollars?|euros?|pounds?|shillings?)\b[\s,]*([0-9][0-9,]*(?:\.[0-9]+)?(?:\s*(?:k|m))?)\s*(?:kes|ksh|kshs|usd|eur|gbp|dollars?|euros?|pounds?|shillings?)?\s+to\s+(kes|ksh|kshs|usd|eur|gbp|dollars?|euros?|pounds?|shillings?)\b/i,
    /\b(kes|ksh|kshs|usd|eur|gbp|dollars?|euros?|pounds?|shillings?)\s+([0-9][0-9,]*(?:\.[0-9]+)?(?:\s*(?:k|m))?)\s+to\s+(kes|ksh|kshs|usd|eur|gbp|dollars?|euros?|pounds?|shillings?)\b/i,
    /\bhow much is\s+(kes|ksh|kshs|usd|eur|gbp|dollars?|euros?|pounds?|shillings?)\s+([0-9][0-9,]*(?:\.[0-9]+)?(?:\s*(?:k|m))?)\s+in\s+(kes|ksh|kshs|usd|eur|gbp|dollars?|euros?|pounds?|shillings?)\b/i,
    /\bconvert\s+(kes|ksh|kshs|usd|eur|gbp|dollars?|euros?|pounds?|shillings?)\s+([0-9][0-9,]*(?:\.[0-9]+)?(?:\s*(?:k|m))?)\s+to\s+(kes|ksh|kshs|usd|eur|gbp|dollars?|euros?|pounds?|shillings?)\b/i,
    /\b([0-9][0-9,]*(?:\.[0-9]+)?(?:\s*(?:k|m))?)\s+(kes|ksh|kshs|usd|eur|gbp|dollars?|euros?|pounds?|shillings?)\s+to\s+(kes|ksh|kshs|usd|eur|gbp|dollars?|euros?|pounds?|shillings?)\b/i,
  ];

  for (const re of patterns) {
    const m = prompt.match(re);
    if (!m) continue;
    let fromRaw: string;
    let toRaw: string;
    if (/^\d/.test(m[1])) {
      fromRaw = m[2];
      toRaw = m[3];
    } else {
      fromRaw = m[1];
      toRaw = m[3] ?? m[m.length - 1];
    }
    const from = normalizeCurrency(fromRaw);
    const to = normalizeCurrency(toRaw);
    if (from && to && from !== to) return { amount, from, to };
  }

  const generic = lower.match(
    /\b(kes|ksh|usd|eur|gbp|dollars?|euros?|pounds?|shillings?)\b.*\bto\b.*\b(kes|ksh|usd|eur|gbp|dollars?|euros?|pounds?|shillings?)\b/,
  );
  if (generic && amount != null) {
    const from = normalizeCurrency(generic[1]);
    const to = normalizeCurrency(generic[2]);
    if (from && to && from !== to) return { amount, from, to };
  }

  return null;
}

function findFxAsset(currency: string, ctx?: MarketContext | null) {
  const fxAssets = (ctx?.assets ?? []).filter((a) => a.kind === "fx");
  return findAsset(currency, fxAssets);
}

function tryFxConversionRoute(
  prompt: string,
  lower: string,
  ctx?: MarketContext | null,
): RouterResult | null {
  const isFxConv =
    /\bconvert\b/.test(lower) ||
    /\bhow much is\b/.test(lower) ||
    /\bto (usd|eur|gbp|kes|dollar|euro|shilling)\b/.test(lower) ||
    /\b(usd|eur|gbp|kes|dollar|euro|shilling)\b.*\bto\b.*\b(usd|eur|gbp|kes|dollar|euro|shilling)\b/.test(lower);

  if (!isFxConv) return null;

  const parsed = parseFxConversion(prompt, lower);
  if (!parsed) return null;

  const { amount, from, to } = parsed;

  if (from !== "KES" && to !== "KES") {
    return unknownFallback(prompt, ctx);
  }

  const foreignCurrency = from === "KES" ? to : from;
  const asset = findFxAsset(foreignCurrency, ctx);
  if (!asset || asset.value <= 0) {
    return unknownFallback(prompt, ctx);
  }

  return calculateFxConversionScenario(
    amount,
    from,
    to,
    asset.value,
    asset.valueLabel,
  );
}

function parseSignedMovementPct(prompt: string, lower: string): number | null {
  const pct = parsePercent(prompt);
  if (pct == null) return null;
  if (/\bshilling strengthens?\b/.test(lower)) return -Math.abs(pct);
  if (/\bshilling weakens?\b/.test(lower)) return Math.abs(pct);
  const negative = /(down|fall|falls|drop|drops|lose|loses)\b/.test(lower);
  if (negative) return -Math.abs(pct);
  return Math.abs(pct);
}

function tryFxMoveRoute(
  prompt: string,
  lower: string,
  ctx?: MarketContext | null,
): RouterResult | null {
  const isFxMove =
    (/usd\s*\/\s*kes|kes\s*\/\s*usd|exchange rate/.test(lower) &&
      /(up|down|rise|rises|fall|falls|drop|drops|weak|strengthen)/.test(lower)) ||
    /\bshilling (weakens|strengthens|strengthen|falls|rises)\b/.test(lower);

  if (!isFxMove) return null;

  const movementPct = parseSignedMovementPct(prompt, lower);
  if (movementPct == null) return null;

  const usdAsset = findFxAsset("USD", ctx);
  if (!usdAsset || usdAsset.value <= 0) {
    return unknownFallback(prompt, ctx);
  }

  return calculateFxMoveScenario("USD", "KES", usdAsset.value, movementPct);
}

const COMMODITY_QUERY_RES: Array<{ re: RegExp; query: string }> = [
  { re: /\bbrent\b/i, query: "brent" },
  { re: /\bcrude\b/i, query: "crude" },
  { re: /\boil\b/i, query: "oil" },
  { re: /\bgold\b/i, query: "gold" },
  { re: /\bsilver\b/i, query: "silver" },
  { re: /\bcoffee\b/i, query: "coffee" },
  { re: /\btea\b/i, query: "tea" },
];

function extractCommodityQuery(lower: string): string | null {
  for (const { re, query } of COMMODITY_QUERY_RES) {
    if (re.test(lower)) return query;
  }
  return null;
}

function isCommodityMoveIntent(lower: string, prompt: string): boolean {
  const hasCommodity = COMMODITY_QUERY_RES.some(({ re }) => re.test(lower));
  const hasMove = /(up|down|rise|rises|fall|falls|drop|drops|goes up|go up)\b/.test(lower);
  return hasCommodity && (hasMove || /\d+(?:\.\d+)?\s*%/.test(prompt));
}

function tryCommodityMoveRoute(
  prompt: string,
  lower: string,
  ctx?: MarketContext | null,
): RouterResult | null {
  if (!isCommodityMoveIntent(lower, prompt)) return null;

  const query = extractCommodityQuery(lower);
  if (!query) return null;

  const commodities = (ctx?.assets ?? []).filter((a) => a.kind === "commodity");
  const asset = findAsset(query, commodities);
  if (!asset || asset.value <= 0) {
    return unknownFallback(prompt, ctx);
  }

  const movementPct = parseSignedMovementPct(prompt, lower);
  if (movementPct == null) return null;

  return calculateCommodityMoveScenario(
    asset.symbol,
    asset.name,
    asset.value,
    asset.valueLabel,
    movementPct,
  );
}

function tryCompareRoute(prompt: string, ctx?: MarketContext | null): RouterResult | null {
  const lower = prompt.toLowerCase();
  if (/explain|what is|what's|define|meaning of/.test(lower)) return null;

  const sides = parseCompareSides(prompt);
  if (!sides) return null;

  const assets = ctx?.assets ?? [];
  const leftMatch = resolveAssetMatch(sides.left, assets);
  const rightMatch = resolveAssetMatch(sides.right, assets);

  if (leftMatch.status === "ambiguous") {
    return {
      kind: "unknown",
      message: formatAmbiguousMatchMessage("the first item", leftMatch.query, leftMatch.candidates),
      suggestions: [
        "Compare SCOM vs KCB",
        "Compare Britam Money Market Fund vs CIC Money Market Fund",
        "Compare USD vs EUR",
      ],
      disclaimer: STANDARD_DISCLAIMER,
    };
  }

  if (rightMatch.status === "ambiguous") {
    return {
      kind: "unknown",
      message: formatAmbiguousMatchMessage("the second item", rightMatch.query, rightMatch.candidates),
      suggestions: [
        "Compare SCOM vs KCB",
        "Compare Britam Money Market Fund vs CIC Money Market Fund",
        "Compare USD vs EUR",
      ],
      disclaimer: STANDARD_DISCLAIMER,
    };
  }

  const a = leftMatch.asset;
  const b = rightMatch.asset;

  if (a && b && a.symbol !== b.symbol) {
    return compareAssets(a, b);
  }

  const missing: string[] = [];
  if (!a) missing.push(`"${sides.left.trim()}"`);
  if (!b) missing.push(`"${sides.right.trim()}"`);

  return {
    kind: "unknown",
    message:
      missing.length > 0
        ? formatCompareNotFoundMessage(missing)
        : "Pick two different assets to compare.",
    suggestions: [
      "Compare SCOM vs KCB",
      "Compare USD vs EUR",
      "Compare Gold vs Brent Crude",
      "Compare CIC Money Market Fund vs Sanlam Money Market Fund",
    ],
    disclaimer: STANDARD_DISCLAIMER,
  };
}

function tryNewsSummaryRoute(
  prompt: string,
  lower: string,
  ctx?: MarketContext | null,
  newsCtx?: NewsContext | null,
): RouterResult | null {
  if (!isNewsLabPrompt(lower)) return null;

  if (!newsCtx?.articles?.length) {
    return buildNewsLimitationFallback(prompt, lower);
  }

  const match = matchNewsForPrompt(prompt, newsCtx, ctx);
  if (!match || !match.articles.length) {
    return buildNewsUnavailableFallback(prompt, lower, newsCtx, ctx);
  }

  return calculateNewsSummaryScenario(match.articles, {
    queryLabel: match.queryLabel,
    relatedSymbol: match.relatedSymbol,
    queryKind: match.queryKind,
  });
}

function routeExplainer(lower: string): ScenarioResult | null {
  if (isNewsLabPrompt(lower)) return null;
  if (
    /\b(?:new to|beginner|beginners?|starting|start)\b.*\b(?:invest|investing|shares?|stocks?|money)\b/i.test(lower) ||
    /\b(?:how (?:do|can) i|how to|where do|what does a)\b.*\b(?:start|begin|learn)\b.*\b(?:invest|investing|shares?|stocks?)\b/i.test(lower) ||
    /\bi (?:know|understand) (?:nothing|little) about\b.*\b(?:invest\w*|shares?|stocks?)\b/i.test(lower) ||
    /\bnew investor\b|\bbeginers?\b.*\binv(?:e)?sting\b|\bstart learning about investments?\b/i.test(lower) ||
    /\bnataka kuanza\s+(?:ku)?invest/i.test(lower) ||
    /\bgetting[-\s]started\b/i.test(lower)
  ) {
    return EXPLAINERS["getting-started"];
  }
  const isExp = /explain|what is|what's|define/.test(lower);
  if (!isExp) return null;

  if (/\b(?:mmf|money market)\b.*\b(?:vs|versus|difference|stock|share)\b|\b(?:stock|share)\b.*\b(?:vs|versus|difference|mmf|money market)\b/.test(lower)) {
    return EXPLAINERS["stock-vs-mmf"];
  }
  if (/\b(?:investment|investing)\s+risk\b|\brisk\s+of\s+investing\b/.test(lower)) {
    return EXPLAINERS["investment-risk"];
  }
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

export function routePrompt(
  rawPrompt: string,
  ctx?: MarketContext | null,
  newsCtx?: NewsContext | null,
): RouterResult {
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

  const compareResult = tryCompareRoute(prompt, ctx);
  if (compareResult) return compareResult;

  const newsSummary = tryNewsSummaryRoute(prompt, lower, ctx, newsCtx);
  if (newsSummary) return newsSummary;

  const explainer = routeExplainer(lower);
  if (explainer) return explainer;

  const fxConversion = tryFxConversionRoute(prompt, lower, ctx);
  if (fxConversion) return fxConversion;

  const fxMove = tryFxMoveRoute(prompt, lower, ctx);
  if (fxMove) return fxMove;

  const commodityMove = tryCommodityMoveRoute(prompt, lower, ctx);
  if (commodityMove) return commodityMove;

  const portfolioSplit = tryPortfolioSplitRoute(prompt, lower, ctx);
  if (portfolioSplit) return portfolioSplit;

  const assetAmount = tryAssetAmountRoute(prompt, lower, ctx);
  if (assetAmount) return assetAmount;

  const mmf = tryMmfRoutes(prompt, lower, ctx);
  if (mmf) return mmf;

  if (isReverseGoalPrompt(lower)) return unknownFallback(prompt, ctx);

  const goalProjection = tryGoalProjectionRoute(prompt, lower);
  if (goalProjection) return goalProjection;

  const stockAmount = tryStockAmountRoute(prompt, lower, ctx);
  if (stockAmount) return stockAmount;

  const stockMove = tryStockMoveRoute(prompt, lower, ctx);
  if (stockMove) return stockMove;

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

  const hypothetical = buildHypotheticalScenarioResponse(prompt);
  if (hypothetical) return hypothetical;

  return unknownFallback(prompt, ctx);
}
