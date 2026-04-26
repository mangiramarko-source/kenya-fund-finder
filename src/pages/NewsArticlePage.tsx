import { useParams, Link } from "react-router-dom";
import { decodeHtmlEntities } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";
import { ArrowLeft, ArrowRight, Clock, Calendar, Share2, Link2, Twitter, Facebook, TrendingUp, Landmark, Shield, Megaphone, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchNewsById, fetchRelatedNews, type NewsFromDB } from "@/lib/api";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getNewsImage, handleNewsImageError } from "@/lib/news-images";

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

const NewsArticlePage = () => {
  const { id } = useParams();
  
  const { toast } = useToast();
  const [article, setArticle] = useState<NewsFromDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState<NewsFromDB[]>([]);
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);

  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const themeInitial = useRef(true);
  useEffect(() => {
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    if (themeInitial.current) {
      themeInitial.current = false;
      return;
    }
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) setDark(e.matches);
    };
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setRelated([]);
    setEnrichError(null);
    fetchNewsById(id)
      .then((a) => {
        setArticle(a);
        if (a) {
          fetchRelatedNews(a.category, a.id, 3)
            .then(setRelated)
            .catch(() => {});

          // Auto-enrich if content is missing/short and source URL exists
          const needsEnrichment = (!a.content || a.content.trim().length < 200) && a.url && /^https?:\/\//i.test(a.url);
          if (needsEnrichment) {
            setEnriching(true);
            supabase.functions.invoke("enrich-article", { body: { articleId: a.id } })
              .then(({ data, error }) => {
                if (error) {
                  setEnrichError(error.message || "Could not load full article");
                } else if (data?.content) {
                  setArticle((prev) => prev ? { ...prev, content: data.content } : prev);
                } else if (data?.error) {
                  setEnrichError(data.error);
                }
              })
              .catch((e) => setEnrichError(e?.message || "Could not load full article"))
              .finally(() => setEnriching(false));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useDocumentTitle(
    article ? `${article.title} – Kenya Fund Finder` : "News Article – Kenya Fund Finder",
    article?.summary,
    article ? { title: article.title, description: article.summary, type: "article" } : undefined
  );

  useJsonLd(article ? {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.summary,
    datePublished: article.date_published,
    image: getNewsImage(article.image_url, article.category, article.id),
    author: { "@type": "Organization", name: article.source || "Kenya Fund Finder" },
    publisher: {
      "@type": "Organization",
      name: "Kenya Fund Finder",
      legalName: "Elyon Innovation LTD",
      url: "https://kenyafundfinder.com",
      logo: { "@type": "ImageObject", url: "https://kenyafundfinder.com/og-image.png" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://kenyafundfinder.com/news/${article.id}` },
    articleSection: article.category,
  } : null);

  useJsonLd(article ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://kenyafundfinder.com/" },
      { "@type": "ListItem", position: 2, name: "News", item: "https://kenyafundfinder.com/news" },
      { "@type": "ListItem", position: 3, name: article.title, item: `https://kenyafundfinder.com/news/${article.id}` },
    ],
  } : null);

  const shareUrl = article ? `https://kenyafundfinder.com/news/${article.id}` : "";
  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: "Link copied to clipboard" });
  };
  

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6">
        <Skeleton className="h-4 w-32 mb-6" />
        <Skeleton className="h-64 w-full rounded-2xl mb-4" />
        <Skeleton className="h-5 w-24 mb-3" />
        <Skeleton className="h-8 w-full mb-2" />
        <Skeleton className="h-8 w-3/4 mb-4" />
        <Skeleton className="h-4 w-48 mb-6" />
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center px-4">
        <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
        <p className="text-muted-foreground mb-6">This article may have been removed or the link is incorrect.</p>
        <Button asChild variant="outline">
          <Link to="/news"><ArrowLeft className="mr-2 h-4 w-4" /> Back to News</Link>
        </Button>
      </div>
    );
  }

  const CatIcon = categoryIcons[article.category] || Megaphone;
  const heroImage = getNewsImage(article.image_url, article.category, article.id);

  return (
    <div className="md:max-w-3xl md:mx-auto md:py-8 md:px-6">
      {/* Mobile-only sticky back button (replaces top nav) */}
      <div className="md:hidden sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border px-3 py-2 flex items-center relative">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2">
          <Link to="/news" aria-label="Back to news">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDark(!dark)}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          className="h-9 w-9 absolute left-1/2 -translate-x-1/2"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Share article" className="h-9 w-9 -mr-1 ml-auto">
              <Share2 className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCopyLink}>
              <Link2 className="mr-2 h-3.5 w-3.5" /> Copy Link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(shareUrl)}`, "_blank", "noopener")}>
              <Twitter className="mr-2 h-3.5 w-3.5" /> Share on X
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank", "noopener")}>
              <Facebook className="mr-2 h-3.5 w-3.5" /> Share on Facebook
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Breadcrumb — desktop only */}
      <nav className="hidden md:flex items-center gap-2 text-muted-foreground mb-5 text-sm">
        <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
        <span>/</span>
        <Link to="/news" className="hover:text-foreground transition-colors">News</Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[200px]">{decodeHtmlEntities(article.title)}</span>
      </nav>

      {/* Hero image — full-bleed on mobile, rounded card on desktop */}
      <div className="md:rounded-2xl overflow-hidden md:mb-5 md:border md:border-border">
        <img
          src={heroImage}
          alt={article.title}
          className="w-full aspect-[2/1] object-cover"
          onError={(e) => handleNewsImageError(e, article.category, article.id)}
          loading="eager"
        />
      </div>

      {/* Inner content padding for mobile */}
      <div className="px-4 pt-5 md:px-0 md:pt-0">

      {/* Category & meta */}
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        <div className={`flex items-center justify-center h-8 w-8 rounded-md ${categoryColors[article.category]?.split(" ")[0] || "bg-muted"}`}>
          <CatIcon className={`h-4 w-4 ${categoryColors[article.category]?.split(" ")[1] || "text-muted-foreground"}`} />
        </div>
        <Badge variant="outline" className={`text-sm sm:text-sm ${categoryColors[article.category] || ""}`}>
          {article.category}
        </Badge>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" /> {article.read_time}
        </span>
      </div>

      {/* Title */}
      <h1 className="sm:text-2xl md:text-3xl font-bold leading-tight mb-3 text-3xl text-left">{decodeHtmlEntities(article.title)}</h1>

      {/* Date & source */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-6">
        <span className="flex items-center gap-1 text-sm">
          <Calendar className="h-3 w-3" />
          {new Date(article.date_published).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
        </span>
        {article.source && <span className="text-sm">· {article.source}</span>}
      </div>

      {/* Summary */}
      <p className="sm:text-base text-muted-foreground leading-relaxed mb-6 border-l-2 border-accent/30 pl-4 px-[20px] text-base">
        {decodeHtmlEntities(article.summary)}
      </p>

      {/* Content */}
      {(() => {
        const hasContent = article.content && article.content.trim().length > 0;
        return (
          <>
            {hasContent && (
              <div className="flex items-center gap-1.5 mb-3 text-[11px] text-muted-foreground">
                <Sparkles className="h-3 w-3 text-accent" />
                <span>AI-generated summary based on the original source</span>
              </div>
            )}
            <div className="prose prose-sm max-w-none text-foreground leading-relaxed space-y-4">
              {hasContent ? (
                article.content!.split("\n").filter(Boolean).map((paragraph, i) => (
                  <p key={i} className="sm:text-base text-foreground leading-relaxed font-sans mx-[2px] my-0 px-0 py-0 border-8 border-none pl-[10px] pr-[10px] text-left text-xl font-medium">{decodeHtmlEntities(paragraph)}</p>
                ))
              ) : enriching ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground italic py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  <span>Generating extended summary from the original source…</span>
                </div>
              ) : enrichError ? (
                <p className="text-sm text-muted-foreground italic">
                  Extended summary unavailable. {article.url ? "You can read the full article at the original source below." : ""}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Full article content is not yet available.</p>
              )}
            </div>
            {article.url && /^https?:\/\//i.test(article.url) && (
              <div className="mt-6 pt-4 border-t border-border">
                <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                  <a href={article.url} target="_blank" rel="noopener noreferrer">
                    Read Original Source <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            )}
          </>
        );
      })()}

      {/* Share & actions */}
      <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
        <Button asChild variant="ghost" size="sm" className="text-xs gap-1.5">
          <Link to="/news"><ArrowLeft className="h-3.5 w-3.5" /> All News</Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <Share2 className="h-3.5 w-3.5" /> Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCopyLink}>
              <Link2 className="mr-2 h-3.5 w-3.5" /> Copy Link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(shareUrl)}`, "_blank", "noopener")}>
              <Twitter className="mr-2 h-3.5 w-3.5" /> Share on X
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank", "noopener")}>
              <Facebook className="mr-2 h-3.5 w-3.5" /> Share on Facebook
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>


      {/* Related Articles */}
      {related.length > 0 && (
        <section className="mt-10 pt-6 border-t border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-lg sm:text-xl text-foreground">Related Articles</h2>
            <Link to="/news" className="text-xs text-accent hover:underline inline-flex items-center gap-1">
              More <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {/* Mobile: stacked horizontal band cards */}
          <div className="sm:hidden -mx-4 divide-y divide-border border-y border-border">
            {related.map((r) => (
              <Link
                key={r.id}
                to={`/news/${r.id}`}
                className="group flex items-stretch gap-3 px-4 py-3 active:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold uppercase text-accent truncate">{r.category}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                      <Clock className="h-3 w-3" />{r.read_time}
                    </span>
                  </div>
                  <h4 className="font-heading font-bold text-base leading-tight line-clamp-3 mb-1.5 text-foreground">
                    {decodeHtmlEntities(r.title)}
                  </h4>
                  <div className="mt-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {r.source && <span className="truncate">{r.source}</span>}
                    {r.source && <span>·</span>}
                    <span>{new Date(r.date_published).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}</span>
                  </div>
                </div>
                <div className="w-32 shrink-0 overflow-hidden bg-muted self-stretch rounded-md">
                  <img
                    src={getNewsImage(r.image_url, r.category, r.id)}
                    alt={r.title}
                    className="w-full h-full object-cover min-h-[110px]"
                    loading="lazy"
                    onError={(e) => handleNewsImageError(e, r.category, r.id)}
                  />
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: card grid (unchanged) */}
          <div className="hidden sm:grid grid-cols-3 gap-4">
            {related.map((r) => {
              const RelIcon = categoryIcons[r.category] || Megaphone;
              return (
                <Link
                  key={r.id}
                  to={`/news/${r.id}`}
                  className="group block rounded-xl border border-border bg-card hover:border-accent/40 hover:-translate-y-0.5 transition-all overflow-hidden"
                >
                  <div className="aspect-[16/9] overflow-hidden bg-muted">
                    <img
                      src={getNewsImage(r.image_url, r.category, r.id)}
                      alt={r.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      onError={(e) => handleNewsImageError(e, r.category, r.id)}
                    />
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <RelIcon className="h-3 w-3 text-accent" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent truncate">{r.category}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto inline-flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" /> {r.read_time}
                      </span>
                    </div>
                    <h3 className="font-heading font-semibold text-sm leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                      {decodeHtmlEntities(r.title)}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      {r.source && `${r.source} · `}
                      {new Date(r.date_published).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <p className="text-[10px] text-muted-foreground text-center mt-8 pb-6 md:pb-0">
        All information is sourced from publicly available data. Fund yields and regulatory details are based on CMA-regulated disclosures.
      </p>
      </div>
    </div>
  );
};

export default NewsArticlePage;
