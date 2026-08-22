import { describe, expect, it } from "vitest";
import type { ExchangeRate } from "@/components/home/MarketTicker";
import type { FundFromDB } from "@/lib/api";
import { buildRelatedMarketLinks, computeMarketPercentChange, findRelatedMmf } from "./newsMarketLinks";

const mockFunds: FundFromDB[] = [
  {
    id: "fund-nabo",
    slug: "nabo-sh-mmf",
    name: "Nabo Shilling Money Market Fund",
    manager: "Nabo Capital Limited",
    cma_licensed: true,
    annual_yield: 13.74,
    daily_yield: 12.88,
    seven_day_yield: 12.9,
    thirty_day_yield: 13,
    fund_type: "money_market",
    minimum_investment: 100000,
    management_fee: 2,
    withdrawal_time: "1-2 days",
    description: "",
    website: "",
    fact_sheet_date: null,
    yield_unit: "%",
    is_published: true,
    logo_url: null,
    updated_at: "2026-08-10T09:00:00.000Z",
  },
  {
    id: "fund-equity",
    slug: "equity-sh-mmf",
    name: "Equity",
    manager: "Equity Investment Bank ",
    cma_licensed: true,
    annual_yield: 14.1,
    daily_yield: 13.5,
    seven_day_yield: 13.6,
    thirty_day_yield: 13.8,
    fund_type: "money_market",
    minimum_investment: 1000,
    management_fee: 1.5,
    withdrawal_time: "Same day",
    description: "",
    website: "",
    fact_sheet_date: null,
    yield_unit: "%",
    is_published: true,
    logo_url: null,
    updated_at: "2026-08-10T09:00:00.000Z",
  },
  {
    id: "fund-stanbic",
    slug: "stanbic-sh-mmf",
    name: "Stanbic",
    manager: "Stanbic Investment Management Services ",
    cma_licensed: true,
    annual_yield: 13.8,
    daily_yield: 13.2,
    seven_day_yield: 13.3,
    thirty_day_yield: 13.5,
    fund_type: "money_market",
    minimum_investment: 5000,
    management_fee: 1.75,
    withdrawal_time: "1 day",
    description: "",
    website: "",
    fact_sheet_date: null,
    yield_unit: "%",
    is_published: true,
    logo_url: null,
    updated_at: "2026-08-10T09:00:00.000Z",
  },
  {
    id: "fund-kcb",
    slug: "kcb-sh-mmf",
    name: "KCB ",
    manager: "KCB Asset Management Ltd",
    cma_licensed: true,
    annual_yield: 13.9,
    daily_yield: 13.3,
    seven_day_yield: 13.4,
    thirty_day_yield: 13.6,
    fund_type: "money_market",
    minimum_investment: 5000,
    management_fee: 1.5,
    withdrawal_time: "1-2 days",
    description: "",
    website: "",
    fact_sheet_date: null,
    yield_unit: "%",
    is_published: true,
    logo_url: null,
    updated_at: "2026-08-10T09:00:00.000Z",
  },
  {
    id: "fund-cic",
    slug: "cic-sh-mmf",
    name: "CIC ",
    manager: "CIC Asset Management Ltd",
    cma_licensed: true,
    annual_yield: 13.6,
    daily_yield: 13.0,
    seven_day_yield: 13.1,
    thirty_day_yield: 13.2,
    fund_type: "money_market",
    minimum_investment: 5000,
    management_fee: 1.75,
    withdrawal_time: "1-2 days",
    description: "",
    website: "",
    fact_sheet_date: null,
    yield_unit: "%",
    is_published: true,
    logo_url: null,
    updated_at: "2026-08-10T09:00:00.000Z",
  },
  {
    id: "fund-mali",
    slug: "mali-sh-mmf",
    name: "Mali ",
    manager: "Genghis Capital Limited",
    cma_licensed: true,
    annual_yield: 14.5,
    daily_yield: 13.9,
    seven_day_yield: 14.0,
    thirty_day_yield: 14.2,
    fund_type: "money_market",
    minimum_investment: 100,
    management_fee: 2,
    withdrawal_time: "Instant",
    description: "",
    website: "",
    fact_sheet_date: null,
    yield_unit: "%",
    is_published: true,
    logo_url: null,
    updated_at: "2026-08-10T09:00:00.000Z",
  },
  {
    id: "fund-kuza",
    slug: "kuza-sh-mmf",
    name: "Kuza",
    manager: "Kuza Asset Management Limited",
    cma_licensed: true,
    annual_yield: 14.8,
    daily_yield: 14.2,
    seven_day_yield: 14.3,
    thirty_day_yield: 14.5,
    fund_type: "money_market",
    minimum_investment: 1000,
    management_fee: 1.5,
    withdrawal_time: "Same day",
    description: "",
    website: "",
    fact_sheet_date: null,
    yield_unit: "%",
    is_published: true,
    logo_url: null,
    updated_at: "2026-08-10T09:00:00.000Z",
  },
];

const fx = (overrides: Partial<ExchangeRate> = {}): ExchangeRate => ({
  id: "fx-1",
  currency_code: "USD",
  currency_name: "US Dollar",
  rate: 130,
  previous_rate: 125,
  day_change_percent: null,
  flag_emoji: "🇺🇸",
  ...overrides,
});

describe("news market links", () => {
  describe("MUST match legitimate MMF stories", () => {
    it("matches exact full product name", () => {
      const matched = findRelatedMmf(
        "Nabo Capital updates its money market fund yield",
        "The manager said the Nabo Shilling Money Market Fund posted a strong yield this week.",
        mockFunds
      );
      expect(matched?.id).toBe("fund-nabo");
    });

    it("matches provider + explicit money market fund phrase", () => {
      const matched = findRelatedMmf(
        "Kuza Money Market Fund reports record inflows",
        "Kuza Asset Management said its money market fund assets reached Sh5 billion.",
        mockFunds
      );
      expect(matched?.id).toBe("fund-kuza");
    });

    it("matches provider + explicit MMF acronym", () => {
      const matched = findRelatedMmf(
        "Equity MMF hits 14% annual yield",
        "The Equity Money Market Fund declared an effective annual rate of 14.1%.",
        mockFunds
      );
      expect(matched?.id).toBe("fund-equity");
    });

    it("matches provider near annual yield context", () => {
      const matched = findRelatedMmf(
        "Stanbic unit trust yields rise following benchmark rate review",
        "Stanbic Investment Management reported higher compounding yields across its money market portfolios.",
        mockFunds
      );
      expect(matched?.id).toBe("fund-stanbic");
    });

    it("matches KCB when explicit fund context is present", () => {
      const matched = findRelatedMmf(
        "KCB Asset Management raises money market fund yield",
        "KCB's money market fund increased its annual yield to 13.9% for retail unitholders.",
        mockFunds
      );
      expect(matched?.id).toBe("fund-kcb");
    });

    it("matches Genghis Mali MMF when product name is used", () => {
      const matched = findRelatedMmf(
        "Mali Money Market Fund delivers instant liquidity to mobile savers",
        "The Genghis Mali MMF platform expanded its daily yield distribution.",
        mockFunds
      );
      expect(matched?.id).toBe("fund-mali");
    });
  });

  describe("MUST NOT match unrelated stories (Anti-regressions)", () => {
    it("does not match Equity Group corporate earnings", () => {
      const matched = findRelatedMmf(
        "Equity Group posts Sh29.6bn net profit in half-year results",
        "Equity Group Holdings recorded a 15% surge in banking revenues and expanded lending in DRC.",
        mockFunds
      );
      expect(matched).toBeNull();
    });

    it("does not match Equity Group scholarship announcement", () => {
      const matched = findRelatedMmf(
        "121 scholars get Sh3bn scholarships from Equity Group to study abroad",
        "NAIROBI, Kenya – Equity Group has awarded 121 scholars from East Africa scholarships to study at universities around the world under the Equity Leaders Program.",
        mockFunds
      );
      expect(matched).toBeNull();
    });

    it("does not match generic 'private equity' references", () => {
      const matched = findRelatedMmf(
        "East Africa private equity activity rebounds with $500m deployed",
        "Private equity funds have accelerated investments in fintech, logistics, and renewable energy startups across Kenya and Rwanda.",
        mockFunds
      );
      expect(matched).toBeNull();
    });

    it("does not match 'equity markets' or stock market turnover", () => {
      const matched = findRelatedMmf(
        "Nairobi Securities Exchange equity market turnover rises 20%",
        "Foreign investors increased buying activity in blue-chip equities listed on the NSE main investment market.",
        mockFunds
      );
      expect(matched).toBeNull();
    });

    it("does not match 'equity valuations' in macro/inflation stories", () => {
      const matched = findRelatedMmf(
        "Ghana Inflation Cools to 4.6% in July 2026",
        "Headline inflation fell to 4.6%, creating selective room for inward portfolio allocations and for equity valuations in rate-sensitive sectors.",
        mockFunds
      );
      expect(matched).toBeNull();
    });

    it("does not match KCB Bank commercial banking/mortgage news", () => {
      const matched = findRelatedMmf(
        "Kenya targets one million mortgages as affordable housing drive gains pace",
        "Commercial banks led by KCB and Equity have rolled out long-term home loans backed by state credit guarantees.",
        mockFunds
      );
      expect(matched).toBeNull();
    });

    it("does not match KCB dividend and profit news", () => {
      const matched = findRelatedMmf(
        "KCB shareholders to get Sh9.64b interim dividend as net profit rises to Sh36.1b",
        "KCB Group has declared an interim dividend payout after half-year net profit rose on strong interest income from loans.",
        mockFunds
      );
      expect(matched).toBeNull();
    });

    it("does not match Stanbic Bank commercial operations news", () => {
      const matched = findRelatedMmf(
        "Stanbic Bank Tanzania doubles down on SME and retail clients",
        "Standard Bank Group, Africa's largest bank by assets, derives 40% of headline earnings from its African regional operations including Stanbic Bank.",
        mockFunds
      );
      expect(matched).toBeNull();
    });

    it("does not match CIC Insurance/Group corporate news", () => {
      const matched = findRelatedMmf(
        "Insurance Regulatory Authority releases Q2 claims report",
        "General insurers including CIC Insurance Group and Jubilee Holdings processed over Sh15 billion in medical and motor claims.",
        mockFunds
      );
      expect(matched).toBeNull();
    });

    it("does not match references to Mali the country", () => {
      const matched = findRelatedMmf(
        "Guinea demands local refining as raw gold exports banned",
        "Mining authorities in Guinea, Mali, and Burkina Faso have coordinated policies to ban the export of unrefined gold bars to Swiss refineries.",
        mockFunds
      );
      expect(matched).toBeNull();
    });

    it("does not match generic 'funding' verbs", () => {
      const matched = findRelatedMmf(
        "HELB to be scrapped under new Bill, replaced by Funding Authority",
        "The Tertiary Education Placement and Funding Bill proposes to give the new authority powers to disburse grants to needy university students.",
        mockFunds
      );
      expect(matched).toBeNull();
    });

    it("does not match generic MMF industry articles with no named provider", () => {
      const matched = findRelatedMmf(
        "More Kenyans ditch money market funds for higher-yielding special schemes",
        "Although MMFs remain the largest investment category, their market dominance has fallen as investors seek higher returns.",
        mockFunds
      );
      expect(matched).toBeNull();
    });
  });

  describe("FX & Commodity Links Integration", () => {
    it("links explicit FX pairs and calculates movement from prior rate", () => {
      const links = buildRelatedMarketLinks(
        "USD/KES rises after dollar demand increases",
        "Banks quoted USD/KES higher in morning trading.",
        mockFunds,
        [fx()]
      );

      expect(links.relatedFx).toMatchObject({
        id: "fx-1",
        pair: "USD/KES",
        rate: 130,
        changePercent: 4,
      });
    });

    it("links commodities by named market", () => {
      const links = buildRelatedMarketLinks(
        "Gold prices edge higher",
        "Gold was supported by safe-haven demand.",
        mockFunds,
        [],
        [{
          id: "commodity-1",
          name: "Gold",
          symbol: "XAU",
          price: 2400,
          previous_price: 2300,
          day_change_percent: 1.25,
          unit: "oz",
        }]
      );

      expect(links.relatedCommodity).toMatchObject({
        id: "commodity-1",
        name: "Gold",
        price: 2400,
        unit: "oz",
        changePercent: 1.25,
      });
    });

    it("keeps completely unrelated articles unlinked", () => {
      const links = buildRelatedMarketLinks(
        "New road project announced",
        "The county expects construction to begin next month.",
        mockFunds,
        [fx()],
        [{ id: "commodity-1", name: "Gold", price: 2400 }]
      );

      expect(links.relatedMmf).toBeNull();
      expect(links.relatedFx).toBeNull();
      expect(links.relatedCommodity).toBeNull();
    });

    it("prefers explicit percentage movement over computed movement", () => {
      expect(computeMarketPercentChange(110, 100, 3.5)).toBe(3.5);
    });
  });
});
