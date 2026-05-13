/**
 * Shared fixtures for bulk-fund parser + matcher tests.
 *
 * Single source of truth for:
 *   - FULL_SAMPLE_PASTE: representative scrape text from Business Daily UT table
 *   - EXISTING_FUNDS:    DB snapshot used by the matcher
 *   - EXPECTATIONS:      per-row expected (kind, fund_id, drift)
 *
 * Any test that needs sample input MUST import from here so changes are
 * detected in exactly one place.
 */

import type { ExistingFund } from "@/lib/bulkFundMatcher";

export const FULL_SAMPLE_PASTE = [
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

export const EXISTING_FUNDS: ExistingFund[] = [
  // Money Market %
  { id: "mm-britam",     manager: "Britam Asset Managers",                   fund_type: "money_market", yield_unit: "%",   annual_yield: 9.47 },
  { id: "mm-icea",       manager: "ICEA LION Asset Management Ltd",          fund_type: "money_market", yield_unit: "%",   annual_yield: 8.26 },
  { id: "mm-cytonn",     manager: "Cytonn Asset Managers Limited",           fund_type: "money_market", yield_unit: "%",   annual_yield: 11.23 },
  { id: "mm-aa",         manager: "African Alliance Kenya Asset Management", fund_type: "money_market", yield_unit: "%",   annual_yield: 6.98 },
  { id: "mm-cic",        manager: "CIC Asset Management Ltd",                fund_type: "money_market", yield_unit: "%",   annual_yield: 8.43 },
  { id: "mm-lofty",      manager: "Lofty-Corban Investments Limited",        fund_type: "money_market", yield_unit: "%",   annual_yield: 10.62 },
  { id: "mm-madison",    manager: "Madison Investment Managers Limited",     fund_type: "money_market", yield_unit: "%",   annual_yield: 10.03 },
  { id: "mm-old-mutual", manager: "Old Mutual Investment Group",             fund_type: "money_market", yield_unit: "%",   annual_yield: 10.09 },
  { id: "mm-nabo",       manager: "Nabo Capital Limited",                    fund_type: "money_market", yield_unit: "%",   annual_yield: 11.58 },
  { id: "mm-etica",      manager: "Etica Capital Ltd",                       fund_type: "money_market", yield_unit: "%",   annual_yield: 11.92 },
  // Money Market USD
  { id: "mm-cytonn-usd", manager: "Cytonn Asset Managers Limited",           fund_type: "money_market", yield_unit: "USD", annual_yield: 5.50 },
  // Equity (KES NAV)
  { id: "eq-icea",       manager: "ICEA LION Asset Management",              fund_type: "equity",       yield_unit: "KES", annual_yield: 155.12 },
  { id: "eq-britam",     manager: "Britam Asset Managers (Kenya) Limited",   fund_type: "equity",       yield_unit: "KES", annual_yield: 148.30 },
  // Bond %
  { id: "bond-britam",   manager: "Britam Asset Managers Kenya Limited",     fund_type: "bond",         yield_unit: "%",   annual_yield: 9.50 },

  // Synthetic same-name-different-unit pair to exercise type-mismatch.
  { id: "tm-foo-pct",    manager: "FooBar Capital",                          fund_type: "money_market", yield_unit: "%",   annual_yield: 9.0 },
  { id: "tm-foo-usd",    manager: "FooBar Capital",                          fund_type: "money_market", yield_unit: "USD", annual_yield: 5.0 },
];

export interface RowExpectation {
  manager: string;
  fund_type: string;
  yield_unit: string;
  expected: "matched" | "review" | "new" | "type-mismatch";
  expectFundId?: string;
}

export const EXPECTATIONS: RowExpectation[] = [
  { manager: "Britam",                   fund_type: "money_market", yield_unit: "%",   expected: "matched",     expectFundId: "mm-britam" },
  { manager: "Cytonn",                   fund_type: "money_market", yield_unit: "%",   expected: "matched",     expectFundId: "mm-cytonn" },
  { manager: "African Alliance",         fund_type: "money_market", yield_unit: "%",   expected: "matched",     expectFundId: "mm-aa" },
  { manager: "CIC",                      fund_type: "money_market", yield_unit: "%",   expected: "matched",     expectFundId: "mm-cic" },
  { manager: "Lofty_Corban",             fund_type: "money_market", yield_unit: "%",   expected: "matched",     expectFundId: "mm-lofty" },
  { manager: "Madison",                  fund_type: "money_market", yield_unit: "%",   expected: "matched",     expectFundId: "mm-madison" },
  { manager: "Old Mutual",               fund_type: "money_market", yield_unit: "%",   expected: "matched",     expectFundId: "mm-old-mutual" },
  { manager: "Nabo",                     fund_type: "money_market", yield_unit: "%",   expected: "matched",     expectFundId: "mm-nabo" },
  { manager: "Etica",                    fund_type: "money_market", yield_unit: "%",   expected: "matched",     expectFundId: "mm-etica" },
  { manager: "Cytonn",                   fund_type: "money_market", yield_unit: "USD", expected: "matched",     expectFundId: "mm-cytonn-usd" },
  { manager: "African Alliance Special", fund_type: "money_market", yield_unit: "%",   expected: "new" },
  { manager: "CIC Wealth",               fund_type: "money_market", yield_unit: "%",   expected: "new" },
  { manager: "Etica Shariah",            fund_type: "special",      yield_unit: "%",   expected: "new" },
  { manager: "Madison Wealth",           fund_type: "special",      yield_unit: "%",   expected: "new" },
  { manager: "ICEA",                     fund_type: "equity",       yield_unit: "KES", expected: "new" },
  { manager: "Britam",                   fund_type: "equity",       yield_unit: "KES", expected: "matched",     expectFundId: "eq-britam" },
  { manager: "Britam",                   fund_type: "bond",         yield_unit: "%",   expected: "matched",     expectFundId: "bond-britam" },
];
