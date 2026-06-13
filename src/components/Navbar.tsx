import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Menu, TrendingUp, BarChart3, Newspaper, Moon, Sun, User, LogOut, Shield, Settings, Info, Mail, Scale, FileText, LineChart, Bell, Landmark, Calculator, ArrowLeft, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import SearchDialog from "@/components/SearchDialog";
import NotificationBell from "@/components/alerts/NotificationBell";

const navLinks = [
  { to: "/", label: "Home", icon: BarChart3 },
  { to: "/stocks", label: "Stocks", icon: TrendingUp },
  { to: "/markets", label: "Market", icon: LineChart },
];

const mobileNavLinks = [
  { to: "/", label: "Overview" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/stocks", label: "Stocks" },
  { to: "/funds", label: "Unit trusts" },
  { to: "/news", label: "News" },
  { to: "/rates", label: "Fx rates" },
  { to: "/commodities", label: "Commodities" },
];

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
      return; // Preserve system-preference following until user toggles
    }
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      // Only follow system if user hasn't explicitly chosen
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

  // Auto-scroll active mobile tab into center on route change
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
      setMobileHeaderHeight(element.getBoundingClientRect().height);
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

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
  // Detail pages get a Back button instead of Home
  const detailRoutePatterns = [
    /^\/stocks\/[^/]+/,
    /^\/compare\/[^/]+/,
    /^\/funds\/[^/]+/,
  ];
  const isDetailPage = detailRoutePatterns.some((re) => re.test(location.pathname));
  const isMinimal = isDetailPage || minimalRoutes.some((p) => location.pathname.startsWith(p));

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

        {/* Mobile slide-in sheet from right (shared with full navbar) */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="right" className="w-[280px] p-0 flex flex-col">
            <SheetHeader className="p-5 pb-3 border-b border-border">
              <SheetTitle className="flex items-center gap-2 text-base">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-accent text-accent-foreground">
                  <TrendingUp className="h-4 w-4" />
                </div>
                Menu
              </SheetTitle>
            </SheetHeader>

            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {/* User info */}
              {user && (
                <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-muted/50">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                      {(displayName || user.email || "U").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{displayName || "User"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              )}

              {/* Sign In CTA — priority for non-authenticated */}
              {!user && (
                <Link
                  to="/auth"
                  onClick={closeMobile}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-colors mb-2"
                >
                  <User className="h-5 w-5" /> Sign In / Sign Up
                </Link>
              )}

              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={closeMobile}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-accent hover:bg-accent/10 transition-colors"
                >
                  <Shield className="h-5 w-5" /> Admin Panel
                </Link>
              )}

              <div className="h-px bg-border my-2" />
              <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Tools</p>
              <Link
                to="/calculator"
                onClick={closeMobile}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground/70 hover:bg-muted transition-colors"
              >
                <Calculator className="h-5 w-5" /> Calculator
              </Link>
              <Link
                to="/news"
                onClick={closeMobile}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground/70 hover:bg-muted transition-colors"
              >
                <Newspaper className="h-5 w-5" /> News
              </Link>
              <Link
                to={user ? "/alerts" : "/auth"}
                onClick={closeMobile}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground/70 hover:bg-muted transition-colors"
              >
                <Bell className="h-5 w-5" /> Alerts
              </Link>
              <Link
                to="/learn"
                onClick={closeMobile}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground/70 hover:bg-muted transition-colors"
              >
                <GraduationCap className="h-5 w-5" /> Learn
              </Link>

              <button
                onClick={() => { setDark(!dark); }}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium text-foreground/70 hover:bg-muted transition-colors"
              >
                {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                {dark ? "Light Mode" : "Dark Mode"}
              </button>

              <div className="h-px bg-border my-2" />
              <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Info</p>
              {[
                { to: "/page/about", label: "About", icon: Info },
                { to: "/page/contact", label: "Contact", icon: Mail },
                { to: "/page/legal", label: "Legal", icon: Scale },
                { to: "/privacy", label: "Privacy Policy", icon: FileText },
                { to: "/terms", label: "Terms of Use", icon: FileText },
              ].map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={closeMobile}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground/70 hover:bg-muted transition-colors"
                  >
                    <Icon className="h-5 w-5" /> {link.label}
                  </Link>
                );
              })}
              {user && (
                <>
                  <div className="h-px bg-border my-2" />
                  <Link
                    to="/profile"
                    onClick={closeMobile}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground/70 hover:bg-muted transition-colors"
                  >
                    <Settings className="h-5 w-5" /> Profile Settings
                  </Link>
                  <button
                    onClick={async () => { await signOut(); closeMobile(); navigate("/"); }}
                    className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-5 w-5" /> Sign Out
                  </button>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <>
    <header
      ref={headerRef}
      className={`fixed inset-x-0 top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border transition-shadow duration-200 ${scrolled ? "md:shadow-[0_12px_28px_-18px_hsl(var(--foreground)/0.35)]" : ""}`}
    >
      <div className="container flex h-16 items-center justify-between relative">
        {/* Logo */}
        <Link to="/" className="hidden md:flex items-center gap-2.5 font-heading text-xl font-extrabold text-primary shrink-0">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-accent text-accent-foreground">
            <TrendingUp className="h-5 w-5" />
          </div>
          <span>Kenya Fund Finder</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 bg-muted/60 rounded-full px-1.5 py-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/80"
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-2">
          <SearchDialog />
          <NotificationBell />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDark(!dark)}
            className="rounded-full"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {user ? (
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link to="/admin" className="text-xs font-semibold text-accent hover:underline flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" /> Admin
                </Link>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full ring-2 ring-border hover:ring-accent transition-all">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={avatarUrl} alt={displayName || user.email || ""} />
                      <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                        {(displayName || user.email || "U").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium truncate">{displayName || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/alerts")} className="gap-2 cursor-pointer">
                    <Bell className="h-4 w-4" /> My Alerts
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" /> Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full font-semibold">
              <Link to="/auth"><User className="mr-1.5 h-3.5 w-3.5" /> Sign In</Link>
            </Button>
          )}
        </div>

        {/* Mobile: search on left */}
        <div className="flex md:hidden items-center gap-1">
          <SearchDialog variant="icon" />
        </div>

        {/* Mobile: logo centered */}
        <Link to="/" className="md:hidden absolute left-1/2 -translate-x-1/2 flex items-center justify-center h-9 w-9 rounded-xl bg-accent text-accent-foreground">
          <TrendingUp className="h-5 w-5" />
        </Link>

        {/* Mobile: hamburger on right */}
        <div className="flex md:hidden items-center">
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
      </div>

      {/* Mobile: full-width scrollable tab bar */}
      <div className="md:hidden relative">
        <div ref={mobileTabsScrollRef} className="overflow-x-auto scrollbar-hide bg-card border-b border-border" style={{ scrollBehavior: "smooth" }}>
          <nav className="flex min-w-max">
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
                  className={`relative shrink-0 px-4 py-3 text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? "font-bold text-foreground"
                      : "font-medium text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-4 right-4 h-[3px] rounded-t-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="pointer-events-none absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent" />
      </div>


      {/* Mobile slide-in sheet from right */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[280px] p-0 flex flex-col">
          <SheetHeader className="p-5 pb-3 border-b border-border">
            <SheetTitle className="flex items-center gap-2 text-base">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-accent text-accent-foreground">
                <TrendingUp className="h-4 w-4" />
              </div>
              Menu
            </SheetTitle>
          </SheetHeader>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {/* User info */}
            {user && (
              <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-muted/50">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                    {(displayName || user.email || "U").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{displayName || "User"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            )}

            {/* Sign In CTA — priority for non-authenticated */}
            {!user && (
              <Link
                to="/auth"
                onClick={closeMobile}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-colors mb-2"
              >
                <User className="h-5 w-5" /> Sign In / Sign Up
              </Link>
            )}

            {isAdmin && (
              <Link
                to="/admin"
                onClick={closeMobile}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-accent hover:bg-accent/10 transition-colors"
              >
                <Shield className="h-5 w-5" /> Admin Panel
              </Link>
            )}

            <div className="h-px bg-border my-2" />
            <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Tools</p>
            <Link
              to="/calculator"
              onClick={closeMobile}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground/70 hover:bg-muted transition-colors"
            >
              <Calculator className="h-5 w-5" /> Calculator
            </Link>
            <Link
              to="/news"
              onClick={closeMobile}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground/70 hover:bg-muted transition-colors"
            >
              <Newspaper className="h-5 w-5" /> News
            </Link>
            <Link
              to={user ? "/alerts" : "/auth"}
              onClick={closeMobile}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground/70 hover:bg-muted transition-colors"
            >
              <Bell className="h-5 w-5" /> Alerts
            </Link>
            <Link
              to="/learn"
              onClick={closeMobile}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground/70 hover:bg-muted transition-colors"
            >
              <GraduationCap className="h-5 w-5" /> Learn
            </Link>

            <button
              onClick={() => { setDark(!dark); }}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium text-foreground/70 hover:bg-muted transition-colors"
            >
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              {dark ? "Light Mode" : "Dark Mode"}
            </button>

            <div className="h-px bg-border my-2" />
            <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">Info</p>
            {[
              { to: "/page/about", label: "About", icon: Info },
              { to: "/page/contact", label: "Contact", icon: Mail },
              { to: "/page/legal", label: "Legal", icon: Scale },
              { to: "/privacy", label: "Privacy Policy", icon: FileText },
              { to: "/terms", label: "Terms of Use", icon: FileText },
            ].map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={closeMobile}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground/70 hover:bg-muted transition-colors"
                >
                  <Icon className="h-5 w-5" /> {link.label}
                </Link>
              );
            })}
            {user && (
              <>
                <div className="h-px bg-border my-2" />
                <Link
                  to="/profile"
                  onClick={closeMobile}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-foreground/70 hover:bg-muted transition-colors"
                >
                  <Settings className="h-5 w-5" /> Profile Settings
                </Link>
                <button
                  onClick={async () => { await signOut(); closeMobile(); navigate("/"); }}
                  className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-5 w-5" /> Sign Out
                </button>
              </>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
    <div aria-hidden="true" className="md:hidden shrink-0" style={{ height: mobileHeaderHeight }} />
    </>
  );
};

export default Navbar;
