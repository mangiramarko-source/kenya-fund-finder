/**
 * Defensive bulk-fund text parser.
 *
 * Strategy: token-based state machine. We do NOT split by lines or guess
 * field positions. Instead we walk the input and look for currency tokens
 * (Sh | USD | GBP) followed immediately by exactly TWO numeric values
 * (daily, annual). Everything between the previous match end and the next
 * currency token is the candidate "manager name" segment. Everything before
 * the first valid row is the (possibly repeated) category header.
 *
 * Anti-hallucination guarantees:
 *   - Currency tokens are mandatory delimiters. No currency = no row.
 *   - Each row must have BOTH numbers. Missing one = flagged "unparsed".
 *   - Category persists from the most recently seen header until a new one.
 *   - The raw substring used to derive each row is preserved so the UI can
 *     show side-by-side raw vs extracted.
 */

import type { FundType } from "@/lib/api";

export type ParseStatus = "ok" | "unparsed" | "category-missing";

export interface ParsedRow {
  index: number;
  raw: string;                  // The raw segment the parser consumed for this row
  status: ParseStatus;
  category: string | null;      // Original category header text
  fund_type: FundType | null;   // Mapped fund type
  manager: string;              // Trimmed manager/fund name
  currency: "Sh" | "USD" | "GBP" | null;
  yield_unit: "%" | "KES" | "USD" | "GBP" | null;
  daily_yield: number | null;
  annual_yield: number | null;
  warnings: string[];           // Soft warnings (sanity checks etc.)
  log: string;                  // Human-readable parse trace for the log preview
}

export interface ParseReport {
  rows: ParsedRow[];
  unparsedSegments: string[];   // Anything we couldn't make sense of
  categoriesSeen: string[];
  unknownHeaders: string[];     // Header-like phrases in input not in CATEGORY_HEADERS
}

// Known category headers. Both legacy ("Money Mkt Fund") and current
// ("Money Market") variants are supported. The matcher always prefers the
// LONGEST label that matches at a given position so that "Money Market"
// never accidentally matches inside "Money Market Fund".
const CATEGORY_HEADERS: Array<[string, FundType]> = [
  ["Money Market Fund", "money_market"],
  ["Money Mkt Fund", "money_market"],
  ["Money Market", "money_market"],
  ["Fixed Income Fund", "fixed_income"],
  ["Fixed Income", "fixed_income"],
  ["Balanced Fund", "balanced"],
  ["Equity Fund", "equity"],
  ["Special Fund", "special"],
  ["Bond Fund", "bond"],
  // NOTE: bare "Balanced", "Equity", "Special", "Bond" are intentionally
  // NOT included — they collide with manager names like
  // "African Alliance Special", "CIC Global Balanced", etc.
];

const CURRENCY_TOKENS = ["Sh", "USD", "GBP"] as const;

/**
 * Decide the yield_unit. Rule:
 *   - Currency token "USD" / "GBP" → that currency (NAV-priced).
 *   - "Sh": fund_type drives it. Money Market / Fixed Income / Bond → "%".
 *           Balanced / Equity / Special → "KES" (NAV-priced in shillings).
 *   - As a sanity backstop, if the daily/annual values are both > 100, treat
 *     as a NAV (KES) regardless. This prevents a 145.87% mis-labeling.
 */
function deriveYieldUnit(
  currency: "Sh" | "USD" | "GBP",
  fund_type: FundType | null,
  daily: number,
  annual: number,
): "%" | "KES" | "USD" | "GBP" {
  if (currency === "USD") return "USD";
  if (currency === "GBP") return "GBP";
  const isNavType = fund_type === "balanced" || fund_type === "equity";
  if (isNavType) return "KES";
  if (daily > 100 || annual > 100) return "KES";
  return "%";
}

function findNextCategory(text: string, fromIdx: number, headers: Array<[string, FundType]>): { idx: number; label: string; fund_type: FundType } | null {
  let best: { idx: number; label: string; fund_type: FundType } | null = null;
  for (const [label, ft] of headers) {
    const idx = text.indexOf(label, fromIdx);
    if (idx === -1) continue;
    if (best === null || idx < best.idx || (idx === best.idx && label.length > best.label.length)) {
      best = { idx, label, fund_type: ft };
    }
  }
  return best;
}


/**
 * Find the next currency token followed by 1 or 2 numbers, starting from `fromIdx`.
 * If only 1 number is found the row is reported as partial so the UI can
 * surface "missing daily or annual" instead of silently dropping it.
 */
function findNextRow(text: string, fromIdx: number): {
  currencyIdx: number;
  currency: "Sh" | "USD" | "GBP";
  daily: number;
  annual: number | null;
  endIdx: number;
  rawNumbers: string;
  partial: boolean;
} | null {
  const re = /(Sh|USD|GBP)\s*(-?\d+\.\d{2}|-?\d+)(?:\s*(-?\d+\.\d{2}|-?\d+))?/g;
  re.lastIndex = fromIdx;
  const m = re.exec(text);
  if (!m) return null;
  const hasSecond = m[3] !== undefined;
  return {
    currencyIdx: m.index,
    currency: m[1] as "Sh" | "USD" | "GBP",
    daily: parseFloat(m[2]),
    annual: hasSecond ? parseFloat(m[3]) : null,
    endIdx: m.index + m[0].length,
    rawNumbers: hasSecond ? `${m[2]} ${m[3]}` : m[2],
    partial: !hasSecond,
  };
}

export function parseBulkFundText(input: string, extraHeaders: Array<[string, FundType]> = []): ParseReport {
  const text = input.replace(/\r/g, "");
  const mergedHeaders: Array<[string, FundType]> = [...extraHeaders, ...CATEGORY_HEADERS];
  const rows: ParsedRow[] = [];
  const unparsedSegments: string[] = [];
  const categoriesSeen: string[] = [];

  // Detect header-like phrases that DON'T match known categories.
  // Stem-based: trailing word may end in extra letters to catch typos like
  // "Markett", "Funde", "Incomes".
  const knownLabels = new Set(mergedHeaders.map(([l]) => l));
  const HEADER_STEM = "(?:Funds?|Fundes?|Bonds?|REITs?|Trusts?|Notes?|Incomes?|Marketts?|Markets?|Mkts?)";
  const headerLike = new RegExp(
    `([A-Z][a-zA-Z]+(?:\\s+[A-Z][a-zA-Z]+){0,3}\\s+${HEADER_STEM})`,
    "g",
  );
  const unknownHeaders: string[] = [];
  const seenUnknown = new Set<string>();
  // Capture every occurrence so we can use them as segment boundaries — this
  // prevents typos from bleeding their tail into the next manager segment
  // (e.g. "Money Markett" → manager "tBritam").
  const unknownOccurrences: Array<{ idx: number; len: number }> = [];
  let hm: RegExpExecArray | null;
  while ((hm = headerLike.exec(text)) !== null) {
    const phrase = hm[1].trim();
    let isKnown = false;
    for (const [label] of mergedHeaders) {
      if (phrase === label || phrase.endsWith(label) || label.endsWith(phrase)) { isKnown = true; break; }
    }
    if (isKnown || knownLabels.has(phrase)) continue;
    if (!seenUnknown.has(phrase)) { seenUnknown.add(phrase); unknownHeaders.push(phrase); }
    unknownOccurrences.push({ idx: hm.index, len: hm[1].length });
  }

  // Latest boundary (known category OR unknown header) ending strictly before
  // beforeIdx, starting search at fromIdx. Falls back to fromIdx.
  const lastBoundaryEnd = (fromIdx: number, beforeIdx: number): number => {
    let best = fromIdx;
    let s = fromIdx;
    while (true) {
      const cat = findNextCategory(text, s, mergedHeaders);
      if (!cat || cat.idx >= beforeIdx) break;
      best = Math.max(best, cat.idx + cat.label.length);
      s = cat.idx + cat.label.length;
    }
    for (const u of unknownOccurrences) {
      if (u.idx >= fromIdx && u.idx < beforeIdx) {
        const end = u.idx + u.len;
        if (end > best) best = end;
      }
    }
    return best;
  };

  let cursor = 0;
  let currentCategory: { label: string; fund_type: FundType } | null = null;
  let rowIdx = 0;

  while (cursor < text.length) {
    const nextRow = findNextRow(text, cursor);
    if (!nextRow) {
      const tail = text.slice(cursor).trim();
      if (tail) unparsedSegments.push(tail);
      break;
    }

    // Promote current category if a KNOWN header appears before this row.
    let scan = cursor;
    while (true) {
      const cat = findNextCategory(text, scan, mergedHeaders);
      if (!cat || cat.idx >= nextRow.currencyIdx) break;
      currentCategory = { label: cat.label, fund_type: cat.fund_type };
      if (!categoriesSeen.includes(cat.label)) categoriesSeen.push(cat.label);
      scan = cat.idx + cat.label.length;
    }

    // Manager segment starts after the latest boundary (known OR unknown).
    const segStart = lastBoundaryEnd(cursor, nextRow.currencyIdx);

    const managerRaw = text.slice(segStart, nextRow.currencyIdx);
    const manager = managerRaw
      .replace(/[\s\|]+/g, " ")
      .trim()
      .replace(/\s+(?:Sh|KES|USD|GBP)\s*$/i, "")
      .trim();
    const rawSegment = text.slice(segStart, nextRow.endIdx).trim();

    const fund_type = currentCategory?.fund_type ?? null;
    const status: ParseStatus = !currentCategory
      ? "category-missing"
      : !manager || nextRow.partial
        ? "unparsed"
        : "ok";

    const annualForUnit = nextRow.annual ?? nextRow.daily;
    const yield_unit = currentCategory && manager && !nextRow.partial
      ? deriveYieldUnit(nextRow.currency, fund_type, nextRow.daily, annualForUnit)
      : null;

    const warnings: string[] = [];

    if (nextRow.partial) {
      warnings.push("Missing either Daily or Annual yield — partial row, please verify the source.");
    }
    if (nextRow.daily < 0 || (nextRow.annual !== null && nextRow.annual < 0)) {
      warnings.push("Negative yield detected — unusual for Kenyan UTs. Please verify.");
    }
    if (yield_unit === "%" && nextRow.annual !== null && (nextRow.annual > 100 || nextRow.daily > 100)) {
      warnings.push("Yield > 100% — likely NAV mis-tagged as %");
    }
    if ((yield_unit === "KES" || yield_unit === "USD" || yield_unit === "GBP") && nextRow.annual !== null && nextRow.annual < 1) {
      warnings.push("NAV < 1 — likely % mis-tagged as currency");
    }
    if (yield_unit === "%" && nextRow.daily > 0 && nextRow.annual !== null && nextRow.annual > 0) {
      const ratio = nextRow.daily / nextRow.annual;
      if (ratio < 0.5 || ratio > 1.5) {
        warnings.push(`Daily/Annual ratio unusual (${ratio.toFixed(2)})`);
      }
    }

    const log = status === "ok"
      ? `Row ${rowIdx + 1}: [${currentCategory!.label}] [${manager}] [${nextRow.currency}] daily=${nextRow.daily} annual=${nextRow.annual} → unit=${yield_unit}`
      : status === "category-missing"
        ? `Row ${rowIdx + 1}: ⚠ no active category before "${manager || nextRow.rawNumbers}" — flagged`
        : nextRow.partial
          ? `Row ${rowIdx + 1}: ⚠ partial row "${manager}" ${nextRow.currency} ${nextRow.rawNumbers} — missing one yield value`
          : `Row ${rowIdx + 1}: ⚠ empty manager segment before ${nextRow.currency} ${nextRow.rawNumbers} — flagged`;

    rows.push({
      index: rowIdx,
      raw: rawSegment,
      status,
      category: currentCategory?.label ?? null,
      fund_type,
      manager,
      currency: nextRow.currency,
      yield_unit,
      daily_yield: nextRow.daily,
      annual_yield: nextRow.annual,
      warnings,
      log,
    });
    rowIdx++;
    cursor = nextRow.endIdx;
  }

  return { rows, unparsedSegments, categoriesSeen, unknownHeaders };
}
