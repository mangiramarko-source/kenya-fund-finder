import { useNavigate } from "react-router-dom";
import { useState, type MouseEvent } from "react";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageSquare, Share2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import type { FeedItem } from "@/hooks/useSocialFeed";
import type { PostInteraction } from "@/hooks/useFeedInteractions";
import { getStockLogoUrl } from "@/lib/stockBranding";

interface StockFeedCardProps {
  item: FeedItem;
  onSelect: (item: FeedItem) => void;
  interaction?: PostInteraction;
  onLikeToggle?: (itemId: string, defaultLikes?: number) => void;
  index?: number;
}

const rawArticleId = (item: FeedItem) => item.id.startsWith("news-") ? item.id.slice(5) : item.id;

export function StockFeedCard({ item, onSelect, interaction, onLikeToggle, index = 0 }: StockFeedCardProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [logoError, setLogoError] = useState(false);
  const stock = item.relatedStock;
  if (!stock) return null;

  const isUp = stock.changePercent > 0;
  const isDown = stock.changePercent < 0;
  const isLiked = interaction?.liked ?? false;
  const likeCount = interaction?.likeCount ?? item.likes;
  const commentsCount = item.comments + (interaction?.comments.length || 0);
  const articlePath = `/news/${rawArticleId(item)}`;
  const shareUrl = `${window.location.origin}${articlePath}`;
  const timeAgo = formatDistanceToNow(item.timestamp, { addSuffix: true }).replace("about ", "");
  const avatarUrl = getStockLogoUrl(stock.symbol);

  const openArticle = (event?: MouseEvent) => {
    event?.stopPropagation();
    if (isMobile) navigate(articlePath);
    else onSelect(item);
  };
  const handleLike = (event: MouseEvent) => {
    event.stopPropagation();
    if (!user) {
      toast.error("Sign up to like posts", {
        description: "Create an account to interact with posts.",
        action: { label: "Sign Up", onClick: () => navigate("/auth") },
      });
      return;
    }
    onLikeToggle?.(item.id, item.likes);
    if (!isLiked) toast.success("Liked post");
  };

  const handleShare = async (event: MouseEvent) => {
    event.stopPropagation();
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, text: item.content, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard");
      }
    } catch {
      // Native share dismissal is not an error for the user.
    }
  };

  return (
    <article
      onClick={openArticle}
      className="animate-rise rounded-2xl bg-card p-4 sm:p-5 border border-border/80 shadow-sm cursor-pointer hover:border-border transition-all space-y-3"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          navigate(`/stocks/${encodeURIComponent(stock.symbol)}`);
        }}
        className="flex items-center gap-2 text-xs bg-muted/60 hover:bg-muted border border-border/60 rounded-md px-2.5 py-1 w-fit transition-colors"
        aria-label={`View ${stock.name}`}
      >
        <span className="font-bold text-foreground">{stock.symbol}</span>
        <span className="text-muted-foreground">KES {stock.price.toFixed(2)}</span>
        <span className={`flex items-center font-medium ${isUp ? "text-emerald-500" : isDown ? "text-rose-500" : "text-muted-foreground"}`}>
          {isUp ? <TrendingUp className="w-3 h-3 mr-0.5" /> : isDown ? <TrendingDown className="w-3 h-3 mr-0.5" /> : <Minus className="w-3 h-3 mr-0.5" />}
          {Math.abs(stock.changePercent).toFixed(1)}%
        </span>
      </button>

      <header className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-white border border-border text-emerald-700 font-extrabold text-xs flex items-center justify-center shrink-0 overflow-hidden">
          {avatarUrl && !logoError ? (
            <img
              src={avatarUrl}
              alt={`${stock.name} logo`}
              className="w-full h-full object-contain p-1"
              onError={() => setLogoError(true)}
            />
          ) : (
            stock.symbol.slice(0, 3).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-foreground text-base truncate">{stock.name}</p>
          <p className="text-sm text-muted-foreground">
            Live News <span className="px-1">·</span> {timeAgo}
          </p>
        </div>
      </header>

      <h2 className="font-bold text-base text-foreground leading-snug tracking-tight">{item.title}</h2>
      <p className="text-base text-muted-foreground/90 leading-relaxed line-clamp-4 font-normal">
        {item.aiInsight || item.content}
      </p>

      <button type="button" onClick={openArticle} className="text-emerald-500 hover:text-emerald-400 font-semibold text-sm">
        See more
      </button>

      <footer className="flex items-center justify-end gap-6 text-xs text-muted-foreground pt-1">
        <button type="button" onClick={(event) => { event.stopPropagation(); onSelect(item); }} className="flex items-center gap-1.5 hover:text-foreground">
          <MessageSquare className="w-4 h-4" /><span>{commentsCount}</span>
        </button>
        <button type="button" onClick={handleShare} className="flex items-center gap-1.5 hover:text-foreground">
          <Share2 className="w-4 h-4" /><span>Share</span>
        </button>
        <button type="button" onClick={handleLike} className={`flex items-center gap-1.5 ${isLiked ? "text-rose-500 font-semibold" : "hover:text-rose-500"}`}>
          <Heart className={`w-4 h-4 ${isLiked ? "fill-rose-500" : ""}`} /><span>{likeCount}</span>
        </button>
      </footer>
    </article>
  );
}
