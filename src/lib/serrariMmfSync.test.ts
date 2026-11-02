import { describe, expect, it } from "vitest";
import {
  SERRARI_MMF_SNAPSHOT_2026_11_02,
  applySerrariSnapshotToFunds,
  deriveDailyYieldFromEar,
  formatSerrariForSimplePaste,
  hasSerrariMmfChanged,
  normalizeToWeekdayIsoDate,
  parseSerrariAsOfDate,
  parseSerrariMmfMarkdown,
} from "./serrariMmfSync";
import { parseSimplePaste } from "./simpleUnitTrustPaste";
import { FALLBACK_KENYAN_FUNDS } from "./fundDataFallback";

const SAMPLE_KES_MARKDOWN = `
## Money Market Funds in Kenya (MMF): Compare All 27 Funds
Updated 2 November 2026
|  |  |  |  |  |  |  |  |  | News | Watch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | [Faulu](https://serrarigroup.com/companies/faulu) | 10.82% | — (Unchanged since 1 November) | 1K KES 1K | Faulu Money Market Fund[CMA](https://licensees.cma.or.ke/licenses/15/) | 2.00% | 9.20% | 299M KES 299M |  |  |
| 11 | [GenAfrica](https://serrarigroup.com/companies/genafrica) | 9.91% | ▼ 0.10 | 500K KES 500K | GenAfrica Money Market Fund[CMA](https://licensees.cma.or.ke/licenses/15/) | 2.00% | 8.42% | 4.7B KES 4.7B |  |  |
| 18 | APA | 8.16% | — | 1K KES 1K | Apollo Money Market Fund[CMA](https://licensees.cma.or.ke/licenses/15/) | 2.00% | 6.94% | 4.1B KES 4.1B |  |  |
| 20 | Safaricom | 7.03% | ▼ 0.02 | 100 KES 100 | Ziidi Money Market Fund[CMA](https://licensees.cma.or.ke/licenses/15/) | 2.00% | 5.98% | 2.3B KES 2.3B |  |  |
| 22 | [Cytonn](https://serrarigroup.com/companies/cytonn) | 11.11% | — | 1K KES 1K | Cytonn Money Market Fund[CMA](https://licensees.cma.or.ke/licenses/15/) | 2.00% | 9.44% | 2.1B KES 2.1B |  |  |
`;

const SAMPLE_USD_MARKDOWN = `
# USD Money Market Funds Kenya — 13 Dollar Funds, Daily Yields
Updated 2 November 2026
| ##↑ | Company | Yield | Chg | Min | Fund | Fee | Net | AUM | News | Watch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | [Nabo](https://serrarigroup.com/companies/nabo) | 5.58% | — | 1K USD 1K | Nabo Africa Money Market Fund (USD) | 2.50% | 4.74% | 5.10M USD 5.10M |  |  |
| 5 | [Lofty Corban](https://serrarigroup.com/companies/lofty-corban) | 5.10% | — | 100 USD 100 | Lofty Corban Money Market Fund (USD) | 0.20% | 4.34% | 1.50M USD 1.50M |  |  |
`;

describe("serrariMmfSync", () => {
  it("derives nominal daily_yield from Effective Annual Rate (EAR) via daily compounding", () => {
    expect(deriveDailyYieldFromEar(11.11)).toBe(10.54);
    expect(deriveDailyYieldFromEar(10.82)).toBe(10.28);
    expect(deriveDailyYieldFromEar(9.19)).toBe(8.79);
    expect(deriveDailyYieldFromEar(5.58)).toBe(5.43);
  });

  it("parses Serrari KES and USD markdown tables and maps to canonical slugs", () => {
    const kes = parseSerrariMmfMarkdown(SAMPLE_KES_MARKDOWN, "KES");
    expect(kes).toHaveLength(5);
    expect(kes[0]).toMatchObject({
      slug: "cytonn-sh-mmf",
      annual_yield: 11.11,
      daily_yield: 10.54,
      net_yield: 9.44,
      management_fee: 2.0,
      minimum_investment: 1000,
      asOfDate: "2026-11-02",
    });
    expect(kes.find((r) => r.slug === "genafrica-sh-mmf")?.minimum_investment).toBe(500000);
    expect(kes.find((r) => r.slug === "apollo-sh-mmf")?.annual_yield).toBe(8.16);
    expect(kes.find((r) => r.slug === "ziidi-money-market-fund")?.minimum_investment).toBe(100);

    const usd = parseSerrariMmfMarkdown(SAMPLE_USD_MARKDOWN, "USD");
    expect(usd).toHaveLength(2);
    expect(usd[0]).toMatchObject({
      slug: "nabo-usd-mmf",
      annual_yield: 5.58,
      daily_yield: 5.43,
      yield_unit: "USD",
      minimum_investment: 130000,
    });
  });

  it("contains all 27 KES MMFs and 13 USD MMFs (40 total) in the 2026-11-02 snapshot", () => {
    const kesCount = SERRARI_MMF_SNAPSHOT_2026_11_02.filter((r) => r.currency === "KES").length;
    const usdCount = SERRARI_MMF_SNAPSHOT_2026_11_02.filter((r) => r.currency === "USD").length;
    expect(kesCount).toBe(27);
    expect(usdCount).toBe(13);
    expect(SERRARI_MMF_SNAPSHOT_2026_11_02).toHaveLength(40);
  });

  it("formats rows into SimpleUnitTrustPaste format that parses with 0 errors", () => {
    const updatedFunds = applySerrariSnapshotToFunds(FALLBACK_KENYAN_FUNDS);
    const kesRows = parseSerrariMmfMarkdown(SAMPLE_KES_MARKDOWN, "KES");
    const pasteText = formatSerrariForSimplePaste(kesRows);
    const parsed = parseSimplePaste(pasteText, updatedFunds);
    expect(parsed.blockedCount).toBe(0);
    expect(parsed.okCount).toBe(5);
  });

  it("snaps weekend dates (Sat/Sun) back to Friday so MMF update dates reflect Mon-Fri schedule", () => {
    expect(normalizeToWeekdayIsoDate("2026-10-31")).toBe("2026-10-30"); // Saturday -> Friday
    expect(normalizeToWeekdayIsoDate("2026-11-01")).toBe("2026-10-30"); // Sunday -> Friday
    expect(normalizeToWeekdayIsoDate("2026-11-02")).toBe("2026-11-02"); // Monday -> Monday
    expect(parseSerrariAsOfDate("Updated 1 November 2026")).toBe("2026-10-30");
    expect(parseSerrariAsOfDate("Updated 2 November 2026")).toBe("2026-11-02");
  });

  it("only updates fund records and fact_sheet_date when data actually changes", () => {
    const cytonnSnapshot = SERRARI_MMF_SNAPSHOT_2026_11_02.find((r) => r.slug === "cytonn-sh-mmf")!;
    expect(
      hasSerrariMmfChanged(
        {
          annual_yield: cytonnSnapshot.annual_yield,
          daily_yield: cytonnSnapshot.daily_yield,
          management_fee: cytonnSnapshot.management_fee,
          minimum_investment: cytonnSnapshot.minimum_investment,
          yield_unit: cytonnSnapshot.yield_unit,
        },
        cytonnSnapshot,
      ),
    ).toBe(false);

    expect(
      hasSerrariMmfChanged(
        {
          annual_yield: cytonnSnapshot.annual_yield + 0.05,
          daily_yield: cytonnSnapshot.daily_yield,
          management_fee: cytonnSnapshot.management_fee,
          minimum_investment: cytonnSnapshot.minimum_investment,
          yield_unit: cytonnSnapshot.yield_unit,
        },
        cytonnSnapshot,
      ),
    ).toBe(true);

    // Re-applying the same snapshot with a newer date must NOT bump fact_sheet_date on unchanged funds
    const firstPass = applySerrariSnapshotToFunds(FALLBACK_KENYAN_FUNDS, "2026-11-02");
    const secondPass = applySerrariSnapshotToFunds(firstPass, "2026-11-03");
    const cytonnAfterSecondPass = secondPass.find((f) => f.slug === "cytonn-sh-mmf")!;
    expect(cytonnAfterSecondPass.fact_sheet_date).toBe("2026-11-02");
  });
});
