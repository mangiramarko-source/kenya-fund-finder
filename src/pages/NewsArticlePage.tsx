import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Clock, Calendar, Share2, Link2, Twitter, Facebook, TrendingUp, Landmark, Shield, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchNewsById, type NewsFromDB } from "@/lib/api";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { useToast } from "@/hooks/use-toast";
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

  useEffect(() => {
    if (!id) return;
    fetchNewsById(id)
      .then(setArticle)
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
    <div className="max-w-3xl mx-auto py-5 sm:py-8 px-4 sm:px-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-5">
        <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
        <span>/</span>
        <Link to="/news" className="hover:text-foreground transition-colors">News</Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[200px]">{article.title}</span>
      </nav>

      {/* Hero image */}
      <div className="rounded-2xl overflow-hidden mb-5 border border-border">
        <img
          src={heroImage}
          alt={article.title}
          className="w-full aspect-[2/1] object-cover"
          onError={(e) => handleNewsImageError(e, article.category, article.id)}
          loading="eager"
        />
      </div>

      {/* Category & meta */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className={`flex items-center justify-center h-6 w-6 rounded-md ${categoryColors[article.category]?.split(" ")[0] || "bg-muted"}`}>
          <CatIcon className={`h-3 w-3 ${categoryColors[article.category]?.split(" ")[1] || "text-muted-foreground"}`} />
        </div>
        <Badge variant="outline" className={`text-[10px] sm:text-xs ${categoryColors[article.category] || ""}`}>
          {article.category}
        </Badge>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" /> {article.read_time}
        </span>
      </div>

      {/* Title */}
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight mb-3">{article.title}</h1>

      {/* Date & source */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-6">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(article.date_published).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}
        </span>
        {article.source && <span>· {article.source}</span>}
      </div>

      {/* Summary */}
      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-6 border-l-2 border-accent/30 pl-4">
        {article.summary}
      </p>

      {/* Content */}
      {(() => {
        // All content is now publicly accessible
        return (
          <>
            <div className="prose prose-sm max-w-none text-foreground leading-relaxed space-y-4">
              {article.content ? (
                article.content.split("\n").filter(Boolean).map((paragraph, i) => (
                  <p key={i} className="text-sm sm:text-base text-muted-foreground leading-relaxed">{paragraph}</p>
                ))
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

      <p className="text-[10px] text-muted-foreground text-center mt-8">
        All information is sourced from publicly available data. Fund yields and regulatory details are based on CMA-regulated disclosures.
      </p>
    </div>
  );
};

export default NewsArticlePage;
