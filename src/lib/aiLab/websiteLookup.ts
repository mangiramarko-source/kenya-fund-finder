// Phase 12 — deterministic website data lookup via public-data gateway.
// Surfaces fields already stored on KenyaFundFinder; no calculations, no LLM.

import { fetchPublicData } from "@/lib/gateway";
import { findAsset, type ComparableAsset, type MarketContext } from "./marketContext";
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

interface FundRow {
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

function findAssetInPrompt(prompt: string, assets: ComparableAsset[]): ComparableAsset | null {
  const lower = prompt.toLowerCase();
  const ranked = [...assets].sort((a, b) => {
    const aLen = Math.max(a.symbol.length, a.name.length);
    const bLen = Math.max(b.symbol.length, b.name.length);
    return bLen - aLen;
  });

  for (const asset of ranked) {
    const terms = [asset.symbol, asset.name, ...asset.aliases];
    for (const term of terms) {
      const t = term.trim();
      if (t.length < 2) continue;
      const re = new RegExp(`\\b${escapeRegExp(t.toLowerCase())}\\b`, "i");
      if (re.test(lower)) return asset;
    }
  }

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

export function isWebsiteLookupPrompt(prompt: string): boolean {
  if (detectAdviceIntent(prompt)) return false;
  const lower = prompt.toLowerCase();
  if (isNewsLabPrompt(lower)) return false;
  if (COMPARE_RE.test(prompt)) return false;
  if (EXPLAIN_RE.test(prompt)) return false;
  if (hasScenarioSignals(prompt)) return false;
  if (hasAmountScenario(prompt)) return false;
  return LOOKUP_SIGNALS.some((re) => re.test(prompt));
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

async function fetchFundByName(query: string): Promise<FundRow | null> {
  const { data } = await fetchPublicData<FundRow>("funds", {
    select: [...FUND_LOOKUP_SELECT],
    order: "annual_yield.desc",
    limit: 200,
  });
  const q = query.toLowerCase().trim();
  const exact = data.find((f) => f.name?.toLowerCase() === q);
  if (exact) return exact;
  const contains = data.find((f) => f.name?.toLowerCase().includes(q));
  if (contains) return contains;
  const reverse = data.find((f) => q.includes((f.name ?? "").toLowerCase()));
  return reverse ?? null;
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
    /\bshow me\s+(?:data for|details for)\s+(.+?)(?:\?|\.|$)/i,
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

export async function resolveWebsiteLookup(
  prompt: string,
  ctx: MarketContext | null,
): Promise<WebsiteLookupScenarioResult | null> {
  if (!isWebsiteLookupPrompt(prompt) || !ctx) return null;

  const stocks = ctx.assets.filter((a) => a.kind === "stock");
  const stockHit = findAssetInPrompt(prompt, stocks);
  if (stockHit) {
    const row = await fetchStockBySymbol(stockHit.symbol);
    if (row) return buildStockLookup(row);
    const fields: Array<{ label: string; value: string }> = [];
    addField(fields, "Latest price", fmtKES(stockHit.value) ?? undefined);
    if (stockHit.changePct != null) {
      addField(fields, "Day change", fmtPct(stockHit.changePct) ?? undefined);
    }
    return buildResult("stock", stockHit.name, stockHit.symbol, fields, `/stocks/${stockHit.symbol}`);
  }

  if (/\b(mmf|money market|unit trust|fund)\b/i.test(prompt) || extractFundQuery(prompt)) {
    const query = extractFundQuery(prompt) ?? prompt;
    const fundHit = findAssetInPrompt(query, ctx.assets.filter((a) => a.kind === "fund"));
    const row = await fetchFundByName(fundHit?.name ?? query);
    if (row) return buildFundLookup(row);
  }

  if (FX_PAIR_RE.test(prompt) || /\b(usd|eur|gbp|chf|cad|aud|jpy|cny)\b/i.test(prompt)) {
    const fxAssets = ctx.assets.filter((a) => a.kind === "fx");
    const fxHit = findAssetInPrompt(prompt, fxAssets);
    if (fxHit) return buildFxLookup(fxHit);
  }

  if (/\b(gold|brent|crude|oil|commodit)/i.test(prompt)) {
    const commodityHit = findAssetInPrompt(
      prompt,
      ctx.assets.filter((a) => a.kind === "commodity"),
    );
    if (commodityHit) return buildCommodityLookup(commodityHit);
  }

  return null;
}
