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

export const SocialFeedCard = ({ item, onSelect }: { item: FeedItem; onSelect: (item: FeedItem) => void }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [likesCount, setLikesCount] = useState(item.likes || 0);
  const [isLiked, setIsLiked] = useState(false);
  const timeAgo = formatDistanceToNow(item.timestamp, { addSuffix: true }).replace("about ", "");

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Sign up to like posts", {
        description: "Create a free account to like, comment, and engage.",
        action: {
          label: "Sign Up",
          onClick: () => navigate("/auth"),
        },
      });
      return;
    }
    if (isLiked) {
      setLikesCount(prev => Math.max(0, prev - 1));
      setIsLiked(false);
    } else {
      setLikesCount(prev => prev + 1);
      setIsLiked(true);
      toast.success("Post liked");
    }
  };

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Sign up to comment", {
        description: "Create a free account to join the discussion.",
        action: {
          label: "Sign Up",
          onClick: () => navigate("/auth"),
        },
      });
      return;
    }
    onSelect(item);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  };

  return (
    <div 
      onClick={() => onSelect(item)}
      className="relative p-4 rounded-none sm:rounded-2xl border-x-0 border-y sm:border sm:border-border/60 bg-card sm:shadow-sm hover:border-accent/40 transition-all dark:shadow-md cursor-pointer"
    >
      <div className="flex gap-3 items-start">
        {/* Avatar / Logo */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${getAvatarBg(item.type)} mt-0.5`}>
          <span className="text-white font-bold text-[13px] tracking-wider">{getInitials(item.authorName)}</span>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          {/* Header row: Author, Username, Time */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 overflow-hidden text-xs sm:text-[13px]">
              <span className="font-bold text-foreground truncate">{item.authorName}</span>
              {item.authorLabel && (
                <span className="text-muted-foreground truncate">
                  @{item.authorLabel.toLowerCase().replace(/\s+/g, '')}
                </span>
              )}
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground whitespace-nowrap">{timeAgo}</span>
            </div>
            
            <button 
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Title & Body */}
          <div className="mb-2">
            {item.id !== "daily-market-summary" && (
              <h3 className={`text-lg font-bold leading-snug mb-1 tracking-tight ${
                item.type === "FX_ALERT" || item.title.includes("USD/KES") ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
              }`}>
                {item.title}
              </h3>
            )}
            {item.content && (
              <div className="relative">
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:mt-0 prose-p:mb-1.5 prose-headings:mt-0 prose-headings:mb-0 line-clamp-6 cursor-pointer" onClick={(e) => { e.stopPropagation(); onSelect(item); }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {item.content}
                  </ReactMarkdown>
                </div>
                {item.content.length > 200 && (
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(item);
                    }}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold transition-colors mt-1"
                  >
                    See more
                  </button>
                )}
              </div>
            )}
            
            {/* Related Symbols Sparklines */}
            {item.relatedSymbols && item.relatedSymbols.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-2 pt-1">
                {item.relatedSymbols.map(sym => (
                  <Sparkline key={sym} symbol={sym} />
                ))}
              </div>
            )}
            
            {/* Optional Ticker Badge */}
            {item.type === "STOCK_INSIGHT" && item.rawItem && (
              <div className="inline-flex items-center gap-1.5 text-[11px] font-medium mt-2 bg-muted/60 border border-border/60 px-2 py-0.5 rounded-full">
                <span className="text-foreground font-semibold">{item.rawItem.symbol}</span>
                <span className="text-muted-foreground/40">•</span>
                {item.rawItem.current_price != null ? Number(item.rawItem.current_price).toFixed(2) : "-"}
                <span className={Number(item.rawItem.change_pct) >= 0 ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-rose-600 dark:text-rose-400 font-semibold"}>
                  {Number(item.rawItem.change_pct) >= 0 ? "+" : ""}{item.rawItem.change_pct != null ? Number(item.rawItem.change_pct).toFixed(1) : "-"}%
                </span>
              </div>
            )}
          </div>

          {/* Media Box */}
          {item.mediaType === "image" && item.rawItem && (
            <div className="relative mt-2 mb-2 rounded-xl overflow-hidden border border-border bg-muted/40 max-h-[260px]">
              <img
                src={getNewsImage(item.rawItem.image_url || "", item.rawItem.category, item.rawItem.id)}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => handleNewsImageError(e, item.rawItem.category, item.rawItem.id)}
                loading="lazy"
              />
            </div>
          )}

          {/* Video Embed */}
          {item.mediaType === "video" && item.mediaUrl && (
            <div className="relative mt-3 mb-2 rounded-xl overflow-hidden border border-border bg-black aspect-video">
              <iframe
                src={item.mediaUrl}
                title="Video player"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          )}

          {/* Action Bar (Right-aligned, compact, only Comment, Share, Like) */}
          <div className="flex items-center justify-end gap-4 text-muted-foreground mt-2.5 pt-1.5 border-t border-border/30">
            {/* Comment */}
            <button 
              type="button"
              onClick={handleComment}
              className="flex items-center gap-1 hover:text-blue-500 transition-colors group text-xs font-medium"
            >
              <div className="p-1 rounded-full group-hover:bg-blue-500/10 transition-colors">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
              <span>{item.comments || 0}</span>
            </button>
            
            {/* Retweet/Share */}
            <button 
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1 hover:text-emerald-500 transition-colors group text-xs font-medium"
            >
              <div className="p-1 rounded-full group-hover:bg-emerald-500/10 transition-colors">
                <Share2 className="w-3.5 h-3.5" />
              </div>
              <span>Share</span>
            </button>

            {/* Like */}
            <button 
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-1 transition-colors group text-xs font-medium ${
                isLiked ? "text-rose-500 font-semibold" : "hover:text-rose-500"
              }`}
            >
              <div className="p-1 rounded-full group-hover:bg-rose-500/10 transition-colors">
                <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
              </div>
              <span>{likesCount}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export function SocialFeed({ items, loading }: { items: FeedItem[], loading?: boolean }) {
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [displayCount, setDisplayCount] = useState(15);

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col gap-3.5 pb-12">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 dark:shadow-md">
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-32 w-full rounded-xl mt-2" />
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
      <div className="flex flex-col gap-3.5 pb-12">
        {visibleItems.map((item) => (
          <SocialFeedCard key={item.id} item={item} onSelect={setSelectedItem} />
        ))}

        {items.length > displayCount && (
          <div className="px-4 sm:px-0">
            <button
              type="button"
              onClick={() => setDisplayCount(prev => prev + 15)}
              className="w-full py-3 rounded-2xl border border-border bg-card/50 text-xs font-semibold text-emerald-500 hover:bg-muted/50 transition-all text-center cursor-pointer"
            >
              Load more updates ({items.length - displayCount} remaining)
            </button>
          </div>
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
