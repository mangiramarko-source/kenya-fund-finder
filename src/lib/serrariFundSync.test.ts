import { describe, expect, it } from "vitest";
import {
  deriveDailyYieldFromEar,
  hasFundChanged,
  normalizeToWeekdayIsoDate,
  parseSerrariAsOfDate,
  parseSerrariFee,
  parseSerrariMmfMarkdown,
  parseSerrariMinimum,
  parseSerrariUtMarkdown,
} from "./serrariFundSync";

const SAMPLE_KES_MMF = `
## Money Market Funds in Kenya (MMF): Compare All 27 Funds
Updated 4 November 2026
|  |  |  |  |  |  |  |  |  | News | Watch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | [Faulu](https://serrarigroup.com/companies/faulu) | 10.82% | — | 1K KES 1K | Faulu Money Market Fund | 2.00% | 9.20% | 299M KES 299M |  |  |
| 25 | [Cytonn](https://serrarigroup.com/companies/cytonn) | 11.11% | — | 1K KES 1K | Cytonn Money Market Fund | 2.00% | 9.44% | 2.1B KES 2.1B |  |  |
`;

const SAMPLE_USD_MMF = `
# USD Money Market Funds Kenya — 13 Dollar Funds, Daily Yields
Updated 4 November 2026
| ##↑ | Company | Yield | Chg | Min | Fund | Fee | Net | AUM | News | Watch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | [Nabo](https://serrarigroup.com/companies/nabo) | 6.16% | — | 1K USD 1K | Nabo Africa Money Market Fund (USD) | 2.50% | 5.24% | 5.10M USD 5.10M |  |  |
`;

const SAMPLE_UT_MARKDOWN = `
## Kenya Unit Trust Returns — 45 CMA-Regulated Funds Live
Updated 4 November 2026
| #↑ | Provider | Published Metric | Change | Min. Investment | Fund Name | Category | Mgmt Fee | Risk | News | Watch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | SanlamAllianz | KES 32.65 | — | KES 2.5K | SanlamAllianz Balanced Fund | Balanced | 2.00% | medium |  |  |
| 2 | Britam | KES 171.18 | — | KES 1K | Britam Balanced Fund | Balanced | 2.00% | medium |  |  |
| 9 | Mayfair | 17.07% | — | KES 5K | Mayfair Fixed Income Fund | Fixed Income | 2.00% | low |  |  |
| 11 | Lofty-Corban | 13.35% | — | KES 1K | Lofty Corban Bond Fund | Fixed Income | 2.00% | low |  |  |
| 13 | Globatec | 13.27% | — | -- | Globatec Fixed Income Fund | Fixed Income | -- | low |  |  |
| 16 | NCBA | KES 276.57 | — | -- | NCBA Equity Fund | Equity | -- | high |  |  |
`;

describe("serrariFundSync", () => {
  it("derives daily yield correctly from EAR", () => {
    expect(deriveDailyYieldFromEar(17.07)).toBe(15.76);
    expect(deriveDailyYieldFromEar(11.11)).toBe(10.54);
    expect(deriveDailyYieldFromEar(10.82)).toBe(10.28);
    expect(deriveDailyYieldFromEar(6.16)).toBe(5.98);
  });

  it("parses minimum investments with unit prefixes", () => {
    expect(parseSerrariMinimum("KES 2.5K", "KES")).toBe(2500);
    expect(parseSerrariMinimum("KES 100K", "KES")).toBe(100000);
    expect(parseSerrariMinimum("KES 1M", "KES")).toBe(1000000);
    expect(parseSerrariMinimum("KES 100", "KES")).toBe(100);
    expect(parseSerrariMinimum("--", "KES")).toBe(1000);
    expect(parseSerrariMinimum("1K USD", "USD")).toBe(130000);
  });

  it("parses management fees safely", () => {
    expect(parseSerrariFee("2.50%")).toBe(2.5);
    expect(parseSerrariFee("2.00%")).toBe(2.0);
    expect(parseSerrariFee("--")).toBe(2.0);
  });

  it("parses as-of date from markdown headers", () => {
    expect(parseSerrariAsOfDate("Updated 4 November 2026")).toBe("2026-11-04");
    expect(parseSerrariAsOfDate("Data as of 31 October 2026")).toBe("2026-10-30"); // weekend adjusted to Friday
  });

  it("parses MMF markdown tables correctly", () => {
    const kes = parseSerrariMmfMarkdown(SAMPLE_KES_MMF, "KES");
    expect(kes).toHaveLength(2);
    expect(kes[0].slug).toBe("faulu-sh-mmf");
    expect(kes[0].annual_yield).toBe(10.82);
    expect(kes[0].daily_yield).toBe(10.28);
    expect(kes[0].yield_unit).toBe("%");

    const usd = parseSerrariMmfMarkdown(SAMPLE_USD_MMF, "USD");
    expect(usd).toHaveLength(1);
    expect(usd[0].slug).toBe("nabo-usd-mmf");
    expect(usd[0].annual_yield).toBe(6.16);
    expect(usd[0].yield_unit).toBe("USD");
  });

  it("parses Unit Trusts markdown table (/ke/ut) for Fixed Income, Balanced, and Equity", () => {
    const ut = parseSerrariUtMarkdown(SAMPLE_UT_MARKDOWN);
    expect(ut).toHaveLength(6);

    // Balanced fund: KES unit price
    const sanlamBal = ut.find((r) => r.slug === "sanlamallianz-balanced-sh");
    expect(sanlamBal).toBeDefined();
    expect(sanlamBal?.annual_yield).toBe(32.65);
    expect(sanlamBal?.yield_unit).toBe("KES");
    expect(sanlamBal?.fund_type).toBe("balanced");

    // Fixed income fund: % yield
    const mayfair = ut.find((r) => r.slug === "mayfair-fixed-income-fund");
    expect(mayfair).toBeDefined();
    expect(mayfair?.annual_yield).toBe(17.07);
    expect(mayfair?.daily_yield).toBe(15.76);
    expect(mayfair?.yield_unit).toBe("%");
    expect(mayfair?.fund_type).toBe("fixed_income");

    // New fund auto-discovered: Globatec
    const globatec = ut.find((r) => r.slug === "globatec-fixed-income-sh");
    expect(globatec).toBeDefined();
    expect(globatec?.name).toBe("Globatec");
    expect(globatec?.annual_yield).toBe(13.27);
    expect(globatec?.fund_type).toBe("fixed_income");

    // Equity fund: KES unit price
    const ncbaEq = ut.find((r) => r.slug === "ncba-equity-sh");
    expect(ncbaEq).toBeDefined();
    expect(ncbaEq?.annual_yield).toBe(276.57);
    expect(ncbaEq?.yield_unit).toBe("KES");
    expect(ncbaEq?.fund_type).toBe("equity");
  });

  it("detects when fund values changed vs unchanged", () => {
    const existing = {
      annual_yield: 10.82,
      daily_yield: 10.28,
      management_fee: 2.0,
      minimum_investment: 1000,
      yield_unit: "%",
    };

    expect(hasFundChanged(existing, { ...existing })).toBe(false);
    expect(hasFundChanged(existing, { ...existing, annual_yield: 10.95 })).toBe(true);
    expect(hasFundChanged(existing, { ...existing, minimum_investment: 5000 })).toBe(true);
  });
});
