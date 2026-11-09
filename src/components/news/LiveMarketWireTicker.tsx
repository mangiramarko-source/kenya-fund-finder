import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Flame, ArrowRight, X } from "lucide-react";
import { fetchPublishedNews, type NewsFromDB } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { getNewsPublishedAt } from "@/lib/newsDate";

const DISMISS_KEY = "kff_live_wire_dismissed";

export const LiveMarketWireTicker: React.FC = () => {
  const [articles, setArticles] = useState<NewsFromDB[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return typeof window !== "undefined" && window.sessionStorage?.getItem(DISMISS_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isDismissed) return;

    let mounted = true;
    fetchPublishedNews(6, 0)
      .then((data) => {
        if (!mounted) return;
        const valid = (data || []).filter((a) => a.title && a.id);
        setArticles(valid);
      })
      .catch((err) => {
        console.warn("LiveMarketWireTicker fetch error:", err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isDismissed]);

  // Rotate headline every 6 seconds
  useEffect(() => {
    if (articles.length <= 1 || isDismissed) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % articles.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [articles.length, isDismissed]);

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDismissed(true);
    try {
      window.sessionStorage?.setItem(DISMISS_KEY, "true");
    } catch {
      // Ignore storage errors in private browsing/sandboxes
    }
  }, []);

  if (isDismissed) return null;

  if (loading) {
    return (
      <div className="h-10 w-full rounded-lg bg-card/60 border border-border/40 px-3 flex items-center animate-pulse" aria-hidden="true">
        <div className="h-4 w-20 bg-muted/60 rounded" />
        <div className="h-4 flex-1 bg-muted/40 rounded ml-3" />
      </div>
    );
  }

  if (articles.length === 0) return null;

  const current = articles[currentIndex] || articles[0];
  const publishedAt = getNewsPublishedAt(current);
  let timeAgo = "";
  try {
    if (publishedAt) {
      timeAgo = formatDistanceToNow(new Date(publishedAt), { addSuffix: true }).replace("about ", "");
    }
  } catch {
    timeAgo = "";
  }

  return (
    <div
      role="region"
      aria-label="Breaking Financial News Wire"
      className="group relative h-10 w-full overflow-hidden rounded-lg border border-border/70 bg-card/80 px-2.5 sm:px-3 text-xs backdrop-blur-sm transition-colors hover:border-border"
    >
      <div className="flex h-full items-center justify-between gap-2">
        {/* Left Badge */}
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          <span className="flex items-center gap-1 font-bold uppercase tracking-wider text-red-600 dark:text-red-400 text-[10px] sm:text-xs">
            <Flame className="h-3 w-3" />
            <span className="hidden xs:inline">Market</span> Wire
          </span>
          <span className="text-muted-foreground/60">|</span>
        </div>

        {/* Center: Headline (Rotates smoothly) */}
        <Link
          to={`/news/${encodeURIComponent(current.id)}`}
          className="flex min-w-0 flex-1 items-center gap-2 text-foreground hover:text-primary transition-colors"
          title={current.title}
        >
          <span className="truncate font-medium text-xs sm:text-[13px]">
            {current.title}
          </span>
          {current.source && (
            <span className="hidden sm:inline-block shrink-0 rounded bg-muted/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {current.source}
            </span>
          )}
          {timeAgo && (
            <span className="hidden md:inline-block shrink-0 text-[10px] text-muted-foreground">
              {timeAgo}
            </span>
          )}
        </Link>

        {/* Right CTA & Dismiss */}
        <div className="flex shrink-0 items-center gap-1.5 pl-1">
          <Link
            to="/news"
            className="hidden sm:inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:underline"
          >
            All News <ArrowRight className="h-3 w-3" />
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss market wire"
            className="rounded p-1 text-muted-foreground/70 hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveMarketWireTicker;
