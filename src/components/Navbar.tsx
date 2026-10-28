import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import SearchDialog from "@/components/SearchDialog";
import NotificationBell from "@/components/alerts/NotificationBell";
import { getStoredTheme, saveTheme } from "@/lib/themeStorage";
import MobileAccountSheet from "@/components/mobile/MobileAccountSheet";

export const mobileNavLinks = [
  { to: "/", label: "Overview" },
  { to: "/stocks", label: "Stocks" },
  { to: "/funds", label: "MMF" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/treasury", label: "T-Bills" },
  { to: "/rates", label: "FX Rates" },
  { to: "/commodities", label: "Commodities" },
  { to: "/watchlist", label: "Watchlist" },
];

export type MobileNavTitleInfo =
  | { type: "logo" }
  | { type: "title"; title: string }
  | { type: "detail"; title: string; backTo?: string };

export function getMobileNavTitleInfo(pathname: string): MobileNavTitleInfo {
  const cleanPath = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  // 1. Home feed / News home feed keeps the KFF brand logo
  if (!cleanPath || cleanPath === "/" || cleanPath === "/overview" || cleanPath === "/news") {
    return { type: "logo" };
  }

  // 2. Nested sub-pages with back buttons
  if (cleanPath === "/portfolio/summary") {
    return { type: "detail", title: "Summary", backTo: "/portfolio" };
  }
  if (cleanPath.startsWith("/learn/")) {
    return { type: "detail", title: "Learn", backTo: "/learn" };
  }
  if (cleanPath.startsWith("/page/")) {
    const slug = cleanPath.replace("/page/", "");
    const title = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
    return { type: "detail", title, backTo: "/" };
  }
  if (cleanPath === "/privacy" || cleanPath === "/privacy-policy") {
    return { type: "detail", title: "Privacy", backTo: "/" };
  }
  if (cleanPath === "/terms" || cleanPath === "/terms-of-service") {
    return { type: "detail", title: "Terms", backTo: "/" };
  }
  if (cleanPath === "/news/archive" || cleanPath.startsWith("/news/archive/")) {
    return { type: "detail", title: "Archive", backTo: "/news" };
  }

  // 3. Top-level subpages
  switch (cleanPath) {
    case "/stocks":
      return { type: "title", title: "Stocks" };
    case "/funds":
    case "/money-market-funds-kenya":
      return { type: "title", title: "MMFs" };
    case "/portfolio":
      return { type: "title", title: "My Assets" };
    case "/rates":
      return { type: "title", title: "FX Rates" };
    case "/commodities":
      return { type: "title", title: "Commodities" };
    case "/treasury":
    case "/tbills":
    case "/bonds":
      return { type: "title", title: "Treasury Bills" };
    case "/watchlist":
      return { type: "title", title: "My Assets" };
    case "/calculator":
    case "/mmf-calculator":
      return { type: "title", title: "Calculator" };
    case "/compare":
    case "/dev/compare-demo":
      return { type: "title", title: "Compare" };
    case "/alerts":
      return { type: "title", title: "Alerts" };
    case "/learn":
      return { type: "title", title: "Learn" };
    case "/profile":
      return { type: "title", title: "Profile" };
    case "/markets":
      return { type: "title", title: "Markets" };
    case "/admin":
      return { type: "title", title: "Admin" };
    case "/admin/login":
      return { type: "title", title: "Admin Login" };
    default:
      return { type: "logo" };
  }
}

function MobileProfileButton({
  user,
  displayName,
  avatarUrl,
  onClick,
}: {
  user: any;
  displayName: string;
  avatarUrl: string;
  onClick: () => void;
}) {
  const initials = (displayName || user?.email || "MA").slice(0, 2).toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center h-9 w-9 rounded-full text-foreground hover:bg-muted transition-colors relative"
      aria-label={user ? "Open account & settings" : "Sign in to account"}
    >
      <Avatar className="h-8 w-8 border border-emerald-500/40">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName || "User"} /> : null}
        <AvatarFallback className="bg-emerald-600 text-white font-bold text-xs tracking-wider">
          {initials}
        </AvatarFallback>
      </Avatar>
    </button>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
const Navbar = () => {
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileHeaderHeight, setMobileHeaderHeight] = useState(56);
  const [dark, setDark] = useState(() => {
    const saved = getStoredTheme();
    if (saved) return saved === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? true;
  });
  const headerRef = useRef<HTMLElement | null>(null);
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
    saveTheme(dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      if (!getStoredTheme()) setDark(e.matches);
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

  const hasCustomDetailHeader =
    /^\/stocks\/[^/]+/.test(location.pathname) ||
    /^\/compare\/[^/]+/.test(location.pathname) ||
    /^\/funds\/[^/]+/.test(location.pathname);

  if (hasCustomDetailHeader) return null;

  const navTitle = getMobileNavTitleInfo(location.pathname);

  return (
    <>
      <div className="md:hidden">
        <header
          ref={headerRef}
          className="fixed inset-x-0 top-0 z-50 bg-background/95 backdrop-blur-md"
        >
          <nav className="flex h-14 items-center justify-between px-4">
            {/* Left: Dynamic title or KFF logo */}
            <div className="flex items-center min-w-0">
              {navTitle.type === "logo" ? (
                <Link
                  to="/"
                  className="font-mono text-2xl font-black italic tracking-tighter text-emerald-500 dark:text-emerald-400"
                >
                  KFF
                </Link>
              ) : navTitle.type === "detail" ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => (navTitle.backTo ? navigate(navTitle.backTo) : navigate(-1))}
                    className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-muted active:scale-95 transition-all"
                    aria-label="Go back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <span className="truncate text-lg font-bold tracking-tight text-foreground">
                    {navTitle.title}
                  </span>
                </div>
              ) : (
                <span className="truncate text-lg font-bold tracking-tight text-foreground">
                  {navTitle.title}
                </span>
              )}
            </div>

            {/* Right: search, notifications, then profile avatar */}
            <div className="flex items-center gap-1.5">
              <SearchDialog variant="icon" />
              <NotificationBell />
              <MobileProfileButton
                user={user}
                displayName={displayName}
                avatarUrl={avatarUrl}
                onClick={() => setAccountOpen(true)}
              />
            </div>
          </nav>
        </header>
        <div className="h-14" aria-hidden="true" />
      </div>

      <MobileAccountSheet
        open={accountOpen}
        onOpenChange={setAccountOpen}
        user={user}
        displayName={displayName}
        avatarUrl={avatarUrl}
        isAdmin={isAdmin}
        dark={dark}
        setDark={setDark}
        signOut={signOut}
        navigate={navigate}
      />
    </>
  );
};

export default Navbar;
