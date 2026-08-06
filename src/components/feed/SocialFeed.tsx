import React, { useState } from "react";
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
import remarkGfm from 'remark-gfm';

const getInitials = (name: string) => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase();
  return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
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

export const SocialFeedCard = ({ item, onSelect, index = 0 }: { item: FeedItem; onSelect: (item: FeedItem) => void; index?: number }) => {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(item.likes || 0);

  const timeAgo = formatDistanceToNow(item.timestamp, { addSuffix: true }).replace("about ", "");

  const authorName = item.authorName || "KenyaFundFinder Academy";
  const initials = getInitials(authorName);
  
  const rawLabel = item.authorLabel || "dailytip";
  const authorHandle = rawLabel.startsWith("@") ? rawLabel : `@${rawLabel.toLowerCase().replace(/\s+/g, '')}`;

  const handleCardClick = () => {
    const rawId = item.rawItem?.id || (item.id.startsWith("news-") ? item.id.replace("news-", "") : item.id);
    navigate(`/news/${rawId}`);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (liked) {
      setLiked(false);
      setLikeCount(prev => Math.max(0, prev - 1));
    } else {
      setLiked(true);
      setLikeCount(prev => prev + 1);
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
        <div className={`w-9 h-9 rounded-full ${getAvatarBg(item.type)} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm`}>
          {initials}
        </div>

        {/* Author Details & Timestamp */}
        <div className="flex-1 min-w-0 flex items-center flex-wrap gap-x-1.5 text-xs">
          <span className="font-bold text-foreground text-sm truncate">
            {authorName}
          </span>
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

      {/* Text Body Content */}
      <div className="text-sm text-muted-foreground/90 leading-relaxed line-clamp-4 prose-sm dark:prose-invert font-normal">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {item.content || ""}
        </ReactMarkdown>
      </div>

      {/* See more Link */}
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
          <span>{item.comments || 0}</span>
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
          className="flex items-center gap-1.5 hover:text-red-500 transition-colors"
        >
          <Heart className={`w-4 h-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
          <span>{likeCount}</span>
        </button>
      </div>
    </div>
  );
};

export function SocialFeed({ items, loading }: { items: FeedItem[], loading?: boolean }) {
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
          <SocialFeedCard key={item.id} item={item} onSelect={setSelectedItem} index={i} />
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
      />
    </>
  );
}
