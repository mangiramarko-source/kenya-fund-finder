import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { type FeedItem } from "@/hooks/useSocialFeed";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageSquare, Share2, MoreHorizontal, TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { getNewsImage, handleNewsImageError } from "@/lib/news-images";
import { FeedItemDetailModal } from "./FeedItemDetailModal";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from 'react-markdown';
import remarkGfm from '@/lib/remarkGfmSafe';
import { useFeedInteractions, type PostInteraction } from "@/hooks/useFeedInteractions";
import { useIsMobile } from "@/hooks/use-mobile";
import { CorporateActionCard } from "./CorporateActionCard";

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
    case "NEWS": return "bg-red-600 border-red-700";
    case "STOCK_INSIGHT": return "bg-emerald-600 border-emerald-700";
    case "FUND_MILESTONE": return "bg-purple-600 border-purple-700";
    case "FX_ALERT": return "bg-amber-600 border-amber-700";
    case "EDUCATION": return "bg-indigo-600 border-indigo-700";
    default: return "bg-gray-600 border-gray-700";
  }
};

const TickerBadge = ({ symbol, companyName, stock }: { symbol: string, companyName: string, stock?: any }) => {
  const price = stock?.price ?? (120 + symbol.length * 15.5);
  const changePercent = stock?.changePercent ?? ((symbol.length % 2 === 0 ? 1 : -1) * (0.5 + symbol.length * 0.2));
  const isUp = changePercent >= 0;

  return (
    <button className="flex items-center space-x-2 text-xs font-sans bg-[#202024] hover:bg-[#2A2A30] border border-white/10 rounded-md px-2.5 py-1 w-fit transition-colors">
      <span className="font-bold text-white">{symbol}</span>
      <span className="text-gray-300">KES {price.toFixed(2)}</span>
      <span className={`flex items-center font-medium ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isUp ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
        {Math.abs(changePercent).toFixed(1)}%
      </span>
      <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-0.5" />
    </button>
  );
};

export const DemoSocialFeedCard = ({
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
      const isOverflowing = el.scrollHeight > el.clientHeight + 4;
      setIsExpandable(isOverflowing);
    };
    const timeoutId = setTimeout(checkOverflow, 150);
    const resizeObserver = new ResizeObserver(() => checkOverflow());
    if (contentRef.current) resizeObserver.observe(contentRef.current);
    return () => { clearTimeout(timeoutId); resizeObserver.disconnect(); };
  }, [item.content]);

  const isLiked = interaction?.liked ?? false;
  const likeCount = interaction?.likeCount ?? (item.likes || 0);
  const commentsCount = (item.comments || 0) + (interaction?.comments?.length || 0);
  const timeAgo = formatDistanceToNow(item.timestamp, { addSuffix: true }).replace("about ", "");

  const isSocialPost = Boolean(item.authorName?.startsWith("X -") || item.rawItem?.source?.startsWith("X -"));
  const rawAuthor = item.authorName || "Capital FM";
  const authorName = isSocialPost ? rawAuthor.replace(/^X\s*-\s*/, '') : rawAuthor;
  const initials = isSocialPost ? "X" : getInitials(authorName);
  
  const rawLabel = item.authorLabel || "marketnews";
  const authorHandle = rawLabel.startsWith("@") ? rawLabel : `@${rawLabel.toLowerCase().replace(/\s+/g, '')}`;
  
  const domain = getDomainFromUrl(item.url || item.rawItem?.link);
  const customLogo = getCustomSourceLogo(authorName, domain);
  const avatarSrc = customLogo || (domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null);
  const showFavicon = !isSocialPost && avatarSrc && !avatarError;
  
  const primaryStock = item.relatedStocks?.[0];
  const primarySymbol = primaryStock?.symbol || item.relatedSymbols?.[0] || (item.id === "demo-1" ? "AAPL" : undefined);
  const companyName = primaryStock?.name || (primarySymbol === "SCOM" ? "Safaricom" : 
                      primarySymbol === "EQTY" ? "Equity Group" :
                      primarySymbol === "KCB" ? "KCB Group" : 
                      primarySymbol === "EABL" ? "East African Breweries" : 
                      primarySymbol === "AAPL" ? "Apple" : "Market News");

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
    if (onLikeToggle) onLikeToggle(item.id, item.likes || 0);
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
      className="rounded-2xl bg-[#141416] sm:bg-card border border-white/10 sm:border-border/80 p-4 sm:p-5 shadow-sm cursor-pointer hover:border-white/20 transition-all space-y-3 font-sans"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Top Author Bar - exact match to user screenshot */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar Circle */}
          <div className={`w-9 h-9 rounded-full ${isSocialPost ? 'bg-black text-white border-black/10' : getAvatarBg(item.type)} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm overflow-hidden`}>
            {isSocialPost ? (
              <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
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
          <div className="flex items-center gap-1.5 text-xs truncate">
            <span className="font-bold text-white text-sm truncate">
              {authorName}
            </span>
            <span className="text-gray-400 truncate">
              {authorHandle}
            </span>
            <span className="text-gray-400 font-bold">·</span>
            <span className="text-gray-400 whitespace-nowrap">
              {timeAgo}
            </span>
          </div>
        </div>

        {/* Options Button */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleCardClick(); }}
          className="text-gray-400 hover:text-white p-1 transition-colors rounded-full shrink-0"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Stock Ticker Pill (if available) */}
      {primarySymbol && (
        <div className="pt-0.5">
          <TickerBadge symbol={primarySymbol} companyName={companyName} stock={primaryStock} />
        </div>
      )}

      {/* Main Title / Headline */}
      {item.id !== "daily-market-summary" && (
        <h3 className="font-bold text-base text-white leading-snug tracking-tight">
          {item.title}
        </h3>
      )}

      {/* Real Article Image */}
      {(item.mediaUrl || item.rawItem?.image_url) && (
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#202024] max-h-[260px] aspect-[16/9]">
          <img
            src={getNewsImage(item.mediaUrl || item.rawItem?.image_url, item.authorLabel, item.id) || (item.mediaUrl || item.rawItem?.image_url)}
            alt=""
            className="w-full h-full object-cover"
            onError={handleNewsImageError}
            loading="lazy"
          />
        </div>
      )}

      {/* Text Body Content */}
      <div
        ref={contentRef}
        className="text-sm sm:text-base text-gray-300 leading-relaxed line-clamp-4 prose dark:prose-invert font-normal [&_*]:inline [&_*]:m-0 [&_p]:inline [&_p]:m-0 [&_h3]:inline [&_h3]:m-0"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {item.content || ""}
        </ReactMarkdown>
      </div>

      {/* See more Link */}
      {isExpandable && (
        <div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleCardClick(); }}
            className="text-emerald-400 hover:underline font-semibold text-sm inline-block transition-colors cursor-pointer"
          >
            See more
          </button>
        </div>
      )}

      {/* AI Insight Box */}
      {item.aiInsight && (
        <div className="mt-1 p-3 bg-blue-950/40 border border-blue-800/40 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI Insight
            </span>
          </div>
          <p className="text-xs text-blue-200/90 leading-snug">{item.aiInsight}</p>
        </div>
      )}

      {/* Footer Action Icons - exact match to user screenshot */}
      <div className="flex items-center justify-end gap-6 text-xs text-gray-400 pt-1">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSelect(item); }}
          className="flex items-center gap-1.5 hover:text-white transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          <span>{commentsCount}</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 hover:text-white transition-colors"
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

export function DemoSocialFeed({ items, loading }: { items: FeedItem[], loading?: boolean }) {
  const { toggleLike, addComment, getPostInteraction } = useFeedInteractions();
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [displayCount, setDisplayCount] = useState(15);

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col gap-4 bg-black min-h-screen p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-[#141416] p-4 border border-white/10 space-y-3">
            <div className="flex gap-3">
              <Skeleton className="w-9 h-9 rounded-full bg-[#202024]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24 bg-[#202024]" />
                <Skeleton className="h-3 w-16 bg-[#202024]" />
              </div>
            </div>
            <Skeleton className="h-5 w-3/4 bg-[#202024]" />
            <Skeleton className="h-4 w-full bg-[#202024]" />
            <Skeleton className="h-4 w-5/6 bg-[#202024]" />
          </div>
        ))}
      </div>
    );
  }

  const visibleItems = items.slice(0, displayCount);

  const mockEarnings = [
    { date: "Sep 03", symbol: "SCOM", companyName: "Safaricom" },
    { date: "Sep 15", symbol: "EQTY", companyName: "Equity Group Holdings" },
  ];
  const mockDividends = [
    { date: "Oct 10", symbol: "BAT", companyName: "British American Tobacco Kenya" },
    { date: "Nov 05", symbol: "EABL", companyName: "East African Breweries Ltd" },
  ];

  return (
    <div className="bg-black min-h-screen pb-20 pt-4">
      <div className="flex flex-col gap-3">
        {visibleItems.map((item, i) => (
          <React.Fragment key={item.id}>
            <div className="px-3">
              <DemoSocialFeedCard
                item={item}
                onSelect={setSelectedItem}
                index={i}
                interaction={getPostInteraction(item.id, item.likes || 0)}
                onLikeToggle={toggleLike}
              />
            </div>
            {i === 0 && (
              <div className="px-3">
                <CorporateActionCard earnings={mockEarnings} dividends={mockDividends} />
              </div>
            )}
          </React.Fragment>
        ))}

        {items.length > displayCount && (
          <div className="px-3 py-6">
            <button
              type="button"
              onClick={() => setDisplayCount(prev => prev + 15)}
              className="w-full py-4 rounded-xl border border-white/10 bg-[#141416] text-xs font-semibold text-white hover:bg-[#202024] transition-all text-center cursor-pointer"
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
        interaction={selectedItem ? getPostInteraction(selectedItem.id, selectedItem.likes || 0) : undefined}
        onLikeToggle={toggleLike}
        onAddComment={addComment}
      />
    </div>
  );
}
