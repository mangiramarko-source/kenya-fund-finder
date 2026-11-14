import { useMemo, useState } from "react";
import {
  Bell,
  CheckCheck,
  Moon,
  RotateCcw,
  Sun,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import type { AppNotification } from "@/components/alerts/NotificationProvider";
import { TopNotificationBanner } from "@/components/alerts/TopNotificationBanner";
import { NotificationAssetVisual } from "@/components/alerts/NotificationAssetVisual";
import { NotificationCard } from "@/components/alerts/NotificationCard";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  notificationCategory,
  notificationPresentation,
  type NotificationCategory,
} from "@/components/alerts/notificationPresentation";

type Theme = "dark" | "light";
type Device = "desktop" | "mobile";
type FilterKey = "all" | NotificationCategory;

const seedNotifications: AppNotification[] = [
  {
    id: "tbill-1",
    user_id: "preview",
    title: "CBK T-Bill Auction Results",
    message: "91d: 15.65% · 182d: 16.50% · 364d: 16.80%.",
    type: "tbill_auction",
    is_read: false,
    created_at: new Date(Date.now() - 2 * 60_000).toISOString(),
    metadata: { rate_91: 15.65, rate_182: 16.5, rate_364: 16.8, route: "/treasury" },
  },
  {
    id: "scom-mover",
    user_id: "preview",
    title: "Safaricom PLC (SCOM) moved +4.65%",
    message: "Safaricom PLC is trading at KES 37.05 (+4.65% today).",
    type: "watchlist_mover",
    is_read: false,
    created_at: new Date(Date.now() - 12 * 60_000).toISOString(),
    assetType: "stock",
    assetName: "Safaricom PLC",
    assetSymbol: "SCOM",
    assetVisualUrl: "/images/stocks/safaricom.png",
    metadata: { asset_type: "stock", symbol: "SCOM", asset_name: "Safaricom PLC", price: 37.05, day_change_percent: 4.65 },
  },
  {
    id: "mmf-shift",
    user_id: "preview",
    title: "Etica MMF yield rose to 17.40%",
    message: "Annual yield moved +35 bps (from 17.05% to 17.40% p.a.).",
    type: "mmf_yield_shift",
    is_read: false,
    created_at: new Date(Date.now() - 45 * 60_000).toISOString(),
    assetType: "fund",
    assetName: "Etica Money Market Fund",
    metadata: { asset_type: "fund", slug: "etica-sh-mmf", asset_name: "Etica Money Market Fund", annual_yield: 17.4, delta_bps: 35 },
  },
  {
    id: "portfolio",
    user_id: "preview",
    title: "Portfolio up today",
    message: "Your comparable holdings moved +KES 10,000.00 (+10.00%).",
    type: "portfolio_daily",
    is_read: false,
    created_at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    metadata: { opening_value: 100000, closing_value: 110000, change: 10000, percent_change: 10 },
  },
  {
    id: "absa",
    user_id: "preview",
    title: "Price alert: Absa Bank Kenya",
    message: "Absa Bank Kenya is now KES 15.10, meeting your above KES 15.00 alert.",
    type: "price_alert",
    is_read: true,
    created_at: new Date(Date.now() - 5 * 3_600_000).toISOString(),
    assetType: "stock",
    assetName: "Absa Bank Kenya",
    assetSymbol: "ABSA",
    assetVisualUrl: "https://caawgzuofnujrznwbuxk.supabase.co/storage/v1/object/public/market-logos/stocks/ABSA-provided-v3.webp",
    metadata: { asset_type: "stock", condition: "above", target_price: 15, triggered_price: 15.1 },
  },
  {
    id: "market-close",
    user_id: "preview",
    title: "NSE Market Close Brief",
    message: "24 gainers · 11 losers · USD/KES 129.40",
    type: "market_close_brief",
    is_read: true,
    created_at: new Date(Date.now() - 24 * 3_600_000).toISOString(),
    metadata: { breadth_direction: "bullish", gainers_count: 24, losers_count: 11, usd_rate: 129.4 },
  },
  {
    id: "admin-1",
    user_id: "preview",
    title: "New Infrastructure Bond Guide Live",
    message: "Compare tax-free IFB yields against top KES Money Market Funds.",
    type: "admin_broadcast",
    is_read: true,
    created_at: new Date(Date.now() - 48 * 3_600_000).toISOString(),
    metadata: { route: "/updates" },
  },
];

export default function DevNotificationPreviewPage() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [device, setDevice] = useState<Device>("desktop");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bannerOpen, setBannerOpen] = useState(true);
  const [activeBannerId, setActiveBannerId] = useState<string>("tbill-1");
  const [notifications, setNotifications] = useState<AppNotification[]>(seedNotifications);
  const [filter, setFilter] = useState<FilterKey>("all");

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  );

  if (!import.meta.env.DEV) return null;

  const activeBanner = bannerOpen
    ? notifications.find((item) => item.id === activeBannerId) ?? notifications[0] ?? null
    : null;

  const markAllRead = () => setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
  const clearAll = () => {
    setNotifications([]);
    setBannerOpen(false);
  };
  const openNotification = (id: string) =>
    setNotifications((items) => items.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
  const triggerSample = (id: string) => {
    setActiveBannerId(id);
    setBannerOpen(true);
  };
  const reset = () => {
    setNotifications(seedNotifications);
    setActiveBannerId("tbill-1");
    setBannerOpen(true);
    setDrawerOpen(false);
    setFilter("all");
  };

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-muted/40 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Development preview</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Top Glassmorphic Notification Bar &amp; Center</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Preview the floating top drop-down pop-up covering the navbar across all 7 verified notification types.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PreviewButton active={theme === "dark"} onClick={() => setTheme("dark")} label="Dark"><Moon className="h-3.5 w-3.5" /> Dark</PreviewButton>
            <PreviewButton active={theme === "light"} onClick={() => setTheme("light")} label="Light"><Sun className="h-3.5 w-3.5" /> Light</PreviewButton>
            <PreviewButton active={device === "desktop"} onClick={() => setDevice("desktop")} label="Desktop">Desktop</PreviewButton>
            <PreviewButton active={device === "mobile"} onClick={() => setDevice("mobile")} label="Mobile">Mobile</PreviewButton>
            <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold transition hover:bg-muted"><RotateCcw className="h-3.5 w-3.5" /> Reset</button>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className={`mx-auto w-full overflow-hidden rounded-[30px] border border-slate-700/80 bg-slate-950 shadow-2xl ${device === "mobile" ? "max-w-[390px]" : "max-w-[1000px]"}`}>
            <div className={theme === "dark" ? "dark" : ""}>
              <PreviewFrame
                device={device}
                drawerOpen={drawerOpen}
                setDrawerOpen={setDrawerOpen}
                activeBanner={activeBanner}
                onDismissBanner={() => setBannerOpen(false)}
                notifications={notifications}
                unreadCount={unreadCount}
                filter={filter}
                setFilter={setFilter}
                onMarkAllRead={markAllRead}
                onClearAll={clearAll}
                onOpenNotification={openNotification}
              />
            </div>
          </div>

          <aside className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Trigger Top Pop-Up</p>
            <div className="mt-3 space-y-2">
              {seedNotifications.map((sample) => {
                const details = notificationPresentation(sample);
                return (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => triggerSample(sample.id)}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                      bannerOpen && activeBanner?.id === sample.id
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                      {details.categoryBadgeLabel}
                    </span>
                    <span className="mt-0.5 block truncate text-foreground">{details.headline}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="mt-2 w-full rounded-xl bg-emerald-600 px-3 py-2.5 text-left text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Open notification centre
              </button>
            </div>
            <div className="mt-5 space-y-2.5 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
              <p><strong className="text-foreground">Top Drop-Down:</strong> floats over the top navbar, pauses 6s timer on hover, and supports swipe-up dismissal on mobile.</p>
              <p><strong className="text-foreground">+N more badge:</strong> tapping it dismisses the pop-up and opens the filtered notification centre.</p>
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
  device,
  drawerOpen,
  setDrawerOpen,
  activeBanner,
  onDismissBanner,
  notifications,
  unreadCount,
  filter,
  setFilter,
  onMarkAllRead,
  onClearAll,
  onOpenNotification,
}: {
  device: Device;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  activeBanner: AppNotification | null;
  onDismissBanner: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  filter: FilterKey;
  setFilter: (filter: FilterKey) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onOpenNotification: (id: string) => void;
}) {
  const isViewportMobile = useIsMobile();
  const isMobile = device === "mobile";
  const isCompact = isMobile || isViewportMobile;

  return (
    <div className={`relative min-h-[670px] overflow-hidden bg-background text-foreground ${isMobile ? "min-h-[760px]" : ""}`}>
      <header className="flex h-16 items-center justify-between border-b border-border bg-background px-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500 text-sm font-black text-slate-950">K</span>
          <div>
            <p className="text-sm font-bold leading-none">Kenya Fund Finder</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Markets, made clear</p>
          </div>
        </div>
        {isMobile ? (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={`Open notifications, ${unreadCount} unread`}
            className="relative grid h-10 w-10 place-items-center rounded-full border border-border/80 bg-muted/60 text-foreground transition hover:bg-muted"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground shadow-sm">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={`Open notifications, ${unreadCount} unread`}
            className="relative grid h-9 w-9 place-items-center rounded-full text-foreground transition hover:bg-muted"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold leading-none text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        )}
      </header>

      <TopNotificationBanner
        contained
        compact={isCompact}
        durationMs={0}
        notification={activeBanner}
        unreadCount={unreadCount}
        onDismiss={onDismissBanner}
        onView={(item) => {
          onOpenNotification(item.id);
          onDismissBanner();
        }}
        onOpenDrawer={() => setDrawerOpen(true)}
      />

      <div className="p-5 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-500">Overview</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">Your market dashboard</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Metric label="91-Day T-Bill Yield" value="15.65%" delta="CBK Weekly Auction" />
          <Metric label="Portfolio movement" value="+KES 10,000" delta="+10.00% today" />
        </div>
        <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-sm font-semibold">Automated Market &amp; Portfolio Signals</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tracking your watchlist movers, MMF yield shifts, CBK T-Bill auctions, and daily market close.
          </p>
        </div>
      </div>

      {drawerOpen && (
        <NotificationDrawer
          device={device}
          notifications={notifications}
          unreadCount={unreadCount}
          filter={filter}
          setFilter={setFilter}
          onClose={() => setDrawerOpen(false)}
          onMarkAllRead={onMarkAllRead}
          onClearAll={onClearAll}
          onOpen={onOpenNotification}
        />
      )}
    </div>
  );
}

function Metric({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-500">
        <TrendingUp className="h-3.5 w-3.5" />{delta}
      </p>
    </div>
  );
}

function NotificationDrawer({
  device,
  notifications,
  unreadCount,
  filter,
  setFilter,
  onClose,
  onMarkAllRead,
  onClearAll,
  onOpen,
}: {
  device: Device;
  notifications: AppNotification[];
  unreadCount: number;
  filter: FilterKey;
  setFilter: (filter: FilterKey) => void;
  onClose: () => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onOpen: (id: string) => void;
}) {
  const mobile = device === "mobile";
  const filtered = filter === "all" ? notifications : notifications.filter((n) => notificationCategory(n.type) === filter);

  return (
    <div className="absolute inset-0 z-30 bg-slate-950/35" onClick={onClose} role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Notification centre"
        onClick={(event) => event.stopPropagation()}
        className={`absolute flex flex-col overflow-hidden bg-background shadow-2xl ${
          mobile ? "inset-x-0 bottom-0 max-h-[78%] rounded-t-[28px] border-t border-border" : "right-0 top-0 h-full w-[420px] border-l border-border"
        }`}
      >
        {mobile && <div className="mx-auto mt-3 h-1.5 w-11 shrink-0 rounded-full bg-muted" />}
        <header className="flex items-center justify-between gap-2 border-b border-border/70 px-5 py-4">
          <div className="min-w-0">
            <p className="text-lg font-bold tracking-tight">Notifications</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {unreadCount ? `${unreadCount} new notification${unreadCount === 1 ? "" : "s"}` : "You’re all caught up"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {unreadCount > 0 && (
              <button type="button" onClick={onMarkAllRead} className="rounded-full px-2.5 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/10 transition">
                <CheckCheck className="mr-1 inline h-3.5 w-3.5" />Read all
              </button>
            )}
            {notifications.length > 0 && (
              <button type="button" onClick={onClearAll} className="rounded-full px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition">
                <Trash2 className="mr-1 inline h-3.5 w-3.5" />Clear all
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close notifications" className="rounded-full p-2 transition hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>
        {notifications.length > 0 && (
          <div className="flex items-center gap-1.5 border-b border-border/60 px-4 py-2 overflow-x-auto">
            {(["all", "alerts", "portfolio", "market"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize transition ${
                  filter === key ? "border-foreground bg-foreground text-background" : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {key}
              </button>
            ))}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-2.5 p-3 sm:p-4">
            {filtered.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onOpen={() => onOpen(notification.id)}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
