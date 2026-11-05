import { useNavigate } from "react-router-dom";
import { useMemo, useState, type MouseEvent } from "react";
import { formatDistanceToNow } from "date-fns";
import { Heart, TrendingUp, TrendingDown, Minus, ArrowRight, MoreHorizontal, MessageCircle, Share2, ArrowBigUp, BarChart2, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import type { FeedItem } from "@/hooks/useSocialFeed";
import type { PostInteraction } from "@/hooks/useFeedInteractions";
import { getStockLogoUrl } from "@/lib/stockBranding";
import { evaluateStockScorecard } from "@/lib/stockFundamentalScorecard";
import { StockSnowflakeRadar } from "@/components/stocks/StockSnowflakeRadar";

interface StockFeedCardProps {
  item: FeedItem;
  onSelect: (item: FeedItem) => void;
  interaction?: PostInteraction;
  onLikeToggle?: (itemId: string, defaultLikes?: number) => void;
  onUpvoteToggle?: (itemId: string, defaultUpvotes?: number) => void;
  onBookmarkToggle?: (itemId: string) => void;
  onRecordView?: (itemId: string) => void;
  index?: number;
}

const rawArticleId = (item: FeedItem) => item.id.startsWith("news-") ? item.id.slice(5) : item.id;

export function StockFeedCard({
  item,
  onSelect,
  interaction,
  onLikeToggle,
  onUpvoteToggle,
  onBookmarkToggle,
  onRecordView,
  index = 0,
}: StockFeedCardProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [logoError, setLogoError] = useState(false);
  const stock = item.relatedStock;

  const scorecard = useMemo(() => {
    if (!stock) return null;
    return evaluateStockScorecard(
      {
        id: stock.id,
        symbol: stock.symbol,
        name: stock.name,
        sector: stock.sector ?? null,
        price: stock.price,
        previous_price: stock.previousPrice,
        day_change_percent: stock.changePercent,
        pe_ratio: stock.peRatio ?? null,
        dividend_yield: stock.dividendYield ?? null,
        year_low: stock.yearLow ?? null,
        year_high: stock.yearHigh ?? null,
        market_cap: stock.marketCap ?? null,
      },
      { impactScore: item.rawItem?.parsed_ai_analysis?.impact_score ?? null }
    );
  }, [stock, item.rawItem?.parsed_ai_analysis?.impact_score]);

  if (!stock || !scorecard) return null;

  const isUp = stock.changePercent > 0;
  const isDown = stock.changePercent < 0;
  const isLiked = interaction?.liked ?? false;
  const likeCount = interaction?.likeCount ?? item.likes;
  const commentsCount = item.comments + (interaction?.comments?.length || 0);
  const isUpvoted = interaction?.upvoted ?? false;
  const upvoteCount = interaction?.upvoteCount ?? 0;
  const isBookmarked = interaction?.bookmarked ?? false;
  const viewsCount = interaction?.viewsCount ?? 160;
  const formattedViews = interaction?.formattedViews ?? "160";

  const articlePath = `/news/${rawArticleId(item)}`;
  const shareUrl = `${window.location.origin}${articlePath}`;
  const timeAgo = formatDistanceToNow(item.timestamp, { addSuffix: true }).replace("about ", "");
  const avatarUrl = getStockLogoUrl(stock.symbol, stock.logoUrl);

  const openArticle = (event?: MouseEvent) => {
    event?.stopPropagation();
    onRecordView?.(item.id);
    if (isMobile) navigate(articlePath);
    else onSelect(item);
  };
  const handleLike = (event: MouseEvent) => {
    event.stopPropagation();
    if (!user) {
      toast.error("Sign up to like posts", {
        description: "Create an account to interact with posts.",
        action: { label: "Sign Up", onClick: () => navigate("/auth") },
      });
      return;
    }
    onLikeToggle?.(item.id, item.likes);
    if (!isLiked) toast.success("Liked post");
  };

  const handleUpvote = (event: MouseEvent) => {
    event.stopPropagation();
    onUpvoteToggle?.(item.id, upvoteCount);
  };

  const handleBookmark = (event: MouseEvent) => {
    event.stopPropagation();
    onBookmarkToggle?.(item.id);
  };

  const handleShare = async (event: MouseEvent) => {
    event.stopPropagation();
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

  return (
    <article
      onClick={openArticle}
      className="animate-rise relative -mx-4 flex items-start gap-3 border-0 border-b border-border/80 bg-transparent px-4 py-3.5 shadow-none cursor-pointer transition-all md:mx-0 md:rounded-2xl md:border md:bg-card md:p-5 md:shadow-sm md:gap-4 hover:bg-muted/15"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* ─── 1. Left Avatar Column (Twitter / X Style) ─── */}
      <div className="shrink-0 pt-0.5">
        <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-white border border-border text-emerald-700 font-extrabold text-xs flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
          {avatarUrl && !logoError ? (
            <img
              src={avatarUrl}
              alt={`${stock.name} logo`}
              className="w-full h-full object-contain p-1"
              onError={() => setLogoError(true)}
            />
          ) : (
            stock.symbol.slice(0, 3).toUpperCase()
          )}
        </div>
      </div>

      {/* ─── 2. Right Content Column (All Text & Elements Off-Aligned) ─── */}
      <div className="flex-1 min-w-0 space-y-2.5">
        {/* Header: Company Name • NSE Symbol • Timestamp • More (...) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span className="font-bold text-foreground text-sm truncate">{stock.name}</span>
            <span className="text-[11px] font-mono text-muted-foreground">${stock.symbol}</span>
            <span className="text-muted-foreground/50 text-xs">·</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
              Stock
            </span>
            <span className="text-muted-foreground/50 text-xs">·</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo}</span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openArticle();
            }}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted/40 shrink-0 -mr-1"
            aria-label="More options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Top Ticker Pill & Mini Snowflake Score Badge */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/stocks/${encodeURIComponent(stock.symbol)}`);
            }}
            className="flex items-center gap-2 text-xs bg-muted/60 hover:bg-muted border border-border/60 rounded-md px-2.5 py-1 w-fit transition-colors font-sans"
            aria-label={`View ${stock.name}`}
          >
            <span className="font-bold text-foreground">{stock.symbol}</span>
            <span className="text-zinc-800 dark:text-muted-foreground">KES {stock.price.toFixed(2)}</span>
            <span className={`flex items-center font-medium ${isUp ? "text-emerald-500" : isDown ? "text-rose-500" : "text-muted-foreground"}`}>
              {isUp ? <TrendingUp className="w-3 h-3 mr-0.5" /> : isDown ? <TrendingDown className="w-3 h-3 mr-0.5" /> : <Minus className="w-3 h-3 mr-0.5" />}
              {Math.abs(stock.changePercent).toFixed(1)}%
            </span>
          </button>

          <div
            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-2.5 py-0.5 text-[11px]"
            title={`${scorecard.passedScore} passed of ${scorecard.evaluatedCount} verified checks (${scorecard.unverifiedCount} disclosures pending) — ${scorecard.summaryThesis}`}
          >
            <StockSnowflakeRadar
              pillars={scorecard.pillars}
              tone={scorecard.tone}
              size="sm"
              className="h-4 w-4 text-foreground shrink-0"
            />
            <span className="font-extrabold tabular-nums text-foreground">
              {scorecard.passedScore}/{scorecard.evaluatedCount} Verified
            </span>
            <span className="hidden sm:inline text-muted-foreground">·</span>
            <span className="hidden sm:inline font-semibold text-muted-foreground">
              {scorecard.ratingLabel}
            </span>
          </div>
        </div>

      {(() => {
        const analysis = item.rawItem?.parsed_ai_analysis || {
          event_label: item.title?.toLowerCase().includes("profit") || item.title?.toLowerCase().includes("results") || item.title?.toLowerCase().includes("half-year") ? "Earnings Report" : 
                       item.title?.toLowerCase().includes("dividend") ? "Dividend Notice" : "Market Update",
          impact_horizon: "Short-term relevance",
          clustered_count: 1
        };

        return (
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {analysis.event_label && (
              <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                {analysis.event_label}
              </span>
            )}
            {analysis.impact_horizon && (
              <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 ring-1 ring-inset ring-blue-500/20">
                {analysis.impact_horizon}
              </span>
            )}
            {analysis.clustered_count > 1 && (
              <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-700 dark:text-muted-foreground ring-1 ring-inset ring-border">
                +{analysis.clustered_count} sources
              </span>
            )}
          </div>
        );
      })()}

      {item.isHeadlineOnly ? (
        <h2 className="font-body text-sm font-normal text-foreground/90 leading-relaxed">
          {item.title}
        </h2>
      ) : (
        <>
          <h2 className="font-heading font-extrabold text-base text-foreground leading-snug tracking-tight">{item.title}</h2>
          <p className="font-body text-sm text-zinc-900 dark:text-muted-foreground/90 leading-relaxed line-clamp-3 font-normal">
            {item.aiInsight || item.content}
          </p>
        </>
      )}

      {/* Quantitative Fundamental Micro-Strip (Valuation, Yield & Benchmark Context) */}
      {scorecard.feedChips.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-muted/25 p-2.5 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {scorecard.feedChips.map((chip) => (
              <span
                key={chip.id}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                  chip.tone === "positive"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                    : chip.tone === "warning"
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                    : "bg-background/80 text-foreground/85 border border-border/60"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    chip.tone === "positive"
                      ? "bg-emerald-500"
                      : chip.tone === "warning"
                      ? "bg-amber-500"
                      : "bg-cyan-500"
                  }`}
                />
                {chip.label}
              </span>
            ))}
          </div>

          {scorecard.metrics.earningsYield != null && (
            <p className="text-[11.5px] text-muted-foreground leading-snug">
              <strong className="text-foreground/90">Kenyan Yield Lens:</strong>{" "}
              {scorecard.metrics.earningsYield.toFixed(1)}% earnings yield (
              {scorecard.metrics.dividendYield?.toFixed(1) ?? "0.0"}% cash dividend) vs ~
              {scorecard.metrics.mmfBenchmarkYield.toFixed(1)}% {scorecard.metrics.mmfBenchmarkName}
            </p>
          )}
        </div>
      )}

        {/* Continue / View full analysis */}
        <div>
          <button
            type="button"
            onClick={openArticle}
            className="inline-flex items-center gap-1.5 font-heading text-emerald-500 hover:text-emerald-400 font-semibold text-xs md:text-sm transition-colors cursor-pointer"
          >
            <span>View full 5-pillar analysis</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ─── Bottom Actions Row: 6 Distinct Rounded Pill Chips (Twitter / X Format) ─── */}
        <div className="flex items-center justify-between w-full min-w-0 gap-1 sm:gap-2 pt-2 flex-wrap sm:flex-nowrap">
          {/* Comments Pill */}
          <button
            type="button"
            onClick={openArticle}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full border border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
            aria-label={`${commentsCount} comments`}
          >
            <MessageCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="tabular-nums text-[11px] sm:text-xs">{commentsCount}</span>
            <span className="hidden md:inline text-[11px] font-normal text-muted-foreground">Comments</span>
          </button>

          {/* Likes Pill */}
          <button
            type="button"
            onClick={handleLike}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full border text-xs font-semibold transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0 ${
              isLiked
                ? "border-rose-500/40 bg-rose-500/10 text-rose-500 shadow-xs"
                : "border border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
            aria-label={isLiked ? "Unlike article" : "Like article"}
          >
            <Heart className={`h-3.5 w-3.5 shrink-0 ${isLiked ? "fill-rose-500 text-rose-500" : "text-muted-foreground"}`} />
            <span className="tabular-nums text-[11px] sm:text-xs">{likeCount}</span>
            <span className="hidden md:inline text-[11px] font-normal text-muted-foreground">Likes</span>
          </button>

          {/* Rank / Upvote Pill */}
          <button
            type="button"
            onClick={handleUpvote}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full border text-xs font-semibold transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0 ${
              isUpvoted
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "border border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
            aria-label={isUpvoted ? "Remove upvote" : "Upvote story"}
          >
            <ArrowBigUp className={`h-4 w-4 shrink-0 ${isUpvoted ? "fill-emerald-500 text-emerald-500" : "text-muted-foreground"}`} />
            <span className="tabular-nums text-[11px] sm:text-xs">{upvoteCount}</span>
            <span className="hidden md:inline text-[11px] font-normal text-muted-foreground">Rank</span>
          </button>

          {/* Views Metric Chip */}
          <div
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full border border-border/70 bg-muted/20 text-muted-foreground text-xs font-medium whitespace-nowrap shrink-0"
            title={`${viewsCount.toLocaleString()} total views`}
          >
            <BarChart2 className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
            <span className="tabular-nums text-[11px] sm:text-xs">{formattedViews}</span>
            <span className="hidden lg:inline text-[11px] font-normal text-muted-foreground">Views</span>
          </div>

          {/* Bookmark Pill */}
          <button
            type="button"
            onClick={handleBookmark}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full border text-xs font-semibold transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0 ${
              isBookmarked
                ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-xs"
                : "border border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark article"}
          >
            <Bookmark className={`h-3.5 w-3.5 shrink-0 ${isBookmarked ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`} />
            <span className="hidden sm:inline text-[11px] font-normal">Save</span>
          </button>

          {/* Share Pill */}
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1.5 rounded-full border border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
            aria-label="Share article"
          >
            <Share2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="hidden sm:inline text-[11px] font-normal">Share</span>
          </button>
        </div>
      </div>
    </article>
  );
}
