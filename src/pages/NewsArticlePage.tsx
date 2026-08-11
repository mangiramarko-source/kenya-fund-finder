import { useParams, Link, useNavigate } from "react-router-dom";
import { decodeHtmlEntities, splitReadableParagraphs } from "@/lib/utils";
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
  ExternalLink,
  ThumbsUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchNewsById, fetchPublicStockById, fetchRelatedNews, type NewsFromDB, type PublicStock } from "@/lib/api";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow, format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getNewsImage, handleNewsImageError } from "@/lib/news-images";
import { useFeedInteractions } from "@/hooks/useFeedInteractions";
import { getStockLogoUrl } from "@/lib/stockBranding";
import { StockArticleMarketCard } from "@/components/stocks/StockArticleMarketCard";
import { getNewsPresentation } from "../../supabase/functions/_shared/news-text";

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

const NewsArticlePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggleLike, addComment, getPostInteraction } = useFeedInteractions();
  
  const { toast } = useToast();
  const [article, setArticle] = useState<NewsFromDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState<NewsFromDB[]>([]);
  const [relatedStock, setRelatedStock] = useState<PublicStock | null>(null);
  const [stockLogoError, setStockLogoError] = useState(false);
  const [sourceLogoError, setSourceLogoError] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [repostsCount, setRepostsCount] = useState(0);
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const [newCommentInput, setNewCommentInput] = useState("");

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
    setRelatedStock(null);
    setStockLogoError(false);
    setSourceLogoError(false);

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
          if (a.related_stock_id) {
            fetchPublicStockById(a.related_stock_id)
              .then(setRelatedStock)
              .catch(() => setRelatedStock(null));
          }
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

  const articlePresentation = article ? getNewsPresentation(article) : null;

  useDocumentTitle(
    articlePresentation ? `${articlePresentation.title} – Kenya Fund Finder` : "News Article – Kenya Fund Finder",
    articlePresentation?.body,
    article ? {
      title: articlePresentation?.title || article.title,
      description: articlePresentation?.body || articlePresentation?.title || article.summary,
      image: article.image_url || undefined,
      type: "article",
    } : undefined,
  );
  useJsonLd(article ? {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsArticle",
        headline: articlePresentation?.title || article.title,
        description: articlePresentation?.body || articlePresentation?.title || article.summary,
        mainEntityOfPage: `https://kenyafundfinder.com/news/${article.id}`,
        datePublished: article.date_published || article.created_at,
        dateModified: article.created_at || article.date_published,
        ...(article.image_url ? { image: [article.image_url] } : {}),
        author: { "@type": "Organization", name: article.source || "Kenya Fund Finder" },
        publisher: {
          "@type": "Organization",
          name: "Kenya Fund Finder",
          logo: { "@type": "ImageObject", url: "https://kenyafundfinder.com/apple-touch-icon.png" },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://kenyafundfinder.com/" },
          { "@type": "ListItem", position: 2, name: "Market News", item: "https://kenyafundfinder.com/news" },
          { "@type": "ListItem", position: 3, name: articlePresentation?.title || article.title, item: `https://kenyafundfinder.com/news/${article.id}` },
        ],
      },
    ],
  } : null);

  const shareUrl = article ? `https://kenyafundfinder.com/news/${article.id}` : "";
  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: "Link copied to clipboard" });
  };

  const handleArticleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentInput.trim()) return;
    const authorName = user ? (user.email?.split("@")[0] || "User") : "community_member";
    const cmtText = newCommentInput.trim();
    if (article) {
      addComment(`news-${article.id}`, cmtText, authorName);
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
          <div className="font-bold text-base text-foreground tracking-tight">Post</div>
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
  const formattedDate = isNaN(pubDate.getTime()) ? "Today" : format(pubDate, "d MMM yyyy");
  const relativeTime = isNaN(pubDate.getTime()) ? "now" : formatDistanceToNow(pubDate, { addSuffix: true }).replace("about ", "");
  const stockLogoUrl = relatedStock ? getStockLogoUrl(relatedStock.symbol) : "";
  const sourceDomain = (() => {
    if ((article.source || "").toLowerCase().includes("business daily")) return "businessdailyafrica.com";
    if (!article.url) return "";
    try { return new URL(article.url).hostname; } catch { return ""; }
  })();
  const sourceLogoUrl = sourceDomain ? `https://www.google.com/s2/favicons?domain=${sourceDomain}&sz=128` : "";
  const articleText = decodeHtmlEntities(articlePresentation?.body || "");
  const articleParagraphs = splitReadableParagraphs(articleText);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-8">
      {/* ─── 1. Top Navigation Bar (Fixed top header below main navbar) ─── */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border px-5 h-[58px] md:h-12 md:px-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center justify-center h-9 w-9 rounded-full text-foreground hover:bg-muted/50 transition-colors -ml-2 cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="h-6 w-6 md:h-5 md:w-5" />
        </button>

        <div className="font-bold text-sm text-foreground uppercase tracking-[0.3em] md:text-base md:normal-case md:tracking-tight">
          Post
        </div>

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

      <div className="max-w-[430px] mx-auto px-4 py-4 space-y-4 md:py-4">
        {/* ─── 2. Author Header ─── */}
        <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className={`${relatedStock ? "rounded-xl bg-white text-emerald-700" : "rounded-full bg-emerald-600 text-white"} w-10 h-10 border border-border font-bold text-sm flex items-center justify-center shrink-0 shadow-sm overflow-hidden`}>
              {relatedStock && stockLogoUrl && !stockLogoError ? (
                <img
                  src={stockLogoUrl}
                  alt={`${relatedStock.name} logo`}
                  className="h-full w-full object-contain p-1"
                  onError={() => setStockLogoError(true)}
                />
              ) : !relatedStock && sourceLogoUrl && !sourceLogoError ? (
                <img
                  src={sourceLogoUrl}
                  alt={`${article.source} logo`}
                  className="h-full w-full object-cover bg-white"
                  onError={() => setSourceLogoError(true)}
                />
              ) : relatedStock ? (
                relatedStock.symbol.slice(0, 3).toUpperCase()
              ) : (
                (article.source || "KF").slice(0, 2).toUpperCase()
              )}
            </div>
            {/* Name + Username */}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-sm text-foreground">{relatedStock?.name || article.source || "KenyaFundFinder"}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                <span className="truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {relatedStock ? "Stock" : article.category || "Market News"}
                </span>
              </div>
              <span className="text-[13px] text-muted-foreground">
                {relativeTime}
              </span>
            </div>
        </div>

        {relatedStock && <StockArticleMarketCard stock={relatedStock} />}

        {/* ─── 3. Post Text ─── */}
        <div className="space-y-3">
          <h1 className={articlePresentation?.isHeadlineOnly
            ? "text-[15px] font-normal text-foreground/90 leading-relaxed"
            : "text-base sm:text-lg font-bold text-foreground leading-snug tracking-tight"
          }>
            {articlePresentation?.title || decodeHtmlEntities(article.title)}
          </h1>

          {!articlePresentation?.isHeadlineOnly && <div className="text-[15px] sm:text-xl text-foreground/90 leading-relaxed space-y-4 font-normal">
            {articleParagraphs.map((paragraph, index) => (
              <p key={index} className="my-4">
                {paragraph}
              </p>
            ))}
          </div>}
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
        <div className="border-b border-border/60 pb-5 pt-2 text-[10px] font-semibold text-emerald-500 md:border-0 md:p-0 md:text-xs md:text-muted-foreground md:font-medium">
          {article.url && /^https?:\/\//i.test(article.url) ? (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline flex items-center gap-2 text-emerald-500 md:gap-1"
            >
              <span>From {getSourceDomain(article.url, article.source)}</span>
              <ExternalLink className="h-4 w-4 md:h-3 md:w-3" />
            </a>
          ) : (
            <span>From {getSourceDomain(null, article.source)}</span>
          )}
        </div>

        {/* ─── 6. Metadata ─── */}
        <div className="border-b border-border/60 pb-4 pt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 md:border-t md:border-b-0 md:pb-0 md:text-xs md:normal-case md:tracking-normal">
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
          const totalCommentsCount = interaction.comments?.length || 0;

          return (
            <div className="py-2 flex items-center justify-between text-sm text-muted-foreground font-medium md:justify-end md:gap-6 md:text-xs">
              {/* Comment */}
              <button type="button" className="flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer">
                <MessageSquare className="h-5 w-5 md:h-4 md:w-4" />
                <span>{totalCommentsCount}</span>
              </button>

              {/* Share */}
              <button type="button" onClick={handleCopyLink} className="flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer">
                <Share2 className="h-5 w-5 md:h-4 md:w-4" />
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
                <Heart className={`h-5 w-5 md:h-4 md:w-4 ${interaction.liked ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{interaction.likeCount}</span>
              </button>
            </div>
          );
        })()}

        {/* ─── 8. Divider ─── */}
        <div className="h-px bg-border/60" />

        {/* ─── 9. Replies ─── */}
        <div className="space-y-4 pt-1">
          {(() => {
            const itemId = article ? `news-${article.id}` : "";
            const interaction = itemId ? getPostInteraction(itemId, article?.likes || 0) : null;
            if (!interaction || !interaction.comments) return null;
            
            return interaction.comments.map((cmt, idx) => {
              const authorName = typeof cmt === 'string' ? "User" : (cmt.authorName || "User");
              const content = typeof cmt === 'string' ? cmt : cmt.content;
              const initials = authorName.substring(0, 1).toUpperCase();
              
              return (
                <div key={idx} className="flex gap-3 text-xs border-b border-border/40 pb-3">
                  <div className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 font-bold text-muted-foreground">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-foreground">{authorName}</span>
                      <span className="text-muted-foreground">@{authorName.toLowerCase().replace(/\s+/g, '')}</span>
                    </div>
                    <p className="text-foreground/90 leading-relaxed font-normal">
                      {content}
                    </p>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* ─── 10. Reply Composer (Fixed to bottom of screen) ─── */}
      <div className="sticky bottom-0 z-40 bg-background/95 backdrop-blur-md border-t border-border px-4 py-3 max-w-[430px] mx-auto">
        <form onSubmit={handleArticleCommentSubmit} className="flex items-center gap-3 bg-card border border-border rounded-full px-2.5 py-2 shadow-sm md:px-3.5 md:py-1.5">
          <div className="w-9 h-9 md:w-7 md:h-7 rounded-full bg-cyan-950 text-cyan-400 font-bold text-sm md:text-xs flex items-center justify-center shrink-0">
            {user ? (user.email || "U").slice(0, 1).toUpperCase() : "M"}
          </div>
          <input
            type="text"
            placeholder="Post your reply"
            value={newCommentInput}
            onChange={(e) => setNewCommentInput(e.target.value)}
            className="flex-1 bg-transparent text-sm md:text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!newCommentInput.trim()}
            className="h-9 px-5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-all disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 md:h-7 md:px-3 md:text-xs"
          >
            Reply
          </Button>
        </form>
      </div>
    </div>
  );
};

export default NewsArticlePage;
