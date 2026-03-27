import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { fetchPublishedNews, type NewsFromDB } from "@/lib/api";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { Clock, TrendingUp, Landmark, Shield, Megaphone, SortAsc, Sparkles, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getNewsImage } from "@/lib/news-images";

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

type SortOption = "latest" | "oldest" | "featured";

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-KE", { month: "short", day: "numeric" });

const NewsPage = () => {
  useDocumentTitle(
    "News – Kenya Fund Finder",
    "Stay informed about Money Market Funds in Kenya with the latest yield updates, market news, and regulatory changes.",
    { title: "News – Kenya Fund Finder", description: "Stay informed about Money Market Funds in Kenya with the latest yield updates, market news, and regulatory changes." }
  );
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [articles, setArticles] = useState<NewsFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("latest");

  useEffect(() => {
    fetchPublishedNews().then((data) => { setArticles(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = activeCategory === "All" ? articles : articles.filter((a) => a.category === activeCategory);
    if (sortBy === "featured") {
      list = [...list].sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
    } else {
      list = [...list].sort((a, b) => {
        const diff = new Date(b.date_published).getTime() - new Date(a.date_published).getTime();
        return sortBy === "oldest" ? -diff : diff;
      });
    }
    return list;
  }, [articles, activeCategory, sortBy]);

  const heroArticle = useMemo(() => filtered.find((a) => a.is_featured) || filtered[0] || null, [filtered]);
  const topArticles = useMemo(() => {
    if (!heroArticle) return filtered.slice(0, 2);
    return filtered.filter((a) => a.id !== heroArticle.id).slice(0, 2);
  }, [filtered, heroArticle]);
  const listArticles = useMemo(() => {
    const usedIds = new Set([heroArticle?.id, ...topArticles.map(a => a.id)]);
    return filtered.filter((a) => !usedIds.has(a.id));
  }, [filtered, heroArticle, topArticles]);

  if (loading) return (
    <div className="px-4 md:px-6 py-6">
      <Skeleton className="h-7 w-24 mb-1" />
      <Skeleton className="h-4 w-72 mb-5" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Skeleton className="lg:col-span-7 h-80 rounded-xl" />
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="px-4 md:px-6 py-6">
      {/* Header — matches stocks/unit-trusts pages */}
      <div className="mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">News</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Latest on Kenyan unit trusts, stocks, FX rates &amp; commodities.
        </p>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto scrollbar-hide pb-1">
        <div className="flex gap-1.5 shrink-0">
          {categories.map((cat) => {
            const Icon = categoryIcons[cat];
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`inline-flex items-center gap-1.5 rounded-lg text-xs font-medium whitespace-nowrap border h-8 px-3 transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-accent/30 hover:text-foreground"
                }`}
              >
                {Icon && <Icon className="h-3 w-3" />}
                {cat}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <SortAsc className="h-3 w-3 text-muted-foreground" />
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[120px] h-8 text-xs border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="featured">Featured</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-xl">
          <Megaphone className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium">No articles in this category yet.</p>
        </div>
      ) : (
        <>
          {/* Top section: hero + 2 secondary */}
          {heroArticle && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-5">
              {/* Hero */}
              <Link
                to={`/news/${heroArticle.id}`}
                className="lg:col-span-7 group relative rounded-xl overflow-hidden border border-border hover:border-accent/30 transition-all"
              >
                <div className="aspect-[16/9] lg:aspect-[16/10]">
                  <img
                    src={getNewsImage(heroArticle.image_url, heroArticle.category, heroArticle.id)}
                    alt={heroArticle.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                  <div className="flex items-center gap-2 mb-2">
                    {heroArticle.is_featured && (
                      <Badge className="bg-accent text-accent-foreground border-0 gap-1 text-xs h-5">
                        <Sparkles className="h-3 w-3" /> Featured
                      </Badge>
                    )}
                    <span className="text-xs text-white/70">{heroArticle.category}</span>
                    <span className="text-xs text-white/60 ml-auto flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {heroArticle.read_time}
                    </span>
                  </div>
                  <h2 className="font-heading font-bold text-lg md:text-2xl text-white leading-snug line-clamp-3 group-hover:text-accent transition-colors">
                    {heroArticle.title}
                  </h2>
                  <p className="text-sm text-white/70 mt-2 line-clamp-2 max-w-lg leading-relaxed hidden sm:block">
                    {heroArticle.summary}
                  </p>
                  <span className="text-xs text-white/50 mt-2 inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {heroArticle.source && `${heroArticle.source} · `}{formatDate(heroArticle.date_published)}
                  </span>
                </div>
              </Link>

              {/* 2 secondary cards */}
              <div className="lg:col-span-5 grid grid-cols-2 lg:grid-cols-1 gap-4">
                {topArticles.map((article) => (
                  <Link
                    key={article.id}
                    to={`/news/${article.id}`}
                    className="group relative rounded-xl overflow-hidden border border-border hover:border-accent/30 transition-all"
                  >
                    <div className="aspect-[16/9] lg:aspect-[21/9]">
                      <img
                        src={getNewsImage(article.image_url, article.category, article.id)}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                      <span className="text-xs text-white/60">{article.category}</span>
                      <h3 className="font-heading font-semibold text-sm md:text-base text-white leading-snug line-clamp-2 group-hover:text-accent transition-colors mt-0.5">
                        {article.title}
                      </h3>
                      <span className="text-xs text-white/50 mt-1 inline-block">
                        {article.source && `${article.source} · `}{formatDate(article.date_published)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* List — compact rows for remaining articles */}
          {listArticles.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
              {listArticles.map((article) => {
                const dot = categoryDot[article.category] || "bg-muted-foreground";
                return (
                  <Link
                    key={article.id}
                    to={`/news/${article.id}`}
                    className="group flex items-start gap-3 p-3 md:p-4 hover:bg-muted/40 transition-colors"
                  >
                    {/* Thumbnail */}
                    <div className="w-20 h-14 md:w-28 md:h-[72px] rounded-lg overflow-hidden shrink-0">
                      <img
                        src={getNewsImage(article.image_url, article.category, article.id)}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`h-2 w-2 rounded-full ${dot} shrink-0`} />
                        <span className="text-xs text-muted-foreground truncate">{article.category}</span>
                        <span className="text-xs text-muted-foreground/60 ml-auto shrink-0 hidden sm:inline">
                          {article.read_time}
                        </span>
                      </div>
                      <h3 className="font-heading font-semibold text-sm md:text-base leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 hidden md:block">
                        {article.summary}
                      </p>
                      <span className="text-xs text-muted-foreground/60 mt-1 inline-block">
                        {article.source && `${article.source} · `}{formatDate(article.date_published)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Footer stats */}
      <div className="flex items-center justify-center gap-3 mt-6 text-[10px] text-muted-foreground">
        <span>{filtered.length} article{filtered.length !== 1 ? "s" : ""}</span>
        <span className="w-px h-3 bg-border" />
        <span>{activeCategory === "All" ? "All categories" : activeCategory}</span>
      </div>
    </div>
  );
};

export default NewsPage;
