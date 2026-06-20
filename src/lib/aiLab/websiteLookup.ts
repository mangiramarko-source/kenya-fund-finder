// Phase 12 — deterministic website data lookup via public-data gateway.
// Surfaces fields already stored on KenyaFundFinder; no calculations, no LLM.

import { fetchPublicData } from "@/lib/gateway";
import { findAsset, type ComparableAsset, type MarketContext } from "./marketContext";
import { resolveAssetMatch } from "./nameMatch";
import { isNewsLabPrompt } from "./newsContext";
import { detectAdviceIntent } from "./safety";
import {
  STANDARD_DISCLAIMER,
  type WebsiteLookupScenarioResult,
  type WebsiteLookupEntityType,
} from "./scenarios";

const COMPARE_RE = /^\s*compare\s+(.+?)\s+(?:vs\.?|versus|with|to|and|&)\s+(.+?)\s*$/i;
const EXPLAIN_RE = /\bexplain\b/i;

const SCENARIO_BLOCKERS: RegExp[] = [
  /\bif i\b/i,
  /\bwhat happens\b/i,
  /\bhow much (will|would|do) i\b/i,
  /\bgoal projection\b/i,
  /\bmonthly contribution\b/i,
  /\bsplit\b/i,
  /\bconvert\b/i,
  /\b(?:falls?|rises?|drops?|increase|decrease)\s+\d+\s*%/i,
  /\bat\s+\d+(?:\.\d+)?\s*%\s*(?:yield|for)\b/i,
];

const LOOKUP_SIGNALS: RegExp[] = [
  /\b(what is|what's|show me|tell me about|lookup|data for|details for)\b/i,
  /\b(current|latest|listed|shown)\b.*\b(price|yield|rate|value)\b/i,
  /\b(price|yield|rate|trading at|minimum investment|management fee|withdrawal time|pe ratio|dividend yield|market cap|volume|sector)\b/i,
  /\bhow much is .+ trading\b/i,
];

const FX_PAIR_RE =
  /\b(usd|eur|gbp|chf|cad|aud|jpy|cny|dollar|euro|pound)\b.*\b(kes|shilling|rate)\b/i;

const FUND_LOOKUP_SELECT = [
  "slug",
  "name",
  "manager",
  "annual_yield",
  "daily_yield",
  "seven_day_yield",
  "thirty_day_yield",
  "fund_type",
  "minimum_investment",
  "management_fee",
  "withdrawal_time",
  "fact_sheet_date",
  "updated_at",
] as const;

const STOCK_LOOKUP_SELECT = [
  "symbol",
  "name",
  "sector",
  "price",
  "previous_price",
  "day_change_percent",
  "volume",
  "market_cap",
  "pe_ratio",
  "dividend_yield",
  "year_high",
  "year_low",
  "updated_at",
] as const;

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "on",
  "of",
  "for",
  "to",
  "in",
  "at",
  "me",
  "my",
  "is",
  "are",
  "what",
  "whats",
  "show",
  "tell",
  "about",
  "current",
  "latest",
  "listed",
  "shown",
  "data",
  "details",
  "info",
  "yield",
  "price",
  "rate",
  "fund",
  "funds",
  "unit",
  "trust",
]);

const QUERY_ALIASES: Array<{ re: RegExp; replacement: string }> = [
  { re: /\bsafaricom\b/gi, replacement: "scom" },
  { re: /\bdollar rate\b/gi, replacement: "usd kes rate" },
  { re: /\busd\s*\/\s*kes\b/gi, replacement: "usd kes" },
  { re: /\bmoney market fund\b/gi, replacement: "money market mmf" },
  { re: /\bmoney market\b/gi, replacement: "money market mmf" },
  { re: /\bmmf\b/gi, replacement: "money market mmf" },
];

const STOCK_SYMBOL_ALIASES: Record<string, string> = {
  safaricom: "SCOM",
  scom: "SCOM",
};

const FX_QUERY_ALIASES: Record<string, string> = {
  dollar: "USD",
  usd: "USD",
  euro: "EUR",
  pound: "GBP",
};

const MIN_FUND_MATCH_SCORE = 180;
const AMBIGUITY_SCORE_GAP = 40;
const MMF_FILTER_LIMIT = 12;
const FAMILY_OVERVIEW_LIMIT = 12;
const EQUAL_YIELD_EPSILON = 0.05;

const FAMILY_STRIP_RE =
  /\b(what is|what's|show me|tell me about|lookup|data for|details for|show|tell|about|current|latest|listed|shown|the|a|an|is|are|me|my|data|details|info|yield|price|rate|for|of|on|trading)\b/gi;

const MMF_CONTEXT_RE = /\b(mmf|mmfs|money market(?:\s+funds?)?)\b/i;
const MMF_FILTER_RANKING_BANNED_RE =
  /\b(best|top|safest|recommended|highest quality|rank|sort)\b/i;

const BROAD_FILTER_LOOKUP_RE =
  /\b(show|list|find|filter|rank|sort)\b.*\b(mmf|mmfs|money market|fund|funds)\b.*\b(above|below|over|under|greater|less|highest|lowest|top|best)\b/i;
const YIELD_THRESHOLD_RE =
  /\b(mmf|mmfs|money market|fund|funds)\b.*\b(above|below|over|under)\s+\d+\s*%/i;
const SHOW_MMFS_ABOVE_RE = /\bshow\s+mmfs?\s+above\b/i;

export type MmfYieldComparison = "above" | "below" | "equal";

export interface MmfYieldFilterIntent {
  comparison: MmfYieldComparison;
  thresholdPct: number;
}

export function parseMmfYieldFilterPrompt(prompt: string): MmfYieldFilterIntent | null {
  if (detectAdviceIntent(prompt)) return null;
  if (MMF_FILTER_RANKING_BANNED_RE.test(prompt)) return null;
  if (!MMF_CONTEXT_RE.test(prompt)) return null;

  let comparison: MmfYieldComparison | null = null;
  if (/\b(above|over|greater than|more than|>=)\b/i.test(prompt)) comparison = "above";
  else if (/\b(below|under|less than|<=)\b/i.test(prompt)) comparison = "below";
  else if (/\b(equal to|equals|at exactly|=)\b/i.test(prompt)) comparison = "equal";

  if (!comparison) return null;

  const thresholdMatch =
    prompt.match(
      /\b(?:above|over|greater than|more than|>=|below|under|less than|<=|equal to|equals|at exactly|=)\s*(\d+(?:\.\d+)?)\s*%?/i,
    ) ?? prompt.match(/(\d+(?:\.\d+)?)\s*%/i);

  if (!thresholdMatch?.[1]) return null;

  const thresholdPct = parseFloat(thresholdMatch[1]);
  if (!Number.isFinite(thresholdPct)) return null;

  return { comparison, thresholdPct };
}

export function isMmfYieldFilterPrompt(prompt: string): boolean {
  return parseMmfYieldFilterPrompt(prompt) != null;
}

function isBroadFilterLookupPrompt(prompt: string): boolean {
  return (
    BROAD_FILTER_LOOKUP_RE.test(prompt) ||
    YIELD_THRESHOLD_RE.test(prompt) ||
    SHOW_MMFS_ABOVE_RE.test(prompt)
  );
}

export function isUnsupportedFilterLookupPrompt(prompt: string): boolean {
  if (isMmfYieldFilterPrompt(prompt)) return false;
  if (isBroadFilterLookupPrompt(prompt)) return true;
  if (
    MMF_FILTER_RANKING_BANNED_RE.test(prompt) &&
    MMF_CONTEXT_RE.test(prompt) &&
    /\b(show|list|find|filter|rank|sort)\b/i.test(prompt)
  ) {
    return true;
  }
  if (/\b(rank|sort)\b/i.test(prompt) && /\bfunds?\b/i.test(prompt)) return true;
  if (
    /\b(show|list|find|filter)\b/i.test(prompt) &&
    /\bfunds?\b/i.test(prompt) &&
    /\b(yield|above|below|over|under)\b/i.test(prompt) &&
    !MMF_CONTEXT_RE.test(prompt)
  ) {
    return true;
  }
  return false;
}

export interface FundRow {
  slug?: string | null;
  name?: string | null;
  manager?: string | null;
  annual_yield?: number | string | null;
  daily_yield?: number | string | null;
  seven_day_yield?: number | string | null;
  thirty_day_yield?: number | string | null;
  fund_type?: string | null;
  minimum_investment?: number | string | null;
  management_fee?: number | string | null;
  withdrawal_time?: string | null;
  fact_sheet_date?: string | null;
  updated_at?: string | null;
}

interface StockRow {
  symbol?: string | null;
  name?: string | null;
  sector?: string | null;
  price?: number | string | null;
  previous_price?: number | string | null;
  day_change_percent?: number | string | null;
  volume?: number | string | null;
  market_cap?: number | string | null;
  pe_ratio?: number | string | null;
  dividend_yield?: number | string | null;
  year_high?: number | string | null;
  year_low?: number | string | null;
  updated_at?: string | null;
}

export interface FundLookupIntent {
  wantsMmf: boolean;
  wantsBalanced: boolean;
  wantsEquity: boolean;
  wantsBond: boolean;
  brandOnly: boolean;
  queryTokens: string[];
  normalizedQuery: string;
}

export interface FundMatchSelection {
  fund: FundRow | null;
  ambiguous: boolean;
  candidates: FundRow[];
  topScore: number;
}

const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : null;
};

const fmtPct = (n: number | null, digits = 2) =>
  n == null ? null : `${n.toFixed(digits)}%`;

const fmtKES = (n: number | null) =>
  n == null
    ? null
    : new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency: "KES",
        maximumFractionDigits: n >= 1000 ? 0 : 2,
      }).format(n);

const fmtNum = (n: number | null) => (n == null ? null : n.toLocaleString("en-KE"));

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeLookupQuery(raw: string): string {
  let q = raw.toLowerCase().trim();
  for (const { re, replacement } of QUERY_ALIASES) {
    q = q.replace(re, replacement);
  }
  return q.replace(/\s+/g, " ").trim();
}

function tokenizeText(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
  return [...new Set(tokens)];
}

export function parseFundLookupIntent(query: string, prompt = query): FundLookupIntent {
  const normalizedQuery = normalizeLookupQuery(query);
  const combined = normalizeLookupQuery(`${query} ${prompt}`);
  const queryTokens = tokenizeText(normalizedQuery).filter((t) => t !== "mmf");

  const wantsMmf =
    /\b(money market mmf|money market|mmf)\b/.test(combined) ||
    /\bmoney market fund\b/i.test(`${query} ${prompt}`);
  const wantsBalanced = /\bbalanced\b/.test(combined);
  const wantsEquity = /\b(equity|equities)\b/.test(combined);
  const wantsBond = /\b(bond|fixed income)\b/.test(combined);

  const meaningfulTokens = queryTokens.filter(
    (t) => !["money", "market", "fund", "unit", "trust"].includes(t),
  );
  const brandOnly =
    meaningfulTokens.length <= 1 &&
    !wantsMmf &&
    !wantsBalanced &&
    !wantsEquity &&
    !wantsBond;

  return {
    wantsMmf,
    wantsBalanced,
    wantsEquity,
    wantsBond,
    brandOnly,
    queryTokens,
    normalizedQuery,
  };
}

function fundTypeKey(fund: FundRow): string {
  const ft = (fund.fund_type ?? "").toLowerCase();
  const name = (fund.name ?? "").toLowerCase();
  if (ft === "money_market" || isMoneyMarketFund(fund)) return "money_market";
  if (ft.includes("balanced") || name.includes("balanced")) return "balanced";
  if (ft.includes("equity") || name.includes("equity")) return "equity";
  if (ft.includes("bond") || name.includes("bond")) return "bond";
  return ft || "other";
}

export function isMoneyMarketFund(fund: FundRow): boolean {
  const ft = (fund.fund_type ?? "").toLowerCase();
  const name = (fund.name ?? "").toLowerCase();
  return (
    ft === "money_market" ||
    name.includes("money market") ||
    /\bmmf\b/.test(name)
  );
}

function isNonMmfFund(fund: FundRow): boolean {
  if (isMoneyMarketFund(fund)) return false;
  const ft = (fund.fund_type ?? "").toLowerCase();
  const name = (fund.name ?? "").toLowerCase();
  return (
    ft === "balanced" ||
    ft === "equity" ||
    ft === "bond" ||
    ft === "fixed_income" ||
    name.includes("balanced") ||
    name.includes("equity") ||
    name.includes("bond")
  );
}

function allTokensPresent(tokens: string[], haystack: string): boolean {
  if (tokens.length === 0) return false;
  return tokens.every((t) => haystack.includes(t));
}

export function scoreFundCandidate(
  query: string,
  fund: FundRow,
  intent: FundLookupIntent,
): number {
  if (!fund.name) return -999;

  let score = 0;
  const qNorm = normalizeLookupQuery(query);
  const nameNorm = normalizeLookupQuery(fund.name);
  const managerNorm = normalizeLookupQuery(fund.manager ?? "");
  const combined = `${nameNorm} ${managerNorm}`;

  if (nameNorm === qNorm) score += 1000;
  if (managerNorm && qNorm === managerNorm) score += 250;

  const meaningfulTokens = intent.queryTokens.filter(
    (t) => !["money", "market", "fund"].includes(t),
  );
  const matchedMeaningful = meaningfulTokens.filter((t) => combined.includes(t));
  score += matchedMeaningful.length * 120;
  if (meaningfulTokens.length > 0 && matchedMeaningful.length === meaningfulTokens.length) {
    score += 220;
  }

  if (allTokensPresent(intent.queryTokens, combined)) score += 180;

  if (intent.wantsMmf) {
    if (isMoneyMarketFund(fund)) score += 420;
    if (isNonMmfFund(fund)) score -= 650;
  }
  if (intent.wantsBalanced && combined.includes("balanced")) score += 350;
  if (intent.wantsEquity && combined.includes("equity")) score += 350;
  if (intent.wantsBond && combined.includes("bond")) score += 350;

  if (qNorm.length >= 5 && nameNorm.includes(qNorm)) score += 160;
  if (nameNorm.length >= 8 && qNorm.includes(nameNorm)) score += 80;

  const hasYield = num(fund.annual_yield) != null;
  if (!hasYield) score -= 80;

  return score;
}

export function selectBestFundMatch(
  funds: FundRow[],
  query: string,
  intent: FundLookupIntent,
): FundMatchSelection {
  const scored = funds
    .filter((f) => f.name)
    .map((fund) => ({ fund, score: scoreFundCandidate(query, fund, intent) }))
    .filter((x) => x.score >= MIN_FUND_MATCH_SCORE)
    .sort((a, b) => b.score - a.score || (a.fund.name ?? "").localeCompare(b.fund.name ?? ""));

  if (scored.length === 0) {
    return { fund: null, ambiguous: false, candidates: [], topScore: 0 };
  }

  const top = scored[0];
  const second = scored[1];
  const gap = second ? top.score - second.score : top.score;

  if (intent.brandOnly) {
    const typeSet = new Set(scored.slice(0, 5).map((s) => fundTypeKey(s.fund)));
    if (typeSet.size > 1) {
      return {
        fund: null,
        ambiguous: true,
        candidates: scored.slice(0, 5).map((s) => s.fund),
        topScore: top.score,
      };
    }
  }

  if (second && gap < AMBIGUITY_SCORE_GAP) {
    const topType = fundTypeKey(top.fund);
    const secondType = fundTypeKey(second.fund);
    if (topType !== secondType) {
      return {
        fund: null,
        ambiguous: true,
        candidates: scored.slice(0, 3).map((s) => s.fund),
        topScore: top.score,
      };
    }
  }

  return {
    fund: top.fund,
    ambiguous: false,
    candidates: scored.slice(0, 3).map((s) => s.fund),
    topScore: top.score,
  };
}

function expandStockQuery(prompt: string): string {
  let q = prompt.toLowerCase();
  for (const [alias, symbol] of Object.entries(STOCK_SYMBOL_ALIASES)) {
    q = q.replace(new RegExp(`\\b${escapeRegExp(alias)}\\b`, "gi"), symbol.toLowerCase());
  }
  return q;
}

function findAssetInPrompt(prompt: string, assets: ComparableAsset[]): ComparableAsset | null {
  const result = resolveAssetMatch(prompt, assets);
  if (result.status === "match") return result.asset ?? null;
  return findAsset(prompt, assets);
}

function hasScenarioSignals(prompt: string): boolean {
  return SCENARIO_BLOCKERS.some((re) => re.test(prompt));
}

function hasAmountScenario(prompt: string): boolean {
  const amountRe =
    /(?:kes|ksh|kshs|sh)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)(?:\s*(k|m)\b)?(?!\s*%)/i;
  if (!amountRe.test(prompt)) return false;
  return /\b(in|into|invest|put|worth of|at \d)\b/i.test(prompt);
}

/** Bare named fund queries like "Britam MMF" or "Etica Money Market Fund". */
export function isNamedFundLookupPrompt(prompt: string): boolean {
  if (detectAdviceIntent(prompt)) return false;
  if (hasScenarioSignals(prompt) || hasAmountScenario(prompt)) return false;

  const trimmed = prompt.trim();
  if (trimmed.length < 4) return false;
  if (!/\b(mmf|money market(?:\s+fund)?|unit trust|fund)\b/i.test(trimmed)) return false;
  if (/^(an?\s+)?(mmf|money market(?:\s+fund)?|unit trust|fund)$/i.test(trimmed)) return false;

  const namePart = trimmed
    .replace(
      /\b(mmf|money market fund|money market|unit trust|fund|the|a|an|show|what is|what's|yield|data|details|info)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  return namePart.length >= 3;
}

/** Single-token manager/brand prompts like "Britam" (resolved via fund lookup disambiguation). */
export function isBareBrandFundPrompt(prompt: string): boolean {
  if (detectAdviceIntent(prompt)) return false;
  if (hasScenarioSignals(prompt) || hasAmountScenario(prompt)) return false;

  const trimmed = prompt.trim();
  if (trimmed.length < 2 || trimmed.length > 40) return false;
  if (/\b(mmf|money market|unit trust|fund|stock|share|price|yield|usd|kes|news|compare)\b/i.test(trimmed)) {
    return false;
  }
  if (/\d/.test(trimmed)) return false;

  const tokens = tokenizeText(trimmed);
  return tokens.length >= 1 && tokens.length <= 2;
}


/** Strip lookup signal words to get the core family name, e.g. "Show Britam yield" → "Britam". */
export function extractFamilyQuery(prompt: string): string {
  return prompt
    .replace(FAMILY_STRIP_RE, " ")
    .replace(/[''?.,!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getFamilyTokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function matchesFamilyTokens(haystack: string, tokens: string[]): boolean {
  if (tokens.length === 0) return false;
  const lower = haystack.toLowerCase();
  return tokens.every((t) => lower.includes(t));
}

/** Broad single-name or family-level prompts like Britam, Old Mutual, KCB, USD, Gold. */
export function isInstrumentFamilyPrompt(prompt: string): boolean {
  if (detectAdviceIntent(prompt)) return false;
  if (isNewsLabPrompt(prompt.toLowerCase())) return false;
  if (COMPARE_RE.test(prompt)) return false;
  if (EXPLAIN_RE.test(prompt)) return false;
  if (hasScenarioSignals(prompt)) return false;
  if (hasAmountScenario(prompt)) return false;
  if (isMmfYieldFilterPrompt(prompt)) return false;
  if (isNamedFundLookupPrompt(prompt)) return false;
  if (FX_PAIR_RE.test(prompt)) return false;
  if (/\d/.test(prompt)) return false;

  const core = extractFamilyQuery(prompt);
  if (core.length < 2) return false;

  const tokens = getFamilyTokens(core);
  if (tokens.length === 0 || tokens.length > 3) return false;

  const lower = prompt.toLowerCase();
  if (/\b(mmf|money market|unit trust)\b/i.test(lower)) return false;
  if (/\b(stock|share|trading at)\b/i.test(lower)) return false;
  if (/\b(compare|news|invest|split|convert)\b/i.test(lower)) return false;

  return true;
}

export function isWebsiteLookupPrompt(prompt: string): boolean {
  if (detectAdviceIntent(prompt)) return false;
  const lower = prompt.toLowerCase();
  if (isNewsLabPrompt(lower)) return false;
  if (COMPARE_RE.test(prompt)) return false;
  if (EXPLAIN_RE.test(prompt)) return false;
  if (hasScenarioSignals(prompt)) return false;
  if (hasAmountScenario(prompt)) return false;
  if (FX_PAIR_RE.test(prompt)) return true;
  const signalMatch = LOOKUP_SIGNALS.some((re) => re.test(prompt));
  const namedFundMatch = isNamedFundLookupPrompt(prompt);
  const bareBrandMatch = isBareBrandFundPrompt(prompt);
  const familyMatch = isInstrumentFamilyPrompt(prompt);
  return signalMatch || namedFundMatch || bareBrandMatch || familyMatch;
}

function addField(
  fields: Array<{ label: string; value: string }>,
  label: string,
  value: string | null | undefined,
) {
  if (value == null || value === "") return;
  fields.push({ label, value });
}

function buildResult(
  entityType: WebsiteLookupEntityType,
  entityName: string,
  entitySymbol: string | undefined,
  fields: Array<{ label: string; value: string }>,
  pagePath: string | undefined,
): WebsiteLookupScenarioResult | null {
  if (fields.length === 0) return null;
  return {
    kind: "website-lookup",
    summary: `Website data shown for ${entityName}. Values come from KenyaFundFinder listings, not a scenario projection.`,
    entityType,
    entityName,
    entitySymbol,
    fields,
    sourceNote: "Pulled from KenyaFundFinder public listings via the data gateway.",
    pagePath,
    disclaimer: STANDARD_DISCLAIMER,
  };
}

function buildNotFoundResult(
  entityType: WebsiteLookupEntityType,
  query: string,
): WebsiteLookupScenarioResult {
  const label =
    entityType === "fund"
      ? "fund"
      : entityType === "stock"
        ? "stock"
        : entityType === "fx"
          ? "FX rate"
          : "asset";
  const lookupMessage = `I could not find that exact ${label} in the current KenyaFundFinder data.`;
  return {
    kind: "website-lookup",
    summary: lookupMessage,
    entityType,
    entityName: query,
    fields: [
      {
        label: "Lookup result",
        value: "No matching listing found in current KenyaFundFinder data.",
      },
    ],
    sourceNote: "No matching record in KenyaFundFinder public listings.",
    disclaimer: STANDARD_DISCLAIMER,
    notFound: true,
    lookupMessage,
  };
}

function buildAmbiguousFundResult(query: string, candidates: FundRow[]): WebsiteLookupScenarioResult {
  const names = candidates
    .map((f) => f.name)
    .filter((n): n is string => Boolean(n))
    .slice(0, 5);
  const lookupMessage =
    names.length > 0
      ? `I found several matching funds for "${query}". Please specify which one: ${names.join(", ")}.`
      : `I could not find that exact fund in the current KenyaFundFinder data.`;
  return {
    kind: "website-lookup",
    summary: lookupMessage,
    entityType: "fund",
    entityName: query,
    fields: names.length
      ? [{ label: "Possible matches", value: names.join("; ") }]
      : [
          {
            label: "Lookup result",
            value: "No matching listing found in current KenyaFundFinder data.",
          },
        ],
    sourceNote: "Multiple possible matches in KenyaFundFinder public listings.",
    disclaimer: STANDARD_DISCLAIMER,
    notFound: true,
    lookupMessage,
  };
}

async function fetchAllFunds(): Promise<FundRow[]> {
  const { data } = await fetchPublicData<FundRow>("funds", {
    select: [...FUND_LOOKUP_SELECT],
    order: "annual_yield.desc",
    limit: 200,
  });
  return data;
}

async function fetchStockBySymbol(symbol: string): Promise<StockRow | null> {
  const { data } = await fetchPublicData<StockRow>("stocks", {
    select: [...STOCK_LOOKUP_SELECT],
    filters: { symbol: symbol.toUpperCase() },
    limit: 1,
  });
  return data[0] ?? null;
}

function buildFundLookup(row: FundRow): WebsiteLookupScenarioResult | null {
  if (!row.name) return null;
  const fields: Array<{ label: string; value: string }> = [];
  addField(fields, "Manager", row.manager ?? undefined);
  addField(fields, "Fund type", row.fund_type?.replace(/_/g, " ") ?? undefined);
  addField(fields, "Annual yield", fmtPct(num(row.annual_yield)) ?? undefined);
  addField(fields, "Daily yield", fmtPct(num(row.daily_yield), 4) ?? undefined);
  addField(fields, "7-day yield", fmtPct(num(row.seven_day_yield)) ?? undefined);
  addField(fields, "30-day yield", fmtPct(num(row.thirty_day_yield)) ?? undefined);
  addField(fields, "Minimum investment", fmtKES(num(row.minimum_investment)) ?? undefined);
  addField(fields, "Management fee", fmtPct(num(row.management_fee)) ?? undefined);
  addField(fields, "Withdrawal time", row.withdrawal_time ?? undefined);
  addField(fields, "Fact sheet date", row.fact_sheet_date ?? undefined);
  return buildResult(
    "fund",
    row.name,
    row.slug ?? undefined,
    fields,
    row.slug ? `/compare/${row.slug}` : undefined,
  );
}

function buildStockLookup(row: StockRow): WebsiteLookupScenarioResult | null {
  if (!row.symbol || !row.name) return null;
  const fields: Array<{ label: string; value: string }> = [];
  addField(fields, "Latest price", fmtKES(num(row.price)) ?? undefined);
  addField(fields, "Day change", fmtPct(num(row.day_change_percent)) ?? undefined);
  addField(fields, "Sector", row.sector ?? undefined);
  addField(fields, "Volume", fmtNum(num(row.volume)) ?? undefined);
  addField(fields, "Market cap", fmtKES(num(row.market_cap)) ?? undefined);
  addField(fields, "P/E ratio", fmtNum(num(row.pe_ratio)) ?? undefined);
  addField(fields, "Dividend yield", fmtPct(num(row.dividend_yield)) ?? undefined);
  addField(fields, "52-week high", fmtKES(num(row.year_high)) ?? undefined);
  addField(fields, "52-week low", fmtKES(num(row.year_low)) ?? undefined);
  return buildResult(
    "stock",
    row.name,
    row.symbol,
    fields,
    `/stocks/${row.symbol}`,
  );
}

function buildFxLookup(
  asset: ReturnType<typeof findAsset>,
): WebsiteLookupScenarioResult | null {
  if (!asset || asset.kind !== "fx") return null;
  const fields: Array<{ label: string; value: string }> = [];
  addField(fields, "Currency", asset.name);
  addField(fields, "Rate", `${asset.value.toLocaleString("en-KE", { maximumFractionDigits: 4 })} KES per 1 unit`);
  if (asset.changePct != null) {
    addField(fields, "Recent change", fmtPct(asset.changePct) ?? undefined);
  }
  return buildResult("fx", asset.name, asset.symbol, fields, "/rates");
}

function buildCommodityLookup(
  asset: ReturnType<typeof findAsset>,
): WebsiteLookupScenarioResult | null {
  if (!asset || asset.kind !== "commodity") return null;
  const fields: Array<{ label: string; value: string }> = [];
  addField(fields, "Symbol", asset.symbol);
  addField(fields, "Latest value", `${asset.value.toLocaleString("en-KE", { maximumFractionDigits: 2 })} (${asset.valueLabel.replace("Price ", "")})`);
  if (asset.changePct != null) {
    addField(fields, "Recent change", fmtPct(asset.changePct) ?? undefined);
  }
  return buildResult("commodity", asset.name, asset.symbol, fields, "/commodities");
}

function extractFundQuery(prompt: string): string | null {
  const patterns = [
    /\b(?:yield|data|details|info|minimum investment|management fee|withdrawal time)\s+(?:on|for|of)\s+(.+?)(?:\?|\.|$)/i,
    /\b(?:fund|mmf|unit trust)\s+(?:called|named)?\s+(.+?)(?:\?|\.|$)/i,
    /\btell me about\s+(.+?)(?:\?|\.|$)/i,
    /\bshow me\s+(?:data for|details for|the yield on)\s+(.+?)(?:\?|\.|$)/i,
    /\bshow\s+(.+?)\s+(?:yield|data|details)\b/i,
  ];
  for (const re of patterns) {
    const m = prompt.match(re);
    if (m?.[1]) return m[1].trim();
  }
  if (/\b(mmf|money market|unit trust|fund)\b/i.test(prompt)) {
    const cleaned = prompt
      .replace(/\b(what is|what's|show me|tell me about|current|latest|the|a|an)\b/gi, " ")
      .replace(/\b(yield|price|rate|data|details|minimum investment|management fee)\b/gi, " ")
      .trim();
    if (cleaned.length >= 3) return cleaned;
  }
  return null;
}

function isFundLookupPrompt(prompt: string): boolean {
  return (
    /\b(mmf|money market|unit trust|fund)\b/i.test(prompt) ||
    Boolean(extractFundQuery(prompt)) ||
    isBareBrandFundPrompt(prompt)
  );
}

function resolveFxAsset(prompt: string, assets: ComparableAsset[]): ComparableAsset | null {
  const lower = normalizeLookupQuery(prompt);
  for (const [alias, code] of Object.entries(FX_QUERY_ALIASES)) {
    if (new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i").test(lower)) {
      const hit = assets.find((a) => a.kind === "fx" && a.symbol.toUpperCase() === code);
      if (hit) return hit;
    }
  }
  return findAssetInPrompt(prompt, assets.filter((a) => a.kind === "fx"));
}


function comparisonLabel(comparison: MmfYieldComparison, thresholdPct: number): string {
  if (comparison === "above") return `MMFs with annual yield above ${thresholdPct}%`;
  if (comparison === "below") return `MMFs with annual yield below ${thresholdPct}%`;
  return `MMFs with annual yield equal to ${thresholdPct}%`;
}

function fundTypeLabel(fund: FundRow): string {
  return (fund.fund_type ?? "money_market").replace(/_/g, " ");
}

function matchesYieldFilter(yieldPct: number, intent: MmfYieldFilterIntent): boolean {
  if (intent.comparison === "above") return yieldPct > intent.thresholdPct;
  if (intent.comparison === "below") return yieldPct < intent.thresholdPct;
  return Math.abs(yieldPct - intent.thresholdPct) <= EQUAL_YIELD_EPSILON;
}

async function resolveMmfYieldFilter(prompt: string): Promise<WebsiteLookupScenarioResult> {
  const intent = parseMmfYieldFilterPrompt(prompt);
  if (!intent) {
    return buildNotFoundResult("fund", prompt);
  }

  const funds = await fetchAllFunds();
  const mmfFunds = funds.filter((fund) => fund.name && isMoneyMarketFund(fund));

  let matching = mmfFunds.filter((fund) => {
    const yieldPct = num(fund.annual_yield);
    return yieldPct != null && matchesYieldFilter(yieldPct, intent);
  });

  if (intent.comparison === "below") {
    matching.sort(
      (a, b) => (num(a.annual_yield) ?? 0) - (num(b.annual_yield) ?? 0) || (a.name ?? "").localeCompare(b.name ?? ""),
    );
  } else {
    matching.sort(
      (a, b) => (num(b.annual_yield) ?? 0) - (num(a.annual_yield) ?? 0) || (a.name ?? "").localeCompare(b.name ?? ""),
    );
  }

  const totalMatches = matching.length;
  const shown = matching.slice(0, MMF_FILTER_LIMIT);
  const shownCount = shown.length;
  const entityName = comparisonLabel(intent.comparison, intent.thresholdPct);

  if (shownCount === 0) {
    const lookupMessage =
      "I could not find MMFs matching that yield filter in the current KenyaFundFinder data.";
    return {
      kind: "website-lookup",
      summary: lookupMessage,
      entityType: "fund",
      entityName,
      fields: [
        {
          label: "Lookup result",
          value: "No MMFs matched this yield filter in current KenyaFundFinder data.",
        },
      ],
      sourceNote: "Filtered from KenyaFundFinder public listings via the data gateway.",
      disclaimer: STANDARD_DISCLAIMER,
      notFound: true,
      lookupMessage,
      lookupMode: "mmf-yield-filter",
      totalMatches: 0,
      shownCount: 0,
    };
  }

  const fields: Array<{ label: string; value: string }> = shown.map((fund) => ({
    label: fund.name!,
    value: `${fmtPct(num(fund.annual_yield))} annual yield · ${fundTypeLabel(fund)}`,
  }));

  if (totalMatches > shownCount) {
    fields.push({
      label: "Note",
      value: "Showing the first 12 matching funds available in the current data.",
    });
  }

  return {
    kind: "website-lookup",
    summary: `Money market funds matching your yield filter from KenyaFundFinder listings.`,
    entityType: "fund",
    entityName,
    fields,
    sourceNote: "Filtered from KenyaFundFinder public listings via the data gateway.",
    disclaimer: STANDARD_DISCLAIMER,
    lookupMode: "mmf-yield-filter",
    totalMatches,
    shownCount,
  };
}


type FamilyMatchKind = "fund" | "stock" | "fx" | "commodity";

interface FamilyMatch {
  kind: FamilyMatchKind;
  label: string;
  value: string;
  buildSingle: () => Promise<WebsiteLookupScenarioResult | null>;
}

function assetHaystack(asset: ComparableAsset): string {
  return [asset.symbol, asset.name, ...asset.aliases].filter(Boolean).join(" ");
}

function fundHaystack(fund: FundRow): string {
  return `${fund.name ?? ""} ${fund.manager ?? ""}`;
}

async function collectFamilyMatches(
  tokens: string[],
  ctx: MarketContext,
): Promise<FamilyMatch[]> {
  const matches: FamilyMatch[] = [];

  const funds = await fetchAllFunds();
  for (const fund of funds) {
    if (!fund.name || !matchesFamilyTokens(fundHaystack(fund), tokens)) continue;
    const yieldPct = num(fund.annual_yield);
    const value =
      yieldPct != null
        ? `${fmtPct(yieldPct)} annual yield · ${fundTypeLabel(fund)}`
        : fundTypeLabel(fund);
    matches.push({
      kind: "fund",
      label: `Fund: ${fund.name}`,
      value,
      buildSingle: async () => buildFundLookup(fund),
    });
  }

  for (const asset of ctx.assets.filter((a) => a.kind === "stock")) {
    if (!matchesFamilyTokens(assetHaystack(asset), tokens)) continue;
    matches.push({
      kind: "stock",
      label: `Stock: ${asset.symbol}`,
      value: `${fmtKES(asset.value) ?? asset.value.toLocaleString("en-KE")} latest price`,
      buildSingle: async () => {
        const row = await fetchStockBySymbol(asset.symbol);
        if (row) return buildStockLookup(row);
        const fields: Array<{ label: string; value: string }> = [];
        addField(fields, "Latest price", fmtKES(asset.value) ?? undefined);
        if (asset.changePct != null) {
          addField(fields, "Day change", fmtPct(asset.changePct) ?? undefined);
        }
        return (
          buildResult("stock", asset.name, asset.symbol, fields, `/stocks/${asset.symbol}`) ??
          buildNotFoundResult("stock", asset.name)
        );
      },
    });
  }

  for (const asset of ctx.assets.filter((a) => a.kind === "fx")) {
    if (!matchesFamilyTokens(assetHaystack(asset), tokens)) continue;
    matches.push({
      kind: "fx",
      label: `FX: ${asset.symbol}/KES`,
      value: `${asset.value.toLocaleString("en-KE", { maximumFractionDigits: 4 })} KES per 1 unit`,
      buildSingle: async () => buildFxLookup(asset),
    });
  }

  for (const asset of ctx.assets.filter((a) => a.kind === "commodity")) {
    if (!matchesFamilyTokens(assetHaystack(asset), tokens)) continue;
    const unitLabel = asset.valueLabel.replace(/^Price\s*/i, "").replace(/[()]/g, "") || "value";
    matches.push({
      kind: "commodity",
      label: `Commodity: ${asset.name}`,
      value: `${asset.value.toLocaleString("en-KE", { maximumFractionDigits: 2 })} ${unitLabel}`.trim(),
      buildSingle: async () => buildCommodityLookup(asset),
    });
  }

  const kindOrder: Record<FamilyMatchKind, number> = {
    fund: 0,
    stock: 1,
    fx: 2,
    commodity: 3,
  };

  return matches.sort(
    (a, b) => kindOrder[a.kind] - kindOrder[b.kind] || a.label.localeCompare(b.label),
  );
}

function buildFamilyNotFoundResult(query: string): WebsiteLookupScenarioResult {
  const lookupMessage = `I could not find matching instruments for "${query}" in the current KenyaFundFinder data.`;
  return {
    kind: "website-lookup",
    summary: lookupMessage,
    entityType: "fund",
    entityName: query,
    fields: [
      {
        label: "Lookup result",
        value: "No matching instruments found in current KenyaFundFinder data.",
      },
    ],
    sourceNote: "No matching record in KenyaFundFinder public listings.",
    disclaimer: STANDARD_DISCLAIMER,
    notFound: true,
    lookupMessage,
  };
}

function familyEntityType(matches: FamilyMatch[]): WebsiteLookupEntityType {
  const first = matches[0]?.kind;
  if (first === "stock") return "stock";
  if (first === "fx") return "fx";
  if (first === "commodity") return "commodity";
  return "fund";
}

function buildInstrumentFamilyOverviewResult(
  query: string,
  matches: FamilyMatch[],
): WebsiteLookupScenarioResult {
  const totalMatches = matches.length;
  const shown = matches.slice(0, FAMILY_OVERVIEW_LIMIT);
  const shownCount = shown.length;
  const lookupMessage =
    "Ask for a specific instrument name if you want a single-instrument view.";

  const fields: Array<{ label: string; value: string }> = shown.map((m) => ({
    label: m.label,
    value: m.value,
  }));

  if (totalMatches > shownCount) {
    fields.push({
      label: "Note",
      value: "Showing the first 12 matching instruments available in the current data.",
    });
  }

  return {
    kind: "website-lookup",
    summary: `Matching instruments for "${query}" from KenyaFundFinder listings.`,
    entityType: familyEntityType(matches),
    entityName: query,
    fields,
    sourceNote: "Pulled from KenyaFundFinder public listings via the data gateway.",
    disclaimer: STANDARD_DISCLAIMER,
    lookupMode: "instrument-family-overview",
    lookupMessage,
    totalMatches,
    shownCount,
  };
}

async function resolveInstrumentFamilyOverview(
  prompt: string,
  ctx: MarketContext,
): Promise<WebsiteLookupScenarioResult> {
  const query = extractFamilyQuery(prompt);
  const tokens = getFamilyTokens(query);
  const matches = await collectFamilyMatches(tokens, ctx);

  if (matches.length === 0) {
    return buildFamilyNotFoundResult(query);
  }

  if (matches.length === 1) {
    const single = await matches[0].buildSingle();
    return single ?? buildFamilyNotFoundResult(query);
  }

  return buildInstrumentFamilyOverviewResult(query, matches);
}


async function resolveFundLookup(
  prompt: string,
): Promise<WebsiteLookupScenarioResult | null> {
  const rawQuery = extractFundQuery(prompt) ?? prompt;
  const query = rawQuery.trim();
  const intent = parseFundLookupIntent(query, prompt);
  const funds = await fetchAllFunds();
  const selection = selectBestFundMatch(funds, query, intent);


  if (selection.ambiguous) {
    return buildAmbiguousFundResult(query, selection.candidates);
  }
  if (!selection.fund) {
    return buildNotFoundResult("fund", query);
  }

  const built = buildFundLookup(selection.fund);
  return built ?? buildNotFoundResult("fund", query);
}

export async function resolveWebsiteLookup(
  prompt: string,
  ctx: MarketContext | null,
): Promise<WebsiteLookupScenarioResult | null> {
  if (isMmfYieldFilterPrompt(prompt)) {
    return resolveMmfYieldFilter(prompt);
  }

  const isLookup = isWebsiteLookupPrompt(prompt);
  if (!isLookup || !ctx) return null;

  if (isNamedFundLookupPrompt(prompt)) {
    return resolveFundLookup(prompt);
  }

  if (FX_PAIR_RE.test(prompt)) {
    const fxAssets = ctx.assets.filter((a) => a.kind === "fx");
    const fxHit = resolveFxAsset(prompt, fxAssets);
    if (fxHit) return buildFxLookup(fxHit);
    return buildNotFoundResult("fx", prompt);
  }

  const stocksForFamily = ctx.assets.filter((a) => a.kind === "stock");
  const stockHitForFamily = findAssetInPrompt(prompt, stocksForFamily);
  const stockIntentForFamily = /\b(stock|share|price|trading)\b/i.test(prompt);

  if (
    isInstrumentFamilyPrompt(prompt) &&
    !(stockHitForFamily && stockIntentForFamily)
  ) {
    return resolveInstrumentFamilyOverview(prompt, ctx);
  }

  const extractedFundQuery = extractFundQuery(prompt);
  const hasExplicitFundKeyword =
    /\b(mmf|money market|unit trust|fund)\b/i.test(prompt) ||
    Boolean(extractedFundQuery);
  const bareBrand = isBareBrandFundPrompt(prompt);
  const stocks = ctx.assets.filter((a) => a.kind === "stock");
  const stockHit = findAssetInPrompt(prompt, stocks);
  const stockIntent = /\b(stock|share|price|trading)\b/i.test(prompt);

  if (hasExplicitFundKeyword || (bareBrand && !stockHit)) {
    return resolveFundLookup(prompt);
  }

  if (stockHit || stockIntent) {
    if (!stockHit) {
      return buildNotFoundResult("stock", prompt);
    }
    const row = await fetchStockBySymbol(stockHit.symbol);
    if (row) return buildStockLookup(row);
    const fields: Array<{ label: string; value: string }> = [];
    addField(fields, "Latest price", fmtKES(stockHit.value) ?? undefined);
    if (stockHit.changePct != null) {
      addField(fields, "Day change", fmtPct(stockHit.changePct) ?? undefined);
    }
    const fallback = buildResult("stock", stockHit.name, stockHit.symbol, fields, `/stocks/${stockHit.symbol}`);
    return fallback ?? buildNotFoundResult("stock", stockHit.name);
  }

  if (/\b(usd|eur|gbp|chf|cad|aud|jpy|cny|dollar|euro|pound)\b/i.test(prompt)) {
    const fxAssets = ctx.assets.filter((a) => a.kind === "fx");
    const fxHit = resolveFxAsset(prompt, fxAssets);
    if (fxHit) return buildFxLookup(fxHit);
    return buildNotFoundResult("fx", prompt);
  }

  if (/\b(gold|brent|crude|oil|commodit)/i.test(prompt)) {
    const commodityHit = findAssetInPrompt(
      prompt,
      ctx.assets.filter((a) => a.kind === "commodity"),
    );
    if (commodityHit) return buildCommodityLookup(commodityHit);
    return buildNotFoundResult("commodity", prompt);
  }

  return null;
}
