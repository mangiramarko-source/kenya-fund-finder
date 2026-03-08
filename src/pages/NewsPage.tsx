import { useState, useEffect, useMemo } from "react";
import { fetchPublishedNews, type NewsFromDB } from "@/lib/api";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowRight, TrendingUp, Landmark, Shield, Megaphone, SortAsc, Share2, Link2, Twitter, Facebook, Sparkles, Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import AuthGate from "@/components/AuthGate";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

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
  useDocumentTitle("MMF News & Updates – Kenya Money Market Funds", "Stay informed about Money Market Funds in Kenya with the latest yield updates, market news, and regulatory changes.");
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [articles, setArticles] = useState<NewsFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<NewsFromDB | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("latest");

  useEffect(() => {
    fetchPublishedNews().then((data) => { setArticles(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = activeCategory === "All"
      ? articles
      : articles.filter((a) => a.category === activeCategory);

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

  const featuredArticle = useMemo(() => filtered.find((a) => a.is_featured) || null, [filtered]);
  const remainingArticles = useMemo(() => {
    if (!featuredArticle) return filtered;
    return filtered.filter((a) => a.id !== featuredArticle.id);
  }, [filtered, featuredArticle]);

  const isAuthenticated = !!user;

  const handleArticleClick = (article: NewsFromDB) => setSelectedArticle(article);

  const getShareUrl = (article: NewsFromDB) => `https://kenyafundfinder.com/news#${article.id}`;

  const handleShare = async (article: NewsFromDB, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getShareUrl(article);
    const text = `${article.title} — ${article.summary}`;
    if (navigator.share) {
      try { await navigator.share({ title: article.title, text, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied!" });
    }
  };

  const shareToTwitter = (article: NewsFromDB, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(getShareUrl(article))}`, "_blank", "noopener");
  };

  const shareToFacebook = (article: NewsFromDB, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl(article))}`, "_blank", "noopener");
  };

  const copyLink = async (article: NewsFromDB, e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(getShareUrl(article));
    toast({ title: "Link copied to clipboard" });
  };

  useJsonLd(selectedArticle ? {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: selectedArticle.title,
    description: selectedArticle.summary,
    datePublished: selectedArticle.date_published,
    author: { "@type": "Organization", name: selectedArticle.source || "Kenya Fund Finder" },
    publisher: {
      "@type": "Organization",
      name: "Kenya Fund Finder",
      url: "https://kenyafundfinder.com",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://kenyafundfinder.com/news#${selectedArticle.id}`,
    },
    articleSection: selectedArticle.category,
  } : null);

  if (loading) return (
    <div className="container py-6 sm:py-10 max-w-5xl px-4 sm:px-6">
      <Skeleton className="h-8 w-48 sm:h-10 sm:w-64 mb-2" />
      <Skeleton className="h-4 w-64 sm:h-5 sm:w-96 mb-6 sm:mb-8" />
      <Skeleton className="h-48 sm:h-64 w-full rounded-2xl mb-4 sm:mb-6" />
      <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 sm:h-40 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="container py-5 sm:py-8 md:py-10 max-w-5xl px-4 sm:px-6">
      {/* Header — compact on mobile */}
      <div className="mb-5 sm:mb-8">
        <div className="flex items-center gap-2.5 sm:gap-3 mb-1 sm:mb-2">
          <div className="flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-accent/10">
            <Megaphone className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">News & Updates</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Stay informed about investment funds in Kenya</p>
          </div>
        </div>
      </div>

      {/* Filters — horizontal scroll on mobile, sort inline */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3 mb-5 sm:mb-6">
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap snap-x snap-mandatory">
          {categories.map((cat) => {
            const Icon = categoryIcons[cat];
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 border snap-start h-9 ${
                  Icon ? "px-3 sm:px-3.5" : "px-4 sm:px-5"
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
        <div className="text-center py-16 sm:py-20 text-muted-foreground border border-dashed border-border rounded-2xl">
          <Megaphone className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-base sm:text-lg font-medium mb-1">No articles found</p>
          <p className="text-xs sm:text-sm">Try selecting a different category.</p>
        </div>
      ) : (
        <>
          {/* Featured hero card — stacked on mobile */}
          {featuredArticle && (
            <div
              className="group rounded-2xl border border-border bg-card p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 cursor-pointer hover:border-accent/30 hover:shadow-lg transition-all duration-300 relative overflow-hidden active:scale-[0.99]"
              onClick={() => handleArticleClick(featuredArticle)}
            >
              <div className="absolute top-0 right-0 w-40 h-40 sm:w-64 sm:h-64 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 flex-wrap">
                  <Badge className="bg-accent/15 text-accent border-accent/20 gap-1 text-[10px] sm:text-xs">
                    <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Featured
                  </Badge>
                  <Badge variant="secondary" className={`text-[10px] sm:text-xs ${categoryColors[featuredArticle.category] || ""}`}>
                    {featuredArticle.category}
                  </Badge>
                  <span className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground ml-auto sm:ml-0">
                    <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    {featuredArticle.read_time}
                  </span>
                </div>
                <h2 className="font-heading font-bold text-base sm:text-xl md:text-2xl mb-2 sm:mb-3 group-hover:text-accent transition-colors leading-snug sm:leading-tight max-w-2xl line-clamp-3 sm:line-clamp-none">
                  {featuredArticle.title}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-3 sm:mb-4 max-w-2xl line-clamp-2 sm:line-clamp-3">
                  {featuredArticle.summary}
                </p>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                    <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    {featuredArticle.source && <span className="hidden sm:inline">{featuredArticle.source} · </span>}
                    {new Date(featuredArticle.date_published).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <ShareButton article={featuredArticle} copyLink={copyLink} shareToTwitter={shareToTwitter} shareToFacebook={shareToFacebook} />
                    <span className="text-xs sm:text-sm text-accent font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                      Read <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Article list — single column cards on mobile, grid on desktop */}
          <div className="space-y-2.5 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
            {remainingArticles.map((article) => {
              const CatIcon = categoryIcons[article.category] || Megaphone;
              return (
                <article
                  key={article.id}
                  className="group rounded-xl border border-border bg-card p-3.5 sm:p-5 hover:shadow-md hover:border-accent/30 transition-all duration-200 cursor-pointer flex flex-col active:scale-[0.99]"
                  onClick={() => handleArticleClick(article)}
                >
                  {/* Mobile: compact horizontal layout */}
                  <div className="flex gap-3 sm:block">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-3 flex-wrap">
                        <div className={`flex items-center justify-center h-5 w-5 sm:h-6 sm:w-6 rounded-md ${categoryColors[article.category]?.split(" ")[0] || "bg-muted"}`}>
                          <CatIcon className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${categoryColors[article.category]?.split(" ")[1] || "text-muted-foreground"}`} />
                        </div>
                        <Badge variant="outline" className={`text-[9px] sm:text-[10px] px-1.5 py-0 ${categoryColors[article.category] || ""}`}>
                          {article.category}
                        </Badge>
                        <span className="text-[9px] sm:text-[10px] text-muted-foreground flex items-center gap-0.5 ml-auto">
                          <Clock className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                          {article.read_time}
                        </span>
                      </div>

                      <h2 className="font-heading font-semibold text-[13px] sm:text-sm md:text-base mb-1 sm:mb-2 group-hover:text-accent transition-colors leading-snug line-clamp-2">
                        {article.title}
                      </h2>

                      <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2 sm:mb-4">
                        {article.summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border/50 mt-auto">
                    <span className="text-[10px] sm:text-[11px] text-muted-foreground">
                      {article.source && <span className="hidden sm:inline">{article.source} · </span>}
                      {new Date(article.date_published).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
                    </span>
                    <div className="flex items-center gap-1">
                      <ShareButton article={article} copyLink={copyLink} shareToTwitter={shareToTwitter} shareToFacebook={shareToFacebook} />
                      <span className="text-[10px] sm:text-[11px] text-accent font-medium flex items-center gap-0.5">
                        Read <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* Article stats */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 mt-6 sm:mt-8 text-[10px] sm:text-xs text-muted-foreground">
        <span>{filtered.length} article{filtered.length !== 1 ? "s" : ""}</span>
        <span className="w-px h-3 bg-border" />
        <span>{activeCategory === "All" ? "All categories" : activeCategory}</span>
      </div>

      {/* Full article dialog — full-screen on mobile */}
      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] sm:max-h-[85vh] p-0 overflow-hidden w-[calc(100%-1rem)] sm:w-full rounded-xl sm:rounded-2xl">
          <ScrollArea className="max-h-[90vh] sm:max-h-[85vh]">
            <div className="p-4 sm:p-6 md:p-8">
              <DialogHeader className="mb-3 sm:mb-4">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
                  {selectedArticle && (
                    <>
                      <Badge variant="secondary" className={`text-[10px] sm:text-xs ${categoryColors[selectedArticle.category] || ""}`}>
                        {selectedArticle.category}
                      </Badge>
                      <span className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                        <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        {selectedArticle.read_time}
                      </span>
                      {selectedArticle.is_featured && (
                        <Badge className="bg-accent/15 text-accent border-0 text-[9px] sm:text-[10px]">Featured</Badge>
                      )}
                    </>
                  )}
                </div>
                <DialogTitle className="text-lg sm:text-xl md:text-2xl font-heading leading-snug sm:leading-tight">
                  {selectedArticle?.title}
                </DialogTitle>
                <DialogDescription className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2">
                  {selectedArticle?.source && `${selectedArticle.source} · `}
                  {selectedArticle && new Date(selectedArticle.date_published).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
                </DialogDescription>
              </DialogHeader>

              {isAuthenticated ? (
                <>
                  <div className="prose prose-sm max-w-none text-foreground leading-relaxed space-y-3 sm:space-y-4">
                    {selectedArticle?.content ? (
                      selectedArticle.content.split("\n").filter(Boolean).map((paragraph, i) => (
                        <p key={i} className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{paragraph}</p>
                      ))
                    ) : (
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{selectedArticle?.summary}</p>
                    )}
                  </div>

                  {selectedArticle?.url && (
                    <div className="mt-5 sm:mt-6 pt-3 sm:pt-4 border-t border-border">
                      <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs w-full sm:w-auto">
                        <a href={selectedArticle.url} target="_blank" rel="noopener noreferrer">
                          Read Original Source <ArrowRight className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-2">
                  {selectedArticle?.content && (
                    <div className="relative mb-4 sm:mb-6">
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {selectedArticle.content.split("\n").filter(Boolean)[0]}
                      </p>
                      <div className="mt-2 h-12 sm:h-16 bg-gradient-to-b from-transparent to-background" />
                    </div>
                  )}
                  <AuthGate
                    source="news_article"
                    title="Sign up to read full articles"
                    description="Create a free account to access complete news articles, market analysis, and regulatory updates."
                  />
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <p className="text-[10px] text-muted-foreground text-center mt-6">
        All information is sourced from publicly available data. Fund yields and regulatory details are based on CMA-regulated disclosures.
      </p>
    </div>
  );
};

/* Share button sub-component */
const ShareButton = ({ article, copyLink, shareToTwitter, shareToFacebook }: {
  article: NewsFromDB;
  copyLink: (a: NewsFromDB, e: React.MouseEvent) => void;
  shareToTwitter: (a: NewsFromDB, e: React.MouseEvent) => void;
  shareToFacebook: (a: NewsFromDB, e: React.MouseEvent) => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-accent">
        <Share2 className="h-3.5 w-3.5" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
      <DropdownMenuItem onClick={(e) => copyLink(article, e)}><Link2 className="mr-2 h-3.5 w-3.5" /> Copy Link</DropdownMenuItem>
      <DropdownMenuItem onClick={(e) => shareToTwitter(article, e)}><Twitter className="mr-2 h-3.5 w-3.5" /> Share on X</DropdownMenuItem>
      <DropdownMenuItem onClick={(e) => shareToFacebook(article, e)}><Facebook className="mr-2 h-3.5 w-3.5" /> Share on Facebook</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export default NewsPage;
