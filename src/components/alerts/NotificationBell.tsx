import { useState } from "react";
import { Bell, Check, ChevronRight, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/components/alerts/NotificationProvider";
import { useAuth } from "@/hooks/useAuth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { priceAlertPresentation } from "./priceAlertPresentation";

const NotificationBell = () => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAllRead, deleteNotification, openNotification } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

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
      <SheetContent side="right" className="inset-y-0 right-0 left-auto h-full w-[400px] max-w-[92vw] rounded-none border-l border-t-0 bg-background p-0 [&>button]:hidden">
        <div className="flex items-center gap-2 border-b border-border/80 px-5 py-3">
          <div className="min-w-0 flex-1"><SheetTitle className="text-base font-bold text-foreground">Notifications</SheetTitle><p className="text-xs text-muted-foreground">{unreadCount ? `${unreadCount} new price alert${unreadCount === 1 ? "" : "s"}` : "You’re all caught up"}</p></div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-8 px-2 text-emerald-600 hover:text-emerald-700" onClick={markAllRead}>
              <Check className="h-3.5 w-3.5 mr-1" /> Read all
            </Button>
          )}
          <button onClick={() => setOpen(false)} aria-label="Close notifications" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/70 hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground stroke-[2.5]" />
          </button>
        </div>
        <ScrollArea className="h-[calc(100dvh-69px)]">
          {notifications.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Bell className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">No notifications yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Price alerts will appear here when they are triggered.</p>
            </div>
          ) : (
            <div className="space-y-2 p-3">
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

export function NotificationRow({ notification, onOpen, onDelete }: { notification: ReturnType<typeof useNotifications>["notifications"][number]; onOpen: () => void; onDelete: () => void }) {
  const details = notification.type === "price_alert" ? priceAlertPresentation(notification) : null;
  return <div className={`group rounded-2xl border p-4 transition ${notification.is_read ? "border-border bg-card" : "border-emerald-500/35 bg-emerald-500/[0.08]"}`}>
    <div className="flex items-start gap-3"><button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-3 text-left"><span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500 text-xs font-black text-slate-950">{details?.symbol?.slice(0, 2) ?? "KFF"}</span><span className="min-w-0"><span className="flex items-center gap-2"><span className="truncate text-sm font-bold text-foreground">{details?.assetName ?? notification.title}</span>{!notification.is_read && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />}</span><span className="mt-1 block text-xs text-muted-foreground">{details?.target ?? notification.message}</span></span></button><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-destructive" onClick={onDelete} aria-label={`Delete notification: ${notification.title}`}><Trash2 className="h-3.5 w-3.5" /></Button></div>
    <button type="button" onClick={onOpen} className="mt-3 flex w-full items-center justify-between border-t border-border/70 pt-3 text-left"><span className="text-base font-bold tabular-nums text-foreground">{details?.currentPrice ?? "View update"}</span><span className="inline-flex items-center text-xs font-bold text-emerald-600">View alert <ChevronRight className="h-3.5 w-3.5" /></span></button>
  </div>;
}

export default NotificationBell;
