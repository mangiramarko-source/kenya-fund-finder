import { Fragment, useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link, useLocation, useNavigationType } from "react-router-dom";
import { decodeHtmlEntities } from "@/lib/utils";
import { fetchPublishedNews, fetchStockLinkedNews, fetchPublicStocks, type NewsFromDB } from "@/lib/api";
import { findMentionedStock } from "@/lib/stockNewsFeed";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { Archive, Megaphone, Sparkles, Bookmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SocialFeedCard } from "@/components/feed/SocialFeed";
import { StockFeedCard } from "@/components/feed/StockFeedCard";
import { FeedItemDetailModal } from "@/components/feed/FeedItemDetailModal";
import { FeedPollCard } from "@/components/feed/FeedPollCard";
import { FeedTriviaCard } from "@/components/feed/FeedTriviaCard";
import { useFeedInteractions } from "@/hooks/useFeedInteractions";
import { type FeedItem } from "@/hooks/useSocialFeed";
import { useAuth } from "@/hooks/useAuth";
import InlineDataGate from "@/components/auth/InlineDataGate";
import { isBotOrPrerender } from "@/hooks/useSoftWallTrigger";
import { isFundsAndFixedIncomeArticle, FUNDS_AND_FIXED_INCOME_TAB } from "@/lib/fundsFixedIncomeNews";
import { getNewsPublishedAt, getNewsPublishedTime } from "@/lib/newsDate";
import { matchesNewsTab } from "@/lib/newsTabMatching";
import { dedupeNewsArticles, interleaveItems } from "@/lib/newsDedupe";
import { classifyArticleCategory } from "@/lib/articleCategoryClassifier";
import { calculateRankScore } from "@/lib/feedEngagement";
import OverviewPortfolioWidget from "@/components/portfolio/OverviewPortfolioWidget";
import { newsCache } from "@/lib/newsCache";
import { stockCache } from "@/lib/stockCache";
import { feedNavigationState } from "@/lib/feedNavigationState";

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

  const { user, loading: authLoading } = useAuth();
  const isGated = !authLoading && !user && !isBotOrPrerender();
  const {
    toggleLike,
    toggleUpvote,
    toggleBookmark,
    recordView,
    addComment,
    getPostInteraction,
    userBookmarks,
  } = useFeedInteractions();
  const [articles, setArticles] = useState<NewsFromDB[]>(() => {
    const cached = newsCache.loadNews();
    return cached?.articles || [];
  });
  const [stocks, setStocks] = useState<any[]>(() => {
    const cached = stockCache.loadStocks();
    return cached?.stocks || [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = newsCache.loadNews();
    return !(cached?.articles && cached.articles.length > 0);
  });
  const location = useLocation();
  const navType = useNavigationType();

  const [activeNavTab, setActiveNavTab] = useState<string>(() => {
    if (navType === "POP" && typeof window !== "undefined") {
      const saved = feedNavigationState.getState(window.location.pathname);
      if (saved?.activeCategory) return saved.activeCategory;
    }
    return DEFAULT_NEWS_TAB;
  });
  const activeNavTabRef = useRef(activeNavTab);
  useEffect(() => {
    activeNavTabRef.current = activeNavTab;
  }, [activeNavTab]);

  // Persist scroll position and category on route exit and page hide
  useEffect(() => {
    const saveState = () => {
      feedNavigationState.saveState(location.pathname, {
        scrollY: window.scrollY,
        activeCategory: activeNavTabRef.current,
      });
    };

    window.addEventListener("pagehide", saveState);
    return () => {
      saveState();
      window.removeEventListener("pagehide", saveState);
    };
  }, [location.pathname]);

  const scrollToFeedTop = useCallback(() => {
    const headerEl = document.getElementById("market-news-header");
    if (headerEl) {
      const rect = headerEl.getBoundingClientRect();
      const targetScrollY = Math.max(0, window.scrollY + rect.bottom - 56);
      if (window.scrollY > targetScrollY) {
        window.scrollTo({ top: targetScrollY, behavior: "instant" });
      }
    } else if (window.scrollY > 0) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, []);

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
    const matching = currentArticles.filter(a =>
      tab === "Stocks" ? Boolean(findMentionedStock(a, currentStocks)) : matchesNewsTab(tab, a, currentStocks)
    );
    if (matching.length >= 15 || !currentHasMore) return;
    if (matching.length === 0) {
      setLoadingMore(true);
    }
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
    Promise.allSettled([fetchPublishedNews(60, 0), fetchStockLinkedNews(40), fetchPublicStocks()])
      .then(([newsResult, stockNewsResult, stocksResult]) => {
        const newsData = newsResult.status === "fulfilled" ? newsResult.value : [];
        const stockNewsData = stockNewsResult.status === "fulfilled" ? stockNewsResult.value : [];
        const stocksData = stocksResult.status === "fulfilled" ? stocksResult.value : [];
        const resolved = stocksData || [];
        const mergedNews = dedupeNewsArticles([
          ...newsData,
          ...stockNewsData.filter((s) => !newsData.some((g) => g.id === s.id)),
        ]);
        const more = newsData.length > 0;
        setArticles(mergedNews);
        if (mergedNews.length > 0) {
          newsCache.saveNews(mergedNews);
        }
        setStocks(resolved);
        setOffset(0);
        setHasMore(more);
        setLoading(false);
        // Only trigger extra fill batches if the default tab requires filtering beyond "All"
        if (DEFAULT_NEWS_TAB !== "All") {
          triggerFillForTab(DEFAULT_NEWS_TAB, mergedNews, 0, more, resolved);
        }
      })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const refreshLatest = async () => {
      try {
        const [latest, stockNews] = await Promise.all([
          fetchPublishedNews(60, 0),
          fetchStockLinkedNews(40),
        ]);
        setArticles(current => {
          const incoming = [...latest, ...stockNews];
          const incomingIds = new Set(incoming.map(article => article.id));
          const updated = dedupeNewsArticles([
            ...incoming,
            ...current.filter(article => !incomingIds.has(article.id)),
          ]);
          if (updated.length > 0) {
            newsCache.saveNews(updated);
          }
          return updated;
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
    const MAX_BATCHES = 2; // Fast cap to avoid lag/lockups
    let batches = 0;

    while (hasMoreRemote && batches < MAX_BATCHES) {
      const matching = accumulated.filter(a =>
        tab === "Stocks" ? Boolean(findMentionedStock(a, stocksList)) : matchesNewsTab(tab, a, stocksList)
      );
      if (matching.length >= target) break;

      const nextOffset = currentOffset + 60;
      const batch = await fetchPublishedNews(60, nextOffset);
      batches++;

      if (batch.length > 0) {
        const existingIds = new Set(accumulated.map(a => a.id));
        const fresh = batch.filter(a => !existingIds.has(a.id));
        accumulated = dedupeNewsArticles([...accumulated, ...fresh]);
        currentOffset = nextOffset;
      } else {
        hasMoreRemote = false;
        break;
      }
    }

    return { articles: accumulated, offset: currentOffset, hasMore: hasMoreRemote };
  };
  // No reactive useEffect needed — fills happen imperatively on tab click and initial load

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const currentMatchingCount = articles.filter((a) =>
        activeNavTab === "Stocks"
          ? Boolean(findMentionedStock(a, stocks))
          : matchesNewsTab(activeNavTab, a, stocks),
      ).length;
      const result = await fillTab(
        activeNavTab,
        articles,
        offset,
        hasMore,
        stocks,
        currentMatchingCount + 15,
      );
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
    if (activeNavTab === "All" || activeNavTab === "Latest") {
      const texts = list
        .filter((a) => !a.video_url)
        .sort((a, b) => getNewsPublishedTime(b) - getNewsPublishedTime(a));
      const videos = list
        .filter((a) => Boolean(a.video_url))
        .sort((a, b) => getNewsPublishedTime(b) - getNewsPublishedTime(a));
      return interleaveItems(texts, videos, 1, 4);
    } else if (activeNavTab === "Top Ranked" || activeNavTab === "Saved" || ["Kenyan", "International", "Stocks", "MMFs", "FX Rates", "Commodities"].includes(activeNavTab)) {
      list.sort((a, b) => getNewsPublishedTime(b) - getNewsPublishedTime(a));
    } else if (activeNavTab === "Oldest") {
      list.sort((a, b) => getNewsPublishedTime(a) - getNewsPublishedTime(b));
    }

    return list;
  }, [articles, activeNavTab]);

  const feedItems = useMemo(() => {
    const items: FeedItem[] = filteredArticles.map((a) => {
      // Find related stock if present (explicit link first, then ticker/brand mention in title or summary)
      const relatedStock: any = findMentionedStock(a, stocks) || null;

      const displayCategory = classifyArticleCategory({
        title: a.title,
        summary: a.summary,
        content: a.content,
        category: a.category,
        source: a.source,
        relatedStock,
        related_stock_id: a.related_stock_id,
      });

      return {
        id: `news-${a.id}`,
        type: "NEWS" as const,
        authorName: a.source || "Market News",
        authorLabel: displayCategory,
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
          sector: relatedStock.sector ?? null,
          logoUrl: relatedStock.logo_url ?? null,
          price: relatedStock.price || 35.75,
          previousPrice: relatedStock.previous_price || 35.0,
          changePercent: relatedStock.day_change_percent || 1.2,
          peRatio: relatedStock.pe_ratio ?? null,
          dividendYield: relatedStock.dividend_yield ?? null,
          yearLow: relatedStock.year_low ?? null,
          yearHigh: relatedStock.year_high ?? null,
          marketCap: relatedStock.market_cap ?? null,
        } : null,
        relatedSymbols: relatedStock ? [relatedStock.symbol] : undefined,
      };
    });

    let allItems = [...items];
    
    // Perform filtering / sorting on allItems based on activeNavTab
    if (activeNavTab === "Saved") {
      allItems = allItems.filter(
        a => userBookmarks[a.id] || (a.rawItem?.id && userBookmarks[a.rawItem.id]) || userBookmarks[`news-${a.rawItem?.id}`]
      );
    } else if (activeNavTab === "Top Ranked") {
      allItems.sort((a, b) => {
        const interA = getPostInteraction(a.id, a.likes || 0, a.timestamp);
        const interB = getPostInteraction(b.id, b.likes || 0, b.timestamp);
        const scoreA = calculateRankScore({
          upvotes: interA.upvoteCount,
          likes: interA.likeCount,
          comments: interA.comments.length || a.comments || 0,
          views: interA.viewsCount,
        });
        const scoreB = calculateRankScore({
          upvotes: interB.upvoteCount,
          likes: interB.likeCount,
          comments: interB.comments.length || b.comments || 0,
          views: interB.viewsCount,
        });
        return scoreB - scoreA;
      });
    } else if (activeNavTab === "Stocks") {
      allItems = allItems.filter(a => Boolean(a.relatedStock));
    } else if (["Kenyan", "International", "FX Rates", "Commodities"].includes(activeNavTab)) {
      allItems = allItems.filter(a => matchesNewsTab(activeNavTab, a.rawItem || a, stocks));
    } else if (activeNavTab === FUNDS_AND_FIXED_INCOME_TAB || activeNavTab === "MMFs") {
      allItems = allItems.filter(a => isFundsAndFixedIncomeArticle(a.rawItem || a));
    }

    return allItems;
  }, [filteredArticles, stocks, activeNavTab, userBookmarks, getPostInteraction]);

  const displayFeedItems = isGated && feedItems.length > 3 ? feedItems.slice(0, 3) : feedItems;

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

  useEffect(() => {
    if (newTodayCount > 0 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("kff:market-news-count", { detail: newTodayCount }));
    }
  }, [newTodayCount]);

  // Restore scroll position on back navigation
  const hasRestoredScrollRef = useRef(false);
  useEffect(() => {
    if (navType !== "POP" || hasRestoredScrollRef.current) return;
    const saved = feedNavigationState.getState(location.pathname);
    if (!saved) return;

    if (saved.activeCategory && saved.activeCategory !== activeNavTabRef.current) {
      setActiveNavTab(saved.activeCategory);
    }

    const restoreScroll = () => {
      if (saved.scrollY > 0) {
        window.scrollTo({ top: saved.scrollY, behavior: "instant" });
      }
    };

    if (feedItems.length > 0) {
      hasRestoredScrollRef.current = true;
      restoreScroll();
      requestAnimationFrame(restoreScroll);
      setTimeout(restoreScroll, 50);
    }
  }, [navType, location.pathname, feedItems.length]);

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6 min-h-screen">
      {/* User Portfolio Cards */}
      <OverviewPortfolioWidget />

      {/* Header */}
      <div className="mb-3.5 mt-0" id="market-news-header" data-new-count={newTodayCount}>
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">Market News</h1>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {newTodayCount > 0 ? `${newTodayCount} new today` : `${filteredArticles.length} articles`}
          </span>
        </div>
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
      <div
        className="no-scrollbar mb-4 flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain sticky z-30 -mx-4 px-4 py-2.5 bg-background/95 backdrop-blur-md border-b border-border/40 top-safe-sticky-tabs md:static md:w-full md:max-w-full md:mx-0 md:px-0 md:py-0 md:bg-transparent md:backdrop-blur-none md:border-b-0 md:z-auto pb-1 md:pb-1"
      >
        {[
          DEFAULT_NEWS_TAB,
          "Top Ranked",
          "Saved",
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
              onClick={(e) => {
                setActiveNavTab(f);
                scrollToFeedTop();
                e.currentTarget.scrollIntoView({
                  behavior: "smooth",
                  inline: "center",
                  block: "nearest",
                });
                setTimeout(() => {
                  triggerFillForTab(f, articles, offset, hasMore, stocks);
                }, 0);
              }}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-foreground text-background font-bold shadow-xs"
                  : "border border-border/80 bg-background text-zinc-800 dark:text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Articles Feed */}
      {feedItems.length === 0 ? (
        loading ? (
          <div className="space-y-3 pb-20">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : activeNavTab === "Saved" ? (
          <div className="text-center py-16 px-4 border border-dashed border-border rounded-2xl bg-card/40 space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
              <Bookmark className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">No saved stories yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Tap the bookmark icon on any article in your feed to save it for quick reference and offline reading.
            </p>
            <button
              type="button"
              onClick={() => setActiveNavTab(DEFAULT_NEWS_TAB)}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
            >
              Browse All News
            </button>
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-2xl">
            <Megaphone className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium">No articles found matching your criteria.</p>
            <p className="text-xs mt-1 text-muted-foreground/60">Try searching for something else or selecting a different tab.</p>
          </div>
        )
      ) : (
        <div className="space-y-0 md:space-y-4 md:pt-4 pb-20">
          {displayFeedItems.map((item, index) => {
            const card = item.relatedStock ? (
              <StockFeedCard
                key={item.id}
                item={item}
                index={index}
                onSelect={setSelectedFeedItem}
                interaction={getPostInteraction(item.id, item.likes || 0, item.timestamp)}
                onLikeToggle={toggleLike}
                onUpvoteToggle={toggleUpvote}
                onBookmarkToggle={toggleBookmark}
                onRecordView={recordView}
              />
            ) : (
              <SocialFeedCard
                key={item.id}
                item={item}
                index={index}
                onSelect={setSelectedFeedItem}
                interaction={getPostInteraction(item.id, item.likes || 0, item.timestamp)}
                onLikeToggle={toggleLike}
                onUpvoteToggle={toggleUpvote}
                onBookmarkToggle={toggleBookmark}
                onRecordView={recordView}
              />
            );

            return (
              <Fragment key={`feed-frag-${item.id}`}>
                {card}
                {index === 2 && !isGated && <FeedPollCard key="in-feed-poll" index={index + 1} />}
                {index === 6 && <FeedTriviaCard key="in-feed-trivia" index={index + 1} />}
              </Fragment>
            );
          })}

          {isGated && feedItems.length > 3 && (
            <div
              aria-hidden="true"
              className="pointer-events-none select-none blur-[2px] opacity-40 rounded-xl border border-border/70 bg-card p-4 space-y-3"
            >
              <div className="flex justify-between items-center">
                <div className="h-3 w-20 bg-muted rounded" />
                <div className="h-4 w-12 bg-muted rounded-full" />
              </div>
              <div className="h-5 w-4/5 bg-muted rounded" />
              <div className="h-4 w-full bg-muted rounded" />
            </div>
          )}

          {isGated && feedItems.length > 3 && (
            <InlineDataGate
              category="news"
              totalCount={articles.length || feedItems.length}
              visibleCount={3}
              title="Unlock All Kenyan Market News & Disclosures"
              description="Showing top 3 stories. Create a free account to read all market news, company earnings announcements, and analyst briefings."
            />
          )}
          
          {!isGated && hasMore && (
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
        interaction={selectedFeedItem ? getPostInteraction(selectedFeedItem.id, selectedFeedItem.likes || 0, selectedFeedItem.timestamp) : undefined}
        onLikeToggle={toggleLike}
        onUpvoteToggle={toggleUpvote}
        onBookmarkToggle={toggleBookmark}
        onRecordView={recordView}
        onAddComment={addComment}
      />
    </div>
  );
}
