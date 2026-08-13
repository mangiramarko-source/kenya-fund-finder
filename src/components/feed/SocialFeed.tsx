import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { type FeedItem } from "@/hooks/useSocialFeed";
import { formatDistanceToNow } from "date-fns";
import { Heart, MoreHorizontal, BarChart3, Newspaper, DollarSign, Wallet, ArrowRight } from "lucide-react";
import { Sparkline } from "./Sparkline";
import { getNewsImage, handleNewsImageError } from "@/lib/news-images";
import { FeedItemDetailModal } from "./FeedItemDetailModal";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from 'react-markdown';
import remarkGfm from '@/lib/remarkGfmSafe';
import { StockDecisionContext } from "../news/StockDecisionContext";
import { Loader2, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { enrichArticleLive, type NewsFromDB, type PublicStock } from "@/lib/api";

import { useFeedInteractions, type PostInteraction } from "@/hooks/useFeedInteractions";
import { useIsMobile } from "@/hooks/use-mobile";

const getInitials = (name: string) => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase();
  return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
};

const getDomainFromUrl = (url?: string) => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
};

const getCustomSourceLogo = (authorName: string, domain?: string | null) => {
  const normName = authorName.toLowerCase();
  if (normName.includes("business daily") || domain?.includes("businessdailyafrica")) {
    return "/images/sources/business-daily.png";
  }
  return null;
};

const getAvatarBg = (type: FeedItem["type"]) => {
  switch (type) {
    case "NEWS": return "bg-blue-500 border-blue-600";
    case "STOCK_INSIGHT": return "bg-emerald-500 border-emerald-600";
    case "FUND_MILESTONE": return "bg-purple-500 border-purple-600";
    case "FX_ALERT": return "bg-amber-500 border-amber-600";
    case "EDUCATION": return "bg-indigo-500 border-indigo-600";
    default: return "bg-gray-500 border-gray-600";
  }
};

import { getStockLogoUrl } from "@/lib/stockBranding";
import { Link } from "react-router-dom";

export const SocialFeedCard = ({
  item,
  onSelect,
  index = 0,
  interaction,
  onLikeToggle,
}: {
  item: FeedItem;
  onSelect: (item: FeedItem) => void;
  index?: number;
  interaction?: PostInteraction;
  onLikeToggle?: (itemId: string, defaultLikes?: number) => void;
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const contentRef = useRef<HTMLDivElement>(null);
  const [isExpandable, setIsExpandable] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const isStockNews = item.type === "NEWS" && !!item.relatedStock;
  const isMmfNews = item.type === "NEWS" && !!item.relatedMmf;
  const isFxNews = item.type === "NEWS" && !!item.relatedFx;
  const isCommodityNews = item.type === "NEWS" && !!item.relatedCommodity;
  const isStockBranded = isStockNews;

  useEffect(() => {
    const checkOverflow = () => {
      const el = contentRef.current;
      if (!el || el.clientHeight === 0) return;
      const isOverflowing = el.scrollHeight > el.clientHeight + 4;
      setIsExpandable(isOverflowing);
    };

    const timeoutId = setTimeout(checkOverflow, 150);

    const resizeObserver = new ResizeObserver(() => {
      checkOverflow();
    });

    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [item.content]);

  const isLiked = interaction?.liked ?? false;
  const likeCount = interaction?.likeCount ?? (item.likes || 0);
  const commentsCount = (item.comments || 0) + (interaction?.comments?.length || 0);

  const timeAgo = formatDistanceToNow(item.timestamp, { addSuffix: true }).replace("about ", "");
  
  const isSocialPost = Boolean(item.authorName?.startsWith("X -") || item.rawItem?.source?.startsWith("X -"));
  const rawAuthor = item.authorName || "KenyaFundFinder Academy";
  const authorName = isSocialPost ? rawAuthor.replace(/^X\s*-\s*/, '') : rawAuthor;
  const initials = isSocialPost ? "X" : getInitials(authorName);
  
  const domain = getDomainFromUrl(item.url || item.rawItem?.link);
  const customLogo = getCustomSourceLogo(authorName, domain);
  const avatarSrc = customLogo || (domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null);
  const showFavicon = !isSocialPost && avatarSrc && !avatarError;

  const handleCardClick = () => {
    if (isMobile) {
      const rawId = item.id.startsWith("news-") ? item.id.slice(5) : item.id;
      navigate(`/news/${rawId}`);
    } else {
      onSelect(item);
    }
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Sign up to like posts", {
        description: "Create an account to interact with posts.",
        action: {
          label: "Sign Up",
          onClick: () => navigate("/auth"),
        },
      });
      return;
    }
    if (onLikeToggle) {
      onLikeToggle(item.id, item.likes || 0);
    }
    if (!isLiked) {
      toast.success("Liked post");
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: item.title,
        text: item.content,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  };

  const stockLogo = isStockBranded ? getStockLogoUrl(item.relatedStock!.symbol) : null;

  return (
    <div
      onClick={handleCardClick}
      className="animate-rise relative -mx-4 space-y-4 border-0 border-b border-border/80 bg-transparent px-4 py-3 shadow-none cursor-pointer transition-all md:mx-0 md:rounded-2xl md:border md:bg-card md:p-6 md:shadow-sm"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Ticker Pill - Rendered inline inside the card */}
      {isStockNews && (
        <div className="flex items-center">
          <Link
            to={`/stocks/${item.relatedStock!.symbol}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/60 px-2.5 py-1 text-xs hover:bg-muted transition-colors font-sans"
          >
            <strong className="font-bold text-foreground">{item.relatedStock!.symbol}</strong>
            <span className="text-muted-foreground">KES {item.relatedStock!.price.toFixed(2)}</span>
            <span className={`inline-flex items-center font-semibold ${item.relatedStock!.changePercent >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              {item.relatedStock!.changePercent >= 0 ? (
                <TrendingUp className="mr-0.5 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-0.5 h-3 w-3" />
              )}
              {Math.abs(item.relatedStock!.changePercent).toFixed(1)}%
            </span>
          </Link>
        </div>
      )}

      {isMmfNews && (
        <div className="flex items-center">
          <div
            className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/60 px-2.5 py-1 text-xs font-sans"
          >
            <strong className="font-bold text-foreground">{item.relatedMmf!.name}</strong>
            <span className="text-muted-foreground">{item.relatedMmf!.yield.toFixed(2)}% Yield</span>
            <span className={`inline-flex items-center font-semibold ${item.relatedMmf!.changePercent >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              {item.relatedMmf!.changePercent >= 0 ? (
                <TrendingUp className="mr-0.5 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-0.5 h-3 w-3" />
              )}
              {Math.abs(item.relatedMmf!.changePercent).toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      {isFxNews && (
        <div className="flex items-center">
          <div
            className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/60 px-2.5 py-1 text-xs font-sans"
          >
            <strong className="font-bold text-foreground">{item.relatedFx!.pair}</strong>
            <span className="text-muted-foreground">{item.relatedFx!.rate.toFixed(2)}</span>
            <span className={`inline-flex items-center font-semibold ${item.relatedFx!.changePercent >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              {item.relatedFx!.changePercent >= 0 ? (
                <TrendingUp className="mr-0.5 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-0.5 h-3 w-3" />
              )}
              {Math.abs(item.relatedFx!.changePercent).toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      {isCommodityNews && (
        <div className="flex items-center">
          <div
            className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/60 px-2.5 py-1 text-xs font-sans"
          >
            <strong className="font-bold text-foreground">{item.relatedCommodity!.name}</strong>
            <span className="text-muted-foreground">{item.relatedCommodity!.price.toFixed(2)} {item.relatedCommodity!.unit}</span>
            <span className={`inline-flex items-center font-semibold ${item.relatedCommodity!.changePercent >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              {item.relatedCommodity!.changePercent >= 0 ? (
                <TrendingUp className="mr-0.5 h-3 w-3" />
              ) : (
                <TrendingDown className="mr-0.5 h-3 w-3" />
              )}
              {Math.abs(item.relatedCommodity!.changePercent).toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      {/* Header Bar */}
      {isStockBranded ? (
        <header className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            {stockLogo ? (
              <img src={stockLogo} alt={item.relatedStock!.name} className="h-full w-full object-contain p-1" />
            ) : (
              <span className="font-bold text-emerald-700 text-sm">{item.relatedStock!.symbol}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-bold text-foreground">{item.relatedStock!.name}</h2>
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground shrink-0">Stock</span>
            </div>
            <p className="text-[13px] text-muted-foreground">{authorName} · {timeAgo}</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted/30"
            aria-label="More options"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </header>
      ) : (
        <div className="flex items-center gap-3">
          {/* Avatar Circle */}
          <div className={`w-12 h-12 rounded-full border ${isSocialPost ? 'bg-black dark:bg-white/10 text-white border-black/10' : getAvatarBg(item.type)} text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-sm overflow-hidden`}>
            {isSocialPost ? (
              <svg className="w-4 h-4 fill-current text-white dark:text-foreground" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            ) : showFavicon ? (
              <img 
                src={avatarSrc!} 
                alt={authorName}
                className="w-full h-full object-cover bg-white"
                onError={() => setAvatarError(true)}
              />
            ) : (
              initials
            )}
          </div>

          {/* Author Details & Timestamp */}
          <div className="flex-1 min-w-0 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-foreground text-sm truncate">{authorName}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground truncate">{item.authorLabel || "Market"}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[13px]">
              <span className="text-muted-foreground whitespace-nowrap">{timeAgo}</span>
            </div>
          </div>

          {/* Options Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="text-muted-foreground hover:text-foreground p-1 transition-colors rounded-full hover:bg-muted/30"
            aria-label="More options"
          >
            <MoreHorizontal className="w-5 h-5 md:w-4 md:h-4" />
          </button>
        </div>
      )}

      {/* Main Title / Headline */}
      {item.id !== "daily-market-summary" && (
        <h3 className={item.isHeadlineOnly
          ? "font-body text-sm font-normal text-foreground/90 leading-relaxed"
          : "font-heading font-extrabold text-base text-foreground leading-snug tracking-tight"
        }>
          {item.title}
        </h3>
      )}

      {/* Real Article Image (only shown if real image_url exists in database) */}
      {(item.mediaUrl || item.rawItem?.image_url) && (
        <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden border-y border-border/80 bg-muted/40 aspect-[16/9] md:left-auto md:-mx-6 md:w-[calc(100%+3rem)] md:translate-x-0 md:border-x-0 md:max-h-[340px]">
          <img
            src={getNewsImage(item.mediaUrl || item.rawItem?.image_url, item.authorLabel, item.id) || (item.mediaUrl || item.rawItem?.image_url)}
            alt=""
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
            onError={handleNewsImageError}
            loading="lazy"
          />
        </div>
      )}

      {/* Text Body Content - Clamped to 2 lines on feed preview */}
      {!item.isHeadlineOnly && (
        <div
          ref={contentRef}
          className="font-body text-sm text-muted-foreground/90 leading-relaxed line-clamp-2 prose dark:prose-invert font-normal [&_*]:inline [&_*]:m-0 [&_p]:inline [&_p]:m-0 [&_p]:after:content-['\20\20'] [&_h3]:inline [&_h3]:m-0 [&_h3]:font-bold [&_h3]:after:content-['\20\20']"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {item.content || ""}
          </ReactMarkdown>
        </div>
      )}

      {/* Continue Reading Link */}
      <div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
          className="inline-flex items-center gap-1.5 font-heading text-emerald-500 hover:text-emerald-400 font-semibold text-sm transition-colors cursor-pointer"
        >
          <span>Continue reading</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 text-muted-foreground">
        <div className="flex items-center gap-5">
          <button type="button" onClick={(e) => { e.stopPropagation(); handleCardClick(); }} className="flex items-baseline gap-1.5">
            <span className="text-sm tabular-nums">{commentsCount}</span><span className="text-[10px] uppercase tracking-[0.16em]">Comments</span>
          </button>
          <button type="button" onClick={handleLike} className={`flex items-baseline gap-1.5 ${isLiked ? "text-rose-500" : ""}`}>
            <span className="text-sm tabular-nums">{likeCount}</span><span className="text-[10px] uppercase tracking-[0.16em]">Likes</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={handleLike} className={`flex h-10 w-10 items-center justify-center rounded-full border border-border ${isLiked ? "border-rose-500/40 text-rose-500" : "text-muted-foreground"}`} aria-label={isLiked ? "Unlike article" : "Like article"}>
            <Heart className={`h-4 w-4 ${isLiked ? "fill-rose-500" : ""}`} />
          </button>
          <button type="button" onClick={handleShare} className="rounded-full bg-foreground px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-background">
            Share
          </button>
        </div>
      </div>

    </div>
  );
};

export function SocialFeed({ items, loading }: { items: FeedItem[], loading?: boolean }) {
  const { toggleLike, addComment, getPostInteraction } = useFeedInteractions();
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [displayCount, setDisplayCount] = useState(15);

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col gap-0 md:gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl bg-card p-4 ring-1 ring-white/5 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground/60 border border-dashed border-white/10 rounded-2xl">
        <p className="font-medium text-sm">No updates available in your feed.</p>
      </div>
    );
  }

  const visibleItems = items.slice(0, displayCount);

  return (
    <>
      <div className="flex flex-col gap-4">
        {visibleItems.map((item, i) => (
          <SocialFeedCard
            key={item.id}
            item={item}
            onSelect={setSelectedItem}
            index={i}
            interaction={getPostInteraction(item.id, item.likes || 0)}
            onLikeToggle={toggleLike}
          />
        ))}

        {items.length > displayCount && (
          <button
            type="button"
            onClick={() => setDisplayCount(prev => prev + 15)}
            className="w-full py-4 rounded-xl border border-border bg-card/50 text-xs font-semibold text-primary hover:bg-muted/50 transition-all text-center cursor-pointer"
          >
            Load more updates ({items.length - displayCount} remaining)
          </button>
        )}
      </div>

      <FeedItemDetailModal
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={(open) => {
          if (!open) setSelectedItem(null);
        }}
        interaction={selectedItem ? getPostInteraction(selectedItem.id, selectedItem.likes || 0) : undefined}
        onLikeToggle={toggleLike}
        onAddComment={addComment}
      />
    </>
  );
}
