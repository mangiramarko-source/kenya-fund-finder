import { useState } from "react";
import { ArrowLeft, Sparkles, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { StockDecisionContext } from "@/components/news/StockDecisionContext";
import { StockFeedCard } from "@/components/feed/StockFeedCard";
import { SocialFeedCard } from "@/components/feed/SocialFeed";
import { type NewsFromDB, type PublicStock } from "@/lib/api";
import { type FeedItem } from "@/hooks/useSocialFeed";

export default function StockDecisionFeedDemoPage() {
  const navigate = useNavigate();
  useDocumentTitle("Source Attribution & SWS Demo | Kenya Fund Finder", "Demo of two-layer source attribution and 5-pillar fundamental analysis.");
  const [selectedStock, setSelectedStock] = useState<"EQTY" | "SCOM" | "KCB">("EQTY");
  const [selectedGeneralCategory, setSelectedGeneralCategory] = useState<"Kenyan" | "International" | "MMF">("Kenyan");

  const mockArticles: Record<"EQTY" | "SCOM" | "KCB", NewsFromDB> = {
    EQTY: {
      id: "demo-equity-article",
      title: "Equity Group Q3 earnings rise 18% as regional subsidiaries boost non-funded revenue",
      source: "Business Daily",
      url: "https://businessdailyafrica.com/markets/equity-q3",
      category: "Stocks",
      read_time: "3 min read",
      date_published: new Date().toISOString(),
      source_published_at: new Date().toISOString(),
      is_featured: true,
      status: "published",
      image_url: null,
      related_stock_id: "eqty-id",
      ai_insight: JSON.stringify({
        event_label: "Earnings Report",
        impact_horizon: "Medium-term relevance",
        impact_score: 4,
        what_happened: "Equity Group reported an 18% increase in net profit for Q3, led by strong cross-border transaction volumes in DRC and Rwanda.",
        why_it_matters: "Non-funded income now contributes over 42% of operating revenue, protecting the bank against domestic lending margin pressures.",
        confirmed_facts: [
          "Group profit after tax rose 18% year-on-year to KES 40.9 billion.",
          "Regional subsidiaries contributed 38% of total group assets.",
          "Board maintained an interim dividend posture with full-year guidance intact."
        ],
        factors_positive: [
          "Cross-border transaction growth reduces single-country risk.",
          "Cost-to-income ratio improved 140 basis points to 48.2%."
        ],
        factors_negative: [
          "Gross NPL ratio ticked up to 12.1% reflecting regional macroeconomic friction."
        ],
        watch_next: [
          "Full-year audited disclosures and final dividend announcement in March.",
          "CBK monetary policy impact on net interest margins."
        ]
      }),
      content: null,
      created_at: new Date().toISOString(),
    },
    SCOM: {
      id: "demo-safaricom-article",
      title: "Safaricom PLC H1 Financial Statements: M-PESA revenue hits KES 77.2B; Interim dividend declared",
      source: "Nairobi Securities Exchange",
      url: "https://www.nse.co.ke/disclosures/safaricom-h1",
      category: "Stocks",
      read_time: "2 min read",
      date_published: new Date().toISOString(),
      source_published_at: new Date().toISOString(),
      is_featured: true,
      status: "published",
      image_url: null,
      related_stock_id: "scom-id",
      ai_insight: JSON.stringify({
        event_label: "Official Filing",
        impact_horizon: "Immediate relevance",
        impact_score: 5,
        what_happened: "Safaricom published its official H1 audited financial statement on the NSE, confirming a KES 0.55 per share interim dividend.",
        why_it_matters: "Direct exchange filing confirms cash dividend timeline and book-closure dates for registered shareholders.",
        confirmed_facts: [
          "Interim dividend of KES 0.55 per share payable on or about March 31.",
          "Book closure date set for February 20."
        ],
        factors_positive: [
          "Dividend backed 100% by operating cash flows."
        ],
        factors_negative: [
          "FX translation headwinds from Ethiopian birr devaluation."
        ]
      }),
      content: null,
      created_at: new Date().toISOString(),
    },
    KCB: {
      id: "demo-kcb-article",
      title: "KCB Group expands mobile lending partnership to accelerate small business credit",
      source: "Capital FM",
      url: "https://www.capitalfm.co.ke/business/kcb-sme-credit",
      category: "Stocks",
      read_time: "3 min read",
      date_published: new Date().toISOString(),
      source_published_at: new Date().toISOString(),
      is_featured: false,
      status: "published",
      image_url: null,
      related_stock_id: "kcb-id",
      ai_insight: JSON.stringify({
        event_label: "Product Expansion",
        impact_horizon: "Medium-term relevance",
        impact_score: 3,
        what_happened: "KCB launched an updated mobile credit facility for MSMEs with automated scoring and lower disbursement fees.",
        why_it_matters: "Digital underwriting lowers operating costs per loan while expanding the fee-based income pool.",
        confirmed_facts: [
          "Disbursements targeted at 250,000 small traders in year one."
        ],
        factors_positive: [
          "Enhances non-funded transaction revenue."
        ],
        factors_negative: [
          "Early default rates require strict automated credit guardrails."
        ]
      }),
      content: null,
      created_at: new Date().toISOString(),
    }
  };

  const mockStocks: Record<"EQTY" | "SCOM" | "KCB", PublicStock> = {
    EQTY: {
      id: "eqty-id",
      symbol: "EQTY",
      name: "Equity Group Holdings Plc",
      sector: "Banking",
      price: 43.50,
      previous_price: 42.75,
      day_change: 0.75,
      day_change_percent: 1.75,
      volume: 450000,
      market_cap: 164000000000,
      pe_ratio: 4.6,
      dividend_yield: 8.4,
      year_high: 52.50,
      year_low: 36.00,
    },
    SCOM: {
      id: "scom-id",
      symbol: "SCOM",
      name: "Safaricom PLC",
      sector: "Telecommunications",
      price: 35.75,
      previous_price: 35.33,
      day_change: 0.42,
      day_change_percent: 1.2,
      volume: 1250000,
      market_cap: 1430000000000,
      pe_ratio: 10.8,
      dividend_yield: 6.1,
      year_high: 39.50,
      year_low: 15.00,
    },
    KCB: {
      id: "kcb-id",
      symbol: "KCB",
      name: "KCB Group Plc",
      sector: "Banking",
      price: 38.25,
      previous_price: 37.90,
      day_change: 0.35,
      day_change_percent: 0.92,
      volume: 680000,
      market_cap: 122000000000,
      pe_ratio: 3.9,
      dividend_yield: 7.6,
      year_high: 46.00,
      year_low: 22.00,
    }
  };

  const currentStock = mockStocks[selectedStock];
  const currentArticle = mockArticles[selectedStock];

  const demoStockFeedItem: FeedItem = {
    id: `news-${currentArticle.id}`,
    type: "NEWS",
    authorName: currentArticle.source,
    authorLabel: "Stocks",
    title: currentArticle.title,
    content: "Tap to review the full 5-pillar fundamental analysis, valuation multiple context, and Kenyan MMF opportunity-cost comparison.",
    timestamp: new Date(),
    likes: 24,
    comments: 5,
    url: currentArticle.url || "#",
    rawItem: currentArticle,
    relatedStock: {
      id: currentStock.id,
      symbol: currentStock.symbol,
      name: currentStock.name,
      sector: currentStock.sector,
      price: currentStock.price,
      previousPrice: currentStock.previous_price,
      changePercent: currentStock.day_change_percent,
      peRatio: currentStock.pe_ratio,
      dividendYield: currentStock.dividend_yield,
      yearLow: currentStock.year_low,
      yearHigh: currentStock.year_high,
      marketCap: currentStock.market_cap,
    }
  };

  // General news examples demonstrating how media articles are tagged by category (Kenyan, International, MMF)
  const demoGeneralFeedItems: Record<"Kenyan" | "International" | "MMF", FeedItem> = {
    Kenyan: {
      id: "news-kenyan-demo",
      type: "NEWS",
      authorName: "Tuko News",
      authorLabel: "Kenyan",
      title: "Kenyan economy records steady recovery as diaspora remittances and tea exports surge",
      content: "Remittance inflows from North America and Europe continued to provide vital foreign exchange support, keeping import cover steady and reinforcing economic resilience for local businesses.",
      timestamp: new Date(Date.now() - 3600000 * 2),
      likes: 15,
      comments: 2,
      url: "https://www.tuko.co.ke/business-economy/kenya-economic-recovery",
      rawItem: {
        id: "kenyan-demo",
        source: "Tuko News",
        category: "Kenyan",
        read_time: "2 min read",
        url: "https://www.tuko.co.ke/business-economy/kenya-economic-recovery",
      }
    },
    International: {
      id: "news-intl-demo",
      type: "NEWS",
      authorName: "Reuters",
      authorLabel: "International",
      title: "Federal Reserve keeps benchmark interest rates steady as global inflation moderates",
      content: "Global market indices traded higher following signals from major central banks that benchmark borrowing rates will remain steady through mid-year.",
      timestamp: new Date(Date.now() - 3600000 * 4),
      likes: 24,
      comments: 6,
      url: "https://www.reuters.com/markets/global-rates",
      rawItem: {
        id: "intl-demo",
        source: "Reuters",
        category: "International",
        read_time: "3 min read",
        url: "https://www.reuters.com/markets/global-rates",
      }
    },
    MMF: {
      id: "news-mmf-demo",
      type: "NEWS",
      authorName: "Business Daily",
      authorLabel: "MMF",
      title: "Kenyan Money Market Funds maintain 14% yields as Treasury bill demand hits 145%",
      content: "Leading unit trust schemes continued to distribute competitive daily interest rates, anchored by weighted yields of 9.04% across 364-day Treasury paper.",
      timestamp: new Date(Date.now() - 3600000 * 5),
      likes: 31,
      comments: 9,
      url: "https://www.businessdailyafrica.com/markets/mmf-yields-t-bills",
      rawItem: {
        id: "mmf-demo",
        source: "Business Daily",
        category: "Funds & Fixed Income",
        read_time: "2 min read",
        url: "https://www.businessdailyafrica.com/markets/mmf-yields-t-bills",
      }
    }
  };

  const currentGeneralItem = demoGeneralFeedItems[selectedGeneralCategory];

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground md:px-6 md:py-8">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header & Source Tier Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold">Test Source Tier:</span>
            <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40">
              <button
                type="button"
                onClick={() => setSelectedStock("SCOM")}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  selectedStock === "SCOM"
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Tier 1: Official Exchange Filing"
              >
                NSE (Official)
              </button>
              <button
                type="button"
                onClick={() => setSelectedStock("EQTY")}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  selectedStock === "EQTY"
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Tier 2: Financial Press"
              >
                Business Daily
              </button>
              <button
                type="button"
                onClick={() => setSelectedStock("KCB")}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  selectedStock === "KCB"
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Tier 3: Press Coverage"
              >
                Capital FM
              </button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Simply Wall St–Style Analytical Newsfeed & Full Attribution</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            The original media sources (e.g. Tuko News, Business Daily, Capital FM) remain clearly cited on every card, while stock-linked stories feature KenyaFundFinder’s 5-Pillar Scorecard, Snowflake radar, and Kenyan MMF opportunity-cost analysis.
          </p>
        </div>

        {/* Section 1: Stock Feed Card with Two-Layer Attribution */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground">
                1. Stock Story Feed Card ({currentStock.symbol})
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground">
              Source: {currentArticle.source}
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-card p-2 sm:p-4">
            <StockFeedCard
              item={demoStockFeedItem}
              onSelect={() => {}}
            />
          </div>
        </section>

        {/* Section 2: General News Card */}
        <section className="space-y-3 pt-4 border-t border-border/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-500" />
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground">
                2. General News Card Preview ({currentGeneralItem.authorLabel})
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-semibold">Test Category:</span>
              <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40">
                {(["Kenyan", "International", "MMF"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedGeneralCategory(cat)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                      selectedGeneralCategory === cat
                        ? "bg-foreground text-background shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Just like stocks display <strong className="text-foreground">STOCK</strong> next to the ticker name, general news articles display their category title badge (e.g. <strong className="text-foreground">KENYAN</strong> next to Tuko News, <strong className="text-foreground">INTERNATIONAL</strong> next to Reuters, or <strong className="text-foreground">MMF</strong> next to Business Daily).
          </p>

          <div className="rounded-2xl border border-border bg-card p-2 sm:p-4">
            <SocialFeedCard
              item={currentGeneralItem}
              onSelect={() => {}}
            />
          </div>
        </section>

        {/* Section 3: Full Analytical Briefing Preview */}
        <section className="space-y-3 pt-4 border-t border-border/60">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground">
              3. Full Analytical Briefing Preview (Inside Article / Modal)
            </h2>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 md:p-6 shadow-sm">
            <StockDecisionContext
              article={currentArticle}
              stock={currentStock}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
