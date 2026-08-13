import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Menu, TrendingUp, BarChart3, Newspaper, Moon, Sun, User, LogOut, Shield, Settings, Info, Mail, Scale, FileText, LineChart, Bell, Landmark, Calculator, ArrowLeft, GraduationCap, Sparkles, X, ChevronRight, Star, Wallet, BarChart2, DollarSign, Tag, BookOpen, CalendarDays, HelpCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import SearchDialog from "@/components/SearchDialog";
import NotificationBell from "@/components/alerts/NotificationBell";
import CurrencyTicker from "@/components/CurrencyTicker";

const navLinks = [
  { to: "/", label: "Home", icon: BarChart3 },
  { to: "/stocks", label: "Stocks", icon: TrendingUp },
  { to: "/markets", label: "Market", icon: LineChart },
];

const mobileNavLinks = [
  { to: "/", label: "Overview" },
  { to: "/stocks", label: "Stocks" },
  { to: "/funds", label: "MMF" },
  { to: "/rates", label: "Fx rates" },
  { to: "/commodities", label: "Commodities" },
  { to: "/portfolio", label: "Portfolio" },
];

// ─── NSE Live Widget ────────────────────────────────────────────────────────
interface IndexItem {
  label: string;
  value: number;
  change: number; // percent
}

function useNseIndices(): { indices: IndexItem[]; isOpen: boolean } {
  const [indices, setIndices] = useState<IndexItem[]>([
    { label: "NSE 20 Share", value: 1742.5, change: 0.62 },
    { label: "NASI (All Share)", value: 104.8, change: 0.41 },
    { label: "NSE 25 Index", value: 2850.1, change: 1.15 },
  ]);

  // Derive market open: Mon–Fri 09:00–15:00 EAT (UTC+3)
  const isOpen = (() => {
    const now = new Date();
    const eat = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Nairobi" }));
    const day = eat.getDay();
    const h = eat.getHours();
    return day >= 1 && day <= 5 && h >= 9 && h < 15;
  })();

  return { indices, isOpen };
}

function NseLiveWidget() {
  const { indices, isOpen } = useNseIndices();
  return (
    <div className="px-4 py-3 border-b border-border">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${isOpen ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">NSE LIVE</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          isOpen
            ? "text-emerald-600 border-emerald-400/60 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400"
            : "text-muted-foreground border-border bg-muted/40"
        }`}>{isOpen ? "Open" : "Closed"}</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {indices.map((idx) => (
          <div key={idx.label} className="rounded-lg bg-muted/50 px-2 py-2">
            <p className="text-[9px] text-muted-foreground font-medium leading-tight mb-0.5">{idx.label}</p>
            <p className="text-[12px] font-bold tabular-nums text-foreground">{idx.value.toLocaleString()}</p>
            <p className={`text-[10px] font-semibold ${
              idx.change > 0 ? "text-emerald-500" : idx.change < 0 ? "text-destructive" : "text-muted-foreground"
            }`}>{idx.change >= 0 ? "+" : ""}{idx.change.toFixed(2)}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sidebar Row ─────────────────────────────────────────────────────────────
function SidebarRow({
  icon: Icon,
  label,
  to,
  onClick,
  badge,
  isNew,
  isDestructive,
}: {
  icon: React.ElementType;
  label: string;
  to?: string;
  onClick?: () => void;
  badge?: number | null;
  isNew?: boolean;
  isDestructive?: boolean;
}) {
  const inner = (
    <>
      <span className={`flex items-center justify-center h-8 w-8 rounded-lg shrink-0 ${
        isDestructive ? "bg-destructive/10" : "bg-muted"
      }`}>
        <Icon className={`h-4 w-4 ${isDestructive ? "text-destructive" : "text-foreground/70"}`} />
      </span>
      <span className={`flex-1 text-sm font-medium ${
        isDestructive ? "text-destructive" : "text-foreground"
      }`}>{label}</span>
      {isNew && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">New</span>
      )}
      {badge != null && badge > 0 && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">{badge}</span>
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
    </>
  );

  const cls = "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-muted/70 active:bg-muted transition-colors";

  if (to) {
    return <Link to={to} onClick={onClick} className={cls}>{inner}</Link>;
  }
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pt-3 pb-1">
      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

// ─── Main Mobile Sidebar Drawer ──────────────────────────────────────────────
function MobileSidebarDrawer({
  open,
  onClose,
  user,
  displayName,
  avatarUrl,
  isAdmin,
  dark,
  setDark,
  signOut,
  navigate,
}: {
  open: boolean;
  onClose: () => void;
  user: any;
  displayName: string;
  avatarUrl: string;
  isAdmin: boolean;
  dark: boolean;
  setDark: (v: boolean) => void;
  signOut: () => Promise<void>;
  navigate: (to: string) => void;
}) {
  // Watchlist count from localStorage
  const [watchlistCount, setWatchlistCount] = useState(0);
  useEffect(() => {
    const refresh = () => {
      try {
        const raw = localStorage.getItem("kf_local_watchlist");
        if (!raw) { setWatchlistCount(0); return; }
        const parsed = JSON.parse(raw);
        setWatchlistCount(Array.isArray(parsed) ? parsed.length : 0);
      } catch { setWatchlistCount(0); }
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("kff:portfolio:changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("kff:portfolio:changed", refresh);
    };
  }, []);

  const close = () => onClose();

  const initials = user
    ? (displayName || user.email || "U").slice(0, 2).toUpperCase()
    : "";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && close()}>
      <SheetContent
        side="right"
        className="w-[300px] p-0 flex flex-col bg-background border-l border-border"
        aria-label="Navigation menu"
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          {user ? (
            <>
              <Avatar className="h-11 w-11 shrink-0">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="bg-emerald-500 text-white font-bold text-sm">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-foreground">{displayName || "User"}</p>
                <p className="text-[11px] text-muted-foreground truncate">Free plan · Nairobi</p>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">Guest</p>
                <p className="text-[11px] text-muted-foreground">Sign in to unlock all features</p>
              </div>
            </>
          )}
          <button
            onClick={close}
            aria-label="Close menu"
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted hover:bg-muted/70 transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* ── NSE Live Widget ── */}
        <NseLiveWidget />

        {/* ── Scrollable Content ── */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2">

          <SidebarSection title="Markets">
            <SidebarRow icon={TrendingUp}  label="NSE Stocks"  to="/stocks"      onClick={close} />
            <SidebarRow icon={BarChart2}   label="Unit Trusts" to="/funds"       onClick={close} />
            <SidebarRow icon={DollarSign}  label="FX Rates"    to="/rates"       onClick={close} />
            <SidebarRow icon={Package}     label="Commodities" to="/commodities" onClick={close} />
          </SidebarSection>

          <div className="h-px bg-border mx-3 my-1" />

          <SidebarSection title="My Space">
            <SidebarRow icon={Wallet}      label="Portfolio"  to="/portfolio"   onClick={close} />
            <SidebarRow icon={Star}        label="Watchlist"  to="/watchlist"   onClick={close} badge={watchlistCount || null} />
          </SidebarSection>

          <div className="h-px bg-border mx-3 my-1" />

          <SidebarSection title="Discover">
            <SidebarRow icon={Sparkles}    label="AI Lab"          to="/ai-lab"    onClick={close} isNew />
            <SidebarRow icon={Newspaper}   label="Market News"     to="/news"      onClick={close} />
            <SidebarRow icon={BookOpen}    label="Learn & Academy" to="/learn"     onClick={close} />
            <SidebarRow icon={Calculator}  label="Calculators"     to="/calculator" onClick={close} />
            <SidebarRow icon={CalendarDays} label="Alerts"         to={user ? "/alerts" : "/auth"} onClick={close} />
          </SidebarSection>

          <div className="h-px bg-border mx-3 my-1" />

          <SidebarSection title="Account">
            {user && (
              <SidebarRow icon={Settings} label="Settings" to="/profile" onClick={close} />
            )}
            <SidebarRow
              icon={dark ? Sun : Moon}
              label={dark ? "Light Mode" : "Dark Mode"}
              onClick={() => setDark(!dark)}
            />
            <SidebarRow icon={HelpCircle} label="Help & Support" to="/page/contact" onClick={close} />
            {isAdmin && (
              <SidebarRow icon={Shield} label="Admin Panel" to="/admin" onClick={close} />
            )}
          </SidebarSection>

        </nav>

        {/* ── Fixed Bottom CTA ── */}
        <div className="p-4 border-t border-border shrink-0">
          {user ? (
            <button
              onClick={async () => { await signOut(); close(); navigate("/"); }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive/10 py-3.5 text-sm font-bold text-destructive hover:bg-destructive/20 transition-colors"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          ) : (
            <Link
              to="/auth"
              onClick={close}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-white hover:bg-emerald-600 transition-colors"
            >
              <User className="h-4 w-4" /> Sign In / Sign Up
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileHeaderHeight, setMobileHeaderHeight] = useState(156);
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const headerRef = useRef<HTMLElement | null>(null);
  const mobileTabsScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileTabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [avatarUrl, setAvatarUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("avatar_url, display_name")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setAvatarUrl(data.avatar_url || "");
            setDisplayName(data.display_name || "");
          }
        });
    } else {
      setAvatarUrl("");
      setDisplayName("");
    }
  }, [user]);

  const themeInitial = useRef(true);
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    if (themeInitial.current) {
      themeInitial.current = false;
      return;
    }
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) setDark(e.matches);
    };
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const activeEl = mobileTabRefs.current[location.pathname];
    const container = mobileTabsScrollRef.current;
    if (!activeEl || !container) return;
    const elRect = activeEl.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const offset =
      activeEl.offsetLeft - container.offsetLeft - (containerRect.width / 2) + (elRect.width / 2);
    container.scrollTo({ left: Math.max(0, offset), behavior: "smooth" });
  }, [location.pathname]);

  useEffect(() => {
    const element = headerRef.current;
    if (!element) return;
    const updateHeight = () => {
      const h = element.getBoundingClientRect().height;
      setMobileHeaderHeight(h);
      document.documentElement.style.setProperty("--kf-mobile-header", `${Math.round(h)}px`);
    };
    updateHeight();
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(updateHeight)
      : null;
    observer?.observe(element);
    window.addEventListener("resize", updateHeight);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  const closeMobile = () => setOpen(false);

  const minimalRoutes = [
    "/calculator",
    "/learn",
    "/alerts",
    "/profile",
    "/privacy",
    "/terms",
    "/admin",
    "/page/",
  ];
  const detailRoutePatterns = [
    /^\/stocks\/[^/]+/,
    /^\/compare\/[^/]+/,
    /^\/funds\/[^/]+/,
  ];
  const isDetailPage = detailRoutePatterns.some((re) => re.test(location.pathname));
  const hasCustomDetailHeader = /^\/stocks\/[^/]+/.test(location.pathname) || /^\/compare\/[^/]+/.test(location.pathname);
  const isMinimal = isDetailPage || minimalRoutes.some((p) => location.pathname.startsWith(p));

  if (hasCustomDetailHeader) return null;

  const sidebarProps = {
    open,
    onClose: closeMobile,
    user,
    displayName,
    avatarUrl,
    isAdmin,
    dark,
    setDark,
    signOut,
    navigate,
  };

  if (isMinimal) {
    return (
      <>
        <header
          ref={headerRef}
          className="md:hidden fixed inset-x-0 top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border"
        >
          <div className="container flex h-16 items-center justify-between">
            {isDetailPage ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="rounded-full h-9 px-2 gap-1.5 text-foreground hover:bg-muted"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="text-sm font-medium">Back</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="rounded-full h-9 px-2 gap-1.5 text-foreground hover:bg-muted"
                aria-label="Go home"
              >
                <BarChart3 className="h-5 w-5" />
                <span className="text-sm font-medium">Home</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(true)}
              className="rounded-full h-9 w-9 text-foreground hover:bg-muted"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </header>
        <div className="md:hidden h-16" aria-hidden="true" />
        <MobileSidebarDrawer {...sidebarProps} />
      </>
    );
  }

  return (
    <>
    <header
      ref={headerRef}
      className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md"
    >
      <nav className="flex h-14 items-center justify-between px-4">
        {/* Left: Search */}
        <SearchDialog variant="icon" />

        {/* Center: KFF Logo */}
        <Link to="/" className="font-mono text-xl font-black italic tracking-tighter text-emerald-500 dark:text-emerald-400">
          KFF
        </Link>

        {/* Right: Hamburger */}
        <button
          onClick={() => setOpen(true)}
          className="grid size-9 place-items-center rounded-md"
          aria-label="Open menu"
        >
          <Menu className="size-5 text-foreground" />
        </button>
      </nav>

      {/* Full-width scrollable tab bar */}
      <div className="no-scrollbar flex overflow-x-auto border-b border-border px-4">
        <div ref={mobileTabsScrollRef} className="flex shrink-0 gap-6 py-3">
          {mobileNavLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                ref={(el) => { mobileTabRefs.current[link.to] = el; }}
                onClick={(e) => {
                  e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                }}
                className={`relative whitespace-nowrap text-sm font-medium transition-colors ${
                  isActive
                    ? "text-emerald-500 dark:text-emerald-400 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute -bottom-3 left-0 h-0.5 w-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {location.pathname === '/' && <CurrencyTicker />}
    </header>

    <MobileSidebarDrawer {...sidebarProps} />
    </>
  );
};

export default Navbar;
