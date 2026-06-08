/**
 * Simple, strict paste parser for going-forward unit-trust yield updates.
 *
 * Input format (tab- OR comma-separated), exactly 3 columns per row:
 *   <fund_id_or_slug>\t<daily_yield>\t<annual_yield>
 *
 * Rules (zero guessing):
 *   - Blank lines and lines starting with `#` are ignored.
 *   - An optional header row (`fund\tdaily\tannual` or similar) is auto-skipped.
 *   - Each data row must have exactly 3 non-empty tokens.
 *   - Numeric tokens may carry `,` thousand separators, a trailing `%`,
 *     or `KES/USD/GBP/Sh` units — these are stripped before parsing.
 *   - Resolved against a provided DB lookup by id OR slug (case-insensitive).
 *   - NEVER creates funds. Unknown ids surface as UNKNOWN_FUND.
 */

export interface SimpleFundLookup {
  id: string;
  slug: string;
  manager: string;
  name: string;
  fund_type: string;
  yield_unit: string;
  annual_yield: number;
  daily_yield: number;
}

export type SimpleRowStatus =
  | "OK"
  | "BAD_FORMAT"
  | "BAD_NUMBER"
  | "UNKNOWN_FUND"
  | "DUPLICATE_FUND_ID";

export interface SimpleParsedRow {
  index: number;          // line number in original input (1-based)
  rawLine: string;
  key: string;            // first token as pasted
  dailyRaw: string;
  annualRaw: string;
  daily: number | null;
  annual: number | null;
  status: SimpleRowStatus;
  errorMessage?: string;
  warnings: string[];     // soft warnings (HIGH_DRIFT, LIKELY_SWAPPED)
  fund?: SimpleFundLookup;
  prevAnnual?: number;
  drift?: number;         // % change vs prevAnnual
}

export interface SimpleParseResult {
  rows: SimpleParsedRow[];
  okCount: number;
  blockedCount: number;
  warningCount: number;
  highDriftCount: number;
}

const NUMERIC_STRIP = /[,%\s]|KES|USD|GBP|Sh/gi;

function parseNumberToken(tok: string): number | null {
  if (!tok) return null;
  const cleaned = tok.replace(NUMERIC_STRIP, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n >= 10000) return null;
  return n;
}

function isHeaderRow(tokens: string[]): boolean {
  const joined = tokens.join(" ").toLowerCase();
  return (
    /\bfund\b/.test(joined) &&
    /\bdaily\b/.test(joined) &&
    /\bannual\b/.test(joined)
  );
}

export function parseSimplePaste(
  input: string,
  lookups: SimpleFundLookup[],
  opts: { highDriftPct?: number; swapWarnPct?: number } = {},
): SimpleParseResult {
  const highDriftPct = opts.highDriftPct ?? 25;
  const swapWarnPct = opts.swapWarnPct ?? 20;

  // Build O(1) lookup maps by id and slug (case-insensitive).
  const byId = new Map<string, SimpleFundLookup>();
  const bySlug = new Map<string, SimpleFundLookup>();
  for (const f of lookups) {
    byId.set(f.id.toLowerCase(), f);
    bySlug.set(f.slug.toLowerCase(), f);
  }

  const lines = input.replace(/\r/g, "").split("\n");
  const rows: SimpleParsedRow[] = [];
  const seenFundIds = new Map<string, number>(); // fund.id → row index

  lines.forEach((rawLine, i) => {
    const line = rawLine.trim();
    if (!line) return;
    if (line.startsWith("#")) return;

    // Split by tab first; if only 1 piece, fall back to comma.
    let tokens = line.split("\t").map((s) => s.trim()).filter(Boolean);
    if (tokens.length < 2) tokens = line.split(",").map((s) => s.trim()).filter(Boolean);

    if (isHeaderRow(tokens)) return;

    const row: SimpleParsedRow = {
      index: i + 1,
      rawLine: line,
      key: tokens[0] ?? "",
      dailyRaw: tokens[1] ?? "",
      annualRaw: tokens[2] ?? "",
      daily: null,
      annual: null,
      status: "OK",
      warnings: [],
    };

    if (tokens.length !== 3) {
      row.status = "BAD_FORMAT";
      row.errorMessage = `Expected 3 tab- or comma-separated columns, got ${tokens.length}.`;
      rows.push(row);
      return;
    }

    const daily = parseNumberToken(tokens[1]);
    const annual = parseNumberToken(tokens[2]);
    if (daily === null || annual === null) {
      row.status = "BAD_NUMBER";
      row.errorMessage = "Daily and annual must be numbers between 0 and 10000.";
      rows.push(row);
      return;
    }
    row.daily = daily;
    row.annual = annual;

    const key = tokens[0].toLowerCase();
    const fund = byId.get(key) ?? bySlug.get(key);
    if (!fund) {
      row.status = "UNKNOWN_FUND";
      row.errorMessage = `No unit trust found with id or slug "${tokens[0]}".`;
      rows.push(row);
      return;
    }
    row.fund = fund;
    row.prevAnnual = fund.annual_yield;

    if (seenFundIds.has(fund.id)) {
      row.status = "DUPLICATE_FUND_ID";
      row.errorMessage = `Fund already listed on line ${seenFundIds.get(fund.id)}.`;
      rows.push(row);
      return;
    }
    seenFundIds.set(fund.id, i + 1);

    // Drift vs prev annual
    if (fund.annual_yield > 0) {
      const drift = Math.abs((annual - fund.annual_yield) / fund.annual_yield) * 100;
      row.drift = drift;
      if (drift > highDriftPct) {
        row.warnings.push(`HIGH_DRIFT: ${drift.toFixed(1)}% vs previous ${fund.annual_yield}`);
      }
    }

    // Likely swapped daily/annual (only meaningful for % units)
    if (fund.yield_unit === "%" && annual > 0 && daily > annual * (1 + swapWarnPct / 100)) {
      row.warnings.push("LIKELY_SWAPPED: daily > annual, did you swap the columns?");
    }

    rows.push(row);
  });

  const okCount = rows.filter((r) => r.status === "OK").length;
  const blockedCount = rows.filter((r) => r.status !== "OK").length;
  const highDriftCount = rows.filter((r) => r.warnings.some((w) => w.startsWith("HIGH_DRIFT"))).length;
  const warningCount = rows.filter((r) => r.warnings.length > 0).length;

  return { rows, okCount, blockedCount, warningCount, highDriftCount };
}
