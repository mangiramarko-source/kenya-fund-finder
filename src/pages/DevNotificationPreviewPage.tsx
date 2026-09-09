import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  Check,
  ChevronRight,
  Coffee,
  Clock3,
  Menu,
  Moon,
  RotateCcw,
  Sun,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";

type Theme = "dark" | "light";
type Device = "desktop" | "mobile";

type PreviewNotification = {
  id: string;
  symbol: string;
  asset: string;
  price: string;
  target: string;
  time: string;
  read: boolean;
  visual: { kind: "logo"; src: string } | { kind: "flag"; value: string } | { kind: "commodity" } | { kind: "portfolio" };
};

const seedNotifications: PreviewNotification[] = [
  { id: "portfolio", symbol: "PORTFOLIO", asset: "Portfolio up today", price: "KES 110,000.00", target: "+KES 10,000.00 (+10.00%)", time: "Today", read: false, visual: { kind: "portfolio" } },
  { id: "absa", symbol: "ABSA", asset: "Absa Bank Kenya", price: "KES 15.10", target: "Above KES 15.00", time: "Just now", read: false, visual: { kind: "logo", src: "https://caawgzuofnujrznwbuxk.supabase.co/storage/v1/object/public/market-logos/stocks/ABSA-provided-v3.webp" } },
  { id: "scom", symbol: "SCOM", asset: "Safaricom PLC", price: "KES 37.05", target: "Above KES 36.90", time: "12 min ago", read: false, visual: { kind: "logo", src: "/images/stocks/safaricom.png" } },
  { id: "aud", symbol: "AUD", asset: "AUD/KES · Australian Dollar", price: "KES 93.37", target: "Above KES 93.00", time: "Yesterday", read: true, visual: { kind: "flag", value: "🇦🇺" } },
  { id: "coffee", symbol: "COFFEE", asset: "Coffee (USD/KG)", price: "KES 292.90", target: "Below KES 310.00", time: "Mon", read: true, visual: { kind: "commodity" } },
];

export default function DevNotificationPreviewPage() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [device, setDevice] = useState<Device>("desktop");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(true);
  const [notifications, setNotifications] = useState(seedNotifications);
  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.read).length, [notifications]);

  if (!import.meta.env.DEV) return null;

  const markAllRead = () => setNotifications((items) => items.map((item) => ({ ...item, read: true })));
  const openNotification = (id: string) => setNotifications((items) => items.map((item) => item.id === id ? { ...item, read: true } : item));
  const reset = () => {
    setNotifications(seedNotifications);
    setAlertOpen(true);
    setDrawerOpen(false);
  };

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-muted/40 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Development preview</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Notifications</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Synthetic portfolio and market updates. Nothing is read from or written to your account.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PreviewButton active={theme === "dark"} onClick={() => setTheme("dark")} label="Dark"><Moon className="h-3.5 w-3.5" /> Dark</PreviewButton>
            <PreviewButton active={theme === "light"} onClick={() => setTheme("light")} label="Light"><Sun className="h-3.5 w-3.5" /> Light</PreviewButton>
            <PreviewButton active={device === "desktop"} onClick={() => setDevice("desktop")} label="Desktop">Desktop</PreviewButton>
            <PreviewButton active={device === "mobile"} onClick={() => setDevice("mobile")} label="Mobile">Mobile</PreviewButton>
            <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold transition hover:bg-muted"><RotateCcw className="h-3.5 w-3.5" /> Reset</button>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className={`mx-auto w-full overflow-hidden rounded-[30px] border border-slate-700/80 bg-slate-950 shadow-2xl ${device === "mobile" ? "max-w-[390px]" : "max-w-[1000px]"}`}>
            <div className={theme === "dark" ? "dark" : ""}>
              <PreviewFrame
                device={device}
                drawerOpen={drawerOpen}
                setDrawerOpen={setDrawerOpen}
                alertOpen={alertOpen}
                setAlertOpen={setAlertOpen}
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAllRead={markAllRead}
                onOpenNotification={openNotification}
              />
            </div>
          </div>

          <aside className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Preview controls</p>
            <div className="mt-3 space-y-2">
              <button type="button" onClick={() => setAlertOpen(true)} className="w-full rounded-xl bg-emerald-600 px-3 py-2.5 text-left text-sm font-semibold text-white transition hover:bg-emerald-700">Trigger live alert card</button>
              <button type="button" onClick={() => setDrawerOpen(true)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-muted">Open notification centre</button>
            </div>
            <div className="mt-5 space-y-3 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
              <p><strong className="text-foreground">Live alert:</strong> centred, acknowledgement-required, and shown only for a new incoming price alert.</p>
              <p><strong className="text-foreground">Drawer:</strong> right-side on desktop; on mobile, Notifications opens from the main navigation drawer.</p>
              <p><strong className="text-foreground">Dismiss:</strong> closes the live card but leaves the alert unread in the centre.</p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function PreviewButton({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${active ? "border-emerald-500 bg-emerald-500 text-white" : "border-border bg-background hover:bg-muted"}`}>{children ?? label}</button>;
}

function PreviewFrame({
  device, drawerOpen, setDrawerOpen, alertOpen, setAlertOpen, notifications, unreadCount, onMarkAllRead, onOpenNotification,
}: {
  device: Device;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  alertOpen: boolean;
  setAlertOpen: (open: boolean) => void;
  notifications: PreviewNotification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onOpenNotification: (id: string) => void;
}) {
  const isMobile = device === "mobile";
  const liveAlert = notifications.find((notification) => notification.id === "absa") ?? notifications[0];

  return (
    <div className={`relative min-h-[670px] overflow-hidden bg-background text-foreground ${isMobile ? "min-h-[760px]" : ""}`}>
      <header className="flex h-16 items-center justify-between border-b border-border bg-background px-5">
        <div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500 text-sm font-black text-slate-950">K</span><div><p className="text-sm font-bold leading-none">Kenya Fund Finder</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Markets, made clear</p></div></div>
        {isMobile ? <button type="button" onClick={() => setDrawerOpen(true)} aria-label={`Open menu, ${unreadCount} unread`} className={`relative grid h-10 w-10 place-items-center rounded-xl transition ${unreadCount > 0 ? "bg-destructive/10 text-destructive shadow-[0_0_0_1px_hsl(var(--destructive)/0.4),0_0_16px_hsl(var(--destructive)/0.55)] motion-safe:animate-pulse" : "border border-border bg-card hover:bg-muted"}`}><Menu className="h-5 w-5" />{unreadCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-black text-destructive-foreground shadow-sm">{unreadCount > 9 ? "9+" : unreadCount}</span>}</button> : <button type="button" onClick={() => setDrawerOpen(true)} aria-label={`Open notifications, ${unreadCount} unread`} className="relative grid h-10 w-10 place-items-center rounded-xl border border-border bg-card transition hover:bg-muted"><Bell className="h-4 w-4" />{unreadCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-emerald-500 px-1 text-[10px] font-black text-slate-950">{unreadCount}</span>}</button>}
      </header>

      <div className="p-5 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-500">Price alerts</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">Your market dashboard</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Metric label="NSE 20 Share Index" value="2,416.18" delta="+0.42% today" />
          <Metric label="Portfolio movement" value="+KES 2,840" delta="Updated moments ago" />
        </div>
        <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm"><p className="text-sm font-semibold">Price alerts are watching</p><p className="mt-1 text-sm text-muted-foreground">You have 3 active targets across NSE stocks.</p></div>
      </div>

      {alertOpen && <LiveAlertCard notification={liveAlert} onDismiss={() => setAlertOpen(false)} onView={() => { onOpenNotification(liveAlert.id); setAlertOpen(false); }} />}
      {drawerOpen && <NotificationDrawer device={device} notifications={notifications} unreadCount={unreadCount} onClose={() => setDrawerOpen(false)} onMarkAllRead={onMarkAllRead} onOpen={onOpenNotification} />}
    </div>
  );
}

function Metric({ label, value, delta }: { label: string; value: string; delta: string }) {
  return <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-xl font-bold tracking-tight">{value}</p><p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-500"><TrendingUp className="h-3.5 w-3.5" />{delta}</p></div>;
}

function LiveAlertCard({ notification, onDismiss, onView }: { notification: PreviewNotification; onDismiss: () => void; onView: () => void }) {
  return <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-[2px]" role="presentation">
    <section role="alertdialog" aria-modal="true" aria-labelledby="live-alert-title" className="w-full max-w-md overflow-hidden rounded-[28px] border border-emerald-400/35 bg-slate-950 text-slate-50 shadow-[0_25px_100px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-300"><span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-400 text-slate-950"><Bell className="h-3.5 w-3.5" /></span> Price target reached</div><button type="button" aria-label="Dismiss alert" onClick={onDismiss} className="rounded-lg p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button></div>
      <div className="px-5 pb-5 pt-6"><div className="flex items-start justify-between gap-3"><div><p className="text-3xl font-bold tracking-tight">{notification.price}</p><h3 id="live-alert-title" className="mt-1 text-base font-semibold">{notification.asset} <span className="text-slate-400">({notification.symbol})</span></h3></div><span className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-bold text-emerald-300">Target hit</span></div>
        <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-white/[0.06] p-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Your condition</p><p className="mt-1 text-sm font-semibold text-white">{notification.target}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Observed</p><p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-white"><Clock3 className="h-3.5 w-3.5 text-emerald-300" />{notification.time}</p></div></div>
        <p className="mt-4 text-xs leading-relaxed text-slate-400">Price data is informational only and is not financial advice.</p>
        <div className="mt-5 flex gap-2"><button type="button" onClick={onDismiss} className="flex-1 rounded-xl border border-white/15 px-3 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">Dismiss</button><button type="button" onClick={onView} className="flex-1 rounded-xl bg-emerald-400 px-3 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300">View alert <ArrowUpRight className="ml-1 inline h-4 w-4" /></button></div>
      </div>
    </section>
  </div>;
}

function NotificationVisual({ notification }: { notification: PreviewNotification }) {
  const [imageFailed, setImageFailed] = useState(false);
  if (notification.visual.kind === "logo" && !imageFailed) {
    return <img src={notification.visual.src} alt={`${notification.asset} logo`} className="h-full w-full object-contain p-1.5" onError={() => setImageFailed(true)} />;
  }
  if (notification.visual.kind === "flag") return <span className="text-xl leading-none" aria-label={`${notification.asset} flag`}>{notification.visual.value}</span>;
  if (notification.visual.kind === "commodity") return <Coffee className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-label="Commodity" />;
  if (notification.visual.kind === "portfolio") return <WalletCards className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-label="Portfolio" />;
  return <span className="text-xs font-black tracking-wide text-foreground">{notification.symbol.slice(0, 3)}</span>;
}

function NotificationDrawer({ device, notifications, unreadCount, onClose, onMarkAllRead, onOpen }: { device: Device; notifications: PreviewNotification[]; unreadCount: number; onClose: () => void; onMarkAllRead: () => void; onOpen: (id: string) => void }) {
  const mobile = device === "mobile";
  return (
    <div className="absolute inset-0 z-30 bg-slate-950/35" onClick={onClose} role="presentation">
      <section role="dialog" aria-modal="true" aria-label="Notification centre" onClick={(event) => event.stopPropagation()} className={`absolute flex flex-col overflow-hidden bg-background shadow-2xl ${mobile ? "inset-x-0 bottom-0 max-h-[78%] rounded-t-[28px] border-t border-border" : "right-0 top-0 h-full w-[420px] border-l border-border"}`}>
        {mobile && <div className="mx-auto mt-3 h-1.5 w-11 shrink-0 rounded-full bg-muted" />}
        <header className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
          <div className="min-w-0"><p className="text-lg font-bold tracking-tight">Notifications</p><p className="mt-0.5 text-xs text-muted-foreground">{unreadCount ? `${unreadCount} new notification${unreadCount === 1 ? "" : "s"}` : "You’re all caught up"}</p></div>
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={onMarkAllRead} disabled={!unreadCount} className="rounded-full px-3 py-2 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-500/10 disabled:opacity-40"><Check className="mr-1 inline h-3.5 w-3.5" />Read all</button>
            <button type="button" onClick={onClose} aria-label="Close notifications" className="rounded-full p-2.5 transition hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="divide-y divide-border/60">
            {notifications.map((notification) => (
              <button type="button" key={notification.id} onClick={() => onOpen(notification.id)} className={`relative flex w-full items-center gap-3 px-5 py-4 text-left transition active:bg-muted/60 ${notification.read ? "hover:bg-muted/40" : "bg-emerald-500/[0.045] hover:bg-emerald-500/[0.08]"}`}>
                {!notification.read && <span className="absolute inset-y-3 left-0 w-0.5 rounded-r-full bg-emerald-500" aria-label="Unread" />}
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-border/70 bg-card shadow-sm"><NotificationVisual notification={notification} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-bold text-foreground">{notification.asset}</span><span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{notification.target}</span></span>
                <span className="flex shrink-0 items-center gap-1.5 text-right"><span><span className="block text-[13px] font-bold tabular-nums text-foreground">{notification.price}</span><span className="mt-0.5 block text-[10px] font-medium text-muted-foreground">{notification.time}</span></span><ChevronRight className="h-4 w-4 text-muted-foreground" /></span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
