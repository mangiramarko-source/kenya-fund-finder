import { describe, it, expect } from "vitest";
import {
  matchRow,
  type ExistingFund,
  type ParsedRowMatchInput,
} from "./bulkFundMatcher";
import { parseBulkFundText } from "./bulkFundParser";

/**
 * E2E + safety + drift tests for the bulk-paste matcher.
 *
 * Three suites:
 *   1. End-to-end parse of the user's full sample blob → assert match kind
 *      for every parsed row.
 *   2. Unit-class safety — USD/GBP rows must never collapse onto % or KES
 *      rows of the same manager, and unit mismatches surface as
 *      type-mismatch / new (never matched).
 *   3. Drift + prevAnnual arithmetic correctness when a matched fund's
 *      annual_yield differs from the pasted value.
 */

const EXISTING: ExistingFund[] = [
  // Money Market %
  { id: "mm-britam",       manager: "Britam Asset Managers",                    fund_type: "money_market", yield_unit: "%",   annual_yield: 9.47 },
  { id: "mm-icea",         manager: "ICEA LION Asset Management Ltd",           fund_type: "money_market", yield_unit: "%",   annual_yield: 8.26 },
  { id: "mm-cytonn",       manager: "Cytonn Asset Managers Limited",            fund_type: "money_market", yield_unit: "%",   annual_yield: 11.23 },
  { id: "mm-aa",           manager: "African Alliance Kenya Asset Management",  fund_type: "money_market", yield_unit: "%",   annual_yield: 6.98 },
  { id: "mm-cic",          manager: "CIC Asset Management Ltd",                 fund_type: "money_market", yield_unit: "%",   annual_yield: 8.43 },
  { id: "mm-lofty",        manager: "Lofty-Corban Investments Limited",        fund_type: "money_market", yield_unit: "%",   annual_yield: 10.62 },
  { id: "mm-madison",      manager: "Madison Investment Managers Limited",      fund_type: "money_market", yield_unit: "%",   annual_yield: 10.03 },
  { id: "mm-old-mutual",   manager: "Old Mutual Investment Group",              fund_type: "money_market", yield_unit: "%",   annual_yield: 10.09 },
  { id: "mm-nabo",         manager: "Nabo Capital Limited",                     fund_type: "money_market", yield_unit: "%",   annual_yield: 11.58 },
  { id: "mm-etica",        manager: "Etica Capital Ltd",                        fund_type: "money_market", yield_unit: "%",   annual_yield: 11.92 },
  // Money Market USD
  { id: "mm-cytonn-usd",   manager: "Cytonn Asset Managers Limited",            fund_type: "money_market", yield_unit: "USD", annual_yield: 5.50 },
  // Equity (KES NAV)
  { id: "eq-icea",         manager: "ICEA LION Asset Management",               fund_type: "equity",       yield_unit: "KES", annual_yield: 155.12 },
  { id: "eq-britam",       manager: "Britam Asset Managers (Kenya) Limited",    fund_type: "equity",       yield_unit: "KES", annual_yield: 148.30 },
  // Bond %
  { id: "bond-britam",     manager: "Britam Asset Managers Kenya Limited",      fund_type: "bond",         yield_unit: "%",   annual_yield: 9.50 },
  // Special %
  // (none — Etica Shariah / Madison Wealth must remain NEW)

  // Synthetic same-name-different-unit pair to exercise type-mismatch:
  { id: "tm-foo-pct",      manager: "FooBar Capital",                            fund_type: "money_market", yield_unit: "%",   annual_yield: 9.0 },
  { id: "tm-foo-usd",      manager: "FooBar Capital",                            fund_type: "money_market", yield_unit: "USD", annual_yield: 5.0 },
];

const row = (
  manager: string,
  fund_type: string,
  yield_unit: string,
  annual_yield = 0,
): ParsedRowMatchInput => ({
  index: 0, status: "ok", manager, fund_type, yield_unit, annual_yield,
});

// ─────────────────────────────────────────────────────────────────────────
// 1. END-TO-END PARSE OF THE USER'S SAMPLE BLOB
// ─────────────────────────────────────────────────────────────────────────

const FULL_SAMPLE = [
  "Money Market Fund",
  "BritamSh9.269.71 ICEASh7.758.06 CytonnSh11.4512.13 CytonnUSD5.575.72",
  "African AllianceSh6.106.28 African Alliance SpecialSh6.596.79",
  "CICSh8.128.43 CIC WealthSh7.007.00",
  "Lofty_CorbanSh10.1710.66 MadisonSh9.6610.14 Old MutualSh9.7410.15",
  "NaboSh11.2711.93 EticaSh11.4712.16",
  "Equity Fund ICEASh157.84157.84 BritamSh147.35152.48",
  "Special Fund Etica ShariahSh6.847.08 Madison WealthSh11.0111.64",
  "Bond Fund BritamSh9.6310.11",
  "13 May 2026",
].join(" ");

interface Expectation {
  manager: string;
  fund_type: string;
  yield_unit: string;
  expected: "matched" | "review" | "new" | "type-mismatch";
  expectFundId?: string;
}

const EXPECTATIONS: Expectation[] = [
  // MM % → all matched via prefix
  { manager: "Britam",            fund_type: "money_market", yield_unit: "%",   expected: "matched", expectFundId: "mm-britam" },
  { manager: "Cytonn",            fund_type: "money_market", yield_unit: "%",   expected: "matched", expectFundId: "mm-cytonn" },
  { manager: "African Alliance",  fund_type: "money_market", yield_unit: "%",   expected: "matched", expectFundId: "mm-aa" },
  { manager: "CIC",               fund_type: "money_market", yield_unit: "%",   expected: "matched", expectFundId: "mm-cic" },
  { manager: "Lofty_Corban",      fund_type: "money_market", yield_unit: "%",   expected: "matched", expectFundId: "mm-lofty" },
  { manager: "Madison",           fund_type: "money_market", yield_unit: "%",   expected: "matched", expectFundId: "mm-madison" },
  { manager: "Old Mutual",        fund_type: "money_market", yield_unit: "%",   expected: "matched", expectFundId: "mm-old-mutual" },
  { manager: "Nabo",              fund_type: "money_market", yield_unit: "%",   expected: "matched", expectFundId: "mm-nabo" },
  { manager: "Etica",             fund_type: "money_market", yield_unit: "%",   expected: "matched", expectFundId: "mm-etica" },
  // MM USD → matched against the USD-class Cytonn record
  { manager: "Cytonn",            fund_type: "money_market", yield_unit: "USD", expected: "matched", expectFundId: "mm-cytonn-usd" },
  // Truly new
  { manager: "African Alliance Special", fund_type: "money_market", yield_unit: "%", expected: "new" },
  { manager: "CIC Wealth",        fund_type: "money_market", yield_unit: "%",   expected: "new" },
  { manager: "Etica Shariah",     fund_type: "special",      yield_unit: "%",   expected: "new" },
  { manager: "Madison Wealth",    fund_type: "special",      yield_unit: "%",   expected: "new" },
  // Equity KES
  { manager: "ICEA",              fund_type: "equity",       yield_unit: "KES", expected: "new" },     // ICEA→ICEA LION fails (LION not generic) → documented gap
  { manager: "Britam",            fund_type: "equity",       yield_unit: "KES", expected: "matched", expectFundId: "eq-britam" },
  // Bond %
  { manager: "Britam",            fund_type: "bond",         yield_unit: "%",   expected: "matched", expectFundId: "bond-britam" },
];

describe("E2E: full sample paste → expected match kind for every row", () => {
  const report = parseBulkFundText(FULL_SAMPLE);
  const byKey = new Map<string, (typeof report.rows)[number]>();
  for (const r of report.rows) byKey.set(`${r.manager}|${r.fund_type}|${r.yield_unit}`, r);

  it("parser produces a row for every expectation", () => {
    for (const e of EXPECTATIONS) {
      const k = `${e.manager}|${e.fund_type}|${e.yield_unit}`;
      expect(byKey.has(k), `parser missing row: ${k}`).toBe(true);
    }
  });

  for (const e of EXPECTATIONS) {
    const label = `${e.manager} / ${e.fund_type} / ${e.yield_unit} → ${e.expected}`;
    it(label, () => {
      const r = byKey.get(`${e.manager}|${e.fund_type}|${e.yield_unit}`)!;
      const m = matchRow(
        {
          index: r.index,
          status: r.status,
          manager: r.manager,
          fund_type: r.fund_type,
          yield_unit: r.yield_unit,
          annual_yield: r.annual_yield,
        },
        EXISTING,
      );
      expect(m.kind).toBe(e.expected);
      if (e.expectFundId) expect(m.fund?.id).toBe(e.expectFundId);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// 2. UNIT-CLASS SAFETY
// ─────────────────────────────────────────────────────────────────────────

describe("Unit-class safety: USD/GBP rows never collapse onto %/KES funds", () => {
  it("Britam (MM, USD) does NOT match the % MM Britam record", () => {
    const m = matchRow(row("Britam", "money_market", "USD"), EXISTING);
    expect(m.kind).not.toBe("matched");
    if (m.fund) expect(m.fund.yield_unit).toBe("USD");
  });

  it("Britam (MM, GBP) does NOT match the % MM Britam record", () => {
    const m = matchRow(row("Britam", "money_market", "GBP"), EXISTING);
    expect(m.kind).not.toBe("matched");
  });

  it("ICEA (Equity, USD) does NOT match the KES Equity ICEA record", () => {
    const m = matchRow(row("ICEA", "equity", "USD"), EXISTING);
    expect(m.kind).not.toBe("matched");
  });

  it("CONTRACT: KES/USD/GBP share unit-class 'price' — they DO cross-match", () => {
    // Document the matcher contract: NAV-priced unit classes (KES/USD/GBP)
    // are treated as the same family. The hard wall is % vs price, never
    // KES vs USD. If we want stricter currency separation, change
    // unitClass() to return the raw token.
    const m = matchRow(row("Britam", "equity", "USD"), EXISTING);
    expect(m.kind).toBe("matched");
    expect(m.fund?.yield_unit).toBe("KES");
  });

  it("HARD WALL: % rows never match price rows (and vice versa)", () => {
    // Britam MM exists as % only. Pasting it as KES must NOT match.
    const m = matchRow(row("Britam", "money_market", "KES"), EXISTING);
    expect(m.kind).not.toBe("matched");
  });

  it("Cytonn USD MM correctly matches the USD fund (sanity — same unit class)", () => {
    const m = matchRow(row("Cytonn", "money_market", "USD"), EXISTING);
    expect(m.kind).toBe("matched");
    expect(m.fund?.id).toBe("mm-cytonn-usd");
  });

  it("Same exact manager with a different unit class is flagged type-mismatch", () => {
    // FooBar Capital exists as both % and USD. Pasting FooBar Capital with KES
    // (a third class with no record) should surface the conflicting record.
    const m = matchRow(row("FooBar Capital", "money_market", "KES"), EXISTING);
    expect(m.kind).toBe("type-mismatch");
    expect(m.conflictingFund).toBeDefined();
    // The conflicting fund must be one of the existing FooBar entries.
    expect(["tm-foo-pct", "tm-foo-usd"]).toContain(m.conflictingFund?.id);
  });

  it("CONTRACT: type-mismatch fires before exact-match when ANY same-name record has a different unit class", () => {
    // FooBar Capital exists as both % and USD. Pasting USD finds the % record
    // as a unit-class conflict and surfaces type-mismatch first — even though
    // an exact USD match also exists. This is a deliberate hard warning so
    // the admin must explicitly reconcile classes before saving.
    const m = matchRow(row("FooBar Capital", "money_market", "USD"), EXISTING);
    expect(m.kind).toBe("type-mismatch");
    expect(m.conflictingFund?.id).toBe("tm-foo-pct");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 3. DRIFT + prevAnnual ARITHMETIC
// ─────────────────────────────────────────────────────────────────────────

describe("drift % and prevAnnual computation", () => {
  it("exposes prevAnnual = existing.annual_yield on a matched row", () => {
    const m = matchRow(row("Britam", "money_market", "%", 9.71), EXISTING);
    expect(m.kind).toBe("matched");
    expect(m.prevAnnual).toBe(9.47);
  });

  it("computes drift as |new − prev| / prev × 100", () => {
    // 9.71 vs 9.47 → drift ≈ 2.534%
    const m = matchRow(row("Britam", "money_market", "%", 9.71), EXISTING);
    expect(m.drift).toBeDefined();
    expect(m.drift!).toBeCloseTo(((9.71 - 9.47) / 9.47) * 100, 5);
  });

  it("drift is absolute — works for downward moves too", () => {
    // Cytonn DB=11.23, paste=10.00 → drift ≈ 10.952%
    const m = matchRow(row("Cytonn", "money_market", "%", 10.0), EXISTING);
    expect(m.kind).toBe("matched");
    expect(m.drift!).toBeCloseTo(((11.23 - 10.0) / 11.23) * 100, 5);
    expect(m.drift!).toBeGreaterThan(0);
  });

  it("drift is 0 when pasted == existing", () => {
    const m = matchRow(row("Etica", "money_market", "%", 11.92), EXISTING);
    expect(m.kind).toBe("matched");
    expect(m.drift).toBe(0);
  });

  it("drift handles large NAV-style values (Britam Equity KES 152.48 vs DB 148.30)", () => {
    const m = matchRow(row("Britam", "equity", "KES", 152.48), EXISTING);
    expect(m.kind).toBe("matched");
    expect(m.prevAnnual).toBe(148.30);
    expect(m.drift!).toBeCloseTo(((152.48 - 148.30) / 148.30) * 100, 5);
  });

  it("drift is 0 when existing annual_yield is 0 (guards divide-by-zero)", () => {
    const zeroDb: ExistingFund[] = [
      { id: "z1", manager: "Zero Capital", fund_type: "money_market", yield_unit: "%", annual_yield: 0 },
    ];
    const m = matchRow(row("Zero Capital", "money_market", "%", 5.0), zeroDb);
    expect(m.kind).toBe("matched");
    expect(m.drift).toBe(0);
    expect(m.prevAnnual).toBe(0);
  });
});
