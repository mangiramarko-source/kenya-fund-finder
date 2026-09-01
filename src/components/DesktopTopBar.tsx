import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { 
  Moon, Sun, User, LogOut, Shield, Settings, Bell, 
  TrendingUp, Sparkles, Briefcase, Calculator, GraduationCap, Star,
  FileText, Scale, ChevronRight, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import SearchDialog from "@/components/SearchDialog";
import NotificationBell from "@/components/alerts/NotificationBell";

function AccountDrawerRow({ icon: Icon, label, tone, onClick }: { icon: React.ElementType; label: string; tone?: "accent" | "destructive"; onClick: () => void }) {
  const iconClass = tone === "destructive" ? "text-destructive" : tone === "accent" ? "text-emerald-600" : "text-foreground/70";
  const labelClass = tone === "destructive" ? "text-destructive" : tone === "accent" ? "text-emerald-600" : "text-foreground";
  return <button type="button" onClick={onClick} className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left transition-colors hover:bg-muted/60 active:bg-muted">
    <Icon className={`h-5 w-5 shrink-0 stroke-[1.8] ${iconClass}`} />
    <span className={`flex-1 text-[15px] font-bold tracking-tight ${labelClass}`}>{label}</span>
    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 stroke-[2]" />
  </button>;
}

function AccountDrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="pb-1 pt-3.5"><p className="px-4 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">{title}</p><div className="space-y-0.5">{children}</div></div>;
}

const DesktopTopBar = () => {
  const [avatarUrl, setAvatarUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") return true;
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? true;
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (dark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    if (isInitialMount.current) {
      isInitialMount.current = false;
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
    if (user) {
      supabase.from("profiles").select("avatar_url, display_name").eq("user_id", user.id).maybeSingle()
        .then(({ data }) => {
          if (data) { setAvatarUrl(data.avatar_url || ""); setDisplayName(data.display_name || ""); }
        });
    } else { setAvatarUrl(""); setDisplayName(""); }
  }, [user]);

  const handleSignOut = async () => { await signOut(); navigate("/"); };
  const closeAndNavigate = (to: string) => { setAccountOpen(false); navigate(to); };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/funds") {
      return location.pathname.startsWith("/funds") || /^\/compare\/[^/]+\/?$/.test(location.pathname);
    }
    if (path === "/treasury") {
      return location.pathname.startsWith("/treasury") || location.pathname.startsWith("/tbills") || location.pathname.startsWith("/bonds");
    }
    return location.pathname.startsWith(path);
  };

  const NAV_LINKS = [
    { to: "/", label: "Overview" },
    { to: "/ai-lab", label: "AI Lab" },
    { to: "/stocks", label: "Stocks" },
    { to: "/funds", label: "MMF" },
    { to: "/treasury", label: "T-Bills" },
    { to: "/rates", label: "FX Rates" },
    { to: "/commodities", label: "Commodities" },
    { to: "/portfolio", label: "Portfolio" },
    { to: "/watchlist", label: "Watchlist" },
    { to: "/calculator", label: "Calculator" },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 hidden h-14 max-w-full items-center gap-2 overflow-x-clip border-b border-border bg-card/95 px-4 backdrop-blur-md md:flex lg:gap-4 lg:px-6 xl:gap-6">
      {/* 1. Logo */}
      <Link to="/" className="flex items-center shrink-0 mr-1 lg:mr-2 group" aria-label="KenyaFundFinder Home">
        <span className="font-mono text-2xl font-black italic tracking-tighter text-emerald-500 dark:text-emerald-400 transition-transform group-hover:scale-105">
          KFF
        </span>
      </Link>

      {/* 2. Main Navigation Links */}
      <nav className="flex items-center gap-0.5 lg:gap-1 shrink-0 h-full">
        {NAV_LINKS.map(({ to, label }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={`relative flex items-center h-full px-2 lg:px-3 text-[12px] lg:text-[13px] font-bold transition-colors whitespace-nowrap ${
                active
                  ? "text-emerald-500 dark:text-emerald-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{label}</span>
              {active && (
                <span className="absolute bottom-0 left-1.5 right-1.5 h-[2.5px] rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* 3. Search and Actions */}
      <div className="flex items-center gap-2 lg:gap-3 ml-auto shrink min-w-0">
        <div className="w-36 md:w-44 lg:w-60 xl:w-72 shrink min-w-0">
          <SearchDialog variant="topbar" />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDark(!dark)}
          className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <NotificationBell />

        {/* 4. User account drawer */}
        <div className="flex items-center ml-1 shrink-0">
          <button type="button" onClick={() => setAccountOpen(true)} className="rounded-full ring-2 ring-transparent transition-all hover:ring-border" aria-label={user ? `Open account menu for ${displayName || user.email || "your account"}` : "Open account menu"}>
            <Avatar className="h-8 w-8 border border-border bg-muted">
              {user ? <><AvatarImage src={avatarUrl} alt={displayName || user.email || ""} /><AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">{(displayName || user.email || "U").slice(0, 2).toUpperCase()}</AvatarFallback></> : <AvatarFallback className="bg-transparent text-muted-foreground"><User className="h-4 w-4" /></AvatarFallback>}
            </Avatar>
          </button>
          <Sheet open={accountOpen} onOpenChange={setAccountOpen}>
            <SheetContent side="right" className="inset-y-0 right-0 left-auto flex h-full w-[400px] max-w-[92vw] flex-col rounded-none border-l border-t-0 bg-background p-0 [&>button]:hidden">
              <div className="flex items-center gap-3.5 border-b border-border/80 px-5 py-3">
                {user ? <><Avatar className="h-11 w-11 shrink-0 border border-emerald-500/30"><AvatarImage src={avatarUrl} alt={displayName || user.email || ""} /><AvatarFallback className="bg-emerald-600 text-base font-extrabold text-white">{(displayName || user.email || "U").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><SheetTitle className="truncate text-base font-bold leading-snug">{displayName || "User"}</SheetTitle><p className="truncate text-xs font-medium text-muted-foreground">{user.email}</p></div></> : <><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-base font-extrabold text-white">KFF</div><div className="min-w-0 flex-1"><SheetTitle className="text-base font-bold leading-snug">Welcome</SheetTitle><p className="text-xs font-medium text-muted-foreground">Sign in to personalise KFF</p></div></>}
                <button onClick={() => setAccountOpen(false)} aria-label="Close account menu" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/70 transition-colors hover:bg-muted"><X className="h-4 w-4 text-muted-foreground stroke-[2.5]" /></button>
              </div>
              {user ? <nav className="flex-1 overflow-y-auto px-2 pb-4"><AccountDrawerSection title="TOOLS"><AccountDrawerRow icon={Sparkles} label="AI Lab" tone="accent" onClick={() => closeAndNavigate("/ai-lab")} /><AccountDrawerRow icon={Briefcase} label="Portfolio" onClick={() => closeAndNavigate("/portfolio")} /><AccountDrawerRow icon={Star} label="Watchlist" onClick={() => closeAndNavigate("/watchlist")} /><AccountDrawerRow icon={Calculator} label="Calculator" onClick={() => closeAndNavigate("/calculator")} /><AccountDrawerRow icon={GraduationCap} label="Learn" onClick={() => closeAndNavigate("/learn")} />{isAdmin && <AccountDrawerRow icon={Shield} label="Admin Panel" tone="accent" onClick={() => closeAndNavigate("/admin")} />}</AccountDrawerSection><div className="mx-4 my-1 h-px bg-border/60" /><AccountDrawerSection title="ACCOUNT"><AccountDrawerRow icon={Bell} label="My Alerts" onClick={() => closeAndNavigate("/alerts")} /><AccountDrawerRow icon={Settings} label="Profile Settings" onClick={() => closeAndNavigate("/profile")} /></AccountDrawerSection><div className="mx-4 my-1 h-px bg-border/60" /><AccountDrawerSection title="LEGAL"><AccountDrawerRow icon={FileText} label="Privacy Policy" onClick={() => closeAndNavigate("/privacy")} /><AccountDrawerRow icon={Scale} label="Terms of Use" onClick={() => closeAndNavigate("/terms")} /></AccountDrawerSection></nav> : <div className="flex-1 px-5 py-8"><p className="text-sm text-muted-foreground">Sign in to manage alerts, your portfolio, and account settings.</p></div>}
              <div className="shrink-0 border-t border-border/80 bg-background p-4">{user ? <button onClick={async () => { setAccountOpen(false); await handleSignOut(); }} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive/10 py-3.5 text-sm font-bold text-destructive transition-colors hover:bg-destructive/20"><LogOut className="h-4 w-4" /> Sign Out</button> : <button onClick={() => closeAndNavigate("/auth")} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"><User className="h-4 w-4" /> Sign In / Sign Up</button>}</div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default DesktopTopBar;
