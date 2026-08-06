import React, { useState } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from "react-router-dom";
import { type FeedItem } from "@/hooks/useSocialFeed";
import { formatDistanceToNow } from "date-fns";
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
  DollarSign, 
  Send 
} from "lucide-react";
import { getNewsImage, handleNewsImageError } from "@/lib/news-images";
import { Sparkline } from "./Sparkline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface FeedItemDetailModalProps {
  item: FeedItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function FeedItemDetailModal({ item, open, onOpenChange }: FeedItemDetailModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(item?.likes || 0);
  const [commentText, setCommentText] = useState("");
  const [commentsList, setCommentsList] = useState<string[]>([]);

  if (!item) return null;

  const timeAgo = formatDistanceToNow(item.timestamp, { addSuffix: true }).replace("about ", "");

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
    setLiked(!liked);
    setLikesCount(prev => liked ? prev - 1 : prev + 1);
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
    setCommentsList(prev => [...prev, commentText.trim()]);
    setCommentText("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card text-card-foreground border border-border p-0 rounded-2xl shadow-2xl hide-scrollbar dark:bg-neutral-900/95 dark:border-white/10 dark:text-foreground">
        {/* Header bar */}
        <div className="p-6 border-b border-border dark:border-white/10 relative">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 border ${getAvatarBg(item.type)}`}>
                <span className="text-white font-bold text-sm tracking-wider">{getInitials(item.authorName)}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground text-base tracking-tight">{item.authorName}</span>
                <div className="flex items-center text-xs text-muted-foreground gap-2 font-medium">
                  {item.authorLabel && <span>{item.authorLabel}</span>}
                  {item.authorLabel && <span className="text-muted-foreground/40 dark:text-white/20">•</span>}
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
                {item.type === "NEWS" ? "Live Feed" : item.authorLabel}
              </Badge>
            )}
          </div>

          <DialogHeader className="mt-4 text-left">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-foreground leading-snug tracking-tight">
              {item.title}
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
            {/* Media Box */}
            {item.mediaType === "image" && item.rawItem?.image_url && (
              <div className="relative mt-4 mb-2 rounded-xl overflow-hidden border border-border bg-muted/40 max-h-[350px]">
                <img
                  src={getNewsImage(item.rawItem.image_url, item.rawItem.category, item.rawItem.id) || item.rawItem.image_url}
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
          <div className="text-base text-foreground/90 leading-relaxed font-normal whitespace-pre-line">
            <div className="prose prose-base dark:prose-invert max-w-none prose-p:my-3 prose-p:text-[16px] prose-p:text-foreground/90 prose-p:leading-relaxed prose-headings:mt-4 prose-headings:mb-2 prose-headings:text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {item.content}
              </ReactMarkdown>
            </div>
          </div>

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
              <div className="pt-2">
                <a
                  href={articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all font-semibold text-xs shadow-sm"
                >
                  <span>Read full story on source website</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            );
          })()}

          {/* Social Interactions Bar */}
          <div className="pt-4 border-t border-border dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={handleLikeToggle}
                className={`flex items-center gap-2 transition-colors ${
                  liked ? "text-rose-500 font-semibold" : "text-muted-foreground hover:text-rose-500"
                }`}
              >
                <Heart className={`w-4 h-4 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
                <span className="text-xs font-medium">{likesCount} Likes</span>
              </button>

              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs font-medium">{item.comments + commentsList.length} Comments</span>
              </div>

              <button className="flex items-center gap-2 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                <Share2 className="w-4 h-4" />
                <span className="text-xs font-medium">Share</span>
              </button>
            </div>
          </div>

          {/* Comment Section */}
          <div className="pt-2 space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Discussion</h4>
            {!user ? (
              <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-center space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Want to join the conversation?</p>
                <Button 
                  onClick={() => {
                    onOpenChange(false);
                    navigate("/auth");
                  }} 
                  size="sm" 
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl px-5"
                >
                  Sign Up / Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-muted/60 border border-border text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-emerald-500/50 dark:bg-white/5 dark:border-white/10"
                />
                <Button type="submit" size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl px-4">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            )}

            {commentsList.length > 0 && (
              <div className="space-y-2 pt-2">
                {commentsList.map((cmt, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-muted/50 border border-border text-xs text-foreground dark:bg-white/5 dark:border-white/5">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 block mb-0.5">You</span>
                    {cmt}
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
