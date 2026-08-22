import { describe, it, expect } from "vitest";
import { isFundsAndFixedIncomeArticle } from "./fundsFixedIncomeNews";
import { findRelatedMmf } from "./newsMarketLinks";
import { buildInvestorBriefing } from "./newsBriefingMapper";
import type { FundFromDB, NewsFromDB } from "./api";

describe("CMA Regulatory News & Funds/CIS Ingestion Parity", () => {
  const sampleFunds: FundFromDB[] = [
    {
      id: "britam-mmf-1",
      slug: "britam-money-market-fund",
      name: "Britam Money Market Fund",
      manager: "Britam Asset Managers",
      cma_licensed: true,
      annual_yield: 13.3,
      daily_yield: 12.5,
      seven_day_yield: 12.5,
      thirty_day_yield: 12.4,
      fund_type: "money_market",
      minimum_investment: 1000,
      management_fee: 2.0,
      withdrawal_time: "24 hours",
      description: "Britam Money Market Fund description",
      website: "https://britam.com",
      fact_sheet_date: "2026-08-01",
      yield_unit: "%",
      is_published: true,
      logo_url: null,
      updated_at: new Date().toISOString(),
    },
    {
      id: "cic-mmf-1",
      slug: "cic-money-market-fund",
      name: "CIC Money Market Fund",
      manager: "CIC Asset Management",
      cma_licensed: true,
      annual_yield: 12.4,
      daily_yield: 11.8,
      seven_day_yield: 11.8,
      thirty_day_yield: 11.7,
      fund_type: "money_market",
      minimum_investment: 5000,
      management_fee: 2.0,
      withdrawal_time: "24 hours",
      description: "CIC Money Market Fund description",
      website: "https://cic.co.ke",
      fact_sheet_date: "2026-08-01",
      yield_unit: "%",
      is_published: true,
      logo_url: null,
      updated_at: new Date().toISOString(),
    },
  ];

  it("classifies CMA unit trust and CIS approval releases as Funds & Fixed Income", () => {
    const article = {
      title: "CMA APPROVES ADDITIONAL UNIT TRUST SUB-FUNDS AND AN ALTERNATIVE INVESTMENT FUND TO EXPAND INVESTOR CHOICE",
      summary: "The Capital Markets Authority (CMA) has approved the registration of additional Collective Investment Scheme sub-funds and a new Alternative Investment Fund.",
      content: "The Authority has authorised Britam Asset Managers Limited to register two new sub-funds under the existing Britam Unit Trust Funds umbrella scheme, the Britam Multi Asset Special Fund (KES) and the Britam Enhanced Global Equities Special Fund (USD).",
      source: "Capital Markets Authority",
      category: "Funds & Fixed Income",
    };

    expect(isFundsAndFixedIncomeArticle(article)).toBe(true);
  });

  it("classifies CMA fund manager licensing actions as Funds & Fixed Income", () => {
    const article = {
      title: "CMA LICENSES THREE NEW FUND MANAGERS TO EXPAND ASSET MANAGEMENT CAPACITY IN KENYA",
      summary: "The Capital Markets Authority has granted new fund manager licences to expand CIS management capacity.",
      source: "Capital Markets Authority",
    };

    expect(isFundsAndFixedIncomeArticle(article)).toBe(true);
  });

  it("classifies CMA ETF and special fund approvals as Funds & Fixed Income", () => {
    const article = {
      title: "CMA APPROVES INNOVATIVE EXCHANGE TRADED FUND TO DIVERSIFY AND DEEPEN THE CAPITAL MARKETS",
      summary: "The Authority has approved a new ETF to deepen fixed income and capital market diversification.",
      source: "Capital Markets Authority",
    };

    expect(isFundsAndFixedIncomeArticle(article)).toBe(true);
  });

  it("strictly preserves relatedMmf = null for umbrella/sub-fund approvals that are not the MMF", () => {
    const title = "CMA APPROVES ADDITIONAL UNIT TRUST SUB-FUNDS AND AN ALTERNATIVE INVESTMENT FUND TO EXPAND INVESTOR CHOICE";
    const content = "The Authority has authorised Britam Asset Managers Limited to register two new sub-funds: Britam Multi Asset Special Fund and Britam Enhanced Global Equities Special Fund.";

    const matchedFund = findRelatedMmf(title, content, sampleFunds);
    expect(matchedFund).toBeNull();
  });

  it("safely matches specific MMF only when the exact Money Market Fund product is named", () => {
    const title = "CMA Approves Registration of Britam Money Market Fund";
    const content = "The Capital Markets Authority has granted formal regulatory approval for the Britam Money Market Fund managed by Britam Asset Managers.";

    const matchedFund = findRelatedMmf(title, content, sampleFunds);
    expect(matchedFund).not.toBeNull();
    expect(matchedFund?.id).toBe("britam-mmf-1");
  });

  it("maps official CMA article into structured InvestorBriefing with accurate source attribution", () => {
    const article: NewsFromDB = {
      id: "cma-art-1",
      title: "CMA Approves New Unit Trust Schemes and Additional Sub-Funds",
      summary: "The Capital Markets Authority (CMA) has approved the registration of new Collective Investment Schemes.",
      content: "The approvals broaden the range of regulated savings and investment options available to Kenyan investors.",
      source: "Capital Markets Authority",
      url: "https://www.cma.or.ke/cma-approves-new-unit-trust-schemes/",
      date_published: "2026-08-27",
      source_published_at: "2026-08-27T09:41:06Z",
      read_time: "2 min read",
      category: "Funds & Fixed Income",
      image_url: "https://www.cma.or.ke/wp-content/uploads/2025/11/press.png",
      created_at: "2026-08-27T09:42:00Z",
      updated_at: "2026-08-27T09:42:00Z",
    };

    const briefing = buildInvestorBriefing(article);
    expect(briefing).not.toBeNull();
    expect(briefing.source.name).toBe("Capital Markets Authority");
    expect(briefing.source.url).toBe("https://www.cma.or.ke/cma-approves-new-unit-trust-schemes/");
  });
});
