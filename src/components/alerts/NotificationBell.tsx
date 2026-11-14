import { useMemo, useState } from "react";
import { Bell, CheckCheck, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/components/alerts/NotificationProvider";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { NotificationCard } from "./NotificationCard";
import {
  notificationCategory,
  type NotificationCategory,
} from "./notificationPresentation";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  variant?: "default" | "round";
}

type FilterKey = "all" | NotificationCategory;

const FILTER_OPTIONS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "alerts", label: "Alerts" },
  { key: "portfolio", label: "Portfolio" },
  { key: "market", label: "Market" },
];

const NotificationBell = ({ variant = "default" }: NotificationBellProps) => {
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    drawerOpen,
    setDrawerOpen,
    markAllRead,
    clearAllNotifications,
    deleteNotification,
    openNotification,
  } = useNotifications();
  const [localOpen, setLocalOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const open = typeof drawerOpen === "boolean" ? drawerOpen : localOpen;
  const setOpen = setDrawerOpen ?? setLocalOpen;

  const counts = useMemo(() => {
    const result: Record<FilterKey, number> = { all: notifications.length, alerts: 0, portfolio: 0, market: 0 };
    for (const item of notifications) {
      result[notificationCategory(item.type)] += 1;
    }
    return result;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (filter === "all") return notifications;
    return notifications.filter((item) => notificationCategory(item.type) === filter);
  }, [filter, notifications]);

  const handleClearAll = async () => {
    await clearAllNotifications();
    toast.success("All notifications cleared");
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    toast.success("All notifications marked as read");
  };

  const isRound = variant === "round";
  const isMultiDigit = unreadCount > 9;
  const buttonClass = isRound
    ? "inline-flex items-center justify-center relative h-10 w-10 rounded-full border border-border/80 dark:border-border/70 bg-muted/60 dark:bg-muted/60 text-foreground hover:bg-muted dark:hover:bg-muted active:scale-95 transition-all shrink-0"
    : "inline-flex items-center justify-center relative h-9 w-9 rounded-full text-foreground hover:bg-muted transition-colors";
  const iconClass = "h-5 w-5";
  const badgeClass = isRound
    ? `absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none shadow-sm ${
        isMultiDigit ? "h-[18px] min-w-[18px] px-1.5" : "h-[18px] w-[18px] aspect-square"
      }`
    : `absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold leading-none ${
        isMultiDigit ? "h-4 min-w-[16px] px-1" : "h-4 w-4 aspect-square"
      }`;

  // For non-authenticated users on mobile, show bell that prompts sign-up
  if (!user) {
    return (
      <button
        type="button"
        className={buttonClass}
        onClick={() => navigate("/auth")}
        aria-label="Sign in for notifications"
      >
        <Bell className={iconClass} />
      </button>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={buttonClass}
          aria-label={unreadCount > 0 ? `Open notifications, ${unreadCount} unread` : "Open notifications"}
        >
          <Bell className={iconClass} />
          {unreadCount > 0 && (
            <span className={badgeClass}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={
          isMobile
            ? "inset-x-2 bottom-[max(env(safe-area-inset-bottom),0.75rem)] flex max-h-[82svh] flex-col overflow-hidden rounded-[28px] border bg-background p-0 [&>button]:hidden"
            : "flex h-full w-[min(420px,calc(100vw-1rem))] flex-col border-l border-border bg-background p-0 [&>button]:hidden sm:max-w-none"
        }
      >
        {isMobile && <div aria-hidden="true" className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted" />}
        <div className="flex items-center gap-2 border-b border-border/80 px-5 py-2.5 md:py-3 shrink-0">
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-base font-bold text-foreground">Notifications</SheetTitle>
            <p className="text-xs text-muted-foreground">
              {unreadCount ? `${unreadCount} new notification${unreadCount === 1 ? "" : "s"}` : "You’re all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 px-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              onClick={handleMarkAllRead}
              aria-label="Mark all notifications as read"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> Read all
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              onClick={handleClearAll}
              aria-label="Clear all notifications"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear all
            </Button>
          )}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close notifications"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/70 hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground stroke-[2.5]" />
          </button>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border/60 px-4 py-2 shrink-0 scrollbar-hide" role="tablist" aria-label="Filter notifications">
            {FILTER_OPTIONS.map((option) => {
              const active = filter === option.key;
              const count = counts[option.key];
              return (
                <button
                  key={option.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(option.key)}
                  className={cn(
                    "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold transition-colors",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border/80 bg-muted/40 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{option.label}</span>
                  <span className={cn("tabular-nums text-[10px]", active ? "opacity-80" : "opacity-70")}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]">
          {notifications.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Bell className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">No notifications yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Price alerts, watchlist movers, MMF shifts, T-Bill auctions, and portfolio updates will appear here.
              </p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Bell className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">No notifications in this category</p>
              <p className="mt-1 text-xs text-muted-foreground">Try switching back to All to view your other updates.</p>
            </div>
          ) : (
            <div className="w-full max-w-full space-y-2.5 overflow-x-hidden p-3 sm:p-4">
              {filteredNotifications.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  onOpen={() => {
                    void openNotification(n);
                    setOpen(false);
                  }}
                  onDelete={() => deleteNotification(n.id)}
                />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export { NotificationCard as NotificationRow } from "./NotificationCard";

export default NotificationBell;
