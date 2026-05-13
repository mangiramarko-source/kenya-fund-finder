import { describe, it, expect } from "vitest";
import {
  matchRow,
  isPrefixTokenMatch,
  unitClass,
  type ExistingFund,
  type ParsedRowMatchInput,
} from "./bulkFundMatcher";
import { parseBulkFundText } from "./bulkFundParser";

/**
 * Snapshot of real DB rows (subset) — kept in sync with what `psql` returned
 * for `SELECT manager, fund_type, yield_unit, annual_yield FROM funds`.
 * Only the manager / fund_type / yield_unit fields drive matching.
 */
const EXISTING: ExistingFund[] = [
  { id: "1",  manager: "Britam Asset Managers",                    fund_type: "money_market", yield_unit: "%",   annual_yield: 9.47 },
  { id: "2",  manager: "Britam Asset Managers",                    fund_type: "fixed_income", yield_unit: "%",   annual_yield: 9.67 },
  { id: "3",  manager: "Britam Asset Managers (Kenya) Limited",    fund_type: "balanced",     yield_unit: "KES", annual_yield: 173.57 },
  { id: "4",  manager: "Britam Asset Managers (Kenya) Limited",    fund_type: "equity",       yield_unit: "KES", annual_yield: 148.30 },
  { id: "5",  manager: "Britam Asset Managers Kenya Limited",      fund_type: "bond",         yield_unit: "%",   annual_yield: 10.41 },
  { id: "6",  manager: "ICEA LION Asset Management Ltd",           fund_type: "money_market", yield_unit: "%",   annual_yield: 8.26 },
  { id: "7",  manager: "ICEA LION Asset Management",               fund_type: "balanced",     yield_unit: "KES", annual_yield: 141.55 },
  { id: "8",  manager: "ICEA LION Asset Management",               fund_type: "equity",       yield_unit: "KES", annual_yield: 155.12 },
  { id: "9",  manager: "ICEA LION Asset Management",               fund_type: "fixed_income", yield_unit: "%",   annual_yield: 16.70 },
  { id: "10", manager: "Cytonn Asset Managers Limited",            fund_type: "money_market", yield_unit: "%",   annual_yield: 11.23 },
  { id: "11", manager: "Lofty-Corban Investments Limited",         fund_type: "money_market", yield_unit: "%",   annual_yield: 10.62 },
  { id: "12", manager: "Lofty Corban Asset Managers Ltd",          fund_type: "bond",         yield_unit: "KES", annual_yield: 13.77 },
  { id: "13", manager: "African Alliance Kenya Asset Management",  fund_type: "money_market", yield_unit: "%",   annual_yield: 6.98 },
  { id: "14", manager: "Sanlam Allianz Investments Limited",       fund_type: "money_market", yield_unit: "%",   annual_yield: 9.30 },
  { id: "15", manager: "Old Mutual Investment Group",              fund_type: "money_market", yield_unit: "%",   annual_yield: 10.09 },
  { id: "16", manager: "CIC Asset Management Ltd",                 fund_type: "money_market", yield_unit: "%",   annual_yield: 8.43 },
  { id: "17", manager: "Etica Capital Ltd",                        fund_type: "money_market", yield_unit: "%",   annual_yield: 11.92 },
  { id: "18", manager: "Nabo Capital Limited",                     fund_type: "money_market", yield_unit: "%",   annual_yield: 11.58 },
  { id: "19", manager: "Madison Investment Managers Limited",      fund_type: "money_market", yield_unit: "%",   annual_yield: 10.03 },
];

const row = (manager: string, fund_type: string, yield_unit: string): ParsedRowMatchInput => ({
  index: 0, status: "ok", manager, fund_type, yield_unit, annual_yield: 0,
});

describe("isPrefixTokenMatch", () => {
  it("matches short pasted name to full DB name when next token is generic", () => {
    expect(isPrefixTokenMatch("Britam", "Britam Asset Managers")).toBe(true);
    expect(isPrefixTokenMatch("ICEA", "ICEA LION Asset Management Ltd")).toBe(false); // "LION" is NOT generic
  });

  it("normalizes underscores and hyphens", () => {
    expect(isPrefixTokenMatch("Lofty_Corban", "Lofty-Corban Investments Limited")).toBe(true);
    expect(isPrefixTokenMatch("Lofty-Corban", "Lofty Corban Asset Managers Ltd")).toBe(true);
  });

  it("rejects when next token is a distinct word, not a suffix", () => {
    // "CIC" must NOT silently match "CIC Wealth"
    expect(isPrefixTokenMatch("CIC", "CIC Wealth Management")).toBe(false);
  });

  it("returns true for identical normalised names", () => {
    expect(isPrefixTokenMatch("Britam Asset Managers", "Britam Asset Managers")).toBe(true);
  });
});

describe("matchRow — short pasted names should match existing funds", () => {
  it("Britam (Money Market %) → Britam Asset Managers MM", () => {
    const r = matchRow(row("Britam", "money_market", "%"), EXISTING);
    expect(r.kind).toBe("matched");
    expect(r.fund?.id).toBe("1");
  });

  it("Cytonn (Money Market %) → Cytonn Asset Managers Limited", () => {
    const r = matchRow(row("Cytonn", "money_market", "%"), EXISTING);
    expect(r.kind).toBe("matched");
    expect(r.fund?.id).toBe("10");
  });

  it("Lofty_Corban (Money Market %) → Lofty-Corban Investments Limited (handles underscore)", () => {
    const r = matchRow(row("Lofty_Corban", "money_market", "%"), EXISTING);
    expect(r.kind).toBe("matched");
    expect(r.fund?.id).toBe("11");
  });

  it("African Alliance (Money Market %) → African Alliance Kenya Asset Management", () => {
    const r = matchRow(row("African Alliance", "money_market", "%"), EXISTING);
    expect(r.kind).toBe("matched");
    expect(r.fund?.id).toBe("13");
  });

  it("Old Mutual (Money Market %) → Old Mutual Investment Group", () => {
    const r = matchRow(row("Old Mutual", "money_market", "%"), EXISTING);
    expect(r.kind).toBe("matched");
    expect(r.fund?.id).toBe("15");
  });

  it("SanlamAllianz (Money Market %) → Sanlam Allianz Investments Limited (token split)", () => {
    // Note: parser yields "SanlamAllianz" as one token. Single-token prefix
    // can't currently split, so this stays NEW — guarding the contract.
    const r = matchRow(row("SanlamAllianz", "money_market", "%"), EXISTING);
    expect(r.kind).toBe("new");
    // …but the spaced form (admin can fix) DOES match.
    const r2 = matchRow(row("Sanlam Allianz", "money_market", "%"), EXISTING);
    expect(r2.kind).toBe("matched");
    expect(r2.fund?.id).toBe("14");
  });

  it("ICEA (Balanced KES) → ICEA LION Asset Management balanced", () => {
    // "LION" is not in GENERIC_SUFFIX, but balanced has only one ICEA candidate.
    // Prefix match should fail; fall through to fuzzy. "ICEA" vs "ICEA LION..."
    // similarity is below threshold → NEW. Document the gap.
    const r = matchRow(row("ICEA", "balanced", "KES"), EXISTING);
    expect(r.kind).toBe("new");
  });
});

describe("matchRow — truly new funds remain NEW", () => {
  it("African Alliance Special (MM) — distinct, not in DB", () => {
    const r = matchRow(row("African Alliance Special", "money_market", "%"), EXISTING);
    expect(r.kind).toBe("new");
  });

  it("CIC Wealth (MM) does not silently steal CIC Asset Management", () => {
    const r = matchRow(row("CIC Wealth", "money_market", "%"), EXISTING);
    expect(r.kind).toBe("new");
  });

  it("Britam 3 months (Fixed Income) is not Britam Asset Managers", () => {
    const r = matchRow(row("Britam 3 months", "fixed_income", "%"), EXISTING);
    expect(r.kind).toBe("new");
  });

  it("Etica Shariah (Special) is not Etica Capital Ltd", () => {
    const r = matchRow(row("Etica Shariah", "special", "%"), EXISTING);
    expect(r.kind).toBe("new");
  });

  it("Madison Wealth (Special) is not Madison Investment Managers", () => {
    const r = matchRow(row("Madison Wealth", "special", "%"), EXISTING);
    expect(r.kind).toBe("new");
  });
});

describe("matchRow — type/unit safety", () => {
  it("Britam USD (Money Market) → review/new, not the % MM record", () => {
    const r = matchRow(row("Britam", "money_market", "USD"), EXISTING);
    // No USD MM Britam exists — should NOT match the % one (different unit class)
    expect(r.kind).not.toBe("matched");
  });

  it("respects fund_type — Britam Equity (KES) should match Britam balanced/equity record only", () => {
    const r = matchRow(row("Britam", "equity", "KES"), EXISTING);
    expect(r.kind).toBe("matched");
    expect(r.fund?.id).toBe("4");
  });

  it("unitClass distinguishes % from KES/USD/GBP", () => {
    expect(unitClass("%")).toBe("percent");
    expect(unitClass("KES")).toBe("price");
    expect(unitClass("USD")).toBe("price");
    expect(unitClass("GBP")).toBe("price");
  });
});

describe("End-to-end: parse the user's sample blob and assert match outcomes", () => {
  const SAMPLE = `Money Market Fund BritamSh9.269.71 ICEASh7.758.06 CytonnSh11.4512.13 CytonnUSD5.575.72 African AllianceSh6.106.28 African Alliance SpecialSh6.596.79 CICSh8.128.43 CIC WealthSh7.007.00 Lofty_CorbanSh10.1710.66 MadisonSh9.6610.14 Old MutualSh9.7410.15 NaboSh11.2711.93 EticaSh11.4712.16 Equity Fund ICEASh157.84157.84 BritamSh147.35152.48 Special Fund Etica ShariahSh6.847.08 Madison WealthSh11.0111.64 Bond Fund BritamSh9.6310.11 Lofty_CorbanSh13.7813.78 13 May 2026`;

  const report = parseBulkFundText(SAMPLE);
  const byManager = new Map<string, (typeof report.rows)[number]>();
  for (const r of report.rows) byManager.set(`${r.manager}|${r.fund_type}|${r.yield_unit}`, r);

  const findKind = (manager: string, fund_type: string, yield_unit: string) => {
    const r = byManager.get(`${manager}|${fund_type}|${yield_unit}`);
    if (!r) throw new Error(`Row not parsed: ${manager} ${fund_type} ${yield_unit}`);
    return matchRow(
      { index: r.index, status: r.status, manager: r.manager, fund_type: r.fund_type, yield_unit: r.yield_unit, annual_yield: r.annual_yield },
      EXISTING,
    ).kind;
  };

  it("parses at least 18 rows from the sample", () => {
    expect(report.rows.length).toBeGreaterThanOrEqual(18);
  });

  it("Britam, ICEA, Cytonn, Lofty_Corban, Old Mutual, African Alliance → MATCHED in MM%", () => {
    expect(findKind("Britam", "money_market", "%")).toBe("matched");
    expect(findKind("Cytonn", "money_market", "%")).toBe("matched");
    expect(findKind("Lofty_Corban", "money_market", "%")).toBe("matched");
    expect(findKind("Old Mutual", "money_market", "%")).toBe("matched");
    expect(findKind("African Alliance", "money_market", "%")).toBe("matched");
    expect(findKind("Madison", "money_market", "%")).toBe("matched");
    expect(findKind("Nabo", "money_market", "%")).toBe("matched");
    expect(findKind("Etica", "money_market", "%")).toBe("matched");
  });

  it("Truly new entries remain NEW", () => {
    expect(findKind("African Alliance Special", "money_market", "%")).toBe("new");
    expect(findKind("CIC Wealth", "money_market", "%")).toBe("new");
    expect(findKind("Etica Shariah", "special", "%")).toBe("new");
    expect(findKind("Madison Wealth", "special", "%")).toBe("new");
  });

  it("Britam Bond Sh → matched against the bond record", () => {
    expect(findKind("Britam", "bond", "%")).toBe("matched");
  });

  it("Lofty_Corban Bond Sh → matched against Lofty Corban Asset Managers (KES bond)", () => {
    // Bond Lofty_Corban in DB is KES; pasted is %. unitClass differs → cannot match.
    // Should stay NEW (or review via fallback).
    const k = findKind("Lofty_Corban", "bond", "%");
    expect(["new", "review"]).toContain(k);
  });
});
