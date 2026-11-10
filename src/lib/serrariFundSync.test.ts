import { describe, expect, it } from "vitest";
import {
  deriveDailyYieldFromEar,
  getVerifiedSourceGroups,
  hasFundChanged,
  hasFundDateChanged,
  hasFundMetricsChanged,
  normalizeToWeekdayIsoDate,
  parseSerrariAsOfDate,
  parseSerrariFee,
  parseSerrariMmfMarkdown,
  parseSerrariMinimum,
  parseSerrariUtMarkdown,
  shouldAdvanceFlatFundDate,
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

    // Advances when source date is newer or existing date is missing/null, even if yield is flat
    const dated = { ...existing, fact_sheet_date: "2026-11-04" };
    expect(hasFundChanged(dated, { ...existing, asOfDate: "2026-11-04" })).toBe(false);
    expect(hasFundChanged(dated, { ...existing, asOfDate: "2026-11-06" })).toBe(true);
    expect(hasFundChanged({ ...existing, fact_sheet_date: null }, { ...existing, asOfDate: "2026-11-06" })).toBe(true);
    expect(hasFundChanged({ ...existing, fact_sheet_date: undefined }, { ...existing, asOfDate: "2026-11-06" })).toBe(true);
    expect(hasFundChanged({ ...existing, fact_sheet_date: "  " }, { ...existing, asOfDate: "2026-11-06" })).toBe(true);
    expect(hasFundChanged(dated, { ...existing, asOfDate: null })).toBe(false);
  });

  it("separates metric changes from date-only changes with epsilon tolerance", () => {
    const existing = {
      annual_yield: 10.82,
      daily_yield: 10.28,
      management_fee: 2.0,
      minimum_investment: 1000,
      yield_unit: "%",
      fact_sheet_date: "2026-11-09",
    };

    // Identical yields on a newer date must NOT trigger hasFundMetricsChanged
    expect(hasFundMetricsChanged(existing, { ...existing, annual_yield: 10.82000001 })).toBe(false);
    expect(hasFundDateChanged(existing, { asOfDate: "2026-11-10" })).toBe(true);
    expect(hasFundDateChanged(existing, { asOfDate: "2026-11-09" })).toBe(false);

    // Real rate change triggers hasFundMetricsChanged
    expect(hasFundMetricsChanged(existing, { ...existing, annual_yield: 10.97 })).toBe(true);
  });

  it("enforces per-endpoint midnight rollover guard before advancing flat fund dates", () => {
    const bySlug = new Map([
      ["faulu-sh-mmf", { annual_yield: 10.98, daily_yield: 10.42, management_fee: 2.0, minimum_investment: 1000, yield_unit: "%", fact_sheet_date: "2026-11-09" }],
      ["cytonn-sh-mmf", { annual_yield: 11.11, daily_yield: 10.54, management_fee: 2.0, minimum_investment: 1000, yield_unit: "%", fact_sheet_date: "2026-11-09" }],
      ["mayfair-fixed-income-fund", { annual_yield: 17.07, daily_yield: 15.76, management_fee: 2.0, minimum_investment: 5000, yield_unit: "%", fact_sheet_date: "2026-11-09" }],
    ]);

    // Case 1: /ke/ut has a rate change (17.07 -> 17.08), but 0 funds in /ke/mmf changed
    const rolloverBatch = [
      { slug: "faulu-sh-mmf", annual_yield: 10.98, daily_yield: 10.42, management_fee: 2.0, minimum_investment: 1000, yield_unit: "%", asOfDate: "2026-11-10", sourceUrl: "https://serrarigroup.com/ke/mmf", fund_type: "money_market", currency: "KES" },
      { slug: "cytonn-sh-mmf", annual_yield: 11.11, daily_yield: 10.54, management_fee: 2.0, minimum_investment: 1000, yield_unit: "%", asOfDate: "2026-11-10", sourceUrl: "https://serrarigroup.com/ke/mmf", fund_type: "money_market", currency: "KES" },
      { slug: "mayfair-fixed-income-fund", annual_yield: 17.08, daily_yield: 15.77, management_fee: 2.0, minimum_investment: 5000, yield_unit: "%", asOfDate: "2026-11-10", sourceUrl: "https://serrarigroup.com/ke/ut", fund_type: "fixed_income", currency: "KES" },
    ];

    const verified1 = getVerifiedSourceGroups(rolloverBatch, bySlug);
    expect(verified1.has("https://serrarigroup.com/ke/ut")).toBe(true);
    expect(verified1.has("https://serrarigroup.com/ke/mmf")).toBe(false);
    // Flat KES MMFs must NOT advance fact_sheet_date when 0 KES MMFs changed
    expect(shouldAdvanceFlatFundDate(bySlug.get("cytonn-sh-mmf")!, rolloverBatch[1], verified1)).toBe(false);

    // Case 2: At least one KES MMF changes (Faulu 10.98 -> 10.97)
    const publishedBatch = [
      { ...rolloverBatch[0], annual_yield: 10.97, daily_yield: 10.41 },
      rolloverBatch[1],
    ];
    const verified2 = getVerifiedSourceGroups(publishedBatch, bySlug);
    expect(verified2.has("https://serrarigroup.com/ke/mmf")).toBe(true);
    // Flat Cytonn MMF now advances its fact_sheet_date because the /ke/mmf batch is verified
    expect(shouldAdvanceFlatFundDate(bySlug.get("cytonn-sh-mmf")!, publishedBatch[1], verified2)).toBe(true);
  });
});
