import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { decodeHtmlEntities } from "@/lib/utils";
import { Link } from "react-router-dom";
import { fetchPublishedNews, type NewsFromDB } from "@/lib/api";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { Clock, TrendingUp, Landmark, Shield, Megaphone, Sparkles, Calendar, Newspaper, ExternalLink, Search, Loader2, Calculator } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

type SortOption = "latest" | "oldest" | "featured";

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

  const filtered = useMemo(() => {
    let list = articles;
    if (activeCategory !== "All") list = list.filter((a) => a.category === activeCategory);
    if (activeSource !== "All") list = list.filter((a) => a.source === activeSource);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q));
    }
    if (sortBy === "featured") {
      list = [...list].sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
    } else {
      list = [...list].sort((a, b) => {
        const diff = new Date(b.date_published).getTime() - new Date(a.date_published).getTime();
        return sortBy === "oldest" ? -diff : diff;
      });
    }
    return list;
  }, [articles, activeCategory, activeSource, sortBy, searchQuery]);

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
    return filtered.filter((a) => !used.has(a.id)).slice(0, 6);
  }, [filtered, heroArticle, heroSidebar]);
  // Must Read: 1 wide + 3 list items
  const mustReadFeature = useMemo(() => {
    const used = new Set([heroArticle?.id, ...heroSidebar.map(a => a.id), ...latestArticles.map(a => a.id)]);
    return filtered.find((a) => !used.has(a.id)) || null;
  }, [filtered, heroArticle, heroSidebar, latestArticles]);
  const mustReadList = useMemo(() => {
    const used = new Set([heroArticle?.id, ...heroSidebar.map(a => a.id), ...latestArticles.map(a => a.id), mustReadFeature?.id]);
    return filtered.filter((a) => !used.has(a.id)).slice(0, 3);
  }, [filtered, heroArticle, heroSidebar, latestArticles, mustReadFeature]);
  // Weekly Highlight: 4 across
  const weeklyHighlight = useMemo(() => {
    const used = new Set([heroArticle?.id, ...heroSidebar.map(a => a.id), ...latestArticles.map(a => a.id), mustReadFeature?.id, ...mustReadList.map(a => a.id)]);
    return filtered.filter((a) => !used.has(a.id)).slice(0, 4);
  }, [filtered, heroArticle, heroSidebar, latestArticles, mustReadFeature, mustReadList]);
  // Top Sources (placeholder for "Top Creators")
  const topSources = useMemo(() => {
    const counts: Record<string, number> = {};
    articles.forEach(a => { if (a.source) counts[a.source] = (counts[a.source] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [articles]);
  // Remaining articles for the load-more list (desktop)
  const listArticles = useMemo(() => {
    const used = new Set([
      heroArticle?.id,
      ...heroSidebar.map(a => a.id),
      ...latestArticles.map(a => a.id),
      mustReadFeature?.id,
      ...mustReadList.map(a => a.id),
      ...weeklyHighlight.map(a => a.id),
    ]);
    return filtered.filter((a) => !used.has(a.id));
  }, [filtered, heroArticle, heroSidebar, latestArticles, mustReadFeature, mustReadList, weeklyHighlight]);
  // Backwards-compatible alias for the old hero sidebar (used in mobile-only paths)
  const topArticles = heroSidebar.slice(0, 3);

  // Infinite scroll / load more
  const PAGE_SIZE = 12;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Reset visible count when filters change
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activeCategory, activeSource, sortBy, searchQuery]);

  const visibleList = useMemo(() => listArticles.slice(0, visibleCount), [listArticles, visibleCount]);
  const hasMore = visibleCount < listArticles.length;
  // On mobile, show ALL filtered articles in the grid (no hero/sidebar)
  const visibleListMobile = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMoreMobile = visibleCount < filtered.length;

  // Intersection observer for infinite scroll
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, listArticles.length));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, listArticles.length]);

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
      {/* Search + sort row */}
      <div className="flex items-center gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 text-[16px] md:text-xs pl-8 bg-card border-border"
          />
        </div>
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
            <div className="hidden lg:block space-y-8 mb-8">
              {/* LATEST NEWS: 3-col grid */}
              {latestArticles.length > 0 && (
                <section>
                  <div className="flex items-end justify-between mb-4">
                    <h2 className="font-heading font-bold text-2xl text-foreground">Latest News</h2>
                    <button
                      onClick={() => setSortBy("latest")}
                      className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
                    >
                      See all →
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-5">
                    {latestArticles.map((article) => (
                      <Link
                        key={article.id}
                        to={`/news/${article.id}`}
                        className="group rounded-xl border border-border bg-card hover:border-accent/40 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-15px_hsl(var(--accent)/0.3)] transition-all overflow-hidden flex flex-col"
                      >
                        <div className="aspect-[4/5] overflow-hidden bg-muted">
                          <img
                            src={getNewsImage(article.image_url, article.category, article.id)}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => handleNewsImageError(e, article.category, article.id)}
                          />
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                          <div className="flex items-center gap-2 mb-3">
                            <Newspaper className="h-4 w-4 text-accent" />
                            <span className="text-sm font-semibold text-foreground">{article.source || "News"}</span>
                            <span className="text-xs text-muted-foreground">· {formatDate(article.date_published)}</span>
                          </div>
                          <h3 className="font-heading font-bold text-xl leading-snug line-clamp-3 mb-3 group-hover:text-accent transition-colors">
                            {decodeHtmlEntities(article.title)}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-4">
                            {decodeHtmlEntities(article.summary)}
                          </p>
                          <div className="flex items-center gap-2 mt-auto pt-3 border-t border-border/60">
                            <span className="inline-flex items-center text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-accent/10 text-accent border border-accent/20">
                              {article.category}
                            </span>
                            <span className="text-xs text-muted-foreground ml-auto inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {article.read_time}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* MUST READ: split section */}
              {mustReadFeature && (
                <section>
                  <div className="flex items-end justify-between mb-4">
                    <h2 className="font-heading font-bold text-2xl text-foreground">Must Read</h2>
                    <button
                      onClick={() => setSortBy("featured")}
                      className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
                    >
                      See all →
                    </button>
                  </div>
                  <div className="grid grid-cols-12 gap-5">
                    {/* Wide feature card */}
                    <Link
                      to={`/news/${mustReadFeature.id}`}
                      className="col-span-7 group relative block rounded-xl overflow-hidden border border-border bg-card hover:border-accent/40 transition-all"
                    >
                      <div className="aspect-[16/10]">
                        <img
                          src={getNewsImage(mustReadFeature.image_url, mustReadFeature.category, mustReadFeature.id)}
                          alt={mustReadFeature.title}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                          loading="lazy"
                          onError={(e) => handleNewsImageError(e, mustReadFeature.category, mustReadFeature.id)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                      </div>
                      <div className="absolute top-4 left-4 flex items-center gap-2 bg-background/85 backdrop-blur-sm rounded-full pl-1 pr-3 py-1 border border-border/60">
                        <div className="h-7 w-7 rounded-full bg-accent/20 grid place-items-center text-[11px] font-bold text-accent">
                          {(mustReadFeature.source || "N").slice(0, 1)}
                        </div>
                        <div className="flex flex-col leading-none">
                          <span className="text-[11px] font-bold text-foreground">{mustReadFeature.source || "NewsHub"}</span>
                          <span className="text-[9px] text-muted-foreground">{formatDate(mustReadFeature.date_published)}</span>
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-accent text-accent-foreground mb-2">
                          {mustReadFeature.category}
                        </span>
                        <h3 className="font-heading font-bold text-2xl text-white leading-tight line-clamp-3 group-hover:text-accent transition-colors">
                          {decodeHtmlEntities(mustReadFeature.title)}
                        </h3>
                      </div>
                    </Link>

                    {/* List items */}
                    <div className="col-span-5 flex flex-col gap-3">
                      {mustReadList.map((article) => (
                        <Link
                          key={article.id}
                          to={`/news/${article.id}`}
                          className="group flex gap-3 p-3 rounded-xl border border-border bg-card hover:border-accent/40 transition-all flex-1"
                        >
                          <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-muted">
                            <img
                              src={getNewsImage(article.image_url, article.category, article.id)}
                              alt={article.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                              onError={(e) => handleNewsImageError(e, article.category, article.id)}
                            />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col">
                            <div className="flex items-center gap-1.5 mb-1">
                              <div className="h-5 w-5 rounded-full bg-accent/20 grid place-items-center text-[9px] font-bold text-accent">
                                {(article.source || "N").slice(0, 1)}
                              </div>
                              <span className="text-[11px] font-semibold text-foreground truncate">{article.source || "News"}</span>
                              <span className="text-[10px] text-muted-foreground">· {formatDate(article.date_published)}</span>
                            </div>
                            <h3 className="font-heading font-semibold text-sm leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                              {decodeHtmlEntities(article.title)}
                            </h3>
                            <div className="flex items-center gap-2 mt-auto pt-1.5">
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-accent">{article.category}</span>
                              <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
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

              {/* WEEKLY HIGHLIGHT: 4-col equal cards */}
              {weeklyHighlight.length > 0 && (
                <section>
                  <div className="flex items-end justify-between mb-4">
                    <h2 className="font-heading font-bold text-2xl text-foreground">Weekly Highlight</h2>
                    <button
                      onClick={() => setSortBy("oldest")}
                      className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
                    >
                      See all →
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {weeklyHighlight.map((article) => (
                      <Link
                        key={article.id}
                        to={`/news/${article.id}`}
                        className="group rounded-xl border border-border bg-card hover:border-accent/40 hover:-translate-y-0.5 transition-all overflow-hidden"
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
                </section>
              )}

              {/* TOP SOURCES (placeholder for "Top Creators") */}
              {topSources.length > 0 && (
                <section>
                  <div className="flex items-end justify-between mb-4">
                    <h2 className="font-heading font-bold text-2xl text-foreground">Top Sources</h2>
                  </div>
                  <div className="flex flex-wrap items-start gap-6">
                    {topSources.map(([source, count]) => (
                      <div key={source} className="flex flex-col items-center gap-2 w-28 text-center">
                        <div className="h-16 w-16 rounded-full border-2 border-accent/30 bg-card grid place-items-center text-xl font-bold text-accent shadow-[0_0_20px_-8px_hsl(var(--accent)/0.4)]">
                          {source.slice(0, 1)}
                        </div>
                        <span className="text-xs font-semibold text-foreground truncate w-full">{source}</span>
                        <span className="text-[10px] text-muted-foreground">{count} article{count !== 1 ? "s" : ""}</span>
                      </div>
                    ))}
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
              {/* Mobile grid: shows ALL filtered articles (hero is hidden on mobile) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
                {visibleListMobile.map((article) => {
                  const dot = categoryDot[article.category] || "bg-muted-foreground";
                  return (
                    <Link
                      key={article.id}
                      to={`/news/${article.id}`}
                      className="group rounded-xl border border-border bg-card hover:border-accent/20 hover:shadow-sm transition-all overflow-hidden"
                    >
                      <div className="aspect-[16/9] overflow-hidden">
                        <img
                          src={getNewsImage(article.image_url, article.category, article.id)}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => handleNewsImageError(e, article.category, article.id)}
                        />
                      </div>
                      <div className="p-3.5">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className={`h-2 w-2 rounded-full ${dot} shrink-0`} />
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{article.category}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {article.read_time}
                          </span>
                        </div>
                        <h3 className="font-heading font-semibold text-base leading-snug line-clamp-2 mb-1 group-hover:text-accent transition-colors">
                          {decodeHtmlEntities(article.title)}
                        </h3>
                        <p className="text-muted-foreground line-clamp-2 leading-relaxed mb-2 text-sm">
                          {decodeHtmlEntities(article.summary)}
                        </p>
                        <div className="flex items-center gap-1.5">
                          {article.source && <SourceBadge source={article.source} />}
                          <span className="text-[10px] text-muted-foreground">
                            {formatDate(article.date_published)}
                          </span>
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); navTo("/calculator"); }}
                            className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:text-accent/80 transition-colors"
                            title="Use ROI Calculator"
                          >
                            <Calculator className="h-3 w-3" /> Calc
                          </button>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Desktop grid: excludes hero/sidebar articles */}
              <div className="hidden lg:grid grid-cols-4 gap-5">
                {visibleList.map((article) => {
                  const dot = categoryDot[article.category] || "bg-muted-foreground";
                  return (
                    <Link
                      key={article.id}
                      to={`/news/${article.id}`}
                      className="group rounded-xl border border-border bg-card hover:border-accent/40 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-15px_hsl(var(--accent)/0.3)] transition-all overflow-hidden flex flex-col"
                    >
                      <div className="aspect-[4/5] overflow-hidden bg-muted">
                        <img
                         src={getNewsImage(article.image_url, article.category, article.id)}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                          onError={(e) => handleNewsImageError(e, article.category, article.id)}
                        />
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex items-center gap-2 mb-3">
                          <Newspaper className="h-4 w-4 text-accent" />
                          <span className="text-sm font-semibold text-foreground">{article.source || "News"}</span>
                          <span className="text-xs text-muted-foreground">· {formatDate(article.date_published)}</span>
                        </div>
                        <h3 className="font-heading font-bold text-xl leading-snug line-clamp-3 mb-3 group-hover:text-accent transition-colors">
                          {decodeHtmlEntities(article.title)}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-4">
                          {decodeHtmlEntities(article.summary)}
                        </p>
                        <div className="flex items-center gap-2 mt-auto pt-3 border-t border-border/60">
                          <span className={`h-2 w-2 rounded-full ${dot} shrink-0`} />
                          <span className="inline-flex items-center text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-accent/10 text-accent border border-accent/20">
                            {article.category}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {article.read_time}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
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
