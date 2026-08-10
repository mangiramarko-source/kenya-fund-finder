import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { type FeedItem } from "@/hooks/useSocialFeed";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageSquare, Share2, MoreHorizontal, BarChart3, Newspaper, DollarSign, Wallet } from "lucide-react";
import { Sparkline } from "./Sparkline";
import { getNewsImage, handleNewsImageError } from "@/lib/news-images";
import { FeedItemDetailModal } from "./FeedItemDetailModal";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from 'react-markdown';
import remarkGfm from '@/lib/remarkGfmSafe';

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

  useEffect(() => {
    const checkOverflow = () => {
      const el = contentRef.current;
      if (!el || el.clientHeight === 0) return;
      // Allow a small buffer for subpixel rendering differences
      const isOverflowing = el.scrollHeight > el.clientHeight + 4;
      setIsExpandable(isOverflowing);
    };

    // Initial check with a slight delay to allow ReactMarkdown and fonts to render
    const timeoutId = setTimeout(checkOverflow, 150);

    // ResizeObserver catches font loads, window resizes, and layout shifts
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
  
  const rawLabel = item.authorLabel || "dailytip";
  const authorHandle = rawLabel.startsWith("@") ? rawLabel : `@${rawLabel.toLowerCase().replace(/\s+/g, '')}`;
  
  const domain = getDomainFromUrl(item.url || item.rawItem?.link);
  const customLogo = getCustomSourceLogo(authorName, domain);
  const avatarSrc = customLogo || (domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null);
  const showFavicon = !isSocialPost && avatarSrc && !avatarError;

  const handleCardClick = () => {
    if (isMobile) {
      // Feed item IDs are prefixed with "news-" (e.g. "news-abc123").
      // Strip the prefix so the URL matches what fetchNewsById expects.
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

  return (
    <div
      onClick={handleCardClick}
      className="animate-rise rounded-2xl bg-card p-4 sm:p-5 border border-border/80 shadow-sm cursor-pointer hover:border-border transition-all space-y-3"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Top Author Bar */}
      <div className="flex items-center gap-3">
        {/* Avatar Circle */}
        <div className={`w-9 h-9 rounded-full ${isSocialPost ? 'bg-black dark:bg-white/10 text-white border-black/10' : getAvatarBg(item.type)} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm overflow-hidden`}>
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
        <div className="flex-1 min-w-0 flex items-center flex-wrap gap-x-1.5 text-xs">
          <span className="font-bold text-foreground text-sm truncate">
            {authorName}
          </span>
          {isSocialPost && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-black/5 dark:bg-white/10 text-foreground dark:text-white px-1.5 py-0.5 rounded-full border border-border/60 shrink-0">
              <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>Social</span>
            </span>
          )}
          <span className="text-muted-foreground truncate">
            {authorHandle}
          </span>
          <span className="text-muted-foreground font-bold">·</span>
          <span className="text-muted-foreground whitespace-nowrap">
            {timeAgo}
          </span>
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
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Main Title / Headline */}
      {item.id !== "daily-market-summary" && (
        <h3 className="font-bold text-base text-foreground leading-snug tracking-tight">
          {item.title}
        </h3>
      )}

      {/* Real Article Image (only shown if real image_url exists in database) */}
      {(item.mediaUrl || item.rawItem?.image_url) && (
        <div className="relative overflow-hidden rounded-xl border border-border/80 bg-muted/40 max-h-[260px] aspect-[16/9]">
          <img
            src={getNewsImage(item.mediaUrl || item.rawItem?.image_url, item.authorLabel, item.id) || (item.mediaUrl || item.rawItem?.image_url)}
            alt=""
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
            onError={handleNewsImageError}
            loading="lazy"
          />
        </div>
      )}

      {/* Text Body Content */}
      <div
        ref={contentRef}
        className="text-base text-muted-foreground/90 leading-relaxed line-clamp-4 prose dark:prose-invert font-normal [&_*]:inline [&_*]:m-0 [&_p]:inline [&_p]:m-0 [&_p]:after:content-['\20\20'] [&_h3]:inline [&_h3]:m-0 [&_h3]:font-bold [&_h3]:after:content-['\20\20']"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {item.content || ""}
        </ReactMarkdown>
      </div>

      {/* See more Link (only shown for long articles that don't fit in card) */}
      {isExpandable && (
        <div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="text-emerald-500 hover:text-emerald-400 font-semibold text-sm inline-block transition-colors cursor-pointer"
          >
            See more
          </button>
        </div>
      )}

      {/* Footer Action Icons */}
      <div className="flex items-center justify-end gap-6 text-xs text-muted-foreground pt-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(item);
          }}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          <span>{commentsCount}</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </button>

        <button
          type="button"
          onClick={handleLike}
          className={`flex items-center gap-1.5 transition-colors ${
            isLiked ? "text-rose-500 font-semibold" : "hover:text-rose-500"
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
          <span>{likeCount}</span>
        </button>
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
      <div className="flex flex-col gap-4">
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
