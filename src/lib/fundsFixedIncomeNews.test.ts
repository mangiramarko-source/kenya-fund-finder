import { describe, expect, it } from "vitest";
import { isFundsAndFixedIncomeArticle, FUNDS_AND_FIXED_INCOME_TAB } from "./fundsFixedIncomeNews";
import { findRelatedMmf, buildRelatedMarketLinks } from "./newsMarketLinks";
import type { FundFromDB } from "./api";

const mockFunds: FundFromDB[] = [
  {
    id: "fund-1",
    slug: "nabo-africa-money-market-fund",
    name: "Nabo Africa Money Market Fund",
    manager: "Nabo Capital",
    cma_licensed: true,
    annual_yield: 12.5,
    daily_yield: 0.034,
    seven_day_yield: 12.5,
    thirty_day_yield: 12.4,
    fund_type: "money_market",
    minimum_investment: 10000,
    management_fee: 1.5,
    withdrawal_time: "2-3 business days",
    description: "",
    website: "",
    fact_sheet_date: null,
    yield_unit: "%",
    is_published: true,
    logo_url: null,
    updated_at: "2026-08-01",
  },
  {
    id: "fund-2",
    slug: "equity-money-market-fund",
    name: "Equity Money Market Fund",
    manager: "Equity Investment Bank",
    cma_licensed: true,
    annual_yield: 11.8,
    daily_yield: 0.032,
    seven_day_yield: 11.8,
    thirty_day_yield: 11.7,
    fund_type: "money_market",
    minimum_investment: 1000,
    management_fee: 1.2,
    withdrawal_time: "Instant to M-Pesa",
    description: "",
    website: "",
    fact_sheet_date: null,
    yield_unit: "%",
    is_published: true,
    logo_url: null,
    updated_at: "2026-08-01",
  },
];

describe("Funds & Fixed Income Centralized Classifier", () => {
  describe("Must Qualify (Positive cases)", () => {
    it("qualifies genuine MMF industry stories", () => {
      const article = {
        title: "More Kenyans ditch money market funds for higher-yielding special schemes",
        summary: "Although MMFs remain the largest investment category, their dominance has shifted.",
      };
      expect(isFundsAndFixedIncomeArticle(article)).toBe(true);
    });

    it("qualifies named MMF stories", () => {
      const article = {
        title: "Nabo Money Market Fund posts 12.5% effective annual yield",
        summary: "Nabo Capital announced its latest daily and annual yield distribution for retail investors.",
      };
      expect(isFundsAndFixedIncomeArticle(article)).toBe(true);
    });

    it("qualifies Treasury bill auction stories", () => {
      const article = {
        title: "CBK reports 140% subscription in latest Treasury bill auction",
        summary: "Investors submitted bids across the 91-day, 182-day and 364-day papers.",
      };
      expect(isFundsAndFixedIncomeArticle(article)).toBe(true);
    });

    it("qualifies 91-day / 182-day / 364-day bill stories", () => {
      const article = {
        title: "91-day Treasury bill yields drop slightly as liquidity improves in the interbank market",
        summary: "Yields on the short-term government paper fell by 5 basis points.",
      };
      expect(isFundsAndFixedIncomeArticle(article)).toBe(true);
    });

    it("qualifies Treasury bond auction stories", () => {
      const article = {
        title: "CBK opens new KSh 15 billion Treasury bond switch auction, with minimum KSh 50k allowed",
        summary: "The Central Bank of Kenya launches a switch auction inviting investors to exchange Treasury bills for ten-year bonds.",
      };
      expect(isFundsAndFixedIncomeArticle(article)).toBe(true);
    });

    it("qualifies infrastructure bond stories", () => {
      const article = {
        title: "Government seeks Sh50 billion from tax-free infrastructure bond",
        summary: "The 15-year IFB offers attractive tax-exempt coupon rates for domestic investors.",
      };
      expect(isFundsAndFixedIncomeArticle(article)).toBe(true);
    });

    it("qualifies corporate bond issuance stories", () => {
      const article = {
        title: "Safaricom, EABL spark corporate bonds frenzy on the NSE",
        summary: "Double-digit returns offered by notes listed on the Nairobi Securities Exchange fuelled pension asset allocation into corporate bonds.",
      };
      expect(isFundsAndFixedIncomeArticle(article)).toBe(true);
    });

    it("qualifies green / sustainability bond stories", () => {
      const article = {
        title: "KCB eyes Sh300bn sustainability bond to finance green, social projects",
        summary: "The lender plans to issue medium-term green notes over the next five years.",
      };
      expect(isFundsAndFixedIncomeArticle(article)).toBe(true);
    });

    it("qualifies fixed-income fund stories", () => {
      const article = {
        title: "Fixed income funds attract Sh12 billion in new quarterly inflows",
        summary: "Retail investors diversify allocations across bond funds and collective investment schemes.",
      };
      expect(isFundsAndFixedIncomeArticle(article)).toBe(true);
    });

    it("qualifies unit trust / CIS fixed-income stories", () => {
      const article = {
        title: "CMA reports unit trusts industry assets surpassed Sh200 billion",
        summary: "Collective investment schemes continued steady growth led by fixed income assets.",
      };
      expect(isFundsAndFixedIncomeArticle(article)).toBe(true);
    });

    it("qualifies government securities via DhowCSD bidding", () => {
      const article = {
        title: "CBK allows up to KSh 250,000 M-Pesa payments for Kenyans buying govt securities",
        summary: "The Central Bank enables mobile payments for government securities bids via DhowCSD.",
      };
      expect(isFundsAndFixedIncomeArticle(article)).toBe(true);
    });
  });

  describe("Must NOT Qualify (Negative & False-Positive Guard cases)", () => {
    it("rejects vehicle and car auction stories", () => {
      const article = {
        title: "Auctioneer announces public vehicle auction for 50 repossessed cars",
        summary: "Bidders must deposit KSh 10,000 before participating in the Saturday car auction.",
      };
      expect(isFundsAndFixedIncomeArticle(article)).toBe(false);
    });

    it("rejects crop and agricultural yield stories", () => {
      const article = {
        title: "Dairy farmers plead for quality feeds to improve milk yields",
        summary: "Feed prices have escalated, diminishing daily agricultural output across Rift Valley farms.",
      };
      expect(isFundsAndFixedIncomeArticle(article)).toBe(false);

      const article2 = {
        title: "Is pawpaw farming profitable in Kenya? Costs, yields, and potential returns",
        summary: "Agronomists break down the harvest yield per acre for smallholder farmers.",
      };
      expect(isFundsAndFixedIncomeArticle(article2)).toBe(false);
    });

    it("rejects standalone private equity stories", () => {
      const article = {
        title: "Private equity firm acquires majority stake in regional healthcare provider",
        summary: "The deal values the clinic chain at KSh 4.5 billion.",
      };
      expect(isFundsAndFixedIncomeArticle(article)).toBe(false);
    });

    it("rejects generic corporate funding / scholarships", () => {
      const article = {
        title: "Universities Fund: Step-by-step guide for Kenyan students to apply for govt scholarships",
        summary: "The state funding authority announces deadlines for higher education grants.",
      };
      expect(isFundsAndFixedIncomeArticle(article)).toBe(false);
    });

    it("rejects generic bank earnings stories with no fixed-income products", () => {
      const article = {
        title: "KCB sets interim dividend as profit after tax rises to KSh 49 billion in 6 months",
        summary: "Commercial lending and customer transactions propelled the group's half-year financial results.",
      };
      expect(isFundsAndFixedIncomeArticle(article)).toBe(false);
    });

    it("rejects generic commercial bank debt defaults or sugar arrears", () => {
      const article = {
        title: "Co-op Bank demands Sh862mn in debt arrears from Sony Sugar",
        summary: "The lender moves to recover outstanding commercial loan facilities.",
      };
      expect(isFundsAndFixedIncomeArticle(article)).toBe(false);
    });

    it("rejects non-financial uses of bond (bail bond, chemical bond, family bond, visa bond)", () => {
      const article = {
        title: "Court frees suspect on KSh 2 million cash bail bond pending trial",
        summary: "The magistrate granted bond conditions after hearing submissions.",
      };
      expect(isFundsAndFixedIncomeArticle(article)).toBe(false);

      const article2 = {
        title: "List of 24 African countries exempt from paying US visa bond after final rule issued",
        summary: "The consular rule applies to tourist and business visitors.",
      };
      expect(isFundsAndFixedIncomeArticle(article2)).toBe(false);
    });

    it("rejects parliamentary bills and pending county bills", () => {
      const article = {
        title: "Businesses petition parliament for nationwide public participation on tobacco bill",
        summary: "Lawmakers will review the health amendments next week.",
      };
      expect(isFundsAndFixedIncomeArticle(article)).toBe(false);

      const article2 = {
        title: "Nairobi’s mounting pending bills signal fiscal crisis, Senate index warns",
        summary: "Suppliers demand payments for unpaid county procurement invoices.",
      };
      expect(isFundsAndFixedIncomeArticle(article2)).toBe(false);
    });

    it("rejects foreign sovereign wealth funds with no retail Kenyan investment connection", () => {
      const article = {
        title: "Africa’s best-performing sovereign wealth funds: What sets them apart?",
        summary: "The success of Botswana’s Pula Fund, Senegal’s FONSIS and Rwanda’s Agaciro holds key lessons.",
      };
      expect(isFundsAndFixedIncomeArticle(article)).toBe(false);
    });

    it("rejects US Treasury and Wall Street sovereign debt stories", () => {
      const article1 = {
        title: "US Treasury Bonds Rally As Secretary Scott Bessent Triggers Leverage Rule Overhaul",
        summary: "Yields on benchmark 10-year US Treasury notes dropped following policy announcements in Washington.",
      };
      expect(isFundsAndFixedIncomeArticle(article1)).toBe(false);

      const article2 = {
        title: "Wall Street Treasury yields climb after Federal Reserve releases interest rate minutes",
        summary: "Traders weighed the outlook for global debt markets and US government paper.",
      };
      expect(isFundsAndFixedIncomeArticle(article2)).toBe(false);
    });
  });

  describe("Batch 1 Targeted Headline Discovery", () => {
    it("qualifies newly targeted Kenya Treasury bond maturity headlines", () => {
      const article = {
        title: "Kenya’s Record KSh 103.4Bn Treasury Bond Matures Today",
        summary: "The National Treasury and CBK prepare for major bond redemptions in the domestic market.",
      };
      expect(isFundsAndFixedIncomeArticle(article)).toBe(true);
    });

    it("qualifies weekly T-Bill auction acceptance reports", () => {
      const article = {
        title: "The Central Bank of Kenya Accepts KSh 57.6Bn at Weekly T-Bills Auction",
        summary: "Investor bids surged across the 91-day, 182-day, and 364-day Treasury bills.",
      };
      expect(isFundsAndFixedIncomeArticle(article)).toBe(true);
    });

    it("qualifies retail DhowCSD government securities bidding headlines", () => {
      const article = {
        title: "CBK introduces mobile payments for government securities bids up to Ksh250,000",
        summary: "Retail investors can now settle Treasury bills and Treasury bonds directly via M-Pesa on DhowCSD.",
      };
      expect(isFundsAndFixedIncomeArticle(article)).toBe(true);
    });

    it("qualifies MMF yield performance ranking reports", () => {
      const article = {
        title: "Top 15 MMFs By Their Net Returns in July 2026",
        summary: "Comparative analysis of money market fund yields published by licensed fund managers in Kenya.",
      };
      expect(isFundsAndFixedIncomeArticle(article)).toBe(true);
    });
  });

  describe("Market Link Strictness & Safety", () => {
    it("ensures general fixed-income stories do NOT attach fake benchmark fund links", () => {
      const title = "Rising treasury bill yields won't derail rate cuts, CBK Governor says";
      const summary = "Interbank rates aligned with the Central Bank Rate as government paper auction participation held strong.";
      
      const fund = findRelatedMmf(title, summary, mockFunds);
      expect(fund).toBeNull();

      const links = buildRelatedMarketLinks(title, summary, mockFunds, [], []);
      expect(links.relatedMmf).toBeNull();
    });

    it("ensures general MMF category stories keep relatedMmf = null", () => {
      const title = "More Kenyans ditch money market funds for higher-yielding special schemes";
      const summary = "MMFs remain popular, but fixed income funds and higher yields attract capital.";
      
      const fund = findRelatedMmf(title, summary, mockFunds);
      expect(fund).toBeNull();

      const links = buildRelatedMarketLinks(title, summary, mockFunds, [], []);
      expect(links.relatedMmf).toBeNull();
    });

    it("links specifically named MMF products to their exact fund entity", () => {
      const title = "Nabo Money Market Fund increases yield to 12.5%";
      const summary = "Nabo Capital announced higher returns for MMF unit holders.";
      
      const fund = findRelatedMmf(title, summary, mockFunds);
      expect(fund).not.toBeNull();
      expect(fund?.slug).toBe("nabo-africa-money-market-fund");
    });
  });
});
