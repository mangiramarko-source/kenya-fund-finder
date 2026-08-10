import React, { useState } from "react";
import { Heart, MessageSquare, Share2, MoreHorizontal, TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { toast } from "sonner";

export interface DemoStockArticle {
  id: string;
  ticker: string;
  price: number;
  currency: string;
  changePercent: number;
  companyName: string;
  companyLogo: string;
  source: string;
  timeAgo: string;
  title: string;
  insight: string;
  likes: number;
  comments: number;
}

interface StockFeedCardProps {
  article: DemoStockArticle;
}

export function StockFeedCard({ article }: StockFeedCardProps) {
  const isUp = article.changePercent >= 0;
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(article.likes);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.insight,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  };

  const handleHandleName = `@${article.source.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  return (
    <div className="rounded-2xl bg-[#141416] sm:bg-card p-4 sm:p-5 border border-white/10 dark:border-border/80 shadow-sm space-y-3 font-sans transition-colors">
      {/* Top Author Bar - exact match to user screenshot */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Circular Red / Logo Avatar */}
          <div className="w-9 h-9 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm overflow-hidden border border-white/10">
            {article.companyLogo ? (
              <img 
                src={article.companyLogo} 
                alt={article.companyName}
                className="w-full h-full object-cover bg-white p-0.5"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="text-[10px] font-bold text-white uppercase">{article.ticker.substring(0, 2)}</span>
            )}
          </div>

          {/* Author Name, Handle & TimeAgo */}
          <div className="flex items-center gap-1.5 text-xs truncate">
            <span className="font-bold text-white dark:text-foreground text-sm truncate">
              {article.source}
            </span>
            <span className="text-gray-400 dark:text-muted-foreground truncate">
              {handleHandleName}
            </span>
            <span className="text-gray-400 dark:text-muted-foreground font-bold">·</span>
            <span className="text-gray-400 dark:text-muted-foreground whitespace-nowrap">
              {article.timeAgo}
            </span>
          </div>
        </div>

        {/* Options Button */}
        <button
          type="button"
          className="text-gray-400 hover:text-white dark:text-muted-foreground dark:hover:text-foreground p-1 transition-colors rounded-full shrink-0"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Stock Ticker Pill (Simply Wall St Style) */}
      <div className="pt-0.5">
        <button className="flex items-center space-x-2 text-xs font-sans bg-[#202024] hover:bg-[#2A2A30] dark:bg-muted/60 dark:hover:bg-muted border border-white/10 dark:border-border/60 rounded-md px-2.5 py-1 w-fit transition-colors">
          <span className="font-bold text-white dark:text-foreground">{article.ticker}</span>
          <span className="text-gray-300 dark:text-muted-foreground">{article.currency}{article.price.toFixed(2)}</span>
          <span className={`flex items-center font-medium ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isUp ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
            {Math.abs(article.changePercent).toFixed(1)}%
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-muted-foreground ml-0.5" />
        </button>
      </div>

      {/* Headline Title */}
      <h3 className="font-bold text-base text-white dark:text-foreground leading-snug tracking-tight">
        {article.title}
      </h3>

      {/* Body Summary Content */}
      <div className="text-sm sm:text-base text-gray-300 dark:text-muted-foreground/90 leading-relaxed font-normal">
        <p className="line-clamp-4 inline">
          {article.insight}
        </p>
      </div>

      {/* See More Link */}
      <div>
        <button
          type="button"
          className="text-emerald-400 dark:text-emerald-500 hover:underline font-semibold text-sm inline-block transition-colors cursor-pointer"
        >
          See more
        </button>
      </div>

      {/* Bottom Action Icons Bar (Right Aligned matching user screenshot) */}
      <div className="flex items-center justify-end gap-6 text-xs text-gray-400 dark:text-muted-foreground pt-1">
        <button
          type="button"
          className="flex items-center gap-1.5 hover:text-white dark:hover:text-foreground transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          <span>{article.comments}</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 hover:text-white dark:hover:text-foreground transition-colors"
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
}
