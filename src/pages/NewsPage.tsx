import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { decodeHtmlEntities } from "@/lib/utils";
import { Link } from "react-router-dom";
import { fetchPublishedNews, type NewsFromDB } from "@/lib/api";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { Clock, TrendingUp, Landmark, Shield, Megaphone, Sparkles, Calendar, Newspaper, ExternalLink, Search, Loader2, SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { getNewsImage, handleNewsImageError } from "@/lib/news-images";

const categories = ["All", "Yield Updates", "Market News", "Regulatory Updates", "Fund Announcements"] as const;

const categoryIcons: Record<string, typeof TrendingUp> = {
  "Yield Updates": TrendingUp,
  "Market News": Landmark,
  "Regulatory Updates": Shield,
  "Fund Announcements": Megaphone,
};

const categoryDot: Record<string, string> = {
  "Yield Updates": "bg-accent",
  "Market News": "bg-info",
  "Regulatory Updates": "bg-warning",
  "Fund Announcements": "bg-primary",
};

const sourceColors: Record<string, string> = {
  "Business Daily": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Standard Media": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "The Star": "bg-red-500/10 text-red-400 border-red-500/20",
  "Nation": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Capital FM": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Tuko News": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

const INTERNATIONAL_SOURCES = new Set([
  "Reuters Business",
  "Reuters Markets",
  "BBC Business",
  "Financial Times Africa",
  "Al Jazeera",
  "CNBC World",
  "Investing.com",
  "MarketWatch",
  "Seeking Alpha",
  "African Business",
  "The Africa Report",
  "Further Africa",
]);

const isInternationalArticle = (a: { source?: string | null; category?: string | null }) =>
  a.category === "International" || (a.source ? INTERNATIONAL_SOURCES.has(a.source) : false);

type RegionFilter = "all" | "kenya" | "international";

type SortOption = "latest" | "oldest" | "featured";

type RecencyOption = "all" | "24h" | "7d" | "30d";

const RECENCY_HOURS: Record<RecencyOption, number | null> = {
  all: null,
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
};

const normalizeUrlForDedup = (url?: string | null): string | null => {
  if (!url) return null;
  try {
    const u = new URL(url);
    u.hash = "";
    Array.from(u.searchParams.keys()).forEach((k) => {
      if (k.startsWith("utm_") || ["fbclid", "gclid", "ref", "mc_cid", "mc_eid"].includes(k)) {
        u.searchParams.delete(k);
      }
    });
    let s = `${u.host.toLowerCase()}${u.pathname.replace(/\/+$/, "")}`;
    const qs = u.searchParams.toString();
    if (qs) s += `?${qs}`;
    return s;
  } catch {
    return url.toLowerCase().trim();
  }
};

const normalizeTitleForDedup = (title: string): string =>
  title.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-KE", { month: "short", day: "numeric" });

const formatDateLong = (d: string) =>
  new Date(d).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" });

const SourceBadge = ({ source }: { source: string }) => {
  const colors = sourceColors[source] || "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border ${colors}`}>
      {source}
    </span>
  );
};

const NewsPage = () => {
  const navTo = useNavigate();
  useDocumentTitle(
    "Kenya Investment News – Unit Trusts, Stocks & Market Updates",
    "Stay informed with the latest Kenyan investment news: unit trust yield updates, NSE stock market news, regulatory changes, and fund announcements.",
    { title: "Kenya Investment News – Unit Trusts, Stocks & Market Updates", description: "Latest Kenyan investment news covering unit trust yields, stock market, FX rates, and regulatory changes." }
  );
  const [activeCategory] = useState<string>("All");
  const [articles, setArticles] = useState<NewsFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchPublishedNews().then((data) => { setArticles(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  // Unique sources for filter
  const sources = useMemo(() => {
    const s = new Set(articles.map(a => a.source).filter(Boolean));
    return Array.from(s).sort();
  }, [articles]);
  const [activeSource] = useState<string>("All");
  const [region, setRegion] = useState<RegionFilter>("all");
  const [recency, setRecency] = useState<RecencyOption>("all");

  const regionCounts = useMemo(() => {
    let intl = 0;
    let ke = 0;
    for (const a of articles) {
      if (isInternationalArticle(a)) intl++;
      else ke++;
    }
    return { kenya: ke, international: intl };
  }, [articles]);

  const filtered = useMemo(() => {
    let list = articles;
    if (region === "kenya") list = list.filter(a => !isInternationalArticle(a));
    else if (region === "international") list = list.filter(a => isInternationalArticle(a));
    if (activeCategory !== "All") list = list.filter((a) => a.category === activeCategory);
    if (activeSource !== "All") list = list.filter((a) => a.source === activeSource);

    // Recency window
    const hours = RECENCY_HOURS[recency];
    if (hours != null) {
      const cutoff = Date.now() - hours * 3600 * 1000;
      list = list.filter((a) => new Date(a.date_published).getTime() >= cutoff);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q));
    }

    // Within-window dedup by URL and normalized title (newest kept)
    const byTime = [...list].sort(
      (a, b) => new Date(b.date_published).getTime() - new Date(a.date_published).getTime()
    );
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();
    const deduped: typeof list = [];
    for (const a of byTime) {
      const nUrl = normalizeUrlForDedup(a.url);
      const nTitle = normalizeTitleForDedup(a.title);
      if (nUrl && seenUrls.has(nUrl)) continue;
      if (nTitle && seenTitles.has(nTitle)) continue;
      if (nUrl) seenUrls.add(nUrl);
      if (nTitle) seenTitles.add(nTitle);
      deduped.push(a);
    }
    list = deduped;

    if (sortBy === "featured") {
      list = [...list].sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
    } else {
      list = [...list].sort((a, b) => {
        const diff = new Date(b.date_published).getTime() - new Date(a.date_published).getTime();
        return sortBy === "oldest" ? -diff : diff;
      });
    }
    return list;
  }, [articles, activeCategory, activeSource, sortBy, searchQuery, region, recency]);

  // Hero pool: featured first, then latest, capped at 6
  const heroPool = useMemo(() => {
    const featured = filtered.filter((a) => a.is_featured);
    const rest = filtered.filter((a) => !a.is_featured);
    const merged: typeof filtered = [];
    const seen = new Set<string>();
    for (const a of [...featured, ...rest]) {
      if (!seen.has(a.id)) { seen.add(a.id); merged.push(a); }
      if (merged.length >= 6) break;
    }
    return merged;
  }, [filtered]);

  // Hero: large feature card (left) + 4 mini cards (right sidebar)
  const heroArticle = heroPool[0] || null;
  const heroSidebar = useMemo(() => {
    if (!heroArticle) return filtered.slice(0, 4);
    return filtered.filter((a) => a.id !== heroArticle.id).slice(0, 4);
  }, [filtered, heroArticle]);
  // Latest News: next 6 after hero+sidebar (3-col x 2 rows)
  const latestArticles = useMemo(() => {
    const used = new Set([heroArticle?.id, ...heroSidebar.map(a => a.id)]);
    return filtered.filter((a) => !used.has(a.id)).slice(0, 12);
  }, [filtered, heroArticle, heroSidebar]);
  // Must Read: 1 wide + 3 list items
  const mustReadFeature = useMemo(() => {
    const used = new Set([heroArticle?.id, ...heroSidebar.map(a => a.id), ...latestArticles.map(a => a.id)]);
    return filtered.find((a) => !used.has(a.id)) || null;
  }, [filtered, heroArticle, heroSidebar, latestArticles]);
  const mustReadList = useMemo(() => {
    const used = new Set([heroArticle?.id, ...heroSidebar.map(a => a.id), ...latestArticles.map(a => a.id), mustReadFeature?.id]);
    return filtered.filter((a) => !used.has(a.id)).slice(0, 11);
  }, [filtered, heroArticle, heroSidebar, latestArticles, mustReadFeature]);
  // Weekly Highlight: horizontal scroll
  const weeklyHighlight = useMemo(() => {
    const used = new Set([heroArticle?.id, ...heroSidebar.map(a => a.id), ...latestArticles.map(a => a.id), mustReadFeature?.id, ...mustReadList.map(a => a.id)]);
    return filtered.filter((a) => !used.has(a.id)).slice(0, 12);
  }, [filtered, heroArticle, heroSidebar, latestArticles, mustReadFeature, mustReadList]);
  // International: dedicated row of global articles (only when not already filtered to a region)
  const internationalArticles = useMemo(() => {
    if (region !== "all") return [];
    const used = new Set([
      heroArticle?.id,
      ...heroSidebar.map(a => a.id),
      ...latestArticles.map(a => a.id),
      mustReadFeature?.id,
      ...mustReadList.map(a => a.id),
      ...weeklyHighlight.map(a => a.id),
    ]);
    return filtered.filter((a) => isInternationalArticle(a) && !used.has(a.id)).slice(0, 12);
  }, [filtered, region, heroArticle, heroSidebar, latestArticles, mustReadFeature, mustReadList, weeklyHighlight]);
  // Remaining articles for the load-more list (desktop)
  const listArticles = useMemo(() => {
    const used = new Set([
      heroArticle?.id,
      ...heroSidebar.map(a => a.id),
      ...latestArticles.map(a => a.id),
      mustReadFeature?.id,
      ...mustReadList.map(a => a.id),
      ...weeklyHighlight.map(a => a.id),
      ...internationalArticles.map(a => a.id),
    ]);
    return filtered.filter((a) => !used.has(a.id));
  }, [filtered, heroArticle, heroSidebar, latestArticles, mustReadFeature, mustReadList, weeklyHighlight, internationalArticles]);
  // Backwards-compatible alias for the old hero sidebar (used in mobile-only paths)
  const topArticles = heroSidebar.slice(0, 3);

  // Infinite scroll / load more
  const PAGE_SIZE = 12;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Reset visible count when filters change
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activeCategory, activeSource, sortBy, searchQuery, region, recency]);

  const visibleList = useMemo(() => listArticles.slice(0, visibleCount), [listArticles, visibleCount]);
  const hasMore = visibleCount < listArticles.length;

  // ===== Mobile per-tab partitioning =====
  // Strict rule: within the active tab, every article appears in EXACTLY ONE
  // place — either as a main card OR inside a single category rail. Never both.
  //
  // 1. Top cards own the first MOBILE_TOP_CARDS articles (by current sort).
  // 2. Each remaining article is grouped by category. Categories with >=
  //    MIN_RAIL_SIZE leftover articles become rails and "own" those articles.
  // 3. Articles whose category did NOT qualify as a rail fall back into the
  //    main mobile card list so nothing is dropped.
  const MOBILE_TOP_CARDS = 3;
  const MIN_RAIL_SIZE = 3;

  const mobilePartition = useMemo(() => {
    // Cards list always contains every filtered article so nothing gets
    // dropped from the mobile feed (rails are injected as a bonus discovery
    // strip every few cards, but never own/exclude articles).
    const cards = filtered;

    const groups: Record<string, NewsFromDB[]> = {};
    for (const a of filtered.slice(MOBILE_TOP_CARDS)) {
      const key = a.category || "Other";
      (groups[key] ||= []).push(a);
    }

    const rails: Array<[string, NewsFromDB[]]> = [];
    Object.entries(groups)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([cat, items]) => {
        if (items.length >= MIN_RAIL_SIZE) rails.push([cat, items]);
      });

    return { cards, rails };
  }, [filtered]);

  const visibleListMobile = useMemo(
    () => mobilePartition.cards.slice(0, visibleCount),
    [mobilePartition.cards, visibleCount]
  );
  const hasMoreMobile = visibleCount < mobilePartition.cards.length;
  const mobileCategoryRails = mobilePartition.rails;

  // Intersection observer for infinite scroll (handles desktop + mobile lists)
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const maxLen = Math.max(listArticles.length, mobilePartition.cards.length);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && (hasMore || hasMoreMobile)) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, maxLen));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, hasMoreMobile, listArticles.length, mobilePartition.cards.length]);

  // Source stats
  const sourceStats = useMemo(() => {
    const counts: Record<string, number> = {};
    articles.forEach(a => { counts[a.source] = (counts[a.source] || 0) + 1; });
    return counts;
  }, [articles]);

  if (loading) return (
    <div className="px-4 md:px-6 py-6">
      <Skeleton className="h-7 w-32 mb-1" />
      <Skeleton className="h-4 w-72 mb-5" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Skeleton className="lg:col-span-8 h-80 rounded-xl" />
        <div className="lg:col-span-4 space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="px-4 md:px-6 py-6">
      {/* Desktop: single row — Region segmented + Search + Sort */}
      <div className="hidden md:flex items-center gap-3 mb-5">
        <div className="inline-flex items-center rounded-lg bg-muted/30 border border-border p-0.5 shrink-0">
          {([
            { key: "all", label: "All", count: articles.length },
            { key: "kenya", label: "Kenya", count: regionCounts.kenya },
            { key: "international", label: "International", count: regionCounts.international },
          ] as const).map((opt) => {
            const active = region === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRegion(opt.key)}
                className={`inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-pressed={active}
              >
                {opt.label}
                <span className={`text-[10px] tabular-nums ${active ? "opacity-90" : "opacity-70"}`}>
                  {opt.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 text-xs pl-8 bg-card border-border w-full"
          />
        </div>

        <Select value={recency} onValueChange={(v) => setRecency(v as RecencyOption)}>
          <SelectTrigger className="w-[120px] h-9 text-xs border-border shrink-0" aria-label="Recency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="24h">Last 24h</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[110px] h-9 text-xs border-border shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">Latest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="featured">Featured</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile: combined search + filter button */}
      <div className="md:hidden flex items-center gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 text-[16px] pl-8 bg-card border-border"
          />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="relative inline-flex items-center justify-center gap-1.5 h-9 px-3 shrink-0 rounded-md border border-border bg-card text-foreground text-xs font-medium hover:border-accent/40 transition-colors"
              aria-label="Filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filter</span>
              {(region !== "all" || sortBy !== "latest" || recency !== "all") && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent" />
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl border-border">
            <SheetHeader>
              <SheetTitle className="text-base">Filters</SheetTitle>
            </SheetHeader>

            <div className="mt-4 space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Region</p>
                <div className="inline-flex items-center rounded-lg bg-muted/30 border border-border p-0.5 w-full">
                  {([
                    { key: "all", label: "All", count: articles.length },
                    { key: "kenya", label: "Kenya", count: regionCounts.kenya },
                    { key: "international", label: "International", count: regionCounts.international },
                  ] as const).map((opt) => {
                    const active = region === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setRegion(opt.key)}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 h-9 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                          active ? "bg-foreground text-background shadow-sm" : "text-muted-foreground"
                        }`}
                        aria-pressed={active}
                      >
                        {opt.label}
                        <span className={`text-[10px] tabular-nums ${active ? "opacity-90" : "opacity-70"}`}>
                          {opt.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recency</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {([
                    { key: "all", label: "All" },
                    { key: "24h", label: "24h" },
                    { key: "7d", label: "7d" },
                    { key: "30d", label: "30d" },
                  ] as const).map((opt) => {
                    const active = recency === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setRecency(opt.key)}
                        className={`h-9 rounded-md text-xs font-medium border transition-colors ${
                          active
                            ? "bg-foreground text-background border-foreground"
                            : "bg-card text-muted-foreground border-border"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Sort by</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { key: "latest", label: "Latest" },
                    { key: "oldest", label: "Oldest" },
                    { key: "featured", label: "Featured" },
                  ] as const).map((opt) => {
                    const active = sortBy === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setSortBy(opt.key)}
                        className={`h-9 rounded-md text-xs font-medium border transition-colors ${
                          active
                            ? "bg-foreground text-background border-foreground"
                            : "bg-card text-muted-foreground border-border"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <SheetClose asChild>
                <button
                  type="button"
                  className="w-full h-10 rounded-md bg-accent text-accent-foreground text-sm font-semibold"
                >
                  Apply filters
                </button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-xl">
          <Megaphone className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium">No articles match your filters.</p>
          <p className="text-xs mt-1 text-muted-foreground/60">Try a different source or category.</p>
        </div>
      ) : (
        <>
          {/* ===== DESKTOP: NewsHub layout (hidden on mobile) ===== */}
          {heroArticle && (
            <div className="hidden lg:block space-y-8 mb-8 overscroll-x-contain">
              {/* LATEST NEWS: 3-col grid */}
              {latestArticles.length > 0 && (
                <section className="overscroll-x-contain">
                  <div className="mb-4">
                    <h2 className="font-heading font-bold text-2xl text-foreground">Latest News</h2>
                  </div>
                  <div className="overflow-x-auto overscroll-x-contain -mx-4 px-4 pb-2 [scrollbar-width:thin]">
                    <div className="flex gap-4 snap-x snap-mandatory overscroll-x-contain">
                      {latestArticles.map((article, lIdx) => (
                        <Link
                          key={article.id}
                          to={`/news/${article.id}`}
                          className="group shrink-0 w-[calc((100%-3rem)/4)] snap-start rounded-xl border border-border bg-card hover:border-accent/40 hover:-translate-y-0.5 transition-all overflow-hidden"
                        >
                          <div className="aspect-square overflow-hidden bg-muted">
                            <img
                              src={getNewsImage(article.image_url, article.category, article.id)}
                              alt={article.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading={lIdx === 0 ? "eager" : "lazy"}
                              fetchPriority={lIdx === 0 ? "high" : "auto"}
                              decoding={lIdx === 0 ? "sync" : "async"}
                              onError={(e) => handleNewsImageError(e, article.category, article.id)}
                            />
                          </div>
                          <div className="p-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Newspaper className="h-3 w-3 text-accent" />
                              <span className="text-[10px] font-semibold text-foreground truncate">{article.source || "News"}</span>
                              <span className="text-[9px] text-muted-foreground">· {formatDate(article.date_published)}</span>
                            </div>
                            <h3 className="font-heading font-bold text-sm leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                              {decodeHtmlEntities(article.title)}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-accent">{article.category}</span>
                              <span className="text-[10px] text-muted-foreground ml-auto inline-flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" /> {article.read_time}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* MUST READ: 4-col equal cards (matches Weekly Highlight) */}
              {(mustReadFeature || mustReadList.length > 0) && (
                <section className="overscroll-x-contain">
                  <div className="mb-4">
                    <h2 className="font-heading font-bold text-2xl text-foreground">Must Read</h2>
                  </div>
                  <div className="overflow-x-auto overscroll-x-contain -mx-4 px-4 pb-2 [scrollbar-width:thin]">
                    <div className="flex gap-4 snap-x snap-mandatory overscroll-x-contain">
                      {[mustReadFeature, ...mustReadList].filter(Boolean).map((article) => (
                        <Link
                          key={article!.id}
                          to={`/news/${article!.id}`}
                          className="group shrink-0 w-[calc((100%-3rem)/4)] snap-start rounded-xl border border-border bg-card hover:border-accent/40 hover:-translate-y-0.5 transition-all overflow-hidden"
                        >
                          <div className="aspect-square overflow-hidden bg-muted">
                            <img
                              src={getNewsImage(article!.image_url, article!.category, article!.id)}
                              alt={article!.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                              onError={(e) => handleNewsImageError(e, article!.category, article!.id)}
                            />
                          </div>
                          <div className="p-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Newspaper className="h-3 w-3 text-accent" />
                              <span className="text-[10px] font-semibold text-foreground truncate">{article!.source || "News"}</span>
                              <span className="text-[9px] text-muted-foreground">· {formatDate(article!.date_published)}</span>
                            </div>
                            <h3 className="font-heading font-bold text-sm leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                              {decodeHtmlEntities(article!.title)}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-accent">{article!.category}</span>
                              <span className="text-[10px] text-muted-foreground ml-auto inline-flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" /> {article!.read_time}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* WEEKLY HIGHLIGHT: 4-col equal cards */}
              {weeklyHighlight.length > 0 && (
                <section className="overscroll-x-contain">
                  <div className="mb-4">
                    <h2 className="font-heading font-bold text-2xl text-foreground">Weekly Highlight</h2>
                  </div>
                  <div className="overflow-x-auto overscroll-x-contain -mx-4 px-4 pb-2 [scrollbar-width:thin]">
                    <div className="flex gap-4 snap-x snap-mandatory overscroll-x-contain">
                      {weeklyHighlight.map((article) => (
                        <Link
                          key={article.id}
                          to={`/news/${article.id}`}
                          className="group shrink-0 w-[calc((100%-3rem)/4)] snap-start rounded-xl border border-border bg-card hover:border-accent/40 hover:-translate-y-0.5 transition-all overflow-hidden"
                        >
                          <div className="aspect-square overflow-hidden bg-muted">
                            <img
                              src={getNewsImage(article.image_url, article.category, article.id)}
                              alt={article.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                              onError={(e) => handleNewsImageError(e, article.category, article.id)}
                            />
                          </div>
                          <div className="p-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Newspaper className="h-3 w-3 text-accent" />
                              <span className="text-[10px] font-semibold text-foreground truncate">{article.source || "News"}</span>
                              <span className="text-[9px] text-muted-foreground">· {formatDate(article.date_published)}</span>
                            </div>
                            <h3 className="font-heading font-bold text-sm leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                              {decodeHtmlEntities(article.title)}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-accent">{article.category}</span>
                              <span className="text-[10px] text-muted-foreground ml-auto inline-flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" /> {article.read_time}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* INTERNATIONAL: 4-col equal cards (only on default "All" view) */}
              {internationalArticles.length > 0 && (
                <section className="overscroll-x-contain">
                  <div className="mb-4 flex items-center gap-2">
                    <h2 className="font-heading font-bold text-2xl text-foreground">International</h2>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-accent/40 text-accent">
                      Global
                    </Badge>
                  </div>
                  <div className="overflow-x-auto overscroll-x-contain -mx-4 px-4 pb-2 [scrollbar-width:thin]">
                    <div className="flex gap-4 snap-x snap-mandatory overscroll-x-contain">
                      {internationalArticles.map((article) => (
                        <Link
                          key={article.id}
                          to={`/news/${article.id}`}
                          className="group shrink-0 w-[calc((100%-3rem)/4)] snap-start rounded-xl border border-border bg-card hover:border-accent/40 hover:-translate-y-0.5 transition-all overflow-hidden"
                        >
                          <div className="aspect-square overflow-hidden bg-muted">
                            <img
                              src={getNewsImage(article.image_url, article.category, article.id)}
                              alt={article.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                              onError={(e) => handleNewsImageError(e, article.category, article.id)}
                            />
                          </div>
                          <div className="p-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Newspaper className="h-3 w-3 text-accent" />
                              <span className="text-[10px] font-semibold text-foreground truncate">{article.source || "News"}</span>
                              <span className="text-[9px] text-muted-foreground">· {formatDate(article.date_published)}</span>
                            </div>
                            <h3 className="font-heading font-bold text-sm leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                              {decodeHtmlEntities(article.title)}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-accent">{article.category}</span>
                              <span className="text-[10px] text-muted-foreground ml-auto inline-flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" /> {article.read_time}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* "More News" header before remaining grid */}
              {listArticles.length > 0 && (
                <div className="flex items-end justify-between pt-2 border-t border-border">
                  <h2 className="font-heading font-bold text-2xl text-foreground pt-6">More News</h2>
                </div>
              )}
            </div>
          )}

          {/* Grid of remaining articles */}
          {(visibleList.length > 0 || visibleListMobile.length > 0) && (
            <>
              {/* Mobile list: edge-to-edge full-screen articles, with category horizontal scroll rails interleaved */}
              <div className="lg:hidden -mx-4 border-y border-border">
                {visibleListMobile.map((article, idx) => {
                  const dot = categoryDot[article.category] || "bg-muted-foreground";
                  // Inject a category rail after every 3rd article
                  const railIndex = Math.floor(idx / 3);
                  const showRail = idx > 0 && idx % 3 === 0 && mobileCategoryRails[railIndex - 1];
                  const rail = showRail ? mobileCategoryRails[railIndex - 1] : null;
                  const RailIcon = rail ? (categoryIcons[rail[0]] || Megaphone) : null;
                  const railItems = rail
                    ? rail[1].filter((a) => a.id !== article.id).slice(0, 8)
                    : [];

                  return (
                    <div key={article.id}>
                      {idx > 0 && !rail && (
                        <div className="h-px bg-border/60" role="separator" />
                      )}
                       {rail && RailIcon && railItems.length > 0 && (
                        <section className="mt-8 border-t-2 border-border bg-muted/10">
                          <div className="flex items-center gap-2 px-4 py-5">
                            <RailIcon className="h-4 w-4 text-foreground" />
                            <h3 className="font-bold uppercase tracking-wider text-foreground text-lg leading-none">
                              Related: {rail[0]}
                            </h3>
                          </div>
                          <div className="divide-y divide-border border-y border-border">
                            {railItems.map((item) => (
                              <Link
                                key={item.id}
                                to={`/news/${item.id}`}
                                className="group flex items-stretch gap-3 px-4 py-3 active:bg-muted/30 transition-colors"
                              >
                                <div className="flex-1 min-w-0 flex flex-col">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
                                      {item.category}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {item.read_time}
                                    </span>
                                  </div>
                                  <h4 className="font-heading font-bold text-base leading-tight line-clamp-3 mb-1.5 text-foreground group-hover:text-accent transition-colors">
                                    {decodeHtmlEntities(item.title)}
                                  </h4>
                                  <div className="mt-auto flex items-center gap-1.5 flex-wrap">
                                    {item.source && (
                                      <div className="h-5 w-5 rounded-full bg-accent/15 grid place-items-center text-[9px] font-bold text-accent shrink-0">
                                        {item.source.slice(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                    <span className="text-xs font-medium text-foreground truncate">{item.source}</span>
                                    <span className="text-xs text-muted-foreground">·</span>
                                    <span className="text-xs text-muted-foreground">{formatDate(item.date_published)}</span>
                                  </div>
                                </div>
                                <div className="w-32 shrink-0 overflow-hidden bg-muted self-stretch">
                                  <img
                                    src={getNewsImage(item.image_url, item.category, item.id)}
                                    alt={item.title}
                                    className="w-full h-full object-cover min-h-[110px]"
                                    loading="lazy"
                                    onError={(e) => handleNewsImageError(e, item.category, item.id)}
                                  />
                                </div>
                              </Link>
                            ))}
                          </div>
                        </section>
                      )}
                      <Link
                        to={`/news/${article.id}`}
                        className="group flex items-stretch gap-3 px-4 py-3 active:bg-muted/30 transition-colors"
                      >
                        {/* Content on the left */}
                        <div className="flex-1 min-w-0 flex flex-col">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
                              {article.category}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {article.read_time}
                            </span>
                          </div>
                          <h3 className="font-heading font-bold text-base leading-tight line-clamp-3 mb-1.5 text-foreground group-hover:text-accent transition-colors">
                            {decodeHtmlEntities(article.title)}
                          </h3>
                          <div className="mt-auto flex items-center gap-1.5 flex-wrap">
                            {article.source && (
                              <div className="h-5 w-5 rounded-full bg-accent/15 grid place-items-center text-[9px] font-bold text-accent shrink-0">
                                {article.source.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <span className="text-xs font-medium text-foreground truncate">{article.source}</span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">{formatDate(article.date_published)}</span>
                          </div>
                        </div>
                        {/* Image on the right - fills vertical space, not rounded */}
                        <div className="w-32 shrink-0 overflow-hidden bg-muted self-stretch">
                          <img
                            src={getNewsImage(article.image_url, article.category, article.id)}
                            alt={article.title}
                            className="w-full h-full object-cover min-h-[110px]"
                            loading={idx === 0 ? "eager" : "lazy"}
                            fetchPriority={idx === 0 ? "high" : "auto"}
                            decoding={idx === 0 ? "sync" : "async"}
                            onError={(e) => handleNewsImageError(e, article.category, article.id)}
                          />
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>

              {/* Desktop horizontal scroll: excludes hero/sidebar articles */}
              <div className="hidden lg:block overflow-x-auto overscroll-x-contain -mx-4 px-4 pb-2 [scrollbar-width:thin]">
                <div className="flex gap-4 snap-x snap-mandatory overscroll-x-contain">
                  {visibleList.map((article) => (
                    <Link
                      key={article.id}
                      to={`/news/${article.id}`}
                      className="group shrink-0 w-[calc((100%-3rem)/4)] snap-start rounded-xl border border-border bg-card hover:border-accent/40 hover:-translate-y-0.5 transition-all overflow-hidden"
                    >
                      <div className="aspect-square overflow-hidden bg-muted">
                        <img
                          src={getNewsImage(article.image_url, article.category, article.id)}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                          onError={(e) => handleNewsImageError(e, article.category, article.id)}
                        />
                      </div>
                      <div className="p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Newspaper className="h-3 w-3 text-accent" />
                          <span className="text-[10px] font-semibold text-foreground truncate">{article.source || "News"}</span>
                          <span className="text-[9px] text-muted-foreground">· {formatDate(article.date_published)}</span>
                        </div>
                        <h3 className="font-heading font-bold text-sm leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                          {decodeHtmlEntities(article.title)}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-accent">{article.category}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto inline-flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" /> {article.read_time}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Infinite scroll sentinel */}
              <div ref={loaderRef} className="flex items-center justify-center py-6">
                {(hasMore || hasMoreMobile) ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading more articles...
                  </div>
                ) : filtered.length > 0 ? (
                  <p className="text-[10px] text-muted-foreground">
                    Showing all {filtered.length} articles
                  </p>
                ) : null}
              </div>
            </>
          )}
        </>
      )}

      {/* Footer stats */}
      <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-muted-foreground flex-wrap">
        <span>{filtered.length} article{filtered.length !== 1 ? "s" : ""}</span>
        <span className="w-px h-3 bg-border" />
        <span>{activeCategory === "All" ? "All categories" : activeCategory}</span>
        <span className="w-px h-3 bg-border" />
        <span>{activeSource === "All" ? `${sources.length} sources` : activeSource}</span>
      </div>
    </div>
  );
};

export default NewsPage;
