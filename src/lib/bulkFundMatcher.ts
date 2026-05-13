/**
 * Pure matcher for bulk-paste fund rows ↔ existing DB funds.
 * Extracted from BulkFundPasteVerify so it can be unit-tested in isolation.
 *
 * Matching strategy:
 *   1. Type-mismatch check: same manager exists with a different unit-class
 *      (% vs price). Surfaces a hard warning.
 *   2. Exact composite key: manager|fund_type|yield_unit.
 *   3. Token-prefix match within (fund_type, unit_class):
 *        - "Britam"  → "Britam Asset Managers"
 *        - "ICEA"    → "ICEA LION Asset Management"
 *        - "Lofty_Corban" → "Lofty-Corban Investments Limited"
 *      The next token in the longer name must be a generic suffix word (Ltd,
 *      Asset, Limited, …) to avoid matching "CIC" → "CIC Wealth".
 *   4. Strict Levenshtein fallback (similarity ≥ 0.85) within (fund_type,
 *      unit_class).
 */

export interface ExistingFund {
  id: string;
  manager: string;
  /** Specific fund/scheme name (e.g. "Cytonn Money Market Fund"). Optional
   *  because matcher tests pre-date this column; the bulk-paste UI relies on
   *  it for the Remap dialog so users can pick the exact unit trust. */
  name?: string;
  fund_type: string;
  yield_unit: string;
  annual_yield: number;
}

export type MatchKind = "matched" | "review" | "new" | "type-mismatch";

export interface MatchInfo {
  kind: MatchKind;
  fund?: ExistingFund;
  prevAnnual?: number;
  drift?: number;
  conflictingFund?: ExistingFund;
  similarity?: number;
}

export interface ParsedRowMatchInput {
  index: number;
  status: "ok" | "unparsed" | "category-missing";
  manager: string;
  fund_type: string | null;
  yield_unit: string | null;
  annual_yield: number | null;
}

export const SIMILARITY_THRESHOLD = 0.85;

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  }
  return dp[m][n];
}

export function similarity(a: string, b: string): number {
  const la = a.toLowerCase(), lb = b.toLowerCase();
  const max = Math.max(la.length, lb.length);
  if (!max) return 1;
  return 1 - levenshtein(la, lb) / max;
}

export function unitClass(u: string): "percent" | "price" {
  return u === "%" ? "percent" : "price";
}

export function normalizeManager(s: string): string {
  return s
    .toLowerCase()
    .replace(/[_\-/]+/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const GENERIC_SUFFIX = new Set([
  "ltd", "limited", "plc", "llc", "inc", "company", "co",
  "asset", "assets", "management", "managers", "manager",
  "investment", "investments", "investing", "capital",
  "kenya", "group", "services", "bank", "trust",
]);

export function isPrefixTokenMatch(short: string, long: string): boolean {
  const a = normalizeManager(short).split(" ").filter(Boolean);
  const b = normalizeManager(long).split(" ").filter(Boolean);
  if (a.length === 0 || a.length > b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  if (a.length < b.length && !GENERIC_SUFFIX.has(b[a.length])) return false;
  return true;
}

export function compositeKey(manager: string, fund_type: string, yield_unit: string) {
  return `${manager.trim().toLowerCase()}|${fund_type}|${yield_unit}`;
}

export function matchRow(r: ParsedRowMatchInput, existing: ExistingFund[]): MatchInfo {
  if (r.status !== "ok" || !r.fund_type || !r.yield_unit) {
    return { kind: "new" };
  }

  // 1. Type mismatch on same manager
  const conflicting = existing.find(
    (f) =>
      f.manager.toLowerCase().trim() === r.manager.toLowerCase().trim() &&
      unitClass(f.yield_unit) !== unitClass(r.yield_unit!),
  );
  if (conflicting) return { kind: "type-mismatch", conflictingFund: conflicting };

  // 2. Exact composite key
  const byKey = new Map<string, ExistingFund>();
  for (const f of existing) byKey.set(compositeKey(f.manager, f.fund_type, f.yield_unit), f);
  const exact = byKey.get(compositeKey(r.manager, r.fund_type, r.yield_unit));
  if (exact) {
    const drift = exact.annual_yield > 0
      ? Math.abs(((r.annual_yield ?? 0) - exact.annual_yield) / exact.annual_yield) * 100
      : 0;
    return { kind: "matched", fund: exact, prevAnnual: exact.annual_yield, drift };
  }

  // 3. Token-prefix candidates
  const prefixCandidates = existing.filter(
    (f) =>
      f.fund_type === r.fund_type &&
      unitClass(f.yield_unit) === unitClass(r.yield_unit!) &&
      (isPrefixTokenMatch(r.manager, f.manager) || isPrefixTokenMatch(f.manager, r.manager)),
  );
  if (prefixCandidates.length === 1) {
    const f = prefixCandidates[0];
    const drift = f.annual_yield > 0
      ? Math.abs(((r.annual_yield ?? 0) - f.annual_yield) / f.annual_yield) * 100
      : 0;
    return { kind: "matched", fund: f, prevAnnual: f.annual_yield, drift };
  }
  if (prefixCandidates.length > 1) {
    const best = prefixCandidates
      .map((f) => ({ f, sim: similarity(f.manager, r.manager) }))
      .sort((a, b) => b.sim - a.sim)[0];
    return { kind: "review", fund: best.f, prevAnnual: best.f.annual_yield, similarity: best.sim };
  }

  // 4. Strict Levenshtein fallback
  let best: { fund: ExistingFund; sim: number } | null = null;
  for (const f of existing) {
    if (f.fund_type !== r.fund_type) continue;
    if (unitClass(f.yield_unit) !== unitClass(r.yield_unit!)) continue;
    const sim = similarity(f.manager, r.manager);
    if (sim >= SIMILARITY_THRESHOLD && (!best || sim > best.sim)) best = { fund: f, sim };
  }
  if (best) return { kind: "review", fund: best.fund, prevAnnual: best.fund.annual_yield, similarity: best.sim };
  return { kind: "new" };
}
