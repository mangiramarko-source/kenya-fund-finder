import { useParams, Link, useNavigate } from "react-router-dom";
import { decodeHtmlEntities } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";
import { ArrowLeft, ArrowRight, Clock, Calendar, Share2, Link2, Twitter, Facebook, TrendingUp, Landmark, Shield, Megaphone, Sun, Moon, MoreHorizontal, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchNewsById, fetchRelatedNews, type NewsFromDB } from "@/lib/api";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getNewsImage, handleNewsImageError } from "@/lib/news-images";

interface CommentItem {
  id: string;
  authorName: string;
  authorHandle: string;
  avatarInitials: string;
  timestamp: string;
  content: string;
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down';
}

const sampleComments: CommentItem[] = [
  {
    id: "c1",
    authorName: "devon_jd150",
    authorHandle: "devon_jd150",
    avatarInitials: "D",
    timestamp: "2h",
    content: "The gross margin held steady at 16.8%. Everything that shifted happened in opex and lost credits. Market fundamentals sit right above it.",
    upvotes: 2,
    downvotes: 0,
  },
  {
    id: "c2",
    authorName: "frank_ub3n0",
    authorHandle: "frank_ub3n0",
    avatarInitials: "F",
    timestamp: "2h",
    content: "So essentially the entire market outlook is sitting on execution and tech positioning. What's the realistic competitive advantage here?",
    upvotes: 1,
    downvotes: 0,
  },
  {
    id: "c3",
    authorName: "raj_p1md8",
    authorHandle: "raj_p1md8",
    avatarInitials: "R",
    timestamp: "1h",
    content: "Different answers for short-term vs long-term. On yields and cashflow, Kenya Money Market Funds offer a genuine risk-adjusted cushion compared to direct equities.",
    upvotes: 0,
    downvotes: 0,
  }
];

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
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { toast } = useToast();
  const [article, setArticle] = useState<NewsFromDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState<NewsFromDB[]>([]);
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(1);
  const [newCommentInput, setNewCommentInput] = useState("");
  const [commentsList, setCommentsList] = useState<CommentItem[]>(sampleComments);

  const handleArticleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentInput.trim()) return;
    const authorName = user ? (user.email?.split("@")[0] || "User") : "devon_user";
    const initials = authorName.substring(0, 1).toUpperCase();
    const newCmt: CommentItem = {
      id: `c-${Date.now()}`,
      authorName,
      authorHandle: `@${authorName.toLowerCase()}`,
      avatarInitials: initials,
      timestamp: "Just now",
      content: newCommentInput.trim(),
      upvotes: 0,
      downvotes: 0,
    };
    setCommentsList(prev => [newCmt, ...prev]);
    setNewCommentInput("");
    toast({ title: "Comment added" });
  };

  const handleUpvoteComment = (cmtId: string) => {
    setCommentsList(prev => prev.map(c => {
      if (c.id !== cmtId) return c;
      if (c.userVote === 'up') {
        return { ...c, upvotes: c.upvotes - 1, userVote: undefined };
      }
      const newDown = c.userVote === 'down' ? c.downvotes - 1 : c.downvotes;
      return { ...c, upvotes: c.upvotes + 1, downvotes: newDown, userVote: 'up' };
    }));
  };

  const handleDownvoteComment = (cmtId: string) => {
    setCommentsList(prev => prev.map(c => {
      if (c.id !== cmtId) return c;
      if (c.userVote === 'down') {
        return { ...c, downvotes: c.downvotes - 1, userVote: undefined };
      }
      const newUp = c.userVote === 'up' ? c.upvotes - 1 : c.upvotes;
      return { ...c, downvotes: c.downvotes + 1, upvotes: newUp, userVote: 'down' };
    }));
  };

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

          // Auto-enrichment of articles is admin-only and triggered from the
          // Admin → News Enrichment page. Anonymous visitors no longer call
          // the enrich-article function to prevent abuse of paid APIs.
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
      {/* Mobile-only sticky top header matching X.com post view */}
      <header className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/80 px-4 h-12 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center justify-center h-9 w-9 rounded-full text-foreground hover:bg-muted/50 transition-colors -ml-2"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <span className="font-bold text-base text-foreground tracking-tight">
          Post
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center justify-center h-9 w-9 rounded-full text-foreground hover:bg-muted/50 transition-colors -mr-2"
              aria-label="More options"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleCopyLink} className="gap-2 text-sm cursor-pointer">
              <Link2 className="h-4 w-4" /> Copy Link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(shareUrl)}`, "_blank", "noopener")} className="gap-2 text-sm cursor-pointer">
              <Twitter className="h-4 w-4" /> Share on X
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank", "noopener")} className="gap-2 text-sm cursor-pointer">
              <Facebook className="h-4 w-4" /> Share on Facebook
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

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
      <div className="px-4 pt-4 md:px-0 md:pt-0 space-y-5">

      {/* Author Bar & Category Badge (Screenshot 1 Style) */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm border border-emerald-500/20">
            {(article.source || "KF").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <span>{article.source || "KenyaFundFinder Academy"}</span>
              <span className="text-muted-foreground font-normal">@{article.category?.toLowerCase().replace(/\s+/g, '') || "dailytip"}</span>
              <span className="text-muted-foreground font-semibold">·</span>
              <span className="text-muted-foreground font-normal">
                {formatDistanceToNow(new Date(article.date_published), { addSuffix: true }).replace("about ", "")}
              </span>
            </div>
          </div>
        </div>

        <Badge variant="outline" className={`text-xs font-semibold px-2.5 py-1 ${categoryColors[article.category] || "bg-muted text-muted-foreground"}`}>
          {article.category}
        </Badge>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold leading-snug tracking-tight text-foreground md:text-4xl">
        {decodeHtmlEntities(article.title)}
      </h1>

      {/* Highlighted Callout Sections (Screenshot 1 Style) */}
      {article.summary && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 space-y-2 text-xs leading-relaxed text-foreground">
          <div className="flex items-start gap-2">
            <span className="text-base leading-none">🏛️</span>
            <div>
              <span className="font-bold text-amber-600 dark:text-amber-400">Key takeaway: </span>
              <span className="text-foreground/90 font-medium">{decodeHtmlEntities(article.summary)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Body */}
      <div className="prose max-w-none text-foreground leading-relaxed space-y-4">
        {article.content && article.content.trim().length > 0 ? (
          article.content.split("\n").filter(Boolean).map((paragraph, i) => (
            <p key={i} className="text-foreground/90 leading-relaxed font-sans text-[16px] font-normal my-3">
              {decodeHtmlEntities(paragraph)}
            </p>
          ))
        ) : (
          <p className="text-[16px] text-foreground/90 leading-relaxed font-sans">
            {decodeHtmlEntities(article.summary)}
          </p>
        )}
      </div>

      {article.url && /^https?:\/\//i.test(article.url) && (
        <div className="pt-2">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all font-semibold text-xs shadow-sm"
          >
            <span>Read full story on source website</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {/* Reactions Bar (Screenshot 2 Style) */}
      <div className="pt-4 border-t border-border flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setLiked(!liked);
            setLikesCount(prev => liked ? prev - 1 : prev + 1);
            toast({ title: liked ? "Unliked post" : "Liked post" });
          }}
          className={`flex items-center justify-center h-10 w-10 rounded-xl border border-border transition-colors ${
            liked ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-card hover:bg-muted text-muted-foreground"
          }`}
          aria-label="Like post"
        >
          <ThumbsUp className={`h-5 w-5 ${liked ? "fill-emerald-500 text-emerald-500" : ""}`} />
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-muted/40 border border-border/60 px-3 py-1.5 rounded-full">
          <span>👍 {likesCount}</span>
          <span>🔥 4</span>
        </div>
      </div>

      {/* Add Comment Input Bar (Screenshot 2 Style) */}
      <div className="space-y-4 pt-2">
        <form onSubmit={handleArticleCommentSubmit} className="flex items-center gap-2.5 bg-card border border-border/80 rounded-full px-3 py-1.5 shadow-sm">
          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
            {user ? (user.email || "U").slice(0, 1).toUpperCase() : "M"}
          </div>
          <input
            type="text"
            placeholder="Add a comment..."
            value={newCommentInput}
            onChange={(e) => setNewCommentInput(e.target.value)}
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          <Button type="submit" size="sm" variant="ghost" className="h-7 px-3 text-xs font-bold text-emerald-500 hover:text-emerald-400">
            Post
          </Button>
        </form>

        {/* Comment Threads List (Screenshot 2 Style) */}
        <div className="space-y-4 pt-2">
          {commentsList.map((cmt) => (
            <div key={cmt.id} className="flex gap-3 text-xs">
              <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 font-bold text-muted-foreground">
                {cmt.avatarInitials}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <span>{cmt.authorName}</span>
                  <span className="text-muted-foreground font-normal">·</span>
                  <span className="text-muted-foreground font-normal">{cmt.timestamp}</span>
                </div>
                <p className="text-foreground/90 leading-relaxed font-normal">
                  {cmt.content}
                </p>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground font-semibold pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleUpvoteComment(cmt.id)}
                      className={`hover:text-foreground ${cmt.userVote === 'up' ? 'text-emerald-500 font-bold' : ''}`}
                    >
                      ▲ {cmt.upvotes}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownvoteComment(cmt.id)}
                      className={`hover:text-foreground ${cmt.userVote === 'down' ? 'text-red-500 font-bold' : ''}`}
                    >
                      ▼ {cmt.downvotes}
                    </button>
                  </div>
                  <button type="button" className="hover:text-foreground">
                    Reply
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
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
