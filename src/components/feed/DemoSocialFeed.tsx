import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { type FeedItem } from "@/hooks/useSocialFeed";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageSquare, Share2, MoreHorizontal, TrendingUp, TrendingDown } from "lucide-react";
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

import { ChevronDown } from "lucide-react";

const TickerBadge = ({ symbol, companyName, stock }: { symbol: string, companyName: string, stock?: any }) => {
  // Use real data if available, otherwise mock
  const price = stock?.price ?? (120 + symbol.length * 15.5);
  const changePercent = stock?.changePercent ?? ((symbol.length % 2 === 0 ? 1 : -1) * (0.5 + symbol.length * 0.2));
  const isUp = changePercent >= 0;

  return (
    <button className="flex items-center space-x-2 text-sm font-sans bg-[#1A1A1A] hover:bg-[#252525] border border-[#333333] rounded-md px-2.5 py-1 mb-3 w-fit transition-colors">
      <span className="text-gray-400">{symbol}</span>
      <span className="text-gray-200">KES {price.toFixed(2)}</span>
      <span className={`flex items-center ${isUp ? 'text-[#00C853]' : 'text-red-500'}`}>
        {isUp ? <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
        {Math.abs(changePercent).toFixed(1)}%
      </span>
      <ChevronDown className="w-4 h-4 text-gray-500 ml-1" />
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
  
  // Try to use related symbols if extracted by the hook. Otherwise, fallback.
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
    if (onLikeToggle) onLikeToggle(item.id, item.likes || 0);
  };

  return (
    <div
      onClick={handleCardClick}
      className="rounded-xl bg-[#1A1A1A] border border-[#2D2D2D] p-4 sm:p-5 shadow-sm cursor-pointer hover:border-gray-600 transition-all space-y-3"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Ticker Badge / Header */}
      <div className="flex items-start justify-between gap-3">
        {primarySymbol ? (
          <div className="flex-1 min-w-0">
            <TickerBadge symbol={primarySymbol} companyName={companyName} stock={primaryStock} />
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center border border-gray-700 shrink-0">
              <span className="text-gray-300 font-bold text-xs">NEWS</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-white text-sm truncate">Market News</span>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="truncate max-w-[120px]">{item.authorName || "Editorial"}</span>
                <span>·</span>
                <span className="shrink-0">{timeAgo}</span>
              </div>
            </div>
          </div>
        )}

        {/* Options Button */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleCardClick(); }}
          className="text-gray-500 hover:text-white p-1 transition-colors rounded-full shrink-0"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Main Title / Headline */}
      {item.id !== "daily-market-summary" && (
        <h3 className="font-bold text-[17px] text-white leading-snug tracking-tight">
          {item.title}
        </h3>
      )}

      {/* Text Body Content */}
      <div
        ref={contentRef}
        className="text-[15px] text-gray-400 leading-relaxed line-clamp-3 prose dark:prose-invert font-normal [&_*]:inline [&_*]:m-0 [&_p]:inline [&_p]:m-0 [&_h3]:inline [&_h3]:m-0"
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
            className="text-yellow-500 hover:text-yellow-400 font-semibold text-sm inline-block transition-colors cursor-pointer"
          >
            Show more
          </button>
        </div>
      )}

      {/* AI Insight Box */}
      {item.aiInsight && (
        <div className="mt-1 p-3 bg-blue-900/10 border border-blue-900/30 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI Insight
            </span>
          </div>
          <p className="text-sm text-blue-200/80 leading-snug">{item.aiInsight}</p>
        </div>
      )}

      {/* Footer Action Icons */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-[#2D2D2D]/40">
        <button
          type="button"
          onClick={handleLike}
          className={`flex items-center gap-1.5 transition-colors p-2 rounded-lg bg-[#252525] hover:bg-[#333333] ${
            isLiked ? "text-yellow-500 font-semibold" : ""
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? "fill-yellow-500 text-yellow-500" : ""}`} />
          <span>{likeCount}</span>
        </button>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSelect(item); }}
          className="flex items-center gap-1.5 hover:text-white transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          <span>{commentsCount} comments</span>
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
          <div key={i} className="rounded-xl bg-[#1A1A1A] p-4 border border-[#2D2D2D] space-y-3">
            <div className="flex gap-3">
              <Skeleton className="w-10 h-10 rounded-md bg-[#2D2D2D]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24 bg-[#2D2D2D]" />
                <Skeleton className="h-3 w-16 bg-[#2D2D2D]" />
              </div>
            </div>
            <Skeleton className="h-5 w-3/4 bg-[#2D2D2D]" />
            <Skeleton className="h-4 w-full bg-[#2D2D2D]" />
            <Skeleton className="h-4 w-5/6 bg-[#2D2D2D]" />
          </div>
        ))}
      </div>
    );
  }

  const visibleItems = items.slice(0, displayCount);

  // Mock corporate actions for injection
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
      <div className="flex flex-col gap-2">
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
            {/* Inject a corporate action card after the first item for demo */}
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
              className="w-full py-4 rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] text-xs font-semibold text-white hover:bg-[#252525] transition-all text-center cursor-pointer"
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
