import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Shield,
  DollarSign,
  Gem,
  Star,
  Calculator,
  Scale,
  BookOpen,
  Bell,
  Sun,
  Moon,
  User,
  X,
  ChevronRight,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getStoredTheme, saveTheme } from "@/lib/themeStorage";
import { isAiLabEnabled } from "@/lib/featureFlags";

interface MobileMoreDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MobileMoreDrawer({ open, onOpenChange }: MobileMoreDrawerProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();

  // Dark mode state
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = getStoredTheme();
    if (stored) return stored === "dark";
    return document.documentElement.classList.contains("dark");
  });

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    const themeStr = nextDark ? "dark" : "light";
    saveTheme(themeStr);
    if (nextDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const close = () => onOpenChange(false);

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const avatarUrl = user?.user_metadata?.avatar_url || "";
  const initials = user
    ? (displayName || user.email || "U").slice(0, 2).toUpperCase()
    : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[28px] border-x border-t border-border bg-background p-0 shadow-2xl [&>button]:hidden"
        aria-label="More navigation and tools"
      >
        {/* Grab handle indicator */}
        <div aria-hidden="true" className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" />

        {/* Header: User / Account info + Close button */}
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-3">
          <SheetHeader className="p-0 text-left">
            <SheetTitle className="text-base font-bold text-foreground">
              More Markets & Tools
            </SheetTitle>
          </SheetHeader>
          <button
            onClick={close}
            type="button"
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable menu body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-5">
          {/* User Profile Banner */}
          {user ? (
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card/60 p-3 shadow-xs">
              <Link to="/profile" onClick={close} className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar className="h-10 w-10 shrink-0 border border-emerald-500/30">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="bg-emerald-600 text-white font-bold text-sm">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">{displayName || "My Account"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0 mr-1" />
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
              <div className="min-w-0 flex-1 pr-3">
                <p className="text-sm font-bold text-foreground">Sign in to sync watchlist</p>
                <p className="text-xs text-muted-foreground">Track custom alerts and portfolios across devices.</p>
              </div>
              <Link
                to="/auth"
                onClick={close}
                className="shrink-0 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}

          {/* Section 1: Markets & Fixed Income */}
          <div>
            <p className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Markets & Fixed Income
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <DrawerTile
                to="/"
                icon={LayoutDashboard}
                title="Market Overview"
                subtitle="Movers & indices"
                active={location.pathname === "/"}
                onClick={close}
              />
              <DrawerTile
                to="/treasury"
                icon={Shield}
                title="T-Bills & Bonds"
                subtitle="CBK auction rates"
                active={location.pathname === "/treasury"}
                onClick={close}
              />
              <DrawerTile
                to="/rates"
                icon={DollarSign}
                title="FX Rates"
                subtitle="USDKES, EUR, GBP"
                active={location.pathname === "/rates"}
                onClick={close}
              />
              <DrawerTile
                to="/commodities"
                icon={Gem}
                title="Commodities"
                subtitle="Gold, Oil, Tea"
                active={location.pathname === "/commodities"}
                onClick={close}
              />
            </div>
          </div>

          {/* Section 2: Tools & Calculators */}
          <div>
            <p className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Tools & Tracking
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <DrawerTile
                to="/watchlist"
                icon={Star}
                title="Watchlist"
                subtitle="Saved assets"
                active={location.pathname === "/watchlist"}
                onClick={close}
              />
              <DrawerTile
                to="/mmf-calculator"
                icon={Calculator}
                title="MMF Calculator"
                subtitle="Compound interest"
                active={location.pathname === "/mmf-calculator" || location.pathname === "/calculator"}
                onClick={close}
              />
              <DrawerTile
                to="/compare"
                icon={Scale}
                title="Compare Funds"
                subtitle="Side-by-side yields"
                active={location.pathname === "/compare"}
                onClick={close}
              />
              <DrawerTile
                to="/alerts"
                icon={Bell}
                title="Price Alerts"
                subtitle="Notifications"
                active={location.pathname === "/alerts"}
                onClick={close}
              />
            </div>
          </div>

          {/* Section 3: Learn & Settings */}
          <div>
            <p className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Learn & Preferences
            </p>
            <div className="space-y-1.5 rounded-2xl border border-border bg-card/60 p-2">
              <Link
                to="/learn"
                onClick={close}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/60 transition-colors"
              >
                <BookOpen className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="flex-1 text-sm font-semibold text-foreground">Investment Guides & FAQ</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              </Link>

              {isAiLabEnabled() && (
                <Link
                  to="/ai-lab"
                  onClick={close}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/60 transition-colors"
                >
                  <Sparkles className="h-4 w-4 text-purple-500 shrink-0" />
                  <span className="flex-1 text-sm font-semibold text-foreground">AI Assistant (Beta)</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                </Link>
              )}

              <button
                type="button"
                onClick={toggleTheme}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted/60 transition-colors"
              >
                {isDark ? (
                  <Sun className="h-4 w-4 text-amber-500 shrink-0" />
                ) : (
                  <Moon className="h-4 w-4 text-blue-500 shrink-0" />
                )}
                <span className="flex-1 text-sm font-semibold text-foreground">
                  Appearance: {isDark ? "Dark Mode" : "Light Mode"}
                </span>
                <span className="text-xs font-bold text-muted-foreground">Switch</span>
              </button>

              {user && (
                <button
                  type="button"
                  onClick={() => {
                    void signOut();
                    close();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-sm font-semibold">Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DrawerTile({
  to,
  icon: Icon,
  title,
  subtitle,
  active,
  onClick,
}: {
  to: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`group flex flex-col justify-between rounded-2xl border p-3.5 text-left transition-all ${
        active
          ? "border-emerald-500/50 bg-emerald-500/10 shadow-xs"
          : "border-border bg-card/60 hover:border-emerald-500/30 hover:bg-card active:scale-[0.98]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
            active
              ? "bg-emerald-500 text-white"
              : "bg-muted text-muted-foreground group-hover:text-emerald-500"
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
      </div>
      <div className="mt-2.5">
        <p className={`text-xs font-bold truncate ${active ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
          {title}
        </p>
        <p className="text-[11px] text-muted-foreground truncate font-medium">
          {subtitle}
        </p>
      </div>
    </Link>
  );
}
