import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import SearchDialog from "@/components/SearchDialog";
import NotificationBell from "@/components/alerts/NotificationBell";
import { getStoredTheme, saveTheme } from "@/lib/themeStorage";
import MobileAccountSheet from "@/components/mobile/MobileAccountSheet";
import { sanitizeAvatarUrl } from "@/lib/safeImageUpload";

export const mobileNavLinks = [
  { to: "/", label: "Overview" },
  { to: "/stocks", label: "Stocks" },
  { to: "/funds", label: "MMF" },
  { to: "/savings", label: "Savings" },
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
    case "/savings":
    case "/fixed-deposits":
    case "/saccos":
      return { type: "title", title: "T-Bills / Banking / SACCOs" };
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
  if (!user) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-emerald-500/40 dark:border-emerald-500/45 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/25 transition-colors shrink-0 shadow-2xs dark:shadow-[0_0_8px_rgba(16,185,129,0.15)]"
        aria-label="Open account & settings"
      >
        <User className="h-4 w-4" />
      </button>
    );
  }

  const initials = (displayName || user.email || "U").slice(0, 2).toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center h-8 w-8 rounded-full text-foreground hover:bg-muted transition-colors relative shrink-0"
      aria-label="Open account & settings"
    >
      <Avatar className="h-8 w-8 border border-emerald-500/40 dark:border-emerald-400/50 shadow-2xs dark:shadow-[0_0_8px_rgba(16,185,129,0.2)]">
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
            setAvatarUrl(sanitizeAvatarUrl(data.avatar_url));
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

  const cleanPath = location.pathname.length > 1 && location.pathname.endsWith("/") ? location.pathname.slice(0, -1) : location.pathname;
  const isFeedPage = cleanPath === "" || cleanPath === "/" || cleanPath === "/overview" || cleanPath === "/news";
  const [newsScrolledPast, setNewsScrolledPast] = useState(false);

  useEffect(() => {
    if (!isFeedPage) {
      setNewsScrolledPast(false);
      return;
    }

    if (typeof window === "undefined") return;

    let observer: IntersectionObserver | null = null;

    const checkHeaderPosition = () => {
      const target = document.getElementById("market-news-header");
      if (target) {
        const rect = target.getBoundingClientRect();
        const headerBottom = headerRef.current ? headerRef.current.getBoundingClientRect().bottom : 56;
        const threshold = headerBottom > 0 ? headerBottom : 56;
        const isPast = rect.bottom <= threshold;
        setNewsScrolledPast((prev) => (prev !== isPast ? isPast : prev));
      }
    };

    // Passive scroll listener: 100% reliable in all browser engines and inside iframes
    window.addEventListener("scroll", checkHeaderPosition, { passive: true });
    checkHeaderPosition();
    const rafId = requestAnimationFrame(checkHeaderPosition);

    // Also observe with IntersectionObserver if supported
    const target = document.getElementById("market-news-header");
    if (target && typeof IntersectionObserver !== "undefined") {
      try {
        observer = new IntersectionObserver(
          ([entry]) => {
            const headerBottom = headerRef.current ? headerRef.current.getBoundingClientRect().bottom : 56;
            const threshold = headerBottom > 0 ? headerBottom : 56;
            const isPast = !entry.isIntersecting && entry.boundingClientRect.bottom <= threshold;
            setNewsScrolledPast((prev) => (prev !== isPast ? isPast : prev));
          },
          {
            rootMargin: "-56px 0px 0px 0px",
            threshold: 0,
          }
        );
        observer.observe(target);
      } catch {
        // Fallback already active via scroll listener
      }
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", checkHeaderPosition);
      observer?.disconnect();
    };
  }, [isFeedPage, location.pathname]);

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
          className={`fixed inset-x-0 top-0 z-50 bg-background/95 backdrop-blur-md pt-safe transition-colors ${
            isFeedPage && newsScrolledPast ? "border-b-0" : "border-b border-border/50"
          }`}
        >
          <nav className="flex h-14 items-center px-3">
            {navTitle.type === "detail" ? (
              <div className="flex h-full w-full items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => (navTitle.backTo ? navigate(navTitle.backTo) : navigate(-1))}
                    className="-ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-muted active:scale-95 transition-all"
                    aria-label="Go back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <span className="truncate text-base font-bold tracking-tight text-foreground">
                    {navTitle.title}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <SearchDialog variant="icon" />
                  <NotificationBell />
                  <MobileProfileButton
                    user={user}
                    displayName={displayName}
                    avatarUrl={avatarUrl}
                    onClick={() => setAccountOpen(true)}
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-between">
                {/* 1. Far left: Brand mascot logo OR Market News title when scrolled on feed pages */}
                {isFeedPage && newsScrolledPast ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="flex items-center gap-1.5 shrink-0 transition-opacity active:opacity-75 text-left py-1 pr-2 animate-in fade-in duration-200"
                    aria-label="Scroll to top of Market News"
                  >
                    <span className="text-base font-bold tracking-tight text-foreground">
                      Market News
                    </span>
                  </button>
                ) : (
                  <Link
                    to="/"
                    className="flex items-center gap-2 shrink-0 transition-transform active:scale-95 animate-in fade-in duration-200"
                    aria-label="KenyaFundFinder Home"
                  >
                    <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-emerald-500/30 bg-emerald-950/20 shadow-sm">
                      <img
                        src="/apple-touch-icon.png?v=20261110"
                        alt="KenyaFundFinder logo"
                        className="h-full w-full object-cover"
                        width={32}
                        height={32}
                      />
                    </div>
                  </Link>
                )}

                {/* Right side cluster: circular Search, Notifications, Profile */}
                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  <SearchDialog variant="round" />
                  <NotificationBell variant="round" />
                  <MobileProfileButton
                    user={user}
                    displayName={displayName}
                    avatarUrl={avatarUrl}
                    onClick={() => setAccountOpen(true)}
                  />
                </div>
              </div>
            )}
          </nav>
        </header>
        <div className="h-safe-nav" aria-hidden="true" />
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
