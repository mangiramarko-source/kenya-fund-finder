import { useState, useEffect } from "react";
import { Vote, Heart, Share2, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface FeedPollCardProps {
  id?: string;
  question?: string;
  defaultBulls?: number;
  defaultBears?: number;
  index?: number;
}

export function FeedPollCard({
  id = "community-poll-1",
  question = "NSE Community Sentiment: Are you Bullish or Bearish on Safaricom ($SCOM) and Kenyan Equities this week?",
  defaultBulls = 482,
  defaultBears = 194,
  index = 3,
}: FeedPollCardProps) {
  const [userVote, setUserVote] = useState<"bull" | "bear" | null>(null);
  const [bulls, setBulls] = useState(defaultBulls);
  const [bears, setBears] = useState(defaultBears);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(42);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`kff_poll_vote_${id}`);
      if (saved === "bull" || saved === "bear") {
        setUserVote(saved);
      }
    } catch {
      // local storage unavailable
    }
  }, [id]);

  const handleVote = (vote: "bull" | "bear") => {
    if (userVote) return;
    setUserVote(vote);
    if (vote === "bull") setBulls((prev) => prev + 1);
    else setBears((prev) => prev + 1);

    try {
      localStorage.setItem(`kff_poll_vote_${id}`, vote);
    } catch {
      // ignore
    }
    toast.success(vote === "bull" ? "Voted Bullish! 🐂" : "Voted Bearish! 🐻", {
      description: "Your vote has been added to the community sentiment.",
    });
  };

  const handleLike = () => {
    setIsLiked((prev) => !prev);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "KFF Market Poll",
        text: question,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Poll link copied to clipboard");
    }
  };

  const totalVotes = bulls + bears;
  const bullPct = Math.round((bulls / totalVotes) * 100);
  const bearPct = 100 - bullPct;

  return (
    <div
      className="animate-rise relative -mx-4 space-y-3.5 border-0 border-b border-border/80 bg-transparent px-4 py-4 shadow-none transition-all md:mx-0 md:rounded-2xl md:border md:bg-card md:p-6 md:shadow-xs"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Top author/badge row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white font-extrabold text-sm shadow-xs shrink-0">
            KFF
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                KFF Community Pulse
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <Vote className="h-2.5 w-2.5" /> Live Poll
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">Today · 24h Remaining</span>
          </div>
        </div>

        <span className="text-[11px] font-bold text-muted-foreground tabular-nums shrink-0">
          {totalVotes.toLocaleString()} votes
        </span>
      </div>

      {/* Poll Question */}
      <div>
        <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug">
          {question}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Vote below to see what fellow Kenyan retail and institutional investors are anticipating.
        </p>
      </div>

      {/* Interactive Options or Live Results */}
      {!userVote ? (
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => handleVote("bull")}
            className="group flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-emerald-700 dark:text-emerald-300 font-bold text-xs sm:text-sm transition-all hover:bg-emerald-500/15 active:scale-[0.98] cursor-pointer"
          >
            <span className="text-base sm:text-lg">🐂</span>
            <span>Bullish</span>
            <span className="text-xs opacity-70 group-hover:translate-x-0.5 transition-transform">→</span>
          </button>

          <button
            type="button"
            onClick={() => handleVote("bear")}
            className="group flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-rose-700 dark:text-rose-300 font-bold text-xs sm:text-sm transition-all hover:bg-rose-500/15 active:scale-[0.98] cursor-pointer"
          >
            <span className="text-base sm:text-lg">🐻</span>
            <span>Bearish</span>
            <span className="text-xs opacity-70 group-hover:translate-x-0.5 transition-transform">→</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2 pt-1">
          {/* Animated Results Bar */}
          <div className="relative h-10 w-full overflow-hidden rounded-xl bg-muted/60 p-1 flex items-center">
            <div
              className="h-full rounded-lg bg-emerald-500/80 transition-all duration-700 flex items-center px-3"
              style={{ width: `${bullPct}%` }}
            >
              <span className="text-xs font-extrabold text-white whitespace-nowrap">
                🐂 {bullPct}% Bullish
              </span>
            </div>
            <div
              className="h-full rounded-lg bg-rose-500/80 transition-all duration-700 flex items-center justify-end px-3 ml-auto"
              style={{ width: `${bearPct}%` }}
            >
              <span className="text-xs font-extrabold text-white whitespace-nowrap">
                {bearPct}% Bearish 🐻
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
            <span>
              You voted:{" "}
              <strong className={userVote === "bull" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                {userVote === "bull" ? "Bullish 🐂" : "Bearish 🐻"}
              </strong>
            </span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="h-3 w-3" /> Recorded
            </span>
          </div>
        </div>
      )}

      {/* Footer social actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-muted-foreground text-xs">
        <button
          type="button"
          onClick={handleLike}
          className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
            isLiked ? "text-rose-500 font-bold" : "hover:text-foreground"
          }`}
        >
          <Heart className={`h-4 w-4 ${isLiked ? "fill-rose-500" : ""}`} />
          <span>{likeCount}</span>
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
        >
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}
