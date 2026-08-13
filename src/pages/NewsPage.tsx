import { useState, useEffect, useMemo } from "react";
import { decodeHtmlEntities } from "@/lib/utils";
import { fetchPublishedNews, fetchPublicStocks, type NewsFromDB } from "@/lib/api";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Search, Megaphone, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { SocialFeedCard } from "@/components/feed/SocialFeed";
import { FeedItemDetailModal } from "@/components/feed/FeedItemDetailModal";
import { useFeedInteractions } from "@/hooks/useFeedInteractions";
import { type FeedItem } from "@/hooks/useSocialFeed";
import { useAuth } from "@/hooks/useAuth";

const INTERNATIONAL_SOURCES = new Set([
  "Reuters Business",
  "Reuters Markets",
  "Reuters",
  "BBC Business",
  "BBC News",
  "Financial Times Africa",
  "Financial Times",
  "Bloomberg",
  "Al Jazeera",
  "CNBC World",
  "CNBC",
  "Investing.com",
  "MarketWatch",
  "Seeking Alpha",
  "African Business",
  "The Africa Report",
  "Further Africa",
]);

const isInternationalArticle = (a: { source?: string | null; category?: string | null }) =>
  a.category === "International" || (a.source ? INTERNATIONAL_SOURCES.has(a.source) : false);

export default function NewsPage() {
  useDocumentTitle(
    "Market News – Kenya Investment & Global Financial Updates",
    "Stay informed with the latest Kenyan & international investment news, stock updates, unit trust developments, and market trends.",
    { title: "Market News – Kenya Investment & Global Financial Updates", description: "Up-to-date market news covering Kenya and global financial markets." }
  );

  const { user } = useAuth();
  const { toggleLike, addComment, getPostInteraction } = useFeedInteractions();
  const [articles, setArticles] = useState<NewsFromDB[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNavTab, setActiveNavTab] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFeedItem, setSelectedFeedItem] = useState<FeedItem | null>(null);

  useEffect(() => {
    Promise.all([fetchPublishedNews(), fetchPublicStocks()])
      .then(([newsData, stocksData]) => {
        setArticles(newsData);
        setStocks(stocksData || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredArticles = useMemo(() => {
    let list = [...articles];

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q) || (a.summary || "").toLowerCase().includes(q));
    }

    // Filter & Sort by Nav Tab
    if (activeNavTab === "Kenyan") {
      list = list.filter(a => !isInternationalArticle(a));
    } else if (activeNavTab === "International") {
      list = list.filter(a => isInternationalArticle(a));
    } else if (activeNavTab === "Latest") {
      list.sort((a, b) => new Date(b.created_at || b.date_published).getTime() - new Date(a.created_at || a.date_published).getTime());
    } else if (activeNavTab === "Oldest") {
      list.sort((a, b) => new Date(a.created_at || a.date_published).getTime() - new Date(b.created_at || b.date_published).getTime());
    } else {
      // "All" defaults to latest first
      list.sort((a, b) => new Date(b.created_at || b.date_published).getTime() - new Date(a.created_at || a.date_published).getTime());
    }

    return list;
  }, [articles, activeNavTab, searchQuery]);

  const feedItems = useMemo(() => {
    const items: FeedItem[] = filteredArticles.map((a) => {
      // Find related stock if present
      let relatedStock: any = null;
      if (a.related_stock_id) {
        relatedStock = stocks.find(s => s.id === a.related_stock_id);
      }
      if (!relatedStock) {
        const titleUpper = a.title.toUpperCase();
        const found = stocks.find(s => titleUpper.includes(s.symbol));
        if (found) relatedStock = found;
      }

      return {
        id: `news-${a.id}`,
        type: "NEWS" as const,
        authorName: a.source || "Market News",
        authorLabel: a.category || "News",
        title: decodeHtmlEntities(a.title),
        content: a.summary || a.content || "",
        mediaUrl: a.image_url || undefined,
        mediaType: a.image_url ? ("image" as const) : undefined,
        timestamp: new Date(a.created_at || a.date_published || Date.now()),
        likes: a.likes || 0,
        comments: a.comments || 0,
        url: a.url || "#",
        rawItem: a,
        relatedStock: relatedStock ? {
          id: relatedStock.id,
          symbol: relatedStock.symbol,
          name: relatedStock.name,
          price: relatedStock.price || 35.75,
          previousPrice: relatedStock.previous_price || 35.0,
          changePercent: relatedStock.day_change_percent || 1.2
        } : null
      };
    });

    // Add Demo Stock Articles at the top for UI testing with different stocks and dynamic data
    const eqtyStock = stocks.find(s => s.symbol === "EQTY") || {
      id: "demo-eqty",
      symbol: "EQTY",
      name: "Equity Group Holdings",
      price: 42.50,
      previous_price: 41.50,
      day_change_percent: 2.4
    };

    const kcbStock = stocks.find(s => s.symbol === "KCB") || {
      id: "demo-kcb",
      symbol: "KCB",
      name: "KCB Group PLC",
      price: 38.20,
      previous_price: 38.50,
      day_change_percent: -0.8
    };

    const demoArticleEqty: FeedItem = {
      id: "demo-eqty-article",
      type: "NEWS",
      authorName: "Business Daily",
      authorLabel: "Banking & Finance",
      title: "Equity Group expands digital lending platform into DRC market",
      content: "Equity Group Holdings has launched its proprietary micro-lending API in the Democratic Republic of Congo, targeting small business owners and cross-border traders with instant credit access via mobile wallets.",
      isHeadlineOnly: false,
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
      likes: 89,
      comments: 7,
      rawItem: {
        id: "demo-eqty-article",
        title: "Equity Group expands digital lending platform into DRC market",
        source: "Business Daily",
        parsed_ai_analysis: {
          event_label: "Regional Expansion",
          impact_horizon: "Long-term relevance",
          factors_positive: [
            "Access to 90M+ underserved population in DRC market.",
            "Higher net interest margins expected on mobile lending products."
          ],
          factors_negative: [
            "Currency volatility risks associated with Congolese Franc.",
            "Potential increase in non-performing loan (NPL) ratio in new market."
          ],
          what_happened: "Equity Group Holdings introduced instant digital loans in DRC to accelerate regional expansion.",
          verified_figures: ["Targeting 90M+ population", "Mobile API deployment"],
          price_reaction_context: {
            "1D": "+2.4%",
            "7D": "+1.1%",
            "1M": "+4.5%",
            "3M": "+12.0%",
            context: "Shares rallied 2.4% following the DRC expansion news, outperforming the broader banking index."
          },
          related_disclosures: [
            { title: "DRC Expansion Strategy Brief (PDF)", url: "#" },
            { title: "Regulatory Approval Notice", url: "#" }
          ],
          source_quality: "Tier 1 Media",
          clustered_count: 2
        }
      },
      relatedStock: {
        id: eqtyStock.id,
        symbol: eqtyStock.symbol,
        name: eqtyStock.name,
        price: eqtyStock.price || 42.50,
        previousPrice: eqtyStock.previous_price || 41.50,
        changePercent: eqtyStock.day_change_percent || 2.4
      }
    };

    const demoArticleKcb: FeedItem = {
      id: "demo-kcb-article",
      type: "NEWS",
      authorName: "Standard Media",
      authorLabel: "Corporate Earnings",
      title: "KCB Group reports 18% surge in H1 net profit following NBK integration",
      content: "KCB Group PLC posted strong half-year financial results with profit after tax rising to KES 29.9 Billion, buoyed by non-funded revenue growth and operational synergies following the full integration of National Bank of Kenya.",
      isHeadlineOnly: false,
      timestamp: new Date(Date.now() - 2 * 3600 * 1000), // 2 hours ago
      likes: 142,
      comments: 19,
      rawItem: {
        id: "demo-kcb-article",
        title: "KCB Group reports 18% surge in H1 net profit following NBK integration",
        source: "Standard Media",
        parsed_ai_analysis: {
          event_label: "Earnings Report",
          impact_horizon: "Immediate relevance",
          factors_positive: [
            "Non-interest revenue surged 24% year-on-year.",
            "Cost-to-income ratio improved from 51% down to 46%."
          ],
          factors_negative: [
            "Loan loss provisioning increased by 8% due to retail stress.",
            "Macroeconomic inflationary pressure on operational expenditure."
          ],
          what_happened: "KCB Group PLC declared H1 profit after tax of KES 29.9B (+18% YoY) driven by transaction fees and cost efficiencies.",
          verified_figures: ["KES 29.9B Net Profit", "+18% YoY Growth", "46% Cost-to-Income Ratio"],
          price_reaction_context: {
            "1D": "-0.8%",
            "7D": "+2.5%",
            "1M": "+8.2%",
            "3M": "+15.1%",
            context: "Immediate term profit-taking saw shares dip 0.8%, but the stock remains strongly up over the last month on earnings anticipation."
          },
          related_disclosures: [
            { title: "H1 2024 Unaudited Financial Results", url: "#" },
            { title: "Investor Presentation", url: "#" },
            { title: "Dividend Declaration Notice", url: "#" }
          ],
          source_quality: "Official",
          clustered_count: 5
        }
      },
      relatedStock: {
        id: kcbStock.id,
        symbol: kcbStock.symbol,
        name: kcbStock.name,
        price: kcbStock.price || 38.20,
        previousPrice: kcbStock.previous_price || 38.50,
        changePercent: kcbStock.day_change_percent || -0.8
      }
    };

    return [demoArticleEqty, demoArticleKcb, ...items];
  }, [filteredArticles, stocks]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-8 w-full max-w-md" />
        <div className="space-y-4 pt-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">Market News</h1>
          <Badge variant="secondary" className="text-xs bg-muted/80">{filteredArticles.length} articles</Badge>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search market news..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 text-xs pl-8 bg-card border-border rounded-full w-full"
          />
        </div>
      </div>

      {/* Watchlist Briefing */}
      {user && (
        <div className="mb-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">Your Watchlist Briefing</h2>
          </div>
          <div className="space-y-3">
            <p className="text-[14px] text-foreground/90 leading-relaxed">
              <strong>KCB Group (KCB):</strong> H1 earnings beat expectations with 18% YoY growth, driven by non-funded revenue. Short-term outlook remains positive.
            </p>
            <p className="text-[14px] text-foreground/90 leading-relaxed">
              <strong>Equity Group (EQTY):</strong> Expansion into DRC announced via mobile API deployment. Potential long-term growth, but keep an eye on currency volatility risks.
            </p>
          </div>
        </div>
      )}

      {/* Top Nav Filter Tabs */}
      <div className="relative mb-6 border-b border-border dark:border-white/10">
        <div className="flex overflow-x-auto gap-6 sm:gap-8 pb-2.5 hide-scrollbar text-sm font-medium">
          {[
            "All",
            "Kenyan",
            "International",
            "Latest",
            "Oldest",
          ].map((cat) => {
            const isActive = activeNavTab === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveNavTab(cat)}
                className={`whitespace-nowrap transition-colors duration-200 relative pb-1 text-sm ${
                  isActive
                    ? "text-foreground font-bold dark:text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
                {isActive && (
                  <span className="absolute bottom-[-11px] left-0 right-0 h-[2px] bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Articles Feed */}
      {feedItems.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-2xl">
          <Megaphone className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium">No articles found matching your criteria.</p>
          <p className="text-xs mt-1 text-muted-foreground/60">Try searching for something else or selecting a different tab.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-20">
          {feedItems.map((item) => (
            <SocialFeedCard
              key={item.id}
              item={item}
              onSelect={setSelectedFeedItem}
            />
          ))}
        </div>
      )}

      {/* Pop-up Detail Modal */}
      <FeedItemDetailModal
        item={selectedFeedItem}
        open={!!selectedFeedItem}
        onOpenChange={(open) => {
          if (!open) setSelectedFeedItem(null);
        }}
        interaction={selectedFeedItem ? getPostInteraction(selectedFeedItem.id, selectedFeedItem.likes || 0) : undefined}
        onLikeToggle={toggleLike}
        onAddComment={addComment}
      />
    </div>
  );
}
