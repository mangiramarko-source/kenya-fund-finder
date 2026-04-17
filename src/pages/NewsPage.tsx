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

  const heroArticle = useMemo(() => filtered.find((a) => a.is_featured) || filtered[0] || null, [filtered]);
  const topArticles = useMemo(() => {
    if (!heroArticle) return filtered.slice(0, 3);
    return filtered.filter((a) => a.id !== heroArticle.id).slice(0, 3);
  }, [filtered, heroArticle]);
  const listArticles = useMemo(() => {
    const usedIds = new Set([heroArticle?.id, ...topArticles.map(a => a.id)]);
    return filtered.filter((a) => !usedIds.has(a.id));
  }, [filtered, heroArticle, topArticles]);

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
          {/* Hero + sidebar grid */}
          {heroArticle && (
            <div className="hidden lg:grid grid-cols-1 lg:grid-cols-12 gap-4 mb-5">
              {/* Hero */}
              <Link
                to={`/news/${heroArticle.id}`}
                className="lg:col-span-8 group relative rounded-xl overflow-hidden border border-border hover:border-accent/30 transition-all"
              >
                <div className="aspect-[16/9] lg:aspect-[16/10]">
                  <img
                    src={getNewsImage(heroArticle.image_url, heroArticle.category, heroArticle.id)}
                    alt={`${heroArticle.title} – ${heroArticle.category}`}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => handleNewsImageError(e, heroArticle.category, heroArticle.id)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {heroArticle.is_featured && (
                      <Badge className="bg-accent text-accent-foreground border-0 gap-1 text-xs h-5">
                        <Sparkles className="h-3 w-3" /> Featured
                      </Badge>
                    )}
                    <span className="text-xs text-white/70">{heroArticle.category}</span>
                    {heroArticle.source && <SourceBadge source={heroArticle.source} />}
                    <span className="text-xs text-white/60 ml-auto flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {heroArticle.read_time}
                    </span>
                  </div>
                  <h2 className="font-heading font-bold text-lg md:text-2xl text-white leading-snug line-clamp-3 group-hover:text-accent transition-colors">
                    {decodeHtmlEntities(heroArticle.title)}
                  </h2>
                  <p className="text-sm text-white/70 mt-2 line-clamp-2 max-w-lg leading-relaxed hidden sm:block">
                    {decodeHtmlEntities(heroArticle.summary)}
                  </p>
                  <span className="text-xs text-white/50 mt-2 inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDateLong(heroArticle.date_published)}
                  </span>
                </div>
              </Link>

              {/* Sidebar — 3 stacked cards */}
              <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
                {topArticles.map((article) => {
                  const CatIcon = categoryIcons[article.category] || Megaphone;
                  return (
                    <Link
                      key={article.id}
                      to={`/news/${article.id}`}
                      className="group flex gap-3 p-3 rounded-xl border border-border bg-card hover:border-accent/20 hover:shadow-sm transition-all"
                    >
                      <div className="w-20 h-16 rounded-lg overflow-hidden shrink-0">
                        <img
                          src={getNewsImage(article.image_url, article.category, article.id)}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => handleNewsImageError(e, article.category, article.id)}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-1">
                          <CatIcon className="h-3 w-3 text-accent shrink-0" />
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{article.category}</span>
                        </div>
                        <h3 className="font-heading font-semibold text-sm leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                          {decodeHtmlEntities(article.title)}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          {article.source && <SourceBadge source={article.source} />}
                          <span className="text-[10px] text-muted-foreground">{formatDate(article.date_published)}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
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
              <div className="hidden lg:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleList.map((article) => {
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
