import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { fetchPublishedNews, type NewsFromDB } from "@/lib/api";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowRight, TrendingUp, Landmark, Shield, Megaphone, SortAsc, Share2, Link2, Twitter, Facebook, Sparkles, Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import AuthGate from "@/components/AuthGate";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { getNewsImage } from "@/lib/news-images";

const categories = ["All", "Yield Updates", "Market News", "Regulatory Updates", "Fund Announcements"] as const;

const categoryIcons: Record<string, typeof TrendingUp> = {
  "Yield Updates": TrendingUp,
  "Market News": Landmark,
  "Regulatory Updates": Shield,
  "Fund Announcements": Megaphone,
};

const categoryColors: Record<string, string> = {
  "Yield Updates": "bg-accent/10 text-accent border-accent/20",
  "Market News": "bg-info/10 text-info border-info/20",
  "Regulatory Updates": "bg-warning/10 text-warning border-warning/20",
  "Fund Announcements": "bg-primary/10 text-primary border-primary/20",
};

type SortOption = "latest" | "oldest" | "featured";

const NewsPage = () => {
  useDocumentTitle(
    "MMF News & Updates – Kenya Money Market Funds",
    "Stay informed about Money Market Funds in Kenya with the latest yield updates, market news, and regulatory changes.",
    {
      title: "MMF News & Updates – Kenya Money Market Funds",
      description: "Stay informed about Money Market Funds in Kenya with the latest yield updates, market news, and regulatory changes.",
    }
  );
  const { user } = useAuth();
  const { toast } = useToast();
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
  const sideArticles = useMemo(() => {
    if (!heroArticle) return filtered.slice(0, 4);
    return filtered.filter((a) => a.id !== heroArticle.id).slice(0, 4);
  }, [filtered, heroArticle]);
  const gridArticles = useMemo(() => {
    const usedIds = new Set([heroArticle?.id, ...sideArticles.map(a => a.id)]);
    return filtered.filter((a) => !usedIds.has(a.id));
  }, [filtered, heroArticle, sideArticles]);

  const getShareUrl = (article: NewsFromDB) => `https://kenyafundfinder.com/news/${article.id}`;

  const copyLink = async (article: NewsFromDB, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await navigator.clipboard.writeText(getShareUrl(article));
    toast({ title: "Link copied to clipboard" });
  };
  const shareToTwitter = (article: NewsFromDB, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(getShareUrl(article))}`, "_blank", "noopener");
  };
  const shareToFacebook = (article: NewsFromDB, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl(article))}`, "_blank", "noopener");
  };

  if (loading) return (
    <div className="py-6 px-4 sm:px-6 max-w-7xl mx-auto">
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-96 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="lg:col-span-2 h-80 rounded-2xl" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[70px] rounded-xl" />)}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="px-4 md:px-6 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">News</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Stay informed about investment funds & markets in Kenya.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3 mb-5">
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide sm:flex-wrap snap-x snap-mandatory">
          {categories.map((cat) => {
            const Icon = categoryIcons[cat];
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 border snap-start h-9 ${
                  Icon ? "px-3" : "px-4"
                } ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:border-accent/30 hover:text-foreground"
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {cat}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 sm:ml-auto shrink-0">
          <SortAsc className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="featured">Featured First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-2xl">
          <Megaphone className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-lg font-medium mb-1">No articles found</p>
          <p className="text-sm">Try selecting a different category.</p>
        </div>
      ) : (
        <>
          {/* Hero Section — Yahoo News style */}
          {heroArticle && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
              {/* Main hero */}
              <Link
                to={`/news/${heroArticle.id}`}
                className="lg:col-span-3 group relative rounded-2xl overflow-hidden bg-card border border-border hover:border-accent/30 hover:shadow-lg transition-all"
              >
                <div className="aspect-[16/9] overflow-hidden">
                  <img
                    src={getNewsImage(heroArticle.image_url, heroArticle.category, heroArticle.id)}
                    alt={heroArticle.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-2">
                    {heroArticle.is_featured && (
                      <Badge className="bg-accent/90 text-accent-foreground border-0 gap-1 text-[10px]">
                        <Sparkles className="h-2.5 w-2.5" /> Featured
                      </Badge>
                    )}
                    <Badge variant="secondary" className="bg-white/20 text-white border-0 text-[10px] backdrop-blur-sm">
                      {heroArticle.category}
                    </Badge>
                    <span className="text-[10px] text-white/70 flex items-center gap-0.5 ml-auto">
                      <Clock className="h-2.5 w-2.5" /> {heroArticle.read_time}
                    </span>
                  </div>
                  <h2 className="font-heading font-bold text-base sm:text-xl md:text-2xl text-white leading-snug line-clamp-3 group-hover:text-accent transition-colors mb-2">
                    {heroArticle.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-white/70 line-clamp-2 leading-relaxed max-w-xl">
                    {heroArticle.summary}
                  </p>
                  <div className="flex items-center gap-2 mt-3 text-[10px] text-white/60">
                    <Calendar className="h-2.5 w-2.5" />
                    {heroArticle.source && `${heroArticle.source} · `}
                    {new Date(heroArticle.date_published).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </div>
              </Link>

              {/* Side stories */}
              <div className="lg:col-span-2 flex flex-col gap-3">
                {sideArticles.map((article) => (
                  <SideArticleCard
                    key={article.id}
                    article={article}
                    copyLink={copyLink}
                    shareToTwitter={shareToTwitter}
                    shareToFacebook={shareToFacebook}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Grid of remaining articles */}
          {gridArticles.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-4 mt-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">More Stories</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {gridArticles.map((article) => (
                  <GridArticleCard
                    key={article.id}
                    article={article}
                    copyLink={copyLink}
                    shareToTwitter={shareToTwitter}
                    shareToFacebook={shareToFacebook}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Stats */}
      <div className="flex items-center justify-center gap-4 mt-8 text-xs text-muted-foreground">
        <span>{filtered.length} article{filtered.length !== 1 ? "s" : ""}</span>
        <span className="w-px h-3 bg-border" />
        <span>{activeCategory === "All" ? "All categories" : activeCategory}</span>
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-6">
        All information is sourced from publicly available data. Fund yields and regulatory details are based on CMA-regulated disclosures.
      </p>
    </div>
  );
};

/* Side article — horizontal card with thumbnail */
const SideArticleCard = ({ article, copyLink, shareToTwitter, shareToFacebook }: {
  article: NewsFromDB;
  copyLink: (a: NewsFromDB, e: React.MouseEvent) => void;
  shareToTwitter: (a: NewsFromDB, e: React.MouseEvent) => void;
  shareToFacebook: (a: NewsFromDB, e: React.MouseEvent) => void;
}) => {
  const CatIcon = categoryIcons[article.category] || Megaphone;
  return (
    <Link
      to={`/news/${article.id}`}
      className="group flex gap-3 rounded-xl border border-border bg-card p-3 hover:border-accent/30 hover:shadow-sm transition-all"
    >
      <div className="w-24 h-20 sm:w-28 sm:h-[72px] rounded-lg overflow-hidden shrink-0">
        <img
          src={getNewsImage(article.image_url, article.category, article.id)}
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <div className={`flex items-center justify-center h-4 w-4 rounded ${categoryColors[article.category]?.split(" ")[0] || "bg-muted"}`}>
              <CatIcon className={`h-2 w-2 ${categoryColors[article.category]?.split(" ")[1] || "text-muted-foreground"}`} />
            </div>
            <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">{article.category}</span>
          </div>
          <h3 className="font-heading font-semibold text-xs leading-snug line-clamp-2 group-hover:text-accent transition-colors">
            {article.title}
          </h3>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">
            {new Date(article.date_published).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
          </span>
          <ShareButton article={article} copyLink={copyLink} shareToTwitter={shareToTwitter} shareToFacebook={shareToFacebook} />
        </div>
      </div>
    </Link>
  );
};

/* Grid article card — vertical with image */
const GridArticleCard = ({ article, copyLink, shareToTwitter, shareToFacebook }: {
  article: NewsFromDB;
  copyLink: (a: NewsFromDB, e: React.MouseEvent) => void;
  shareToTwitter: (a: NewsFromDB, e: React.MouseEvent) => void;
  shareToFacebook: (a: NewsFromDB, e: React.MouseEvent) => void;
}) => {
  const CatIcon = categoryIcons[article.category] || Megaphone;
  return (
    <Link
      to={`/news/${article.id}`}
      className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:border-accent/30 transition-all flex flex-col"
    >
      <div className="aspect-[16/10] overflow-hidden">
        <img
          src={getNewsImage(article.image_url, article.category, article.id)}
          alt={article.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-1.5 mb-2">
          <div className={`flex items-center justify-center h-5 w-5 rounded-md ${categoryColors[article.category]?.split(" ")[0] || "bg-muted"}`}>
            <CatIcon className={`h-2.5 w-2.5 ${categoryColors[article.category]?.split(" ")[1] || "text-muted-foreground"}`} />
          </div>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${categoryColors[article.category] || ""}`}>
            {article.category}
          </Badge>
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 ml-auto">
            <Clock className="h-2.5 w-2.5" /> {article.read_time}
          </span>
        </div>
        <h2 className="font-heading font-semibold text-sm leading-snug line-clamp-2 group-hover:text-accent transition-colors mb-2">
          {article.title}
        </h2>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3 flex-1">
          {article.summary}
        </p>
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">
            {article.source && `${article.source} · `}
            {new Date(article.date_published).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
          </span>
          <div className="flex items-center gap-1">
            <ShareButton article={article} copyLink={copyLink} shareToTwitter={shareToTwitter} shareToFacebook={shareToFacebook} />
            <span className="text-[10px] text-accent font-medium flex items-center gap-0.5">
              Read <ArrowRight className="h-2.5 w-2.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

/* Share button */
const ShareButton = ({ article, copyLink, shareToTwitter, shareToFacebook }: {
  article: NewsFromDB;
  copyLink: (a: NewsFromDB, e: React.MouseEvent) => void;
  shareToTwitter: (a: NewsFromDB, e: React.MouseEvent) => void;
  shareToFacebook: (a: NewsFromDB, e: React.MouseEvent) => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-accent">
        <Share2 className="h-3 w-3" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
      <DropdownMenuItem onClick={(e) => copyLink(article, e as any)}><Link2 className="mr-2 h-3.5 w-3.5" /> Copy Link</DropdownMenuItem>
      <DropdownMenuItem onClick={(e) => shareToTwitter(article, e as any)}><Twitter className="mr-2 h-3.5 w-3.5" /> Share on X</DropdownMenuItem>
      <DropdownMenuItem onClick={(e) => shareToFacebook(article, e as any)}><Facebook className="mr-2 h-3.5 w-3.5" /> Share on Facebook</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export default NewsPage;
