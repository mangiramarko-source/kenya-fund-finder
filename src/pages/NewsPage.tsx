import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { decodeHtmlEntities } from "@/lib/utils";
import { fetchPublishedNews, fetchPublicStocks, type NewsFromDB } from "@/lib/api";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { Archive, Search, Megaphone, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { SocialFeedCard } from "@/components/feed/SocialFeed";
import { FeedItemDetailModal } from "@/components/feed/FeedItemDetailModal";
import { useFeedInteractions } from "@/hooks/useFeedInteractions";
import { type FeedItem } from "@/hooks/useSocialFeed";
import { useAuth } from "@/hooks/useAuth";
import { getNewsPublishedAt, getNewsPublishedTime } from "@/lib/newsDate";
import { dedupeNewsByUrl } from "@/lib/newsDedupe";

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
    "Kenya Investment News – Stocks, MMFs, FX & Market Updates",
    "Latest Kenyan market news covering NSE stocks, money market fund yields, FX exchange rates, commodities, and macroeconomic updates for Kenyan investors.",
    { title: "Kenya Investment News – Stocks, MMFs, FX & Market Updates", description: "Kenyan market news: NSE stocks, MMF yields, FX rates, commodities, and economic updates." }
  );

  useJsonLd({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://kenyafundfinder.com/news",
    name: "Kenya Investment Market News",
    description: "Curated Kenyan and international financial news covering NSE stocks, money market funds, FX rates, commodities, and macroeconomic trends.",
    url: "https://kenyafundfinder.com/news",
    publisher: {
      "@type": "Organization",
      name: "Kenya Fund Finder",
      url: "https://kenyafundfinder.com",
      logo: { "@type": "ImageObject", url: "https://kenyafundfinder.com/apple-touch-icon.png" }
    },
    about: [
      { "@type": "Thing", name: "Nairobi Securities Exchange" },
      { "@type": "Thing", name: "Money Market Funds Kenya" },
      { "@type": "Thing", name: "Kenya Shilling Exchange Rate" },
      { "@type": "Thing", name: "Kenya Investment News" }
    ],
    inLanguage: "en-KE",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://kenyafundfinder.com/news?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  });

  const { user } = useAuth();
  const { toggleLike, addComment, getPostInteraction } = useFeedInteractions();
  const [articles, setArticles] = useState<NewsFromDB[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNavTab, setActiveNavTab] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFeedItem, setSelectedFeedItem] = useState<FeedItem | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Imperative fill — called with fresh state values, no closure staleness
  const triggerFillForTab = async (
    tab: string,
    currentArticles: NewsFromDB[],
    currentOffset: number,
    currentHasMore: boolean,
    currentStocks: any[]
  ) => {
    const matching = currentArticles.filter(a => tabMatchesArticle(tab, a, currentStocks));
    if (matching.length >= 15 || !currentHasMore) return;
    setLoadingMore(true);
    try {
      const result = await fillTab(tab, currentArticles, currentOffset, currentHasMore, currentStocks);
      setArticles(result.articles);
      setOffset(result.offset);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('fillTab error:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchPublishedNews(60, 0), fetchPublicStocks()])
      .then(([newsData, stocksData]) => {
        const resolved = stocksData || [];
        const more = newsData.length === 60;
        setArticles(newsData);
        setStocks(resolved);
        setOffset(0);
        setHasMore(more);
        setLoading(false);
        // Immediately fill the default tab ("All") — also primes for quick tab switches
        // For "All" this exits instantly (60 ≥ 15), but runs the infrastructure correctly
        triggerFillForTab("All", newsData, 0, more, resolved);
      })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const refreshLatest = async () => {
      try {
        const latest = await fetchPublishedNews(60, 0);
        setArticles(current => {
          const latestIds = new Set(latest.map(article => article.id));
          return dedupeNewsByUrl([
            ...latest,
            ...current.filter(article => !latestIds.has(article.id)),
          ]);
        });
      } catch {
        // Keep the currently rendered feed when a background refresh fails.
      }
    };
    const newsInterval = window.setInterval(refreshLatest, 3 * 60_000);
    const clockInterval = window.setInterval(() => setArticles(current => [...current]), 60_000);
    return () => {
      window.clearInterval(newsInterval);
      window.clearInterval(clockInterval);
    };
  }, []);

  // --- Category match helpers (mirror the feedItems filter logic) ---
  const tabMatchesArticle = (tab: string, a: NewsFromDB, stocksList: any[]): boolean => {
    if (tab === "All" || tab === "Latest" || tab === "Oldest") return true;
    if (tab === "Kenyan") return !isInternationalArticle(a);
    if (tab === "International") return isInternationalArticle(a);
    if (tab === "Stocks") {
      if (a.related_stock_id) return true;
      return stocksList.some(s => {
        const cleanName = s.name.replace(/Group|Holdings|Plc|Ltd|Limited/gi, '').trim();
        const aliases = [s.symbol, s.name];
        if (cleanName.length > 3 && cleanName.toLowerCase() !== 'kenya') aliases.push(cleanName);
        if (cleanName.toLowerCase() === 'equity') aliases.push('Equity Bank');
        if (cleanName.toLowerCase() === 'co-operative') aliases.push('Co-op Bank');
        if (s.symbol === 'SCOM') aliases.push('Safaricom');
        const escaped = aliases.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        return new RegExp(`\\b(${escaped.join('|')})\\b`, 'i').test(a.title);
      });
    }
    if (tab === "MMFs") {
      const rx = /\b(money market( fund)?|mmf|unit trust|collective investment|fund manager|fund yield|money market yield)\b/i;
      return rx.test(a.title) || (!!a.summary && rx.test(a.summary));
    }
    if (tab === "FX Rates") {
      const rx = /\b(shilling|kes|usd\/kes|gbp\/kes|eur\/kes|forex|foreign exchange|currency|exchange rate)\b/i;
      return a.category === "FX & Currency" || rx.test(a.title);
    }
    if (tab === "Commodities") {
      const rx = /\b(oil|crude( oil)?|brent|gold|coffee|tea|fuel|agriculture|agricultural)\b/i;
      return rx.test(a.title);
    }
    return true;
  };

  // Fetch batches until the current tab has at least `target` matching articles OR DB is exhausted.
  // Returns updated [allArticles, newOffset, newHasMore].
  const fillTab = async (
    tab: string,
    existingArticles: NewsFromDB[],
    startOffset: number,
    currentHasMore: boolean,
    stocksList: any[],
    target = 15,
  ): Promise<{ articles: NewsFromDB[]; offset: number; hasMore: boolean }> => {
    let accumulated = [...existingArticles];
    let currentOffset = startOffset;
    let hasMoreRemote = currentHasMore;
    const MAX_BATCHES = 10; // safety cap — never fetch more than 600 extra articles
    let batches = 0;

    while (hasMoreRemote && batches < MAX_BATCHES) {
      const matching = accumulated.filter(a => tabMatchesArticle(tab, a, stocksList));
      if (matching.length >= target) break;

      const nextOffset = currentOffset + 60;
      const batch = await fetchPublishedNews(60, nextOffset);
      batches++;

      if (batch.length > 0) {
        const existingIds = new Set(accumulated.map(a => a.id));
        const fresh = batch.filter(a => !existingIds.has(a.id));
        accumulated = dedupeNewsByUrl([...accumulated, ...fresh]);
        currentOffset = nextOffset;
      }
      if (batch.length < 60) {
        hasMoreRemote = false;
      }
      if (batch.length === 0) break;
    }

    return { articles: accumulated, offset: currentOffset, hasMore: hasMoreRemote };
  };
  // No reactive useEffect needed — fills happen imperatively on tab click and initial load

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await fillTab(activeNavTab, articles, offset, hasMore, stocks);
      setArticles(result.articles);
      setOffset(result.offset);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Failed to load more news:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const filteredArticles = useMemo(() => {
    let list = [...articles];

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q) || (a.summary || "").toLowerCase().includes(q));
    }

    // Sort by Nav Tab (latest/oldest)
    if (activeNavTab === "Latest" || activeNavTab === "All" || ["Kenyan", "International", "Stocks", "MMFs", "FX Rates", "Commodities"].includes(activeNavTab)) {
      list.sort((a, b) => getNewsPublishedTime(b) - getNewsPublishedTime(a));
    } else if (activeNavTab === "Oldest") {
      list.sort((a, b) => getNewsPublishedTime(a) - getNewsPublishedTime(b));
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
        const found = stocks.find(s => {
          const cleanName = s.name.replace(/Group|Holdings|Plc|Ltd|Limited/gi, '').trim();
          const brandAliases = [s.symbol, s.name];
          if (cleanName.length > 3 && cleanName.toLowerCase() !== 'kenya') brandAliases.push(cleanName);
          if (cleanName.toLowerCase() === 'equity') brandAliases.push('Equity Bank');
          if (cleanName.toLowerCase() === 'co-operative') brandAliases.push('Co-op Bank');
          if (s.symbol === 'SCOM') brandAliases.push('Safaricom');
          
          // Escape aliases for regex
          const escapedAliases = brandAliases.map(alias => alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
          const regex = new RegExp(`\\b(${escapedAliases.join('|')})\\b`, 'i');
          return regex.test(a.title);
        });
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
        timestamp: new Date(getNewsPublishedAt(a) || Date.now()),
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

    let allItems = [...items];
    
    // Now perform filtering on allItems based on activeNavTab
    if (activeNavTab === "Kenyan") {
      allItems = allItems.filter(a => !isInternationalArticle(a.rawItem || {}));
    } else if (activeNavTab === "International") {
      allItems = allItems.filter(a => isInternationalArticle(a.rawItem || {}));
    } else if (activeNavTab === "Stocks") {
      allItems = allItems.filter(a => a.rawItem?.category === 'Stocks' || !!a.relatedStock);
    } else if (activeNavTab === "MMFs") {
      const mmfRegex = /\b(money market( fund)?|mmf|unit trust|collective investment|fund manager|fund yield|money market yield)\b/i;
      allItems = allItems.filter(a => 
        a.rawItem?.category === 'MMFs' ||
        mmfRegex.test(a.title) || 
        (a.rawItem?.summary && mmfRegex.test(a.rawItem.summary))
      );
    } else if (activeNavTab === "FX Rates") {
      const fxRegex = /\b(shilling|kes|usd\/kes|gbp\/kes|eur\/kes|forex|foreign exchange|currency|exchange rate)\b/i;
      allItems = allItems.filter(a => 
        a.rawItem?.category === "FX & Currency" || 
        fxRegex.test(a.title)
      );
    } else if (activeNavTab === "Commodities") {
      const commoditiesRegex = /\b(oil|crude( oil)?|brent|gold|coffee|tea|fuel|agriculture|agricultural)\b/i;
      allItems = allItems.filter(a => commoditiesRegex.test(a.title));
    }

    return allItems;
  }, [filteredArticles, stocks, activeNavTab]);

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

      <Link
        to="/news/archive"
        className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 text-sm transition-colors hover:border-emerald-600/50 hover:bg-muted/35"
      >
        <span className="flex items-center gap-2 font-semibold text-foreground"><Archive className="h-4 w-4 text-emerald-700 dark:text-emerald-400" /> Browse the complete news archive</span>
        <span className="text-xs text-muted-foreground">All indexed articles →</span>
      </Link>

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
            "Stocks",
            "MMFs",
            "FX Rates",
            "Commodities",
            "Latest",
            "Oldest",
          ].map((cat) => {
            const isActive = activeNavTab === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveNavTab(cat);
                  // Pass current state directly — no closure staleness possible
                  triggerFillForTab(cat, articles, offset, hasMore, stocks);
                }}
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
          
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-4 mx-auto block px-6 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-50"
            >
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          )}
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
