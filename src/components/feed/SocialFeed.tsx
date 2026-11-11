import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { type FeedItem } from "@/hooks/useSocialFeed";
import { formatDistanceToNow } from "date-fns";
import { Heart, MoreHorizontal, BarChart3, Newspaper, DollarSign, Wallet, ArrowRight, MessageCircle, Share2, ArrowBigUp, BarChart2, Bookmark, Play } from "lucide-react";
import { extractYouTubeVideoId } from "@/lib/newsDedupe";
import { getSourceLogoUrl } from "@/lib/sourceBranding";
import { Sparkline } from "./Sparkline";
import { getNewsImage, handleNewsImageError } from "@/lib/news-images";
import { FeedItemDetailModal } from "./FeedItemDetailModal";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from 'react-markdown';
import remarkGfm from '@/lib/remarkGfmSafe';
import { Loader2, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { enrichArticleLive, type NewsFromDB, type PublicStock } from "@/lib/api";
import { classifyArticleCategory, getCategoryDotColor } from "@/lib/articleCategoryClassifier";

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
  if (normName.includes("kbc")) return "/images/news-sources/kbc.png";
  if (normName.includes("standard media")) return "/images/news-sources/standard.png";
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
  onUpvoteToggle,
  onBookmarkToggle,
  onRecordView,
}: {
  item: FeedItem;
  onSelect: (item: FeedItem) => void;
  index?: number;
  interaction?: PostInteraction;
  onLikeToggle?: (itemId: string, defaultLikes?: number) => void;
  onUpvoteToggle?: (itemId: string, defaultUpvotes?: number) => void;
  onBookmarkToggle?: (itemId: string) => void;
  onRecordView?: (itemId: string) => void;
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const contentRef = useRef<HTMLDivElement>(null);
  const [isExpandable, setIsExpandable] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [hasRecordedVideoView, setHasRecordedVideoView] = useState(false);

  const youtubeVideoId = useMemo(
    () =>
      extractYouTubeVideoId(item.rawItem) ||
      extractYouTubeVideoId({
        video_url: (item as any).videoUrl,
        url: item.url,
        image_url: item.mediaUrl,
      }),
    [item],
  );

  const handlePlayInlineVideo = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (!hasRecordedVideoView) {
      setHasRecordedVideoView(true);
      onRecordView?.(item.id);
    }
    setIsPlayingVideo(true);
  };

  const isStockNews = !!item.relatedStock;
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

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && contentRef.current) {
      resizeObserver = new ResizeObserver(() => {
        checkOverflow();
      });
      resizeObserver.observe(contentRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver?.disconnect();
    };
  }, [item.content]);

  const isLiked = interaction?.liked ?? false;
  const likeCount = interaction?.likeCount ?? (item.likes || 0);
  const commentsCount = (item.comments || 0) + (interaction?.comments?.length || 0);
  const isUpvoted = interaction?.upvoted ?? false;
  const upvoteCount = interaction?.upvoteCount ?? 0;
  const isBookmarked = interaction?.bookmarked ?? false;
  const viewsCount = interaction?.viewsCount ?? 160;
  const formattedViews = interaction?.formattedViews ?? "160";

  const timeAgo = formatDistanceToNow(item.timestamp, { addSuffix: true }).replace("about ", "");
  
  const isSocialPost = Boolean(item.authorName?.startsWith("X -") || item.rawItem?.source?.startsWith("X -"));
  const rawAuthor = item.authorName || "Market News";
  const authorName = rawAuthor.replace(/^(?:Facebook|X)\s*-\s*/i, "").replace(/\s*\(Official\)/i, "").trim();
  const initials = isSocialPost ? "X" : getInitials(authorName);

  const displayCategory = useMemo(
    () =>
      classifyArticleCategory({
        title: item.title,
        summary: item.rawItem?.summary || item.content,
        content: item.content,
        category: item.rawItem?.category,
        source: authorName || item.rawItem?.source,
        authorLabel: item.authorLabel,
        relatedStock: item.relatedStock,
        related_stock_id: item.rawItem?.related_stock_id,
      }),
    [item.title, item.rawItem?.summary, item.content, item.rawItem?.category, authorName, item.rawItem?.source, item.authorLabel, item.relatedStock, item.rawItem?.related_stock_id]
  );
  
  const avatarSrc = getSourceLogoUrl(authorName, item.url || item.rawItem?.link);
  const showFavicon = !isSocialPost && avatarSrc && !avatarError;

  const handleCardClick = () => {
    onRecordView?.(item.id);
    if (isMobile) {
      const rawId = item.id.startsWith("news-") ? item.id.slice(5) : item.id;
      navigate(`/news/${rawId}`, {
        state: {
          article: item.rawItem,
          stock: item.relatedStock,
          feedItem: item,
        },
      });
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

  const handleUpvote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpvoteToggle) {
      onUpvoteToggle(item.id, upvoteCount);
    }
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBookmarkToggle) {
      onBookmarkToggle(item.id);
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

  const stockLogo = isStockBranded ? getStockLogoUrl(item.relatedStock!.symbol, item.relatedStock!.logoUrl) : null;

  return (
    <div
      onClick={handleCardClick}
      className="animate-rise relative -mx-4 flex items-start gap-3 border-0 border-b border-border/80 bg-transparent px-4 py-3 shadow-none cursor-pointer transition-all md:mx-0 md:rounded-2xl md:border md:bg-card md:p-5 md:shadow-sm md:gap-3.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* ─── 1. Left Avatar Column (Twitter / X Style) ─── */}
      <div className="shrink-0 pt-0.5">
        {isStockBranded ? (
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-border bg-white shadow-xs">
            {stockLogo ? (
              <img src={stockLogo} alt={item.relatedStock!.name} className="h-full w-full object-contain p-1" referrerPolicy="no-referrer" />
            ) : (
              <span className="font-extrabold text-emerald-700 text-sm">{item.relatedStock!.symbol}</span>
            )}
          </div>
        ) : (
          <div
            className={`w-12 h-12 rounded-full border ${
              isSocialPost
                ? "bg-black dark:bg-white/10 text-white border-black/10"
                : showFavicon && avatarSrc?.startsWith("/images/")
                  ? "bg-white dark:bg-neutral-900 border-border"
                  : getAvatarBg(item.type)
            } text-white font-bold text-sm flex items-center justify-center shadow-xs overflow-hidden`}
          >
            {isSocialPost ? (
              <svg className="w-5 h-5 fill-current text-white dark:text-foreground" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            ) : showFavicon ? (
              <img
                src={avatarSrc!}
                alt={authorName}
                className="w-full h-full bg-white dark:bg-neutral-900 object-cover scale-110"
                onError={() => setAvatarError(true)}
                referrerPolicy="no-referrer"
              />
            ) : (
              initials
            )}
          </div>
        )}
      </div>

      {/* ─── 2. Right Content Column (All Text & Media Off-Aligned) ─── */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Header Bar: Author Name • Category • Time • Options */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span className="font-bold text-foreground text-[15px] leading-5 truncate hover:underline">
              {isStockBranded ? item.relatedStock!.name : authorName}
            </span>
            {isStockBranded && (
              <span className="text-[15px] font-normal leading-5 font-mono text-muted-foreground">
                ${item.relatedStock!.symbol}
              </span>
            )}
            <span className="text-muted-foreground/60 text-[15px] leading-5 select-none">·</span>
            {displayCategory && (
              <>
                <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${getCategoryDotColor(displayCategory)}`} />
                  {displayCategory}
                </span>
                <span className="text-muted-foreground/60 text-[15px] leading-5 select-none">·</span>
              </>
            )}
            <span className="text-[15px] font-normal leading-5 text-muted-foreground whitespace-nowrap hover:underline">{timeAgo}</span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted/40 shrink-0 -mr-1"
            aria-label="More options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Ticker Pill - Rendered inline inside the card */}
        {isStockNews && !isMmfNews && item.relatedStock && (
          <div className="flex items-center">
            <Link
              to={`/stocks/${item.relatedStock.symbol}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/60 px-2.5 py-1 text-[13px] md:text-xs hover:bg-muted transition-colors font-sans"
            >
              <strong className="font-bold text-foreground">{item.relatedStock.symbol}</strong>
              <span className="text-zinc-800 dark:text-muted-foreground">KES {(Number(item.relatedStock.price) || 0).toFixed(2)}</span>
              <span className={`inline-flex items-center font-semibold ${(Number(item.relatedStock.changePercent) || 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {(Number(item.relatedStock.changePercent) || 0) >= 0 ? (
                  <TrendingUp className="mr-0.5 h-3 w-3" />
                ) : (
                  <TrendingDown className="mr-0.5 h-3 w-3" />
                )}
                {Math.abs(Number(item.relatedStock.changePercent) || 0).toFixed(1)}%
              </span>
            </Link>
          </div>
        )}

        {isMmfNews && (
          <div className="flex items-center">
            <div
              className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/60 px-2.5 py-1 text-[13px] md:text-xs font-sans"
            >
              <strong className="font-bold text-foreground">{item.relatedMmf!.name}</strong>
              <span className="text-zinc-800 dark:text-muted-foreground">{item.relatedMmf!.yield.toFixed(2)}% Yield</span>
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
              className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/60 px-2.5 py-1 text-[13px] md:text-xs font-sans"
            >
              <strong className="font-bold text-foreground">{item.relatedFx!.pair}</strong>
              <span className="text-zinc-800 dark:text-muted-foreground">{item.relatedFx!.rate.toFixed(2)}</span>
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
              className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/60 px-2.5 py-1 text-[13px] md:text-xs font-sans"
            >
              <strong className="font-bold text-foreground">{item.relatedCommodity!.name}</strong>
              <span className="text-zinc-800 dark:text-muted-foreground">{item.relatedCommodity!.price.toFixed(2)} {item.relatedCommodity!.unit}</span>
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

        {/* Main Title / Headline */}
        {item.id !== "daily-market-summary" && (
          <h3 className={item.isHeadlineOnly
            ? "font-body text-[15px] font-normal text-foreground/90 leading-5"
            : "font-heading font-extrabold text-[16px] md:text-[17px] text-foreground leading-snug tracking-tight"
          }>
            {item.title}
          </h3>
        )}

        {/* Text Body Content - Clamped to 2 lines on feed preview */}
        {!item.isHeadlineOnly && (
          <div
            ref={contentRef}
            className="font-body text-[15px] leading-5 text-zinc-900 dark:text-muted-foreground/90 line-clamp-2 prose dark:prose-invert font-normal [&_*]:inline [&_*]:m-0 [&_p]:inline [&_p]:m-0 [&_p]:after:content-['\20\20'] [&_h3]:inline [&_h3]:m-0 [&_h3]:font-bold [&_h3]:after:content-['\20\20']"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {item.content || ""}
            </ReactMarkdown>
          </div>
        )}

        {/* Inline Video Player or Real Article Image (contained in right column, Twitter style) */}
        {youtubeVideoId ? (
          isPlayingVideo ? (
            <div
              onClick={(e) => e.stopPropagation()}
              data-testid="inline-video-iframe-container"
              className="relative overflow-hidden rounded-2xl border border-border/80 bg-black aspect-video w-full max-h-[320px]"
            >
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&rel=0`}
                title={item.title || "Video Briefing"}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div
              onClick={handlePlayInlineVideo}
              role="button"
              tabIndex={0}
              aria-label={`Play video: ${item.title}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handlePlayInlineVideo(e);
                }
              }}
              className="group relative overflow-hidden rounded-2xl border border-border/80 bg-black aspect-video w-full max-h-[320px] cursor-pointer"
            >
              <img
                src={
                  getNewsImage(
                    item.mediaUrl || item.rawItem?.image_url,
                    item.authorLabel,
                    item.id,
                    false,
                    item.rawItem?.source,
                  ) || `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`
                }
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                onError={(e) => {
                  const fallback = `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`;
                  if (e.currentTarget.src !== fallback) {
                    e.currentTarget.src = fallback;
                  }
                }}
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <button
                  type="button"
                  aria-label="Play inline video"
                  onClick={handlePlayInlineVideo}
                  className="w-14 h-14 rounded-full bg-black/65 backdrop-blur-sm border border-white/25 text-white flex items-center justify-center shadow-xl transition-transform duration-200 group-hover:scale-105 group-hover:bg-black/80"
                >
                  <Play className="w-6 h-6 fill-white text-white ml-0.5" />
                </button>
              </div>
              <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-md bg-black/80 backdrop-blur-xs px-2 py-0.5 text-[11px] font-mono font-semibold text-white border border-white/10">
                ▶ Video Briefing
              </span>
            </div>
          )
        ) : (
          !mediaError && (() => {
            const cardImage = getNewsImage(
              item.mediaUrl || item.rawItem?.image_url,
              item.authorLabel,
              item.id,
              false,
              item.rawItem?.source
            );
            if (!cardImage) return null;
            return (
              <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-muted/30 aspect-[16/9] w-full max-h-[320px]">
                <img
                  src={cardImage}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-102"
                  onError={(e) => {
                    setMediaError(true);
                    handleNewsImageError(e);
                  }}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              </div>
            );
          })()
        )}

        {/* Continue Reading Link */}
        <div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="inline-flex items-center gap-1.5 font-heading text-emerald-500 hover:text-emerald-400 font-semibold text-[14px] transition-colors cursor-pointer"
          >
            <span>Continue reading</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ─── Bottom Actions Row: 6 Distinct Rounded Pill Chips (Mobile-identical compact format) ─── */}
        <div className="flex items-center justify-between w-full min-w-0 gap-1 sm:gap-2 pt-2 flex-nowrap">
          {/* Comments Pill */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full border border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
            aria-label={`${commentsCount} comments`}
          >
            <MessageCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="tabular-nums text-[13px] leading-4">{commentsCount}</span>
          </button>

          {/* Likes Pill */}
          <button
            type="button"
            onClick={handleLike}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full border text-xs font-semibold transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0 ${
              isLiked
                ? "border-rose-500/40 bg-rose-500/10 text-rose-500 shadow-xs"
                : "border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
            aria-label={isLiked ? "Unlike article" : "Like article"}
          >
            <Heart className={`h-3.5 w-3.5 shrink-0 ${isLiked ? "fill-rose-500 text-rose-500" : "text-muted-foreground"}`} />
            <span className="tabular-nums text-[13px] leading-4">{likeCount}</span>
          </button>

          {/* Rank / Upvote Pill */}
          <button
            type="button"
            onClick={handleUpvote}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full border text-xs font-semibold transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0 ${
              isUpvoted
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
            aria-label={isUpvoted ? "Remove upvote" : "Upvote story"}
          >
            <ArrowBigUp className={`h-4 w-4 shrink-0 ${isUpvoted ? "fill-emerald-500 text-emerald-500" : "text-muted-foreground"}`} />
            <span className="tabular-nums text-[13px] leading-4">{upvoteCount}</span>
          </button>

          {/* Views Metric Chip */}
          <div
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full border border-border/70 bg-muted/20 text-muted-foreground text-xs font-medium whitespace-nowrap shrink-0"
            title={`${viewsCount.toLocaleString()} total views`}
          >
            <BarChart2 className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
            <span className="tabular-nums text-[13px] leading-4">{formattedViews}</span>
          </div>

          {/* Bookmark Pill */}
          <button
            type="button"
            onClick={handleBookmark}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full border text-xs font-semibold transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0 ${
              isBookmarked
                ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-xs"
                : "border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark article"}
          >
            <Bookmark className={`h-3.5 w-3.5 shrink-0 ${isBookmarked ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`} />
          </button>

          {/* Share Pill */}
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1.5 rounded-full border border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
            aria-label="Share article"
          >
            <Share2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};

export function SocialFeed({ items, loading }: { items: FeedItem[], loading?: boolean }) {
  const {
    toggleLike,
    toggleUpvote,
    toggleBookmark,
    recordView,
    addComment,
    getPostInteraction,
  } = useFeedInteractions();
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
            interaction={getPostInteraction(item.id, item.likes || 0, item.timestamp)}
            onLikeToggle={toggleLike}
            onUpvoteToggle={toggleUpvote}
            onBookmarkToggle={toggleBookmark}
            onRecordView={recordView}
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
        interaction={selectedItem ? getPostInteraction(selectedItem.id, selectedItem.likes || 0, selectedItem.timestamp) : undefined}
        onLikeToggle={toggleLike}
        onUpvoteToggle={toggleUpvote}
        onBookmarkToggle={toggleBookmark}
        onAddComment={addComment}
      />
    </>
  );
}
