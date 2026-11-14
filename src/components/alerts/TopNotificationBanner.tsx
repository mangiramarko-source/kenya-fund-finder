import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import type { AppNotification } from "./NotificationProvider";
import { NotificationAssetVisual } from "./NotificationAssetVisual";
import {
  formatNotificationRelativeTime,
  notificationPresentation,
  type NotificationDirection,
} from "./notificationPresentation";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const AUTO_DISMISS_MS = 6000;

const DIRECTION_TEXT: Record<NotificationDirection, string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-rose-600 dark:text-rose-400",
  neutral: "text-muted-foreground",
};

export type TopNotificationBannerProps = {
  notification: AppNotification | null;
  unreadCount?: number;
  onDismiss: () => void;
  onView: (notification: AppNotification) => void;
  onOpenDrawer?: () => void;
  contained?: boolean;
  compact?: boolean;
  durationMs?: number;
};

/**
 * Minimalist neutral floating top drop-down banner with 6s auto-dismiss,
 * hover/touch pause, and swipe-up dismissal.
 */
export function TopNotificationBanner({
  notification,
  unreadCount = 0,
  onDismiss,
  onView,
  onOpenDrawer,
  contained = false,
  compact: compactProp,
  durationMs = AUTO_DISMISS_MS,
}: TopNotificationBannerProps) {
  const isMobileViewport = useIsMobile();
  const compact = compactProp ?? isMobileViewport;
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(1);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const remainingRef = useRef(durationMs);
  const lastTickRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const notificationId = notification?.id ?? null;

  useEffect(() => {
    if (!notificationId) return;
    remainingRef.current = durationMs;
    lastTickRef.current = performance.now();
    setProgress(1);
    setDragOffsetY(0);
    setPaused(false);
  }, [notificationId, durationMs]);

  useEffect(() => {
    if (!notificationId || paused || durationMs <= 0) {
      lastTickRef.current = null;
      return;
    }

    lastTickRef.current = performance.now();
    let frameId = 0;

    const tick = (now: number) => {
      if (lastTickRef.current !== null) {
        const delta = now - lastTickRef.current;
        remainingRef.current = Math.max(0, remainingRef.current - delta);
      }
      lastTickRef.current = now;
      const nextProgress = remainingRef.current / durationMs;
      setProgress(nextProgress);

      if (remainingRef.current <= 0) {
        onDismissRef.current();
        return;
      }
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [notificationId, paused, durationMs]);

  useEffect(() => {
    if (!notificationId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismissRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [notificationId]);

  if (!notification) return null;

  const details = notificationPresentation(notification);
  const moreUnread = Math.max(0, unreadCount - (notification.is_read ? 0 : 1));
  const hasMetric = Boolean(details.primaryMetric || details.secondaryPill);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
    setPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const currentY = e.touches[0]?.clientY ?? touchStartYRef.current;
    const delta = currentY - touchStartYRef.current;
    if (delta < 0) {
      setDragOffsetY(Math.max(delta, -56));
    }
  };

  const handleTouchEnd = () => {
    if (dragOffsetY <= -24) {
      onDismiss();
    } else {
      setDragOffsetY(0);
      setPaused(false);
    }
    touchStartYRef.current = null;
  };

  return (
    <div
      className={cn(
        contained ? "absolute" : "fixed",
        "inset-x-2.5 top-[max(env(safe-area-inset-top),0.5rem)] z-[90] mx-auto max-w-2xl pointer-events-none"
      )}
    >
      <section
        role="alertdialog"
        aria-modal="false"
        aria-labelledby="top-notification-title"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: dragOffsetY < 0 ? `translateY(${dragOffsetY}px)` : undefined,
          opacity: dragOffsetY < 0 ? Math.max(0.35, 1 + dragOffsetY / 72) : undefined,
        }}
        className={cn(
          "pointer-events-auto relative overflow-hidden rounded-2xl border border-border/80 bg-card/95 text-card-foreground shadow-[0_18px_48px_-14px_rgba(0,0,0,0.22)] dark:shadow-[0_22px_60px_-14px_rgba(0,0,0,0.75)] backdrop-blur-xl transition-opacity duration-200",
          "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-4 motion-safe:duration-300"
        )}
      >
        <div className="relative flex items-center gap-3 px-3.5 py-2.5 sm:px-4 sm:py-3">
          {/* Asset logo / icon */}
          <button
            type="button"
            onClick={() => onView(notification)}
            aria-label={`Open ${details.headline}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/70 bg-muted/40 transition hover:bg-muted"
          >
            <NotificationAssetVisual notification={notification} symbol={details.symbol} />
          </button>

          {/* Clean single-eyebrow + title + summary */}
          <button
            type="button"
            onClick={() => onView(notification)}
            className="min-w-0 flex-1 text-left focus:outline-none"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              {!notification.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />}
              <span className="truncate">{details.categoryBadgeLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="shrink-0">{formatNotificationRelativeTime(details.observedAt, "Just now")}</span>
            </div>
            <h2
              id="top-notification-title"
              className="mt-0.5 truncate text-sm font-bold tracking-tight text-foreground"
            >
              {details.headline}
            </h2>
            <p className="truncate text-xs text-muted-foreground">{details.subline}</p>
          </button>

          {/* Metric + compact action + queue link + dismiss */}
          <div className="flex shrink-0 items-center gap-2">
            {!compact && hasMetric && (
              <div className="text-right">
                {details.primaryMetric && (
                  <p className="text-sm font-bold tabular-nums tracking-tight text-foreground">
                    {details.primaryMetric}
                  </p>
                )}
                {details.secondaryPill && (
                  <p className={cn("text-[11px] font-semibold tabular-nums", DIRECTION_TEXT[details.direction])}>
                    {details.secondaryPill}
                  </p>
                )}
              </div>
            )}

            {moreUnread > 0 && onOpenDrawer && (
              <button
                type="button"
                onClick={() => {
                  onDismiss();
                  onOpenDrawer();
                }}
                aria-label={`+${moreUnread} more unread notifications`}
                className="inline-flex h-8 shrink-0 items-center rounded-lg border border-border/80 bg-muted/45 px-2 text-[11px] font-semibold tabular-nums text-foreground transition hover:bg-muted"
              >
                +{moreUnread} more
              </button>
            )}

            {!compact && (
              <button
                type="button"
                onClick={() => onView(notification)}
                aria-label={details.ctaLabel}
                className="hidden md:inline-flex h-8 items-center gap-1 rounded-lg bg-foreground px-2.5 text-xs font-semibold text-background transition hover:bg-foreground/90 active:scale-95 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <span>View</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss notification"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Compact mobile metric row only when metrics exist */}
        {compact && hasMetric && (
          <div className="flex items-center justify-between border-t border-border/50 px-3.5 py-1.5 text-[11px]">
            <span className="font-bold tabular-nums text-foreground">{details.primaryMetric}</span>
            {details.secondaryPill && (
              <span className={cn("font-semibold tabular-nums", DIRECTION_TEXT[details.direction])}>
                {details.secondaryPill}
              </span>
            )}
          </div>
        )}

        {/* Hairline 6s progress bar */}
        <div aria-hidden="true" className="h-[2px] w-full bg-border/40">
          <div
            className="h-full origin-left bg-foreground/70"
            style={{ transform: `scaleX(${Math.max(0, Math.min(1, progress))})` }}
          />
        </div>
      </section>
    </div>
  );
}
