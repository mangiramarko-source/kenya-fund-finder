import { type FeedItem } from "@/hooks/useSocialFeed";

export function getDemoArticles(scomStock?: any): FeedItem[] {
  const demoStockArticle: FeedItem = {
    id: "demo-eqty-article",
    type: "NEWS",
    authorName: "Business Daily",
    authorLabel: "Market News",
    title: "Equity Group expands digital lending platform into DRC market",
    content: "Equity Group Holdings has launched its proprietary micro-lending API in the Democratic Republic of Congo, targeting small business owners and cross-border traders with instant credit access via mobile wallets.",
    isHeadlineOnly: false,
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    likes: 124,
    comments: 28,
    rawItem: {
      id: "demo-eqty-article",
      title: "Equity Group expands digital lending platform into DRC market",
      source: "Business Daily",
      parsed_ai_analysis: {
        event_label: "Market Expansion",
        impact_horizon: "Medium term relevance",
        factors_positive: [
          "Access to an untapped market with high mobile money penetration.",
          "Potential to significantly boost non-funded income over the next 3 quarters."
        ],
        factors_negative: [
          "Regulatory uncertainty in the DRC financial sector.",
          "Initial setup and operational costs may impact short-term margins."
        ],
        what_happened: "Equity Group rolled out a new digital lending API in the DRC specifically designed for SMEs and cross-border traders.",
        verified_figures: ["Targeting 5M new users", "Initial rollout in 3 major cities"],
        price_reaction_context: {
          "1D": "+1.2%",
          "7D": "+4.5%",
          "1M": "-2.1%",
          "3M": "+8.9%",
          context: "The stock saw a modest bump today, reflecting long-term optimism regarding regional expansion."
        },
        related_disclosures: [
          { title: "Press Release", url: "#" }
        ],
        source_quality: "Tier 1 Media",
        clustered_count: 3
      }
    },
    relatedStock: scomStock || null
  };

  const demoMmfArticle: FeedItem = {
    id: "demo-mmf-article",
    type: "NEWS",
    authorName: "Business Daily",
    authorLabel: "Unit Trusts",
    title: "Sanlam Money Market Fund yields cross 14% as T-bill rates climb",
    content: "Sanlam has announced a record high yield on its flagship money market fund, attracting significant retail inflows as investors seek to beat inflation amidst rising 91-day T-bill rates.",
    isHeadlineOnly: false,
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    likes: 88,
    comments: 15,
    rawItem: {
      id: "demo-mmf-article",
      title: "Sanlam Money Market Fund yields cross 14% as T-bill rates climb",
      source: "Business Daily",
      parsed_ai_analysis: {
        event_label: "Yield Update",
        impact_horizon: "Immediate relevance",
        factors_positive: [
          "Current yield of 14.2% effectively beats the 6.7% inflation rate.",
          "High liquidity allows T+1 day withdrawals for retail investors."
        ],
        factors_negative: [
          "Expected rate cuts by the CBK could lower yields in the medium term.",
          "Increased AUM might dilute future returns if high-yield assets are scarce."
        ],
        what_happened: "Sanlam MMF reported an annualized yield exceeding 14%, directly correlated with recent central bank monetary tightening.",
        verified_figures: ["14.2% Annualized Yield", "6.7% Inflation Rate"],
        price_reaction_context: {
          "1D": "+0.1%",
          "7D": "+0.4%",
          "1M": "+1.2%",
          "3M": "+3.4%",
          context: "The fund has maintained a steady upward trajectory in daily compounding interest."
        },
        related_disclosures: [
          { title: "Fund Fact Sheet", url: "#" }
        ],
        source_quality: "Verified Reporting",
        clustered_count: 2
      }
    },
    relatedMmf: {
      id: "mmf-sanlam",
      name: "Sanlam MMF",
      yield: 14.20,
      changePercent: 0.15
    }
  };

  const demoFxArticle: FeedItem = {
    id: "demo-fx-article",
    type: "NEWS",
    authorName: "Central Bank of Kenya",
    authorLabel: "Currency Markets",
    title: "Kenya Shilling rallies against the Dollar following Eurobond buyback",
    content: "The Kenya Shilling has recorded its strongest weekly gain against the US Dollar in over two years, fueled by increased dollar inflows and the successful buyback of the 2024 Eurobond.",
    isHeadlineOnly: false,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    likes: 245,
    comments: 63,
    rawItem: {
      id: "demo-fx-article",
      title: "Kenya Shilling rallies against the Dollar following Eurobond buyback",
      source: "Central Bank of Kenya",
      parsed_ai_analysis: {
        event_label: "Currency Rally",
        impact_horizon: "Medium term relevance",
        factors_positive: [
          "Reduced external debt servicing pressure.",
          "Lowered cost of imports for local manufacturers."
        ],
        factors_negative: [
          "Exporters face reduced local currency earnings.",
          "Diaspora remittances may temporarily slow down due to unfavorable conversion rates."
        ],
        what_happened: "The KES appreciated by 3.5% against the USD in a single week following the CBK's proactive management of external debt obligations.",
        verified_figures: ["3.5% Appreciation", "$1.5B Eurobond Buyback"],
        price_reaction_context: {
          "1D": "-1.2%",
          "7D": "-3.5%",
          "1M": "-5.8%",
          "3M": "-8.2%",
          context: "The USD/KES pair has been on a strong downtrend, reflecting significant shilling appreciation."
        },
        related_disclosures: [
          { title: "CBK Weekly Bulletin", url: "#" }
        ],
        source_quality: "Official Source",
        clustered_count: 5
      }
    },
    relatedFx: {
      id: "fx-usdkes",
      pair: "USD/KES",
      rate: 132.50,
      changePercent: -1.2
    }
  };

  const demoCommodityArticle: FeedItem = {
    id: "demo-commodity-article",
    type: "NEWS",
    authorName: "Tea Board of Kenya",
    authorLabel: "Export Markets",
    title: "Tea auction prices hit a 6-month high amid supply constraints",
    content: "Average tea prices at the Mombasa auction rose to $2.45 per kilo this week, driven by strong demand from key export destinations and lower crop yields due to unpredictable weather patterns.",
    isHeadlineOnly: false,
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    likes: 112,
    comments: 21,
    rawItem: {
      id: "demo-commodity-article",
      title: "Tea auction prices hit a 6-month high amid supply constraints",
      source: "Tea Board of Kenya",
      parsed_ai_analysis: {
        event_label: "Price Surge",
        impact_horizon: "Short term relevance",
        factors_positive: [
          "Higher earnings for smallholder farmers and listed agricultural firms.",
          "Boosts national foreign exchange reserves."
        ],
        factors_negative: [
          "Risk of buyers shifting to cheaper alternative markets (e.g., Sri Lanka, India).",
          "Weather volatility continues to threaten future supply consistency."
        ],
        what_happened: "Tea prices reached $2.45/kg at the Mombasa auction, a 6-month high, attributed to a 15% drop in supply and sustained demand from Egypt and Pakistan.",
        verified_figures: ["$2.45 per Kilo", "15% Supply Drop"],
        price_reaction_context: {
          "1D": "+2.1%",
          "7D": "+4.5%",
          "1M": "+8.2%",
          "3M": "+12.5%",
          context: "Tea prices have seen a sustained rally over the last quarter due to climatic factors."
        },
        related_disclosures: [
          { title: "Mombasa Auction Report", url: "#" }
        ],
        source_quality: "Industry Authority",
        clustered_count: 1
      }
    },
    relatedCommodity: {
      id: "cmd-tea",
      name: "KTDA Tea",
      price: 2.45,
      unit: "USD/kg",
      changePercent: 2.1
    }
  };

  return [demoStockArticle, demoMmfArticle, demoFxArticle, demoCommodityArticle];
}
