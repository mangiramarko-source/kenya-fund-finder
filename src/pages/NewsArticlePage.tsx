import { useParams, Link, useNavigate } from "react-router-dom";
import { decodeHtmlEntities } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";
import { 
  ArrowLeft, 
  ArrowRight, 
  Clock, 
  Calendar, 
  Share2, 
  Link2, 
  Twitter, 
  Facebook, 
  TrendingUp, 
  Landmark, 
  Shield, 
  Megaphone, 
  MoreHorizontal, 
  MessageSquare, 
  Repeat, 
  Heart, 
  Bookmark, 
  CheckCircle2,
  ExternalLink,
  ThumbsUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchNewsById, fetchRelatedNews, type NewsFromDB } from "@/lib/api";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow, format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getNewsImage, handleNewsImageError } from "@/lib/news-images";

interface CommentItem {
  id: string;
  authorName: string;
  authorHandle: string;
  avatarInitials: string;
  timestamp: string;
  content: string;
  likes: number;
  reposts: number;
  userLiked?: boolean;
}

const sampleComments: CommentItem[] = [
  {
    id: "c1",
    authorName: "Devon JD",
    authorHandle: "@devon_jd150",
    avatarInitials: "D",
    timestamp: "2h",
    content: "The gross margin held steady at 16.8%. Everything that shifted happened in opex and lost credits. Market fundamentals sit right above it.",
    likes: 2,
    reposts: 0,
  },
  {
    id: "c2",
    authorName: "Frank Ub3n",
    authorHandle: "@frank_ub3n0",
    avatarInitials: "F",
    timestamp: "2h",
    content: "So essentially the entire market outlook is sitting on execution and tech positioning. What's the realistic competitive advantage here?",
    likes: 1,
    reposts: 0,
  },
  {
    id: "c3",
    authorName: "Raj Patel",
    authorHandle: "@raj_p1md8",
    avatarInitials: "R",
    timestamp: "1h",
    content: "Different answers for short-term vs long-term. On yields and cashflow, Kenya Money Market Funds offer a genuine risk-adjusted cushion compared to direct equities.",
    likes: 0,
    reposts: 0,
  }
];

const categoryColors: Record<string, string> = {
  "Yield Updates": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  "Market News": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "Regulatory Updates": "bg-amber-500/10 text-amber-500 border-amber-500/20",
  "Fund Announcements": "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

const NewsArticlePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { toast } = useToast();
  const [article, setArticle] = useState<NewsFromDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState<NewsFromDB[]>([]);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [likesCount, setLikesCount] = useState(14);
  const [repostsCount, setRepostsCount] = useState(2);
  const [bookmarksCount, setBookmarksCount] = useState(5);
  const [newCommentInput, setNewCommentInput] = useState("");
  const [commentsList, setCommentsList] = useState<CommentItem[]>(sampleComments);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setRelated([]);
    fetchNewsById(id)
      .then((a) => {
        setArticle(a);
        if (a) {
          fetchRelatedNews(a.category, a.id, 3)
            .then(setRelated)
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useDocumentTitle(
    article ? `${article.title} – Kenya Fund Finder` : "News Article – Kenya Fund Finder",
    article?.summary
  );

  const shareUrl = article ? `https://kenyafundfinder.com/news/${article.id}` : "";
  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: "Link copied to clipboard" });
  };

  const handleArticleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentInput.trim()) return;
    const authorName = user ? (user.email?.split("@")[0] || "User") : "community_member";
    const initials = authorName.substring(0, 1).toUpperCase();
    const newCmt: CommentItem = {
      id: `c-${Date.now()}`,
      authorName,
      authorHandle: `@${authorName.toLowerCase()}`,
      avatarInitials: initials,
      timestamp: "Just now",
      content: newCommentInput.trim(),
      likes: 0,
      reposts: 0,
    };
    setCommentsList(prev => [newCmt, ...prev]);
    setNewCommentInput("");
    toast({ title: "Reply posted" });
  };

  const handleToggleLikeComment = (cmtId: string) => {
    setCommentsList(prev => prev.map(c => {
      if (c.id !== cmtId) return c;
      const userLiked = !c.userLiked;
      return {
        ...c,
        userLiked,
        likes: userLiked ? c.likes + 1 : Math.max(0, c.likes - 1)
      };
    }));
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 space-y-4">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center px-4">
        <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
        <p className="text-muted-foreground mb-6">This post may have been removed or the link is incorrect.</p>
        <Button asChild variant="outline">
          <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Return Home</Link>
        </Button>
      </div>
    );
  }

  const heroImage = getNewsImage(article.image_url, article.category, article.id);

  const getSourceDomain = (url?: string | null, sourceName?: string) => {
    if (sourceName) return sourceName;
    if (!url) return "kenyafundfinder.com";
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      return parsed.hostname.replace("www.", "");
    } catch {
      return "kenyafundfinder.com";
    }
  };

  const pubDate = new Date(article.date_published);
  const formattedTime = isNaN(pubDate.getTime()) ? "12:00 PM" : format(pubDate, "h:mm a");
  const formattedDate = isNaN(pubDate.getTime()) ? "Today" : format(pubDate, "d/M/yyyy");

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-8">
      {/* ─── 1. Top Navigation Bar (Fixed top header below main navbar) ─── */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border px-4 h-12 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center justify-center h-9 w-9 rounded-full text-foreground hover:bg-muted/50 transition-colors -ml-2 cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <h1 className="font-bold text-base text-foreground tracking-tight">
          Post
        </h1>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center justify-center h-9 w-9 rounded-full text-foreground hover:bg-muted/50 transition-colors -mr-2 cursor-pointer"
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

      <div className="max-w-[430px] mx-auto px-4 py-4 space-y-4">
        {/* ─── 2. Author Header ─── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
              {(article.source || "KF").slice(0, 2).toUpperCase()}
            </div>
            {/* Name + Username */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="font-bold text-sm text-foreground">{article.source || "KenyaFundFinder"}</span>
                <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-500 text-background" />
              </div>
              <span className="text-xs text-muted-foreground">@{article.category?.toLowerCase().replace(/\s+/g, '') || "official"}</span>
            </div>
          </div>

          {/* Secondary Label (Category Badge) */}
          <Badge variant="outline" className={`text-xs font-semibold px-2.5 py-0.5 ${categoryColors[article.category] || "bg-muted text-muted-foreground"}`}>
            {article.category}
          </Badge>
        </div>

        {/* ─── 3. Post Text ─── */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground leading-snug tracking-tight">
            {decodeHtmlEntities(article.title)}
          </h2>

          <div className="text-sm text-foreground/90 leading-relaxed space-y-3 font-normal">
            {article.content && article.content.trim().length > 0 ? (
              article.content.split("\n").filter(Boolean).map((paragraph, i) => (
                <p key={i} className="my-2">
                  {decodeHtmlEntities(paragraph)}
                </p>
              ))
            ) : (
              <p>{decodeHtmlEntities(article.summary)}</p>
            )}
          </div>
        </div>

        {/* ─── 4. Main Image ─── */}
        <div className="rounded-2xl overflow-hidden border border-border/80 bg-muted/30">
          <img
            src={heroImage}
            alt={article.title}
            className="w-full aspect-[16/9] object-cover"
            onError={(e) => handleNewsImageError(e, article.category, article.id)}
            loading="eager"
          />
        </div>

        {/* ─── 5. Source / Link ─── */}
        <div className="text-xs text-muted-foreground font-medium">
          {article.url && /^https?:\/\//i.test(article.url) ? (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline flex items-center gap-1 text-emerald-500"
            >
              <span>From {getSourceDomain(article.url, article.source)}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span>From {getSourceDomain(null, article.source)}</span>
          )}
        </div>

        {/* ─── 6. Metadata ─── */}
        <div className="text-xs text-muted-foreground flex items-center gap-2 pt-1 border-t border-border/50">
          <span>{formattedTime}</span>
          <span>•</span>
          <span>{formattedDate}</span>
          <span>•</span>
          <span className="font-semibold text-foreground">151K Views</span>
        </div>

        {/* ─── 7. Engagement Row ─── */}
        <div className="py-2.5 border-y border-border/80 flex items-center justify-end gap-6 text-xs text-muted-foreground font-medium">
          {/* Comment */}
          <button type="button" className="flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer">
            <MessageSquare className="w-4 h-4" />
            <span>{commentsList.length}</span>
          </button>

          {/* Share */}
          <button type="button" onClick={handleCopyLink} className="flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer">
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>

          {/* Like */}
          <button
            type="button"
            onClick={() => {
              setLiked(!liked);
              setLikesCount(prev => liked ? prev - 1 : prev + 1);
            }}
            className={`flex items-center gap-2 transition-colors cursor-pointer ${liked ? 'text-red-500 font-bold' : 'hover:text-foreground'}`}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
            <span>{likesCount}</span>
          </button>
        </div>

        {/* ─── 8. Divider ─── */}
        <div className="h-px bg-border/60" />

        {/* ─── 9. Replies ─── */}
        <div className="space-y-4 pt-1">
          {commentsList.map((cmt) => (
            <div key={cmt.id} className="flex gap-3 text-xs border-b border-border/40 pb-3">
              <div className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 font-bold text-muted-foreground">
                {cmt.avatarInitials}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-foreground">{cmt.authorName}</span>
                  <span className="text-muted-foreground">{cmt.authorHandle}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{cmt.timestamp}</span>
                </div>
                <p className="text-foreground/90 leading-relaxed font-normal">
                  {cmt.content}
                </p>

                {/* Reply action bar */}
                <div className="flex items-center gap-6 text-[11px] text-muted-foreground font-semibold pt-1">
                  <button type="button" className="flex items-center gap-1 hover:text-foreground">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Reply</span>
                  </button>
                  <button type="button" className="flex items-center gap-1 hover:text-emerald-500">
                    <Repeat className="w-3.5 h-3.5" />
                    <span>{cmt.reposts}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleLikeComment(cmt.id)}
                    className={`flex items-center gap-1 transition-colors ${cmt.userLiked ? 'text-red-500 font-bold' : 'hover:text-red-500'}`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${cmt.userLiked ? 'fill-red-500 text-red-500' : ''}`} />
                    <span>{cmt.likes}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 10. Reply Composer (Fixed to bottom of screen) ─── */}
      <div className="sticky bottom-0 z-40 bg-background/95 backdrop-blur-md border-t border-border px-4 py-2.5 max-w-[430px] mx-auto">
        <form onSubmit={handleArticleCommentSubmit} className="flex items-center gap-2.5 bg-card border border-border rounded-full px-3.5 py-1.5 shadow-sm">
          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
            {user ? (user.email || "U").slice(0, 1).toUpperCase() : "M"}
          </div>
          <input
            type="text"
            placeholder="Post your reply"
            value={newCommentInput}
            onChange={(e) => setNewCommentInput(e.target.value)}
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!newCommentInput.trim()}
            className="h-7 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-all disabled:opacity-50"
          >
            Reply
          </Button>
        </form>
      </div>
    </div>
  );
};

export default NewsArticlePage;
