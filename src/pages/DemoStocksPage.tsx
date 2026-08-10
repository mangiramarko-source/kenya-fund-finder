import React, { useState, useMemo } from "react";
import { StockFeedCard } from "@/components/feed/StockFeedCard";
import type { FeedItem } from "@/hooks/useSocialFeed";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Search, Megaphone, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

interface DemoStockArticle {
  id: string;
  ticker: string;
  price: number;
  currency: string;
  changePercent: number;
  companyName: string;
  companyLogo: string;
  source: string;
  timeAgo: string;
  title: string;
  insight: string;
  likes: number;
  comments: number;
}

const DEMO_ARTICLES: DemoStockArticle[] = [
  {
    id: "1",
    ticker: "SCOM",
    price: 15.45,
    currency: "KES ",
    changePercent: 1.2,
    companyName: "Safaricom PLC",
    companyLogo: "https://www.safaricom.co.ke/images/Amended-Safaricom-Logo-1.png",
    source: "Business Daily",
    timeAgo: "2 hours ago",
    title: "Safaricom moves to block competitors from utilizing its mobile money agent network in new dispute",
    insight: "Safaricom has submitted an appeal to the communications regulator seeking to maintain exclusive agreements with its M-PESA agents. This could restrict competitors from expanding their financial services footprint, preserving Safaricom's market dominance in mobile payments.",
    likes: 24,
    comments: 5
  },
  {
    id: "2",
    ticker: "EQTY",
    price: 45.30,
    currency: "KES ",
    changePercent: -0.8,
    companyName: "Equity Group Holdings",
    companyLogo: "https://equitygroupholdings.com/ke/wp-content/uploads/sites/2/2023/11/Equity-Logo.png",
    source: "Reuters Markets",
    timeAgo: "5 hours ago",
    title: "Equity Group announces expansion into new regional markets despite currency volatility",
    insight: "Equity's aggressive expansion strategy continues despite the weakening of regional currencies against the dollar. The bank's diversified portfolio aims to mitigate local economic shocks by tapping into faster-growing neighboring economies.",
    likes: 12,
    comments: 0
  },
  {
    id: "3",
    ticker: "KCB",
    price: 28.90,
    currency: "KES ",
    changePercent: 0.0,
    companyName: "KCB Group",
    companyLogo: "https://kcbgroup.com/images/KCB_Logo.png",
    source: "Financial Times",
    timeAgo: "1 day ago",
    title: "KCB Group posts mixed results for Q3, driven by higher provisions for bad loans",
    insight: "Rising non-performing loans have eaten into KCB's profits this quarter, highlighting the strain of high interest rates on borrowers. However, their digital lending platforms showed strong growth, partially offsetting the losses.",
    likes: 1,
    comments: 1
  },
  {
    id: "4",
    ticker: "EABL",
    price: 142.00,
    currency: "KES ",
    changePercent: 2.5,
    companyName: "East African Breweries Ltd",
    companyLogo: "https://www.eabl.com/sites/default/files/eabl-logo.png",
    source: "Business Daily",
    timeAgo: "2 days ago",
    title: "EABL raises dividend payout as premium beer sales jump 18% in East Africa",
    insight: "Strong demand for premium brands in urban markets boosted net revenues for EABL, helping cushion profit margins against raw material inflation.",
    likes: 18,
    comments: 3
  }
];

export default function DemoStocksPage() {
  useDocumentTitle("Stocks Feed Demo – Market News", "Demo preview of the Stocks feed matching the main news page design.");

  const [activeNavTab, setActiveNavTab] = useState<string>("All Stocks");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredArticles = useMemo(() => {
    let list = [...DEMO_ARTICLES];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => 
        a.title.toLowerCase().includes(q) || 
        a.ticker.toLowerCase().includes(q) || 
        a.companyName.toLowerCase().includes(q)
      );
    }
    if (activeNavTab === "Banking") {
      list = list.filter(a => a.ticker === "EQTY" || a.ticker === "KCB");
    } else if (activeNavTab === "Telecoms") {
      list = list.filter(a => a.ticker === "SCOM");
    } else if (activeNavTab === "Manufacturing") {
      list = list.filter(a => a.ticker === "EABL");
    }
    return list;
  }, [activeNavTab, searchQuery]);

  const toFeedItem = (article: DemoStockArticle): FeedItem => ({
    id: `news-${article.id}`,
    type: "NEWS",
    authorName: article.source,
    authorLabel: "Stocks",
    title: article.title,
    content: article.insight,
    timestamp: new Date(Date.now() - Number.parseInt(article.timeAgo, 10) * 60 * 60 * 1000),
    likes: article.likes,
    comments: article.comments,
    url: "#",
    aiInsight: article.insight,
    relatedStock: {
      id: article.id,
      symbol: article.ticker,
      name: article.companyName,
      price: article.price,
      previousPrice: null,
      changePercent: article.changePercent,
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 min-h-screen">
      {/* Demo Notice Banner */}
      <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold bg-emerald-500 text-black px-1.5 py-0.5 rounded text-[10px] uppercase">DEMO PREVIEW</span>
          <span>This page demonstrates how Stock Updates look using the main News feed design system.</span>
        </div>
        <Link to="/news" className="underline font-semibold hover:text-emerald-300">
          Back to News
        </Link>
      </div>

      {/* Header matching NewsPage */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">Stock Updates</h1>
          <Badge variant="secondary" className="text-xs bg-muted/80">{filteredArticles.length} updates</Badge>
        </div>

        {/* Search Input matching NewsPage */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search stocks or tickers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 text-xs pl-8 bg-card border-border rounded-full w-full"
          />
        </div>
      </div>

      {/* Top Nav Filter Tabs matching NewsPage */}
      <div className="relative mb-6 border-b border-border dark:border-white/10">
        <div className="flex overflow-x-auto gap-6 sm:gap-8 pb-2.5 hide-scrollbar text-sm font-medium">
          {[
            "All Stocks",
            "Banking",
            "Telecoms",
            "Manufacturing",
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

      {/* Articles Feed matching NewsPage */}
      {filteredArticles.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-2xl">
          <Megaphone className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium">No stock updates found matching your criteria.</p>
          <p className="text-xs mt-1 text-muted-foreground/60">Try searching for a ticker like SCOM, EQTY, or KCB.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-20">
          {filteredArticles.map((article) => (
            <StockFeedCard
              key={article.id}
              item={toFeedItem(article)}
              onSelect={() => undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
