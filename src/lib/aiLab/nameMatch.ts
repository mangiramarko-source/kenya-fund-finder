// Fuzzy instrument/fund/company name matching for AI Lab routing.

import type { ComparableAsset } from "./marketContext";

export const INSTRUMENT_NOISE_WORDS = new Set([
  "a",
  "an",
  "the",
  "stock",
  "stocks",
  "share",
  "shares",
  "fund",
  "funds",
  "mmf",
  "mmfs",
  "money",
  "market",
  "unit",
  "trust",
  "plc",
  "limited",
  "ltd",
  "company",
  "group",
  "holding",
  "holdings",
]);

/** Known ticker/name shortcuts applied before tokenization. */
export const INSTRUMENT_ALIASES: Record<string, string> = {
  safaricom: "scom",
  saf: "scom",
  "equity group": "eqty",
  equity: "eqty",
  kcb: "kcb",
  ncba: "ncba",
  britam: "britam",
  cic: "cic",
  etica: "etica",
  sanlam: "sanlam",
  dollar: "usd",
  euro: "eur",
  pound: "gbp",
};

const MIN_MATCH_SCORE = 200;
const AMBIGUITY_SCORE_GAP = 80;
const MIN_PREFIX_LEN = 3;

export type AssetMatchStatus = "match" | "ambiguous" | "none";

export interface AssetMatchResult {
  status: AssetMatchStatus;
  asset?: ComparableAsset;
  candidates: ComparableAsset[];
  query: string;
  topScore: number;
}

export interface CompareSides {
  left: string;
  right: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeInstrumentQuery(raw: string): string {
  let q = raw.toLowerCase().trim();
  q = q.replace(/[''?.!,]/g, " ");
  q = q.replace(/[^\w\s]/g, " ");
  q = q.replace(/\s+/g, " ").trim();

  for (const [alias, replacement] of Object.entries(INSTRUMENT_ALIASES)) {
    q = q.replace(new RegExp(`\\b${escapeRegExp(alias)}\\b`, "gi"), replacement);
  }

  const tokens = q
    .split(/\s+/)
    .filter((t) => t.length > 0 && !INSTRUMENT_NOISE_WORDS.has(t));

  return tokens.join(" ").trim();
}

export function tokenizeInstrumentQuery(raw: string): string[] {
  const normalized = normalizeInstrumentQuery(raw);
  if (!normalized) return [];
  return [...new Set(normalized.split(/\s+/).filter((t) => t.length >= 1))];
}

function assetSearchTerms(asset: ComparableAsset): string[] {
  return [
    asset.symbol,
    asset.name,
    ...asset.aliases,
  ]
    .map((t) => normalizeInstrumentQuery(t))
    .filter(Boolean);
}

function scoreAssetCandidate(query: string, asset: ComparableAsset): number {
  const qNorm = normalizeInstrumentQuery(query);
  if (!qNorm) return -999;

  const qTokens = qNorm.split(/\s+/).filter(Boolean);
  const symbolNorm = normalizeInstrumentQuery(asset.symbol);
  const nameNorm = normalizeInstrumentQuery(asset.name);
  const terms = assetSearchTerms(asset);

  let score = 0;

  if (symbolNorm === qNorm) score += 1000;
  if (nameNorm === qNorm) score += 950;
  if (terms.some((t) => t === qNorm)) score += 900;

  if (symbolNorm.startsWith(qNorm) && qNorm.length >= MIN_PREFIX_LEN) score += 500;
  if (nameNorm.startsWith(qNorm) && qNorm.length >= MIN_PREFIX_LEN) score += 450;
  if (qNorm.startsWith(symbolNorm) && symbolNorm.length >= MIN_PREFIX_LEN) score += 420;
  if (qNorm.startsWith(nameNorm) && nameNorm.length >= MIN_PREFIX_LEN) score += 400;

  if (symbolNorm.includes(qNorm) && qNorm.length >= MIN_PREFIX_LEN) score += 320;
  if (nameNorm.includes(qNorm) && qNorm.length >= MIN_PREFIX_LEN) score += 300;

  const matchedTokens = qTokens.filter((t) =>
    terms.some((term) => term === t || term.includes(t) || t.includes(term)),
  );
  score += matchedTokens.length * 120;
  if (qTokens.length > 0 && matchedTokens.length === qTokens.length) score += 180;

  for (const term of terms) {
    if (term.length >= MIN_PREFIX_LEN && qNorm.includes(term)) score += 80;
    if (term.length >= MIN_PREFIX_LEN && term.includes(qNorm)) score += 60;
  }

  return score;
}

export function resolveAssetMatch(
  query: string,
  assets: ComparableAsset[],
): AssetMatchResult {
  const trimmed = query.trim();
  if (!trimmed) {
    return { status: "none", candidates: [], query: trimmed, topScore: 0 };
  }

  const scored = assets
    .map((asset) => ({ asset, score: scoreAssetCandidate(trimmed, asset) }))
    .filter((x) => x.score >= MIN_MATCH_SCORE)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.asset.symbol.localeCompare(b.asset.symbol) ||
        a.asset.name.localeCompare(b.asset.name),
    );

  if (scored.length === 0) {
    return { status: "none", candidates: [], query: trimmed, topScore: 0 };
  }

  const qTokens = tokenizeInstrumentQuery(trimmed);
  const qNorm = normalizeInstrumentQuery(trimmed);
  const brandOnly = qTokens.length === 1;

  const top = scored[0];
  const second = scored[1];
  const gap = second ? top.score - second.score : top.score;

  if (brandOnly && scored.length > 1) {
    const brandMatches = scored.filter(({ asset }) => {
      const terms = assetSearchTerms(asset);
      return terms.some(
        (term) =>
          term === qNorm ||
          term.startsWith(`${qNorm} `) ||
          term.split(/\s+/).includes(qNorm),
      );
    });
    const uniqueNames = new Set(brandMatches.map((s) => s.asset.name));
    if (uniqueNames.size > 1) {
      return {
        status: "ambiguous",
        candidates: brandMatches.map((s) => s.asset),
        query: trimmed,
        topScore: top.score,
      };
    }
  }

  if (second && gap < AMBIGUITY_SCORE_GAP) {
    const tied = scored.filter((s) => top.score - s.score < AMBIGUITY_SCORE_GAP);
    return {
      status: "ambiguous",
      candidates: tied.map((s) => s.asset),
      query: trimmed,
      topScore: top.score,
    };
  }

  return {
    status: "match",
    asset: top.asset,
    candidates: scored.slice(0, 3).map((s) => s.asset),
    query: trimmed,
    topScore: top.score,
  };
}

const COMPARE_PATTERNS: RegExp[] = [
  /^\s*compare\s+(.+?)\s+(?:vs\.?|versus|with|to|and|&)\s+(.+?)\s*$/i,
  /^\s*(.+?)\s+(?:vs\.?|versus)\s+(.+?)\s*$/i,
  /^\s*difference\s+between\s+(.+?)\s+(?:and|&)\s+(.+?)\s*$/i,
  /^\s*how\s+does\s+(.+?)\s+compare\s+(?:to|with)\s+(.+?)\s*$/i,
];

export function parseCompareSides(prompt: string): CompareSides | null {
  const trimmed = prompt.trim();
  const lower = trimmed.toLowerCase();
  if (/explain|what is|what's|define|meaning of/.test(lower)) return null;

  for (const re of COMPARE_PATTERNS) {
    const m = trimmed.match(re);
    if (m?.[1] && m?.[2]) {
      return { left: m[1].trim(), right: m[2].trim() };
    }
  }
  return null;
}

export function isComparePrompt(prompt: string): boolean {
  return parseCompareSides(prompt) != null;
}

export function formatAmbiguousMatchMessage(sideLabel: string, query: string, candidates: ComparableAsset[]): string {
  const names = candidates
    .slice(0, 5)
    .map((a) => (a.kind === "stock" ? `${a.name} (${a.symbol})` : a.name))
    .join(", ");
  return `I found several matches for ${sideLabel} "${query}". Please specify which one: ${names}.`;
}

export function formatCompareNotFoundMessage(missing: string[]): string {
  if (missing.length === 2) {
    return `Couldn't find ${missing[0]} or ${missing[1]} in the live market data. Try a ticker, company name, or fund name shown on KenyaFundFinder.`;
  }
  return `Couldn't find ${missing.join(" or ")} in the live market data. Try using a ticker (e.g. SCOM, KCB) or the full fund name.`;
}
