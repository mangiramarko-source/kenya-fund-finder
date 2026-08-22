import { describe, expect, it } from "vitest";
import type { NewsFromDB, PublicStock } from "@/lib/api";
import { buildInvestorBriefing, isSemanticallySimilar } from "./newsBriefingMapper";

const mockStock: PublicStock = {
  id: "stock-scom",
  symbol: "SCOM",
  name: "Safaricom PLC",
  price: 36.35,
  previous_price: 36.21,
  day_change_percent: 0.39,
};

const baseArticle: NewsFromDB = {
  id: "art-1",
  title: "ZiiDi Trader now accepts Kenyan passports, military IDs and foreign passports",
  summary: "ZiiDi Trader expanded access to more potential users, including KDF members and non-Kenyan residents.",
  content: "ZiiDi Trader now accepts Kenyan passports, military IDs and foreign passports. This expands access to more potential users, including KDF members and non-Kenyan residents.",
  source: "Business Daily",
  date_published: "2026-08-20T10:00:00.000Z",
  source_published_at: "2026-08-20T09:30:00.000Z",
  url: "https://businessdailyafrica.com/markets/ziidi-trader-ids",
  category: "Telecommunications",
  read_time: "2 min read",
  is_featured: false,
  status: "published",
  image_url: "https://example.com/img.jpg",
  related_stock_id: "stock-scom",
  ai_insight: JSON.stringify({
    what_happened: "ZiiDi Trader now accepts Kenyan passports, military IDs and foreign passports, expanding registration options for potential users.",
    why_it_matters: "A larger group of eligible users could help Safaricom expand adoption of ZiiDi Trader and increase financial-services ecosystem activity.",
    confirmed_facts: [
      "ZiiDi Trader expanded the IDs accepted during registration.",
      "Kenyan passports, military IDs, and foreign passports are now accepted.",
      "The service operates through M-PESA."
    ],
    verified_figures: ["4 new ID types accepted"],
    factors_positive: [
      "More eligible users could increase platform adoption."
    ],
    factors_negative: [
      "The announcement does not disclose expected user growth or revenue impact."
    ],
    not_confirmed: [
      "The source does not quantify expected revenue impact.",
      "There is no evidence that today's share-price movement was caused by this story."
    ],
    watch_next: [
      "ZiiDi Trader user-growth figures",
      "Safaricom financial-services revenue in the next trading update",
      "SCOM price and trading volume"
    ],
    impact_score: 3,
    impact_reason: "Direct product expansion for M-PESA ecosystem, but immediate revenue impact unquantified."
  }),
};

describe("newsBriefingMapper", () => {
  it("builds a clean 9-section briefing for a stock-linked article", () => {
    const briefing = buildInvestorBriefing(baseArticle, { stock: mockStock });

    // 1. Takeaway
    expect(briefing.takeaway.length).toBeGreaterThanOrEqual(1);
    expect(briefing.takeaway[0]).toContain("ZiiDi Trader now accepts");

    // 2. Why This Matters
    expect(briefing.whyThisMatters.length).toBeGreaterThanOrEqual(1);
    expect(briefing.whyThisMatters[0]).toContain("larger group of eligible users");

    // 3. Market Snapshot
    expect(briefing.marketSnapshot).toBeDefined();
    expect(briefing.marketSnapshot?.assetType).toBe("stock");
    expect(briefing.marketSnapshot?.symbolOrName).toBe("SCOM");
    expect(briefing.marketSnapshot?.priceOrYield).toBe("KES 36.35");
    expect(briefing.marketSnapshot?.changeText).toBe("+0.39%");
    expect(briefing.marketSnapshot?.previousPriceOrRate).toBe("KES 36.21");
    expect(briefing.marketSnapshot?.impactScore).toBe(3);

    // 4. What We Know (Facts only)
    expect(briefing.whatWeKnow.length).toBeGreaterThanOrEqual(2);
    expect(briefing.whatWeKnow[0]).toContain("ZiiDi Trader expanded the IDs");

    // 5. What It Could Mean (Interpretation)
    expect(briefing.whatItCouldMean.length).toBeGreaterThanOrEqual(1);
    expect(briefing.whatItCouldMean[0].label).toBe("Potential positive");

    // 6. What We Don't Know (Guardrails)
    expect(briefing.whatWeDontKnow.length).toBeGreaterThanOrEqual(1);
    expect(briefing.whatWeDontKnow[0]).toContain("does not quantify expected revenue impact");

    // 7. Watch Next
    expect(briefing.watchNext.length).toBeGreaterThanOrEqual(2);
    expect(briefing.watchNext[0]).toContain("user-growth figures");

    // 8. Source
    expect(briefing.source.name).toBe("Business Daily");
    expect(briefing.source.sourceDomain).toBe("businessdailyafrica.com");

    // 9. Timeline (for stock)
    expect(briefing.timeline).toBeDefined();
    expect(briefing.timeline?.[0].label).toBe("Today");
  });

  it("does NOT generate a Market Snapshot or Company Timeline when no stock/asset is linked", () => {
    const macroArticle: NewsFromDB = {
      ...baseArticle,
      related_stock_id: null,
      ai_insight: JSON.stringify({
        what_happened: "Central Bank of Kenya maintained the benchmark interest rate at 12.75% following the latest MPC meeting.",
        why_it_matters: "Stable benchmark rates help anchor inflation expectations and keep commercial bank lending rates predictable.",
        confirmed_facts: [
          "CBK held the policy rate at 12.75%.",
          "Inflation remained within the target band of 5±2.5%."
        ],
        watch_next: [
          "Next MPC meeting schedule",
          "Interbank liquidity and 91-day T-bill yields"
        ],
        impact_score: 3
      }),
    };

    const briefing = buildInvestorBriefing(macroArticle, {});

    expect(briefing.marketSnapshot).toBeNull();
    expect(briefing.timeline).toBeNull();
    expect(briefing.takeaway[0]).toContain("Central Bank of Kenya");
    expect(briefing.whatWeKnow[0]).toContain("12.75%");
  });

  it("handles older legacy articles with no AI insight gracefully", () => {
    const legacyArticle: NewsFromDB = {
      ...baseArticle,
      ai_insight: null,
      parsed_ai_analysis: null,
      summary: "Kenya Power plans to roll out 500,000 smart meters to reduce technical and commercial losses across urban centers.",
      content: "Kenya Power plans to roll out 500,000 smart meters to reduce technical and commercial losses across urban centers.",
    };

    const briefing = buildInvestorBriefing(legacyArticle, {});

    expect(briefing.takeaway.length).toBeGreaterThanOrEqual(1);
    expect(briefing.takeaway[0]).toContain("Kenya Power plans to roll out 500,000 smart meters");
    // Should not crash, and should keep empty/short states rather than fabricating
    expect(briefing.source.name).toBe("Business Daily");
  });

  it("handles legacy narrative_sections structure without duplicating text", () => {
    const legacyAnalysis = {
      narrative_sections: [
        {
          heading: "The story",
          body: "KCB Group received regulatory approval to finalize the sale of National Bank of Kenya."
        },
        {
          heading: "The market link",
          body: "The transaction frees up capital for KCB to strengthen its balance sheet and regional operations."
        },
        {
          heading: "What is not proven",
          body: "Final net cash proceeds and dividend impact have not been confirmed by the lender."
        }
      ],
      analyst_summary: "KCB Group received regulatory approval to finalize the sale of National Bank of Kenya.",
      why_it_matters: "The transaction frees up capital for KCB to strengthen its balance sheet and regional operations.",
      watch_next: ["Closing transaction date", "Capital adequacy ratio updates"]
    };

    const legacyArticle: NewsFromDB = {
      ...baseArticle,
      ai_insight: JSON.stringify(legacyAnalysis),
    };

    const briefing = buildInvestorBriefing(legacyArticle, { stock: mockStock });

    expect(briefing.takeaway[0]).toContain("KCB Group received regulatory approval");
    expect(briefing.whyThisMatters[0]).toContain("transaction frees up capital");
    // Semantic deduplication: takeaway and whyThisMatters must not be identical
    expect(isSemanticallySimilar(briefing.takeaway[0], briefing.whyThisMatters[0])).toBe(false);
    expect(briefing.whatWeDontKnow[0]).toContain("Final net cash proceeds");
  });

  it("builds correct snapshot for MMF, FX, and Commodity assets", () => {
    const mmfAsset = { id: "mmf-1", name: "Kuza MMF", manager: "Kuza Asset Management", annualYield: 14.5, changePercent: 0.2 };
    const briefingMmf = buildInvestorBriefing(baseArticle, { mmf: mmfAsset });
    expect(briefingMmf.marketSnapshot?.assetType).toBe("mmf");
    expect(briefingMmf.marketSnapshot?.priceOrYield).toBe("14.50%");
    expect(briefingMmf.marketSnapshot?.changeText).toBe("+0.20%");

    const fxAsset = { pair: "USD/KES", rate: 129.5, changePercent: -0.15 };
    const briefingFx = buildInvestorBriefing(baseArticle, { fx: fxAsset });
    expect(briefingFx.marketSnapshot?.assetType).toBe("fx");
    expect(briefingFx.marketSnapshot?.priceOrYield).toBe("KES 129.50");

    const cmdAsset = { name: "Brent Crude", price: 74.2, unit: "USD/bbl", changePercent: 1.4 };
    const briefingCmd = buildInvestorBriefing(baseArticle, { commodity: cmdAsset });
    expect(briefingCmd.marketSnapshot?.assetType).toBe("commodity");
    expect(briefingCmd.marketSnapshot?.priceOrYield).toBe("74.20 USD/bbl");
  });

  it("gracefully omits empty sections for sparse articles without creating filler (Case E)", () => {
    const sparseArticle: NewsFromDB = {
      id: "sparse-123",
      title: "NSE Morning Trading Brief",
      summary: "Trading commenced on Tuesday with moderate activity in the banking sector.",
      content: "",
      source: "Business Daily",
      url: "https://businessdailyafrica.com/sparse-123",
      image_url: null,
      related_stock_id: null,
      ai_insight: null,
      created_at: "2026-08-20T08:00:00Z",
    };

    const briefing = buildInvestorBriefing(sparseArticle);
    expect(briefing.takeaway.length).toBe(1);
    expect(briefing.takeaway[0]).toContain("Trading commenced on Tuesday");
    // No fake market snapshot, timeline, or fabricated interpretation
    expect(briefing.marketSnapshot).toBeNull();
    expect(briefing.timeline).toBeNull();
    expect(briefing.whatItCouldMean).toHaveLength(0);
    expect(briefing.whyThisMatters).toHaveLength(0);
    expect(briefing.whatWeDontKnow).toHaveLength(0);
    expect(briefing.watchNext).toHaveLength(0);
  });

  it("handles weak/uncertain market relationship without manufacturing fake impact (Case B)", () => {
    const uncertainAnalysis: NewsAiAnalysis = {
      what_happened: "The Ministry of Energy held stakeholder consultations on renewable power tariffs.",
      why_it_matters: "Policy discussions may eventually shape energy pricing framework.",
      confirmed_facts: ["Energy ministry held public stakeholder meetings in Nairobi on Thursday."],
      not_confirmed: ["No specific tariff adjustments or effective dates were announced."],
      impact_score: undefined,
    };

    const article: NewsFromDB = {
      id: "energy-policy-1",
      title: "Energy ministry opens tariff review consultations",
      summary: "Energy ministry begins discussions on power tariffs.",
      content: "",
      source: "The Standard",
      url: "https://standardmedia.co.ke/tariff-review",
      image_url: null,
      related_stock_id: null,
      ai_insight: JSON.stringify(uncertainAnalysis),
      created_at: "2026-08-21T10:00:00Z",
    };

    const briefing = buildInvestorBriefing(article);
    expect(briefing.marketSnapshot).toBeNull();
    expect(briefing.whatWeKnow).toHaveLength(1);
    expect(briefing.whatWeDontKnow[0]).toContain("No specific tariff adjustments");
    expect(briefing.whatItCouldMean).toHaveLength(0); // No fabricated positives/negatives
  });
});

describe("isSemanticallySimilar Audit", () => {
  it("detects exact duplicates correctly", () => {
    const textA = "Safaricom expanded eligible identification documents.";
    const textB = "Safaricom expanded eligible identification documents.";
    expect(isSemanticallySimilar(textA, textB)).toBe(true);
  });

  it("detects paraphrased duplicates correctly", () => {
    const textA = "The transaction frees up regulatory capital for KCB Group.";
    const textB = "This transaction frees up capital for KCB Group.";
    expect(isSemanticallySimilar(textA, textB, 0.65)).toBe(true);
  });

  it("does NOT mark related but distinct facts as duplicates", () => {
    const textA = "Safaricom expanded eligible identification documents.";
    const textB = "Foreign passport holders can now register for the trading platform.";
    expect(isSemanticallySimilar(textA, textB)).toBe(false);
  });

  it("does NOT mark two different numeric facts as duplicates", () => {
    const textA = "Net earnings grew by 12.5% in the first half.";
    const textB = "Net earnings grew by 24.8% in the first half.";
    expect(isSemanticallySimilar(textA, textB)).toBe(false);
  });

  it("preserves fact vs interpretation distinction describing similar subject matter", () => {
    const confirmedFact = "Central Bank of Kenya retained the benchmark CBR rate at 12.75%.";
    const interpretation = "The CBR rate pause helps commercial banks maintain lending margins.";
    expect(isSemanticallySimilar(confirmedFact, interpretation)).toBe(false);
  });
});
