// Deterministic cross-asset intent classifier for AI Lab.
// Parallel to routePrompt — used for unknown fallback messaging and tests.

import { findAsset, type AssetKind, type MarketContext } from "./marketContext";
import {
  detectAdviceIntent,
  hasMmfYieldContext,
  MMF_GET_SCENARIO_RE,
  MMF_MAKE_SCENARIO_RE,
  STANDARD_DISCLAIMER,
  STOCK_AMOUNT_MAKE_SCENARIO_RE,
} from "./safety";
import type { UnknownPayload } from "./routerTypes";
import {
  UNKNOWN_FALLBACK_MSG,
  UNKNOWN_FALLBACK_SUGGESTIONS,
} from "./routerTypes";
import { isPortfolioSplitIntent } from "./portfolioSplitParse";

export type AiLabAssetType =
  | "stock"
  | "fund"
  | "commodity"
  | "fx"
  | "news"
  | "mixed"
  | "unknown";

export type AiLabIntentType =
  | "refusal"
  | "compare"
  | "stock-amount"
  | "stock-move"
  | "mmf-yield"
  | "mmf-yield-change"
  | "goal-projection"
  | "fx-conversion"
  | "fx-move"
  | "commodity-move"
  | "news-summary"
  | "portfolio-split"
  | "explainer"
  | "unknown";

export interface AiLabIntentClassification {
  assetType: AiLabAssetType;
  intentType: AiLabIntentType;
  confidence: "high" | "medium" | "low";
  matchedTerms: string[];
}

const COMPARE_RE = /^\s*compare\s+(.+?)\s+(?:vs\.?|versus|with|to|and|&)\s+(.+?)\s*$/i;

const STRONG_NEWS_RES: Array<{ re: RegExp; term: string }> = [
  { re: /\blatest news\b/i, term: "latest news" },
  { re: /\bnews about\b/i, term: "news about" },
  { re: /\bheadline\b/i, term: "headline" },
  { re: /\barticle\b/i, term: "article" },
  { re: /\bmarket update\b/i, term: "market update" },
  { re: /\bsummarize news\b/i, term: "summarize news" },
  { re: /\bwhat happened to\b/i, term: "what happened to" },
];

const STOCK_TERMS: Array<{ re: RegExp; term: string }> = [
  { re: /\bstock\b/i, term: "stock" },
  { re: /\bshares?\b/i, term: "share" },
  { re: /\bticker\b/i, term: "ticker" },
  { re: /\bnse\b/i, term: "nse" },
  { re: /\bsafaricom\b/i, term: "safaricom" },
  { re: /\bscom\b/i, term: "scom" },
  { re: /\bkcb\b/i, term: "kcb" },
  { re: /\beqty\b/i, term: "eqty" },
  { re: /\bequity group\b/i, term: "equity group" },
];

const FUND_TERMS: Array<{ re: RegExp; term: string }> = [
  { re: /\bmmf\b/i, term: "mmf" },
  { re: /\bmoney market fund\b/i, term: "money market fund" },
  { re: /\bmoney market\b/i, term: "money market" },
  { re: /\bunit trust\b/i, term: "unit trust" },
  { re: /\bannual yield\b/i, term: "annual yield" },
  { re: /\bmonthly income\b/i, term: "monthly income" },
  { re: /\bdaily income\b/i, term: "daily income" },
  { re: /\byield\b/i, term: "yield" },
  { re: /\bfund\b/i, term: "fund" },
];

const COMMODITY_TERMS: Array<{ re: RegExp; term: string }> = [
  { re: /\bcommodit(y|ies)\b/i, term: "commodity" },
  { re: /\bgold\b/i, term: "gold" },
  { re: /\bbrent\b/i, term: "brent" },
  { re: /\bcrude\b/i, term: "crude" },
  { re: /\boil\b/i, term: "oil" },
  { re: /\bsilver\b/i, term: "silver" },
  { re: /\bcoffee\b/i, term: "coffee" },
  { re: /\btea\b/i, term: "tea" },
];

const FX_TERMS: Array<{ re: RegExp; term: string }> = [
  { re: /\bfx\b/i, term: "fx" },
  { re: /\bforex\b/i, term: "forex" },
  { re: /\bexchange rate\b/i, term: "exchange rate" },
  { re: /\bcurrency\b/i, term: "currency" },
  { re: /\busd\b/i, term: "usd" },
  { re: /\beur\b/i, term: "eur" },
  { re: /\bgbp\b/i, term: "gbp" },
  { re: /\bdollar\b/i, term: "dollar" },
  { re: /\beuro\b/i, term: "euro" },
  { re: /\bshilling\b/i, term: "shilling" },
  { re: /\bto usd\b/i, term: "to usd" },
  { re: /\bto kes\b/i, term: "to kes" },
];

const WEAK_NEWS_TERMS: Array<{ re: RegExp; term: string }> = [
  { re: /\bnews\b/i, term: "news" },
  { re: /\bsummarize\b/i, term: "summarize" },
  { re: /\blatest\b/i, term: "latest" },
];

const ASSET_KIND_TO_TYPE: Record<AssetKind, AiLabAssetType> = {
  stock: "stock",
  fund: "fund",
  commodity: "commodity",
  fx: "fx",
};

function matchTerms(
  text: string,
  patterns: Array<{ re: RegExp; term: string }>,
): string[] {
  return patterns.filter(({ re }) => re.test(text)).map(({ term }) => term);
}

function hasStrongNewsIntent(lower: string): boolean {
  return STRONG_NEWS_RES.some(({ re }) => re.test(lower));
}

function hasWeakNewsIntent(lower: string): boolean {
  return WEAK_NEWS_TERMS.some(({ re }) => re.test(lower));
}

function detectAssetGroups(
  prompt: string,
  lower: string,
  ctx?: MarketContext | null,
): { groups: Set<AiLabAssetType>; matchedTerms: string[] } {
  const matchedTerms: string[] = [];
  const groups = new Set<AiLabAssetType>();

  for (const term of matchTerms(lower, STOCK_TERMS)) {
    groups.add("stock");
    matchedTerms.push(term);
  }
  for (const term of matchTerms(lower, FUND_TERMS)) {
    groups.add("fund");
    matchedTerms.push(term);
  }
  for (const term of matchTerms(lower, COMMODITY_TERMS)) {
    groups.add("commodity");
    matchedTerms.push(term);
  }
  for (const term of matchTerms(lower, FX_TERMS)) {
    groups.add("fx");
    matchedTerms.push(term);
  }
  for (const term of matchTerms(lower, [...STRONG_NEWS_RES, ...WEAK_NEWS_TERMS])) {
    groups.add("news");
    matchedTerms.push(term);
  }

  if (ctx?.assets?.length) {
    for (const asset of ctx.assets) {
      if (findAsset(prompt, [asset])) {
        const mapped = ASSET_KIND_TO_TYPE[asset.kind];
        groups.add(mapped);
        matchedTerms.push(asset.symbol.toLowerCase());
      }
    }
  }

  return { groups, matchedTerms };
}

function detectAssetGroupsForSide(
  side: string,
  ctx?: MarketContext | null,
): Set<AiLabAssetType> {
  const lower = side.toLowerCase();
  const groups = new Set<AiLabAssetType>();
  if (matchTerms(lower, STOCK_TERMS).length) groups.add("stock");
  if (matchTerms(lower, FUND_TERMS).length) groups.add("fund");
  if (matchTerms(lower, COMMODITY_TERMS).length) groups.add("commodity");
  if (matchTerms(lower, FX_TERMS).length) groups.add("fx");
  if (ctx?.assets?.length) {
    const hit = findAsset(side, ctx.assets);
    if (hit) groups.add(ASSET_KIND_TO_TYPE[hit.kind]);
  }
  return groups;
}

function resolveAssetType(
  prompt: string,
  lower: string,
  intentType: AiLabIntentType,
  ctx?: MarketContext | null,
): { assetType: AiLabAssetType; matchedTerms: string[] } {
  const { groups, matchedTerms } = detectAssetGroups(prompt, lower, ctx);

  const cmp = prompt.match(COMPARE_RE);
  if (intentType === "compare" && cmp) {
    const left = detectAssetGroupsForSide(cmp[1], ctx);
    const right = detectAssetGroupsForSide(cmp[2], ctx);
    const combined = new Set([...left, ...right]);
    if (combined.size === 0) return { assetType: "unknown", matchedTerms };
    if (combined.size === 1) return { assetType: [...combined][0], matchedTerms };
    return { assetType: "mixed", matchedTerms };
  }

  if (hasStrongNewsIntent(lower) || (hasWeakNewsIntent(lower) && intentType === "news-summary")) {
    for (const { re, term } of STRONG_NEWS_RES) {
      if (re.test(lower)) matchedTerms.push(term);
    }
    return { assetType: "news", matchedTerms: [...new Set(matchedTerms)] };
  }

  if (intentType === "stock-amount" && groups.has("stock")) {
    return { assetType: "stock", matchedTerms: [...new Set(matchedTerms)] };
  }

  if (groups.size === 0) return { assetType: "unknown", matchedTerms };
  if (groups.size === 1) return { assetType: [...groups][0], matchedTerms };
  return { assetType: "mixed", matchedTerms };
}

function isGoalProjectionIntent(lower: string): boolean {
  if (/\bmonthly income\b/.test(lower)) return false;
  return (
    (/\bstart with\b/.test(lower) && /\bmonthly\b/.test(lower)) ||
    /\b(add|save)\b.*\bmonthly\b/.test(lower) ||
    (/\bmonthly\b/.test(lower) && /\bfor\s+\d/.test(lower))
  );
}

function isCompareIntent(prompt: string, lower: string): boolean {
  return (
    COMPARE_RE.test(prompt) ||
    /\bvs\.?\b/.test(lower) ||
    /\bversus\b/.test(lower) ||
    /\bagainst\b/.test(lower) ||
    /\bdifference between\b/.test(lower)
  );
}

function isNewsSummaryIntent(lower: string): boolean {
  return hasStrongNewsIntent(lower) || (hasWeakNewsIntent(lower) && /\bnews\b/.test(lower));
}

function detectIntentType(prompt: string, lower: string): AiLabIntentType {
  if (detectAdviceIntent(prompt)) return "refusal";
  if (isCompareIntent(prompt, lower)) return "compare";
  if (/explain|what is|what's|define|meaning of/.test(lower)) return "explainer";
  if (isNewsSummaryIntent(lower)) return "news-summary";
  if (isPortfolioSplitIntent(lower, prompt)) return "portfolio-split";
  if (/(?:yield\s+)?(?:drops?|falls?|changes?)\s+from\s+\d+(?:\.\d+)?\s*%\s+to\s+\d+(?:\.\d+)?\s*%/i.test(prompt)) {
    return "mmf-yield-change";
  }
  if (isGoalProjectionIntent(lower)) return "goal-projection";
  if (
    /\bhow much monthly income\b/.test(lower) ||
    /\bhow much per day\b/.test(lower) ||
    MMF_GET_SCENARIO_RE.test(prompt) ||
    MMF_MAKE_SCENARIO_RE.test(prompt) ||
    (hasMmfYieldContext(prompt) && /\bhow much\b/.test(lower)) ||
    parseHasAmountAndYield(prompt, lower)
  ) {
    return "mmf-yield";
  }
  if (isStockAmountIntent(lower, prompt)) return "stock-amount";
  if (isCommodityMoveIntent(lower)) return "commodity-move";
  if (isStockMoveIntent(lower, prompt)) return "stock-move";
  if (isFxConversionIntent(lower, prompt)) return "fx-conversion";
  if (isFxMoveIntent(lower)) return "fx-move";
  return "unknown";
}

function parseHasAmountAndYield(_prompt: string, lower: string): boolean {
  return (
    /(\d[\d,]*(?:\.\d+)?\s*(?:k|m)?)/i.test(lower) &&
    /\d+(?:\.\d+)?\s*%/.test(lower) &&
    /(yield|mmf|money market|fund)/.test(lower)
  );
}

const FUND_CONTEXT_RE = /\b(mmf|money market|unit trust|mutual fund|money market fund)\b/i;

function isStockAmountIntent(lower: string, prompt: string): boolean {
  if (FUND_CONTEXT_RE.test(lower) && !/\b(scom|eqty|kcb|safaricom|equity)\b/i.test(lower)) {
    return false;
  }
  if (hasMmfYieldContext(prompt) && FUND_CONTEXT_RE.test(lower)) return false;
  if (STOCK_AMOUNT_MAKE_SCENARIO_RE.test(prompt)) return true;
  if (/\bhow many shares\b/.test(lower)) return true;
  if (/\b(?:put|invest|buy)\b/.test(lower) && /\bin\b/.test(lower) && !FUND_CONTEXT_RE.test(lower)) {
    return /\d/.test(prompt);
  }
  if (/\bkes\b|\bksh\b|\bshilling/.test(lower) && /\bin\b/.test(lower) && !isCompareIntent(prompt, lower)) {
    return true;
  }
  return false;
}

function isStockMoveIntent(lower: string, prompt: string): boolean {
  if (isCommodityMoveIntent(lower)) return false;
  if (!/(stock|share|price|safaricom|equity|equities|scom|eqty|kcb)/.test(lower)) {
    if (!/(up|down|rise|rises|fall|falls|drop|drops|gain|gains|lose|loses)\b/.test(lower)) {
      return false;
    }
  }
  return /\d+(?:\.\d+)?\s*%/.test(prompt) || /\b(up|down|rise|rises|fall|falls|drop|drops)\b/.test(lower);
}

function isFxConversionIntent(lower: string, prompt: string): boolean {
  if (/\bconvert\b/.test(lower) && /(usd|eur|gbp|kes|dollar|euro|shilling)/.test(lower)) return true;
  if (/\bhow much is\b/.test(lower) && /\bin (usd|eur|gbp|kes)\b/.test(lower)) return true;
  if (/\bto (usd|eur|gbp|kes)\b/.test(lower) && /\d/.test(prompt)) return true;
  if (/\b(usd|eur|gbp|kes)\b.*\bto\b.*\b(usd|eur|gbp|kes)\b/.test(lower)) return true;
  return false;
}

function isFxMoveIntent(lower: string): boolean {
  return (
    (/usd\s*\/\s*kes|kes\s*\/\s*usd|exchange rate/.test(lower) &&
      /(up|down|rise|fall|drop|weak|strengthen)/.test(lower)) ||
    /\bshilling (weakens|strengthens|falls|rises)\b/.test(lower)
  );
}

function isCommodityMoveIntent(lower: string): boolean {
  const hasCommodity = COMMODITY_TERMS.some(({ re }) => re.test(lower));
  const hasMove = /(up|down|rise|rises|fall|falls|drop|drops)\b/.test(lower);
  return hasCommodity && (hasMove || /\d+(?:\.\d+)?\s*%/.test(lower));
}

function computeConfidence(
  intentType: AiLabIntentType,
  assetType: AiLabAssetType,
  matchedTerms: string[],
): "high" | "medium" | "low" {
  if (intentType === "unknown" && assetType === "unknown") return "low";
  if (matchedTerms.length >= 2) return "high";
  if (intentType !== "unknown" && assetType !== "unknown") return "medium";
  return "low";
}

export function classifyAiLabPrompt(
  prompt: string,
  ctx?: MarketContext | null,
): AiLabIntentClassification {
  const trimmed = prompt.trim();
  const lower = trimmed.toLowerCase();
  const intentType = detectIntentType(trimmed, lower);
  const { assetType, matchedTerms } = resolveAssetType(trimmed, lower, intentType, ctx);
  const confidence = computeConfidence(intentType, assetType, matchedTerms);

  if (intentType === "news-summary" && assetType !== "news") {
    return {
      assetType: "news",
      intentType,
      confidence: matchedTerms.length >= 1 ? "high" : "medium",
      matchedTerms: [...new Set([...matchedTerms, "news-summary"])],
    };
  }

  return { assetType, intentType, confidence, matchedTerms: [...new Set(matchedTerms)] };
}

export const FX_UNKNOWN_MSG =
  "I could not confidently match that FX question to a supported scenario yet. Try an FX comparison or explainer prompt. FX conversion scenarios are planned for a future update.";

export const FX_UNKNOWN_SUGGESTIONS = [
  "Compare USD vs EUR",
  "Explain gross vs net return",
  "Compare SCOM vs EQTY",
];

export const COMMODITY_UNKNOWN_MSG =
  "I could not confidently match that commodity question to a supported scenario yet. Try a commodity comparison or movement scenario prompt.";

export const COMMODITY_UNKNOWN_SUGGESTIONS = [
  "Compare Gold vs Brent Crude",
  "Compare SCOM vs EQTY",
  "Explain dividend yield",
];

export const NEWS_UNKNOWN_MSG =
  "I could not find matching news in available KenyaFundFinder data for that prompt. Try a specific company or ticker, or wait for news data to finish loading.";

export const NEWS_UNKNOWN_SUGGESTIONS = [
  "KES 10,000 in SCOM",
  "Compare SCOM vs EQTY",
  "Explain dividend yield",
];

export const STOCK_UNKNOWN_SUGGESTIONS = [
  "KES 10,000 in SCOM",
  "What happens if SCOM falls 10%?",
  "Compare SCOM vs EQTY",
];

export const FUND_UNKNOWN_SUGGESTIONS = [
  "If I put KES 100,000 in an MMF, how much do I get?",
  "How much monthly income from KES 100,000 at 11%?",
  "Explain dividend yield",
];

export const PORTFOLIO_SPLIT_UNKNOWN_MSG =
  "I could not confidently match that portfolio split question to available KenyaFundFinder data yet. Try naming a specific stock ticker, stating a yield assumption, and a clear split amount or percentage.";

export const PORTFOLIO_SPLIT_SUGGESTIONS = [
  "Split 100k between MMF and SCOM at 11% yield",
  "70% MMF and 30% SCOM at 11% yield",
  "50k in MMF and 50k in SCOM at 11% yield",
  "Compare SCOM vs EQTY",
];

export function buildUnknownFallback(
  prompt: string,
  ctx?: MarketContext | null,
): UnknownPayload {
  const classification = classifyAiLabPrompt(prompt, ctx);
  const { assetType, intentType } = classification;

  if (assetType === "news" || intentType === "news-summary") {
    return {
      kind: "unknown",
      message: NEWS_UNKNOWN_MSG,
      suggestions: NEWS_UNKNOWN_SUGGESTIONS,
      disclaimer: STANDARD_DISCLAIMER,
    };
  }

  if (assetType === "fx" || intentType === "fx-conversion" || intentType === "fx-move") {
    return {
      kind: "unknown",
      message: FX_UNKNOWN_MSG,
      suggestions: FX_UNKNOWN_SUGGESTIONS,
      disclaimer: STANDARD_DISCLAIMER,
    };
  }

  if (assetType === "commodity" || intentType === "commodity-move") {
    return {
      kind: "unknown",
      message: COMMODITY_UNKNOWN_MSG,
      suggestions: COMMODITY_UNKNOWN_SUGGESTIONS,
      disclaimer: STANDARD_DISCLAIMER,
    };
  }

  if (intentType === "portfolio-split") {
    return {
      kind: "unknown",
      message: PORTFOLIO_SPLIT_UNKNOWN_MSG,
      suggestions: PORTFOLIO_SPLIT_SUGGESTIONS,
      disclaimer: STANDARD_DISCLAIMER,
    };
  }

  if (assetType === "stock") {
    return {
      kind: "unknown",
      message: UNKNOWN_FALLBACK_MSG,
      suggestions: STOCK_UNKNOWN_SUGGESTIONS,
      disclaimer: STANDARD_DISCLAIMER,
    };
  }

  if (assetType === "fund") {
    return {
      kind: "unknown",
      message: UNKNOWN_FALLBACK_MSG,
      suggestions: FUND_UNKNOWN_SUGGESTIONS,
      disclaimer: STANDARD_DISCLAIMER,
    };
  }

  return {
    kind: "unknown",
    message: UNKNOWN_FALLBACK_MSG,
    suggestions: UNKNOWN_FALLBACK_SUGGESTIONS,
    disclaimer: STANDARD_DISCLAIMER,
  };
}
