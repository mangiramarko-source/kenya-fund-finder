import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { BarChart3, ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import SearchDialog from "@/components/SearchDialog";
import NotificationBell from "@/components/alerts/NotificationBell";
import { getStoredTheme, saveTheme } from "@/lib/themeStorage";
import MobileAccountSheet from "@/components/mobile/MobileAccountSheet";

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
  const initials = user
    ? (displayName || user.email || "U").slice(0, 2).toUpperCase()
    : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center h-9 w-9 rounded-full text-foreground hover:bg-muted transition-colors relative"
      aria-label={user ? "Open account & settings" : "Sign in to account"}
    >
      {user ? (
        <Avatar className="h-7 w-7 border border-border/80">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback className="bg-emerald-600 text-white font-bold text-[10px]">
            {initials}
          </AvatarFallback>
        </Avatar>
      ) : (
        <User className="h-5 w-5" />
      )}
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

  if (isMinimal) {
    return (
      <>
        <header
          ref={headerRef}
          className="md:hidden fixed inset-x-0 top-0 z-50 bg-card/95 backdrop-blur-md"
        >
          <div className="container flex h-14 items-center justify-between px-4">
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
            <div className="flex items-center gap-1.5">
              <MobileProfileButton
                user={user}
                displayName={displayName}
                avatarUrl={avatarUrl}
                onClick={() => setAccountOpen(true)}
              />
            </div>
          </div>
        </header>
        <div className="md:hidden h-14" aria-hidden="true" />
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
  }

  return (
    <>
      <div className="md:hidden">
        <header
          ref={headerRef}
          className="fixed inset-x-0 top-0 z-50 bg-background/95 backdrop-blur-md"
        >
          <nav className="flex h-14 items-center justify-between px-4">
            {/* Left: KFF logo */}
            <Link
              to="/"
              className="font-mono text-2xl font-black italic tracking-tighter text-emerald-500 dark:text-emerald-400"
            >
              KFF
            </Link>

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
