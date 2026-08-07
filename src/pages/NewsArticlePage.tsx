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
import { useFeedInteractions } from "@/hooks/useFeedInteractions";

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
  const { toggleLike, addComment, getPostInteraction } = useFeedInteractions();
  
  const { toast } = useToast();
  const [article, setArticle] = useState<NewsFromDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState<NewsFromDB[]>([]);
  const [bookmarked, setBookmarked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [repostsCount, setRepostsCount] = useState(0);
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const [newCommentInput, setNewCommentInput] = useState("");
  const [commentsList, setCommentsList] = useState<CommentItem[]>([]);

const educationalTips = [
  { 
    title: "Dividend Yield", 
    content: "Think of a dividend yield like the interest a bank pays you for keeping money in a savings account, but for stocks. It is a simple percentage that shows how much cash a company pays out to its shareholders each year compared to the price of its stock. For example, if a stock costs $100 and pays $5 a year in dividends, the dividend yield is 5%. It is a useful number for investors who want to earn regular income from their investments." 
  },
  { 
    title: "Bear vs Bull Market", 
    content: "These terms describe the overall mood of the stock market. A 'Bull' market is when prices are generally going up, and people are feeling confident about the economy. A 'Bear' market is the opposite—prices are falling, and people are more cautious. An easy way to remember this is by how the animals attack: a bull thrusts its horns up into the air, while a bear swipes its paws down." 
  },
  { 
    title: "P/E Ratio", 
    content: "The Price-to-Earnings (P/E) ratio is a tool used to figure out if a stock is expensive or cheap. It compares the price of a single share of stock to the profit (earnings) the company makes per share. If a stock costs $50 and the company makes $5 per share, the P/E ratio is 10. A high P/E might mean people expect the company to grow a lot in the future, while a low P/E might mean it is currently undervalued by the market." 
  },
  { 
    title: "Compound Interest", 
    content: "Compound interest is when you earn interest not only on the money you originally saved, but also on the interest you've already earned. Imagine a snowball rolling down a hill, getting bigger and bigger as it picks up more snow. Over a long period of time, compound interest allows your savings to grow much faster than if you were only earning interest on your original starting amount." 
  },
  { 
    title: "Diversification", 
    content: "Diversification is the financial version of the saying 'don't put all your eggs in one basket.' It means spreading your investments across many different areas—like buying stocks from different industries, or mixing stocks with bonds. Because different types of investments react differently to what's happening in the economy, this strategy helps protect your overall portfolio if one specific area suddenly drops in value." 
  },
  { 
    title: "Liquidity", 
    content: "Liquidity simply means how quickly and easily you can turn an asset into cold, hard cash without having to sell it at a huge discount. Cash in your wallet is perfectly liquid. Stocks are usually very liquid because you can sell them almost instantly on the market. On the other hand, a house is very illiquid, because it can take months of work to find a buyer and actually get the cash in your hands." 
  },
  { 
    title: "Bonds vs Stocks", 
    content: "When you buy a stock, you are buying a tiny slice of ownership in a company. If the company does well, your piece becomes more valuable. When you buy a bond, you are not buying ownership; instead, you are lending your money to a company or government for a set amount of time. In return, they promise to pay you back with regular interest payments. Stocks generally offer higher potential rewards, while bonds offer more predictability." 
  },
  { 
    title: "Inflation", 
    content: "Inflation is the invisible force that makes things more expensive over time. It is the rate at which the general prices for goods and services go up. For example, if inflation is at 3%, a basket of groceries that costs $100 today will cost $103 next year. Because things cost more, the actual purchasing power of your money goes down, which is why keeping cash under a mattress usually loses value over decades." 
  }
];

function getSyntheticArticle(id: string): NewsFromDB | null {
  if (id === "daily-market-summary") {
    return {
      id: "daily-market-summary",
      title: "Today's Market Wrap-up",
      summary: "Comprehensive daily overview of Kenyan equities, currency exchange rates, commodities, and top economic headlines.",
      content: `The Kenyan market showed dynamic trading activity today. Key blue-chip equities posted positive momentum on the Nairobi Securities Exchange (NSE), while Money Market Funds (MMFs) continue to deliver steady risk-adjusted yields.\n\n💱 Currency Watch: The US Dollar traded steadily against KES, maintaining balance for import markets while Euro and Sterling pairs held steady.\n\n📦 Commodities: Global Crude Oil and Gold monitored macroeconomic trends, while local agricultural exports remained key economic pillars.`,
      source: "Market Insights",
      date_published: new Date().toISOString(),
      url: null,
      category: "Market News",
      read_time: "2 min read",
      is_featured: true,
      status: "published",
      image_url: null,
    };
  }

  if (id.startsWith("edu-snack-")) {
    const today = new Date();
    const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const tipIndex = dateSeed % educationalTips.length;
    const tip = educationalTips[tipIndex];

    return {
      id: id,
      title: `💡 Term of the Day: ${tip.title}`,
      summary: tip.content,
      content: tip.content,
      source: "KenyaFundFinder Academy",
      date_published: new Date().toISOString(),
      url: null,
      category: "Yield Updates",
      read_time: "2 min read",
      is_featured: false,
      status: "published",
      image_url: null,
    };
  }

  return null;
}

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 50);

    if (!id) return () => clearTimeout(timer);
    setLoading(true);
    setRelated([]);

    const synthetic = getSyntheticArticle(id);
    if (synthetic) {
      setArticle(synthetic);
      setLoading(false);
      return () => clearTimeout(timer);
    }

    fetchNewsById(id)
      .then((a) => {
        if (a) {
          setArticle(a);
          fetchRelatedNews(a.category, a.id, 3)
            .then(setRelated)
            .catch(() => {});
        } else {
          const syn = getSyntheticArticle(id);
          setArticle(syn);
        }
      })
      .catch(() => {
        const syn = getSyntheticArticle(id);
        setArticle(syn);
      })
      .finally(() => {
        setLoading(false);
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      });

    return () => clearTimeout(timer);
  }, [id]);

  useEffect(() => {
    if (!loading && article) {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [loading, article]);

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
    const cmtText = newCommentInput.trim();
    const newCmt: CommentItem = {
      id: `c-${Date.now()}`,
      authorName,
      authorHandle: `@${authorName.toLowerCase()}`,
      avatarInitials: initials,
      timestamp: "Just now",
      content: cmtText,
      likes: 0,
      reposts: 0,
    };
    setCommentsList(prev => [newCmt, ...prev]);
    if (article) {
      addComment(`news-${article.id}`, cmtText);
    }
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
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border px-4 h-12 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center justify-center h-9 w-9 rounded-full text-foreground hover:bg-muted/50 transition-colors -ml-2 cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-bold text-base text-foreground tracking-tight">Post</h1>
          <div className="w-9" />
        </header>
        <div className="max-w-[430px] mx-auto py-4 px-4 space-y-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
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

  const pubDate = new Date(article.created_at || article.date_published);
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
          <h2 className="text-base sm:text-lg font-bold text-foreground leading-snug tracking-tight">
            {decodeHtmlEntities(article.title)}
          </h2>

          <div className="text-lg sm:text-xl text-foreground/90 leading-relaxed space-y-4 font-normal">
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
        {heroImage && (
          <div className="rounded-2xl overflow-hidden border border-border/80 bg-muted/30">
            <img
              src={heroImage}
              alt={article.title}
              className="w-full aspect-[16/9] object-cover"
              onError={handleNewsImageError}
              loading="eager"
            />
          </div>
        )}

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
          {article?.read_time && (
            <>
              <span>•</span>
              <span>{article.read_time}</span>
            </>
          )}
        </div>

        {/* ─── 7. Engagement Row ─── */}
        {(() => {
          const itemId = article ? `news-${article.id}` : "";
          const interaction = itemId ? getPostInteraction(itemId, article?.likes || 0) : { liked: false, likeCount: article?.likes || 0, comments: [] };
          const totalCommentsCount = commentsList.length + (interaction.comments?.length || 0);

          return (
            <div className="py-1.5 flex items-center justify-end gap-6 text-xs text-muted-foreground font-medium">
              {/* Comment */}
              <button type="button" className="flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer">
                <MessageSquare className="w-4 h-4" />
                <span>{totalCommentsCount}</span>
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
                  if (article) {
                    toggleLike(`news-${article.id}`, article.likes || 0);
                  }
                }}
                className={`flex items-center gap-2 transition-colors cursor-pointer ${interaction.liked ? 'text-rose-500 font-bold' : 'hover:text-foreground'}`}
              >
                <Heart className={`w-4 h-4 ${interaction.liked ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{interaction.likeCount}</span>
              </button>
            </div>
          );
        })()}

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

                {/* Reply action bar matching main engagement row */}
                <div className="flex items-center justify-end gap-6 text-[11px] text-muted-foreground font-medium pt-1.5">
                  <button type="button" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Reply</span>
                  </button>
                  <button type="button" onClick={handleCopyLink} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleLikeComment(cmt.id)}
                    className={`flex items-center gap-1.5 transition-colors ${cmt.userLiked ? 'text-red-500 font-bold' : 'hover:text-foreground'}`}
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
