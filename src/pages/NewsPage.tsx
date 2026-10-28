import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { decodeHtmlEntities } from "@/lib/utils";
import { fetchPublishedNews, fetchPublicStocks, type NewsFromDB } from "@/lib/api";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { Archive, Megaphone, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PageLoadingGate from "@/components/PageLoadingGate";
import { SocialFeedCard } from "@/components/feed/SocialFeed";
import { StockFeedCard } from "@/components/feed/StockFeedCard";
import { FeedItemDetailModal } from "@/components/feed/FeedItemDetailModal";
import { useFeedInteractions } from "@/hooks/useFeedInteractions";
import { type FeedItem } from "@/hooks/useSocialFeed";
import { useAuth } from "@/hooks/useAuth";
import { isFundsAndFixedIncomeArticle, FUNDS_AND_FIXED_INCOME_TAB } from "@/lib/fundsFixedIncomeNews";
import { getNewsPublishedAt, getNewsPublishedTime } from "@/lib/newsDate";
import { matchesNewsTab } from "@/lib/newsTabMatching";
import { dedupeNewsByUrl } from "@/lib/newsDedupe";
import OverviewPortfolioWidget from "@/components/portfolio/OverviewPortfolioWidget";

const DEFAULT_NEWS_TAB = "All";

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
  const [activeNavTab, setActiveNavTab] = useState<string>(DEFAULT_NEWS_TAB);
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
    const matching = currentArticles.filter(a => matchesNewsTab(tab, a, currentStocks));
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
    Promise.allSettled([fetchPublishedNews(60, 0), fetchPublicStocks()])
      .then(([newsResult, stocksResult]) => {
        const newsData = newsResult.status === "fulfilled" ? newsResult.value : [];
        const stocksData = stocksResult.status === "fulfilled" ? stocksResult.value : [];
        const resolved = stocksData || [];
        const more = newsData.length === 60;
        setArticles(newsData);
        setStocks(resolved);
        setOffset(0);
        setHasMore(more);
        setLoading(false);
        // Immediately fill the default tab — also primes quick tab switches.
        triggerFillForTab(DEFAULT_NEWS_TAB, newsData, 0, more, resolved);
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
      const matching = accumulated.filter(a => matchesNewsTab(tab, a, stocksList));
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
    const list = [...articles];

    // Sort by Nav Tab (latest/oldest)
    if (activeNavTab === "Latest" || activeNavTab === "All" || ["Kenyan", "International", "Stocks", "MMFs", "FX Rates", "Commodities"].includes(activeNavTab)) {
      list.sort((a, b) => getNewsPublishedTime(b) - getNewsPublishedTime(a));
    } else if (activeNavTab === "Oldest") {
      list.sort((a, b) => getNewsPublishedTime(a) - getNewsPublishedTime(b));
    }

    return list;
  }, [articles, activeNavTab]);

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
    if (["Kenyan", "International", "Stocks", "FX Rates", "Commodities"].includes(activeNavTab)) {
      allItems = allItems.filter(a => matchesNewsTab(activeNavTab, a.rawItem || a, stocks));
    } else if (activeNavTab === FUNDS_AND_FIXED_INCOME_TAB || activeNavTab === "MMFs") {
      allItems = allItems.filter(a => isFundsAndFixedIncomeArticle(a.rawItem || a));
    }

    return allItems;
  }, [filteredArticles, stocks, activeNavTab]);

  const newTodayCount = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    return (articles || []).filter((item) => {
      const timeSource = getNewsPublishedAt(item);
      if (!timeSource) return false;
      const pubTime = new Date(timeSource).getTime();
      return !isNaN(pubTime) && now - pubTime <= oneDayMs;
    }).length;
  }, [articles]);

  return (
    <PageLoadingGate isReady={!loading} message="Loading latest market news…" loaderClassName="min-h-screen">
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6 min-h-screen">
      {/* User Portfolio Cards */}
      <OverviewPortfolioWidget />

      {/* Header */}
      <div className="mb-3.5 mt-0">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Market News</h1>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {newTodayCount > 0 ? `${newTodayCount} new today` : `${filteredArticles.length} articles`}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1 md:hidden">
          Latest financial news, company disclosures, and market updates in Kenya.
        </p>
      </div>

      {/* Watchlist Briefing (For signed-in users) */}
      {user && (
        <div className="mb-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">Your Watchlist Briefing</h2>
          </div>
          <div className="space-y-2 text-xs text-foreground/90 leading-relaxed">
            <p>
              <strong>KCB Group (KCB):</strong> H1 earnings beat expectations with 18% YoY growth, driven by non-funded revenue.
            </p>
            <p>
              <strong>Equity Group (EQTY):</strong> Expansion into regional markets continues with mobile API deployments.
            </p>
          </div>
        </div>
      )}

      {/* Category Filter Pills (Exact Match to Original Market News on Overview) */}
      <div className="no-scrollbar mb-4 flex w-full min-w-0 max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1">
        {[
          DEFAULT_NEWS_TAB,
          "Stocks",
          "Kenyan",
          "International",
          FUNDS_AND_FIXED_INCOME_TAB,
          "FX Rates",
          "Commodities",
          "Latest",
          "Oldest",
        ].map((f) => {
          const isActive = activeNavTab === f;
          return (
            <button
              key={f}
              onClick={() => {
                setActiveNavTab(f);
                triggerFillForTab(f, articles, offset, hasMore, stocks);
              }}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-foreground text-background font-bold shadow-xs"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/80"
              }`}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Articles Feed */}
      {feedItems.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-2xl">
          <Megaphone className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium">No articles found matching your criteria.</p>
          <p className="text-xs mt-1 text-muted-foreground/60">Try searching for something else or selecting a different tab.</p>
        </div>
      ) : (
        <div className="space-y-0 md:space-y-4 pb-20">
          {feedItems.map((item, index) =>
            item.relatedStock ? (
              <StockFeedCard
                key={item.id}
                item={item}
                index={index}
                onSelect={setSelectedFeedItem}
                interaction={getPostInteraction(item.id, item.likes || 0)}
                onLikeToggle={toggleLike}
              />
            ) : (
              <SocialFeedCard
                key={item.id}
                item={item}
                index={index}
                onSelect={setSelectedFeedItem}
                interaction={getPostInteraction(item.id, item.likes || 0)}
                onLikeToggle={toggleLike}
              />
            )
          )}
          
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-6 mx-auto block px-6 py-2 text-sm font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-50"
            >
              {loadingMore ? "Loading more stories..." : "Load More Articles"}
            </button>
          )}

          {/* Clean footer archive link */}
          <div className="pt-8 pb-4 text-center">
            <Link
              to="/news/archive"
              className="inline-flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-emerald-500/40 transition-all"
            >
              <Archive className="h-4 w-4 text-emerald-500" />
              <span>Browse the complete news archive ({articles.length}+ articles) →</span>
            </Link>
          </div>
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
    </PageLoadingGate>
  );
}
