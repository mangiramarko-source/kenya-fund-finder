import { useState } from "react";
import { Bell, Check, ChevronRight, Coffee, Trash2, WalletCards, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/components/alerts/NotificationProvider";
import { useAuth } from "@/hooks/useAuth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { priceAlertPresentation } from "./priceAlertPresentation";
import { portfolioDailyPresentation } from "./portfolioDailyPresentation";
import { getCurrencyFlagUrl } from "@/lib/currencyBranding";
import { useIsMobile } from "@/hooks/use-mobile";

const NotificationBell = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAllRead, deleteNotification, openNotification } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // For non-authenticated users on mobile, show bell that prompts sign-up
  if (!user) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="relative h-9 w-9 p-0"
        onClick={() => navigate("/auth")}
        aria-label="Sign in for notifications"
      >
        <Bell className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 p-0"
          aria-label={unreadCount > 0 ? `Open notifications, ${unreadCount} unread` : "Open notifications"}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side={isMobile ? "bottom" : "right"} className={isMobile ? "inset-x-0 bottom-0 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-[28px] border-x border-t bg-background p-0 [&>button]:hidden" : "flex h-full w-[min(420px,calc(100vw-1rem))] flex-col border-l border-border bg-background p-0 [&>button]:hidden sm:max-w-none"}>
        {isMobile && <div aria-hidden="true" className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted" />}
        <div className="flex items-center gap-2 border-b border-border/80 px-5 py-2.5 md:py-3">
          <div className="min-w-0 flex-1"><SheetTitle className="text-base font-bold text-foreground">Notifications</SheetTitle><p className="text-xs text-muted-foreground">{unreadCount ? `${unreadCount} new notification${unreadCount === 1 ? "" : "s"}` : "You’re all caught up"}</p></div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-8 px-2 text-emerald-600 hover:text-emerald-700" onClick={markAllRead}>
              <Check className="h-3.5 w-3.5 mr-1" /> Read all
            </Button>
          )}
          <button onClick={() => setOpen(false)} aria-label="Close notifications" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/70 hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground stroke-[2.5]" />
          </button>
        </div>
        <ScrollArea className={isMobile ? "max-h-[calc(88dvh-6.5rem)] flex-none" : "min-h-0 flex-1"}>
          {notifications.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Bell className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">No notifications yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Market alerts and portfolio updates will appear here.</p>
            </div>
          ) : (
            <div className="w-full max-w-full divide-y divide-border/60 overflow-x-hidden">
              {notifications.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onOpen={() => { void openNotification(n); setOpen(false); }}
                  onDelete={() => deleteNotification(n.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

function NotificationAssetVisual({ notification, symbol }: { notification: ReturnType<typeof useNotifications>["notifications"][number]; symbol: string | null }) {
  const [imageFailed, setImageFailed] = useState(false);
  const flagUrl = notification.assetType === "currency" ? getCurrencyFlagUrl(symbol) : undefined;
  const label = notification.assetName ?? notification.title;

  if (notification.type === "portfolio_daily") return <WalletCards className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-label="Portfolio" />;

  if (notification.assetVisualUrl && !imageFailed) {
    return <img src={notification.assetVisualUrl} alt={`${label} logo`} className="h-full w-full object-contain p-1.5" onError={() => setImageFailed(true)} />;
  }
  if (flagUrl && !imageFailed) {
    return <img src={flagUrl} alt={`${symbol} flag`} className="h-5 w-5 rounded-full object-cover" onError={() => setImageFailed(true)} />;
  }
  if (notification.assetType === "commodity") return <Coffee className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-label="Commodity" />;
  return <span className="text-xs font-black tracking-wide text-foreground">{symbol?.slice(0, 3) ?? "KFF"}</span>;
}

function notificationTime(value: string | null) {
  if (!value) return "Recently";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Recently";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1_440)}d ago`;
}

export function NotificationRow({ notification, onOpen, onDelete }: { notification: ReturnType<typeof useNotifications>["notifications"][number]; onOpen: () => void; onDelete: () => void }) {
  const details = notification.type === "price_alert" ? priceAlertPresentation(notification) : null;
  const portfolioDetails = notification.type === "portfolio_daily" ? portfolioDailyPresentation(notification) : null;
  const assetName = details?.assetName ?? notification.title;
  const symbol = details?.symbol ?? notification.assetSymbol ?? null;
  return <div className={`group relative box-border flex w-full max-w-full min-w-0 items-center gap-2 overflow-hidden px-4 py-3 md:py-4 transition ${notification.is_read ? "hover:bg-muted/40" : "bg-emerald-500/[0.045] hover:bg-emerald-500/[0.08]"}`}>
    {!notification.is_read && <span className="absolute inset-y-3 left-0 w-0.5 rounded-r-full bg-emerald-500" aria-label="Unread" />}
    <button type="button" onClick={onOpen} aria-label={`Open alert: ${assetName}`} className="flex min-w-0 flex-1 items-center gap-3 text-left">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-border/70 bg-card shadow-sm"><NotificationAssetVisual notification={notification} symbol={symbol} /></span>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-foreground">{assetName}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{details?.target ?? portfolioDetails?.target ?? notification.message}</span></span>
      <span className="flex shrink-0 items-center gap-1.5 text-right"><span><span className="block text-sm font-bold tabular-nums text-foreground">{details?.currentPrice ?? portfolioDetails?.currentPrice ?? "View update"}</span><span className="mt-0.5 block text-xs text-muted-foreground">{notificationTime(details?.observedAt ?? portfolioDetails?.observedAt ?? notification.created_at)}</span></span><ChevronRight className="h-4 w-4 text-muted-foreground" /></span>
    </button>
    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-destructive" onClick={onDelete} aria-label={`Delete notification: ${notification.title}`}><Trash2 className="h-3.5 w-3.5" /></Button>
  </div>;
}

export default NotificationBell;
