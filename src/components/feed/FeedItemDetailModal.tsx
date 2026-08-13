import React, { useState } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from '@/lib/remarkGfmSafe';
import { useNavigate } from "react-router-dom";
import { type FeedItem } from "@/hooks/useSocialFeed";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  ExternalLink, 
  Newspaper, 
  BarChart3, 
  Wallet, 
  DollarSign
} from "lucide-react";
import { getNewsImage, handleNewsImageError } from "@/lib/news-images";
import { Sparkline } from "./Sparkline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

import { useIsMobile } from "@/hooks/use-mobile";
import type { PostInteraction } from "@/hooks/useFeedInteractions";
import { getStockLogoUrl } from "@/lib/stockBranding";
import { StockArticleMarketCard } from "@/components/stocks/StockArticleMarketCard";
import { splitReadableParagraphs } from "@/lib/utils";
import { StockDecisionContext } from "@/components/news/StockDecisionContext";
import { type NewsFromDB, type PublicStock } from "@/lib/api";

interface FeedItemDetailModalProps {
  item: FeedItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interaction?: PostInteraction;
  onLikeToggle?: (itemId: string, defaultLikes?: number) => void;
  onAddComment?: (itemId: string, text: string, authorName?: string) => void;
}

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

export function FeedItemDetailModal({ item, open, onOpenChange, interaction, onLikeToggle, onAddComment }: FeedItemDetailModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [localLiked, setLocalLiked] = useState(false);
  const [localLikesCount, setLocalLikesCount] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [localCommentsList, setLocalCommentsList] = useState<string[]>([]);
  const [stockLogoError, setStockLogoError] = useState(false);

  React.useEffect(() => {
    setStockLogoError(false);
  }, [item?.id]);

  if (!item || isMobile) return null;

  const isLiked = interaction ? interaction.liked : localLiked;
  const likesCount = interaction ? interaction.likeCount : (item.likes || 0) + localLikesCount;
  const commentsList = interaction ? interaction.comments : localCommentsList;
  const totalComments = (item.comments || 0) + commentsList.length;

  const timeAgo = formatDistanceToNow(item.timestamp, { addSuffix: true }).replace("about ", "");
  const formattedTime = format(item.timestamp, "h:mm a");
  const formattedDate = format(item.timestamp, "d MMM yyyy");
  const readTime = item.rawItem?.read_time;
  const readableContent = splitReadableParagraphs(item.content).join("\n\n");

  const handleShare = async () => {
    const rawId = item.id.startsWith("news-") ? item.id.slice(5) : item.id;
    const shareUrl = `${window.location.origin}/news/${rawId}`;
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

  const handleLikeToggle = () => {
    if (!user) {
      toast.error("Sign up to like posts", {
        description: "Create an account to interact with posts.",
        action: {
          label: "Sign Up",
          onClick: () => {
            onOpenChange(false);
            navigate("/auth");
          },
        },
      });
      return;
    }
    if (onLikeToggle) {
      onLikeToggle(item.id, item.likes || 0);
    } else {
      setLocalLiked(!localLiked);
      setLocalLikesCount(prev => localLiked ? prev - 1 : prev + 1);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Sign up to comment", {
        description: "Create an account to join discussions.",
        action: {
          label: "Sign Up",
          onClick: () => {
            onOpenChange(false);
            navigate("/auth");
          },
        },
      });
      return;
    }
    if (!commentText.trim()) return;
    const authorName = user.email?.split("@")[0] || "User";
    if (onAddComment) {
      onAddComment(item.id, commentText.trim(), authorName);
    } else {
      setLocalCommentsList(prev => [...prev, commentText.trim()]);
    }
    setCommentText("");
    toast.success("Comment added!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground border border-border p-0 rounded-2xl shadow-2xl hide-scrollbar dark:bg-neutral-900/95 dark:border-white/10 dark:text-foreground">
        {/* Header bar */}
        {(() => {
          const isSocialPost = Boolean(item.authorName?.startsWith("X -") || item.rawItem?.source?.startsWith("X -"));
          const cleanAuthor = isSocialPost ? item.authorName.replace(/^X\s*-\s*/, '') : item.authorName;
          const stock = item.relatedStock;
          const stockLogoUrl = stock ? getStockLogoUrl(stock.symbol) : "";
          return (
            <div className="p-6 border-b border-border dark:border-white/10 relative">
              <div className="flex items-center justify-between gap-4 pr-8">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 flex items-center justify-center shrink-0 border overflow-hidden ${stock ? "rounded-xl bg-white text-emerald-700 border-border" : `rounded-full ${isSocialPost ? 'bg-black dark:bg-white/10 text-white border-black/10' : getAvatarBg(item.type)}`}`}>
                    {stock && stockLogoUrl && !stockLogoError ? (
                      <img
                        src={stockLogoUrl}
                        alt={`${stock.name} logo`}
                        className="h-full w-full object-contain p-1"
                        onError={() => setStockLogoError(true)}
                      />
                    ) : stock ? (
                      <span className="font-bold text-xs tracking-wider">{stock.symbol.slice(0, 3).toUpperCase()}</span>
                    ) : isSocialPost ? (
                      <svg className="w-5 h-5 fill-current text-white dark:text-foreground" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    ) : (
                      <span className="text-white font-bold text-sm tracking-wider">{getInitials(cleanAuthor)}</span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-base tracking-tight">{stock?.name || cleanAuthor}</span>
                      {isSocialPost && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-black/5 dark:bg-white/10 text-foreground dark:text-white px-2 py-0.5 rounded-full border border-border/60">
                          <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                          </svg>
                          <span>Social Update</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground gap-2 font-medium">
                      <span>{stock ? "Live News" : item.authorLabel}</span>
                      <span className="text-muted-foreground/40 dark:text-white/20">•</span>
                      <span>{timeAgo}</span>
                    </div>
                  </div>
                </div>

            {/* Related Symbols Sparklines */}
            {item.relatedSymbols && item.relatedSymbols.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-1">
                {item.relatedSymbols.map(sym => (
                  <Sparkline key={sym} symbol={sym} />
                ))}
              </div>
            )}
              
            {/* Optional Ticker Badge */}
            {item.type === "STOCK_INSIGHT" && item.rawItem ? (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted border border-border px-3 py-1 rounded-full backdrop-blur-md dark:bg-white/5 dark:border-white/10">
                <span className="text-foreground">{item.rawItem.symbol}</span>
                <span className="text-muted-foreground/40 dark:text-white/20">|</span>
                <span className={Number(item.rawItem.change_pct) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                  {Number(item.rawItem.change_pct) >= 0 ? "+" : ""}{item.rawItem.change_pct != null ? Number(item.rawItem.change_pct).toFixed(1) : "-"}%
                </span>
              </div>
            ) : (
              <Badge variant="secondary" className="bg-muted border border-border text-foreground text-xs px-3 py-1 font-medium dark:bg-white/10 dark:border-white/10 dark:text-white">
                {stock?.symbol || (item.type === "NEWS" ? "Live Feed" : item.authorLabel)}
              </Badge>
            )}
          </div>

          <DialogHeader className="mt-4 text-left">
            <DialogTitle className={item.isHeadlineOnly
              ? "text-base font-normal text-foreground/90 leading-relaxed"
              : "text-xl sm:text-2xl font-bold text-foreground leading-snug tracking-tight"
            }>
              {item.title}
            </DialogTitle>
          </DialogHeader>
        </div>
        );
      })()}

        {/* Modal Body */}
        <div className="p-6 space-y-6">
            {item.relatedStock && (
              <StockArticleMarketCard
                stock={{
                  id: item.relatedStock.id,
                  symbol: item.relatedStock.symbol,
                  name: item.relatedStock.name,
                  price: item.relatedStock.price,
                  previous_price: item.relatedStock.previousPrice,
                  day_change_percent: item.relatedStock.changePercent,
                }}
              />
            )}

            {/* AI Decision Support Context */}
            {item.relatedStock && item.rawItem && (
              <StockDecisionContext 
                article={item.rawItem as NewsFromDB}
                stock={{ 
                  ...item.relatedStock, 
                  day_change_percent: item.relatedStock.changePercent, 
                  previous_price: item.relatedStock.previousPrice 
                } as PublicStock}
                inlineTransparent={false}
              />
            )}

            {/* Media Box */}
            {(item.mediaUrl || item.rawItem?.image_url) && (
              <div className="relative mt-4 mb-2 rounded-xl overflow-hidden border border-border bg-muted/40 max-h-[350px]">
                <img
                  src={getNewsImage(item.mediaUrl || item.rawItem?.image_url, item.authorLabel, item.id) || (item.mediaUrl || item.rawItem?.image_url)}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={handleNewsImageError}
                  loading="lazy"
                />
              </div>
            )}

            {/* Video Embed */}
            {item.mediaType === "video" && item.mediaUrl && (
              <div className="relative mt-4 mb-2 rounded-xl overflow-hidden border border-border bg-black aspect-video">
                <iframe
                  src={item.mediaUrl}
                  title="Video player"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            )}

          {/* Article Text Content */}
          {!item.isHeadlineOnly && <div className="text-base text-foreground/90 leading-relaxed font-normal whitespace-pre-line">
            <div className="prose prose-base dark:prose-invert max-w-none prose-p:my-3 prose-p:text-[16px] prose-p:text-foreground/90 prose-p:leading-relaxed prose-headings:mt-4 prose-headings:mb-2 prose-headings:text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {readableContent}
              </ReactMarkdown>
            </div>
          </div>}

          {/* External Source Link */}
          {(() => {
            if (item.id === "daily-market-summary" || item.type === "EDUCATION") return null;
            
            const formatExternalUrl = (url?: string | null, title?: string, source?: string): string => {
              if (!url || url.trim() === "" || url === "#") {
                return `https://www.google.com/search?q=${encodeURIComponent(`${title || ""} ${source || ""}`.trim())}`;
              }
              const trimmed = url.trim();
              if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
                return trimmed;
              }
              if (trimmed.startsWith("//")) {
                return `https:${trimmed}`;
              }
              return `https://${trimmed}`;
            };

            const articleUrl = formatExternalUrl(item.url, item.title, item.authorName);
            return (
              <div className="border-b border-border/60 pb-5 pt-2">
                <a
                  href={articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-2 text-base font-semibold text-emerald-500 hover:text-emerald-400 hover:underline transition-colors"
                >
                  <span>From {item.authorName}</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            );
          })()}

          <div className="border-b border-border/60 pb-4 text-[11px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
            <span>{formattedTime}</span>
            <span>•</span>
            <span>{formattedDate}</span>
            {readTime && (
              <>
                <span>•</span>
                <span>{readTime}</span>
              </>
            )}
          </div>

          {/* Social Interactions Bar */}
          <div className="flex items-center justify-between py-1 text-sm text-muted-foreground font-medium">
            <button type="button" className="flex items-center gap-2 hover:text-foreground transition-colors">
              <MessageSquare className="h-5 w-5" />
              <span>{totalComments}</span>
            </button>
            <button type="button" onClick={handleShare} className="flex items-center gap-2 hover:text-foreground transition-colors">
              <Share2 className="h-5 w-5" />
              <span>Share</span>
            </button>
            <button
              type="button"
              onClick={handleLikeToggle}
              className={`flex items-center gap-2 transition-colors ${isLiked ? "text-rose-500 font-semibold" : "hover:text-rose-500"}`}
            >
              <Heart className={`h-5 w-5 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
              <span>{likesCount}</span>
            </button>
          </div>

          {/* Comment Section */}
          <div className="space-y-3">
            <form onSubmit={handleAddComment} className="flex items-center gap-3 rounded-full border border-border bg-background/60 px-2.5 py-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-950 text-sm font-bold text-cyan-400">
                {user ? (user.email || "U").slice(0, 1).toUpperCase() : "M"}
              </div>
              <input
                type="text"
                placeholder="Post your reply"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
              />
              <Button type="submit" size="sm" disabled={!commentText.trim()} className="h-9 rounded-full bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100">
                Reply
              </Button>
            </form>

            {commentsList.length > 0 && (
              <div className="space-y-2 pt-2">
                {commentsList.map((cmt, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-muted/50 border border-border text-xs text-foreground dark:bg-white/5 dark:border-white/5">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 block mb-0.5">
                      {typeof cmt === "object" && (cmt as any).authorName ? (cmt as any).authorName : "Community Member"}
                    </span>
                    {typeof cmt === "object" ? (cmt as any).content : cmt}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
