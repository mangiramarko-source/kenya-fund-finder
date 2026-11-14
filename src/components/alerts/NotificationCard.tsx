import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AppNotification } from "./NotificationProvider";
import { NotificationAssetVisual } from "./NotificationAssetVisual";
import {
  formatNotificationRelativeTime,
  notificationPresentation,
  type NotificationDirection,
} from "./notificationPresentation";

const DIRECTION_TEXT: Record<NotificationDirection, string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-rose-600 dark:text-rose-400",
  neutral: "text-muted-foreground",
};

export type NotificationCardProps = {
  notification: AppNotification;
  onOpen: () => void;
  onDelete?: () => void;
};

/**
 * Minimalist neutral notification card with single-line hierarchy and zero repeated labels.
 */
export function NotificationCard({ notification, onOpen, onDelete }: NotificationCardProps) {
  const details = notificationPresentation(notification);
  const isUnread = !notification.is_read;
  const hasMetric = Boolean(details.primaryMetric || details.secondaryPill);

  return (
    <div
      className={cn(
        "group relative box-border flex w-full max-w-full min-w-0 items-center gap-2 overflow-hidden rounded-2xl border p-3.5 transition-colors duration-150",
        isUnread
          ? "border-foreground/20 bg-card shadow-2xs hover:border-foreground/35"
          : "border-border/65 bg-muted/25 hover:border-border hover:bg-card/80"
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open alert: ${details.headline}`}
        className="flex min-w-0 flex-1 items-start gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border",
            isUnread ? "border-border bg-muted/45" : "border-border/60 bg-background/60"
          )}
        >
          <NotificationAssetVisual notification={notification} symbol={details.symbol} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-bold leading-snug text-foreground">
              {details.headline}
            </span>
            {isUnread && (
              <span
                aria-label="Unread"
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground"
              />
            )}
          </span>

          <span className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {details.subline}
          </span>

          <span className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/80">
            <span>{details.categoryBadgeLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{formatNotificationRelativeTime(details.observedAt)}</span>
          </span>
        </span>

        {hasMetric && (
          <span className="shrink-0 text-right tabular-nums">
            {details.primaryMetric && (
              <span className="block text-sm font-bold text-foreground">
                {details.primaryMetric}
              </span>
            )}
            {details.secondaryPill && (
              <span className={cn("mt-0.5 block text-[11px] font-semibold", DIRECTION_TEXT[details.direction])}>
                {details.secondaryPill}
              </span>
            )}
          </span>
        )}
      </button>

      {onDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 self-start rounded-full text-muted-foreground opacity-100 transition hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
          onClick={onDelete}
          aria-label={`Delete notification: ${notification.title}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
