import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, ChevronDown, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import SearchDialog from "@/components/SearchDialog";
import NotificationBell from "@/components/alerts/NotificationBell";
import { getStoredTheme, saveTheme } from "@/lib/themeStorage";
import MobileAccountSheet from "@/components/mobile/MobileAccountSheet";
import { sanitizeAvatarUrl } from "@/lib/safeImageUpload";
import MobileCountryExchangeSheet, { CountryFlagCircle } from "@/components/stocks/MobileCountryExchangeSheet";
import { useSelectedStockExchange } from "@/lib/stockExchangeSelection";
import MobileSectionPickerSheet, { MobileNavPickerTrigger } from "@/components/mobile/MobileSectionPickerSheet";
import {
  buildBankingTabOptions,
  buildFundCategoryOptions,
  buildMacroTabOptions,
  getFundCategoryOptionMeta,
  getStoredFundListForCounts,
  parseBankingTabFromSearch,
  parseFundCategoryFromSearch,
  parseMacroTabFromLocation,
  resolveMobileNavSectionKind,
} from "@/lib/mobileNavSections";
import { fetchBankFixedDeposits, fetchSaccoRecords } from "@/lib/savingsApi";
import { fetchPublicData } from "@/lib/gateway";
import { fetchFunds, type FundFromDB } from "@/lib/api";
import { NEWS_CATEGORY_SENTINEL_ID, NEWS_TABS_DOCKED_EVENT } from "@/lib/mobileStickyFeed";

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
        className="inline-flex items-center justify-center h-10 w-10 rounded-full border border-emerald-500/40 dark:border-emerald-500/45 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/25 active:scale-95 transition-all shrink-0 shadow-2xs dark:shadow-[0_0_8px_rgba(16,185,129,0.15)]"
        aria-label="Open account & settings"
      >
        <User className="h-5 w-5" />
      </button>
    );
  }

  const initials = (displayName || user.email || "U").slice(0, 2).toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center h-10 w-10 rounded-full text-foreground hover:bg-muted active:scale-95 transition-all relative shrink-0"
      aria-label="Open account & settings"
    >
      <Avatar className="h-10 w-10 border border-emerald-500/40 dark:border-emerald-400/50 shadow-2xs dark:shadow-[0_0_8px_rgba(16,185,129,0.2)]">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName || "User"} /> : null}
        <AvatarFallback className="bg-emerald-600 text-white font-bold text-xs tracking-wider">
          {initials}
        </AvatarFallback>
      </Avatar>
    </button>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
let cachedNavbarFunds: FundFromDB[] | null = null;
let cachedBankingCounts: { deposits: number; saccos: number } | null = null;
let cachedMacroCounts: { fx: number; commodities?: number } | null = null;

const Navbar = () => {
  const [accountOpen, setAccountOpen] = useState(false);
  const [countrySheetOpen, setCountrySheetOpen] = useState(false);
  const [sectionSheetOpen, setSectionSheetOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileHeaderHeight, setMobileHeaderHeight] = useState(64);
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
  const isStocksListPage = cleanPath === "/stocks";
  const mobileSectionKind = resolveMobileNavSectionKind(cleanPath);
  const { selectedExchange, market: selectedMarket, setSelectedExchange } = useSelectedStockExchange();
  const [newsScrolledPast, setNewsScrolledPast] = useState(false);
  const [newsTabsDocked, setNewsTabsDocked] = useState(false);
  const [marketNewsCount, setMarketNewsCount] = useState<number>(0);

  const [navFunds, setNavFunds] = useState<FundFromDB[]>(() => cachedNavbarFunds ?? getStoredFundListForCounts());
  const [bankingCounts, setBankingCounts] = useState<{ deposits: number; saccos: number } | undefined>(
    () => cachedBankingCounts ?? undefined,
  );
  const [macroCounts, setMacroCounts] = useState<{ fx: number; commodities?: number } | undefined>(
    () => cachedMacroCounts ?? undefined,
  );

  useEffect(() => {
    setSectionSheetOpen(false);
  }, [cleanPath]);

  useEffect(() => {
    if (!sectionSheetOpen) return;
    let cancelled = false;

    if (mobileSectionKind === "funds") {
      const stored = getStoredFundListForCounts();
      setNavFunds(stored);
      if (!cachedNavbarFunds) {
        fetchFunds()
          .then((list) => {
            if (cancelled || !Array.isArray(list) || list.length === 0) return;
            const published = list.filter((f) => f.is_published);
            cachedNavbarFunds = published;
            setNavFunds(published);
          })
          .catch(() => {});
      }
    } else if (mobileSectionKind === "banking" && !cachedBankingCounts) {
      Promise.all([fetchBankFixedDeposits(), fetchSaccoRecords()])
        .then(([deposits, saccos]) => {
          if (cancelled) return;
          const next = { deposits: deposits.length, saccos: saccos.length };
          cachedBankingCounts = next;
          setBankingCounts(next);
        })
        .catch(() => {});
    } else if (mobileSectionKind === "macro" && !cachedMacroCounts) {
      Promise.allSettled([
        fetchPublicData<unknown>("rates", { limit: 200 }),
        fetchPublicData<unknown>("commodities", { limit: 200 }),
      ]).then(([ratesRes, commRes]) => {
        if (cancelled) return;
        const fxCount =
          ratesRes.status === "fulfilled" && Array.isArray(ratesRes.value?.data) && ratesRes.value.data.length > 0
            ? ratesRes.value.data.length
            : 14;
        const commCount =
          commRes.status === "fulfilled" && Array.isArray(commRes.value?.data) && commRes.value.data.length > 0
            ? commRes.value.data.length
            : undefined;
        const next = { fx: fxCount, commodities: commCount };
        cachedMacroCounts = next;
        setMacroCounts(next);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [sectionSheetOpen, mobileSectionKind]);

  const activeFundCategory = parseFundCategoryFromSearch(location.search);
  const activeBankingTab = parseBankingTabFromSearch(location.search);
  const activeMacroTab = parseMacroTabFromLocation(cleanPath, location.search);

  const fundCategoryOptions = useMemo(() => buildFundCategoryOptions(navFunds), [navFunds]);
  const activeFundMeta = useMemo(
    () => getFundCategoryOptionMeta(activeFundCategory, navFunds),
    [activeFundCategory, navFunds],
  );
  const bankingOptions = useMemo(() => buildBankingTabOptions(bankingCounts), [bankingCounts]);
  const activeBankingMeta = useMemo(
    () => bankingOptions.find((o) => o.id === activeBankingTab) ?? bankingOptions[0],
    [bankingOptions, activeBankingTab],
  );
  const macroOptions = useMemo(() => buildMacroTabOptions(macroCounts), [macroCounts]);
  const activeMacroMeta = useMemo(
    () => macroOptions.find((o) => o.id === activeMacroTab) ?? macroOptions[0],
    [macroOptions, activeMacroTab],
  );

  const handleSelectFundCategory = (category: string) => {
    const params = new URLSearchParams(location.search);
    if (category === "money_market") {
      params.delete("category");
    } else {
      params.set("category", category);
    }
    params.delete("movement");
    const nextSearch = params.toString();
    navigate(`${cleanPath}${nextSearch ? `?${nextSearch}` : ""}`, { replace: true });
  };

  const handleSelectBankingTab = (tab: string) => {
    const params = new URLSearchParams(location.search);
    if (tab === "fixed-deposits") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const nextSearch = params.toString();
    navigate(`${cleanPath}${nextSearch ? `?${nextSearch}` : ""}`, { replace: true });
  };

  const handleSelectMacroTab = (tab: string) => {
    if (tab === "fx") {
      if (cleanPath === "/commodities") {
        navigate("/rates", { replace: true });
        return;
      }
      const params = new URLSearchParams(location.search);
      params.delete("tab");
      const nextSearch = params.toString();
      navigate(`/rates${nextSearch ? `?${nextSearch}` : ""}`, { replace: true });
      return;
    }

    if (cleanPath === "/commodities") return;
    const params = new URLSearchParams(location.search);
    params.set("tab", "commodities");
    navigate(`/rates?${params.toString()}`, { replace: true });
  };

  useEffect(() => {
    if (!isFeedPage) {
      setMarketNewsCount(0);
      return;
    }

    const handleCount = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (typeof customEvent.detail === "number" && customEvent.detail > 0) {
        setMarketNewsCount(customEvent.detail);
      }
    };

    window.addEventListener("kff:market-news-count", handleCount);

    const el = document.getElementById("market-news-header");
    const countAttr = el?.getAttribute("data-new-count");
    if (countAttr) {
      const val = parseInt(countAttr, 10);
      if (!isNaN(val) && val > 0) {
        setMarketNewsCount(val);
      }
    }

    return () => {
      window.removeEventListener("kff:market-news-count", handleCount);
    };
  }, [isFeedPage]);

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
        const headerBottom = headerRef.current ? headerRef.current.getBoundingClientRect().bottom : 64;
        const threshold = headerBottom > 0 ? headerBottom : 64;
        const isPast = rect.bottom <= threshold;
        setNewsScrolledPast((prev) => (prev !== isPast ? isPast : prev));

        const countAttr = target.getAttribute("data-new-count");
        if (countAttr) {
          const val = parseInt(countAttr, 10);
          if (!isNaN(val) && val > 0) {
            setMarketNewsCount((prev) => (prev !== val ? val : prev));
          }
        }
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
            const headerBottom = headerRef.current ? headerRef.current.getBoundingClientRect().bottom : 64;
            const threshold = headerBottom > 0 ? headerBottom : 64;
            const isPast = !entry.isIntersecting && entry.boundingClientRect.bottom <= threshold;
            setNewsScrolledPast((prev) => (prev !== isPast ? isPast : prev));
          },
          {
            rootMargin: "-64px 0px 0px 0px",
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

  useEffect(() => {
    if (!isFeedPage) {
      setNewsTabsDocked(false);
      return;
    }

    const syncFromDom = () => {
      const bar = document.querySelector('[data-testid="mobile-news-category-bar"]');
      if (bar) {
        setNewsTabsDocked(bar.getAttribute("data-docked") === "true");
      }
    };

    const handleDocked = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setNewsTabsDocked(Boolean(customEvent.detail));
    };

    syncFromDom();
    window.addEventListener(NEWS_TABS_DOCKED_EVENT, handleDocked);
    return () => {
      window.removeEventListener(NEWS_TABS_DOCKED_EVENT, handleDocked);
    };
  }, [isFeedPage, location.pathname]);

  const hasCategorySentinel =
    typeof document !== "undefined" && Boolean(document.getElementById(NEWS_CATEGORY_SENTINEL_ID));
  const hideHeaderDivider =
    isFeedPage && newsScrolledPast && (newsTabsDocked || !hasCategorySentinel);

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
            hideHeaderDivider ? "border-b-0" : "border-b border-border/50"
          }`}
        >
          <nav className="flex h-16 items-center px-3.5">
            {navTitle.type === "detail" ? (
              <div className="flex h-full w-full items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => (navTitle.backTo ? navigate(navTitle.backTo) : navigate(-1))}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/80 dark:border-border/70 bg-muted/60 dark:bg-muted/60 text-foreground hover:bg-muted active:scale-95 transition-all shrink-0"
                    aria-label="Go back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <span className="truncate text-base font-bold tracking-tight text-foreground">
                    {navTitle.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
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
                    className="flex flex-col justify-center items-start shrink-0 transition-opacity active:opacity-75 text-left py-0.5 pr-2 animate-in fade-in duration-200"
                    aria-label="Scroll to top of Market News"
                  >
                    <span className="text-base font-bold tracking-tight text-foreground leading-tight">
                      Market News
                    </span>
                    {marketNewsCount > 0 && (
                      <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 leading-none mt-0.5">
                        {marketNewsCount} new today
                      </span>
                    )}
                  </button>
                ) : isStocksListPage ? (
                  <button
                    type="button"
                    onClick={() => setCountrySheetOpen(true)}
                    data-testid="mobile-country-trigger"
                    aria-label={`Selected market: ${selectedMarket.countryName} (${selectedMarket.exchange}). Change country`}
                    className="inline-flex h-10 min-w-0 items-center gap-2 rounded-full border border-border/80 bg-muted/60 dark:bg-muted/70 pl-2.5 pr-3 text-sm font-bold text-foreground hover:bg-muted active:scale-95 transition-all shadow-2xs"
                  >
                    <CountryFlagCircle
                      countryCode={selectedMarket.countryCode}
                      countryName={selectedMarket.countryName}
                      size={22}
                    />
                    <span className="truncate">{selectedMarket.countryName}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ) : mobileSectionKind === "funds" ? (
                  <MobileNavPickerTrigger
                    iconName={activeFundMeta.iconName}
                    label={activeFundMeta.pillLabel}
                    ariaLabel={`Selected fund category: ${activeFundMeta.title}. Change category`}
                    onClick={() => setSectionSheetOpen(true)}
                    testId="mobile-funds-trigger"
                  />
                ) : mobileSectionKind === "banking" ? (
                  <MobileNavPickerTrigger
                    iconName={activeBankingMeta.iconName}
                    label={activeBankingMeta.pillLabel}
                    ariaLabel={`Selected savings category: ${activeBankingMeta.title}. Switch view`}
                    onClick={() => setSectionSheetOpen(true)}
                    testId="mobile-banking-trigger"
                  />
                ) : mobileSectionKind === "macro" ? (
                  <MobileNavPickerTrigger
                    iconName={activeMacroMeta.iconName}
                    label={activeMacroMeta.pillLabel}
                    ariaLabel={`Selected market: ${activeMacroMeta.title}. Switch between FX and Commodities`}
                    onClick={() => setSectionSheetOpen(true)}
                    testId="mobile-macro-trigger"
                  />
                ) : (
                  <Link
                    to="/"
                    className="flex items-center gap-2 shrink-0 transition-transform active:scale-95 animate-in fade-in duration-200"
                    aria-label="KenyaFundFinder Home"
                  >
                    <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-950/20 shadow-sm">
                      <img
                        src="/apple-touch-icon.png?v=20261111"
                        alt="KenyaFundFinder logo"
                        className="h-full w-full object-cover"
                        width={40}
                        height={40}
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

      <MobileCountryExchangeSheet
        open={countrySheetOpen}
        onOpenChange={setCountrySheetOpen}
        selectedExchange={selectedExchange}
        onSelectExchange={setSelectedExchange}
      />

      {mobileSectionKind === "funds" && (
        <MobileSectionPickerSheet
          open={sectionSheetOpen}
          onOpenChange={setSectionSheetOpen}
          title="Filter by Category"
          subtitle="Select a fund category to filter unit trusts"
          headerIcon="Landmark"
          ariaLabel="Choose fund category"
          closeAriaLabel="Close fund category selector"
          options={fundCategoryOptions}
          selectedId={activeFundCategory}
          onSelect={handleSelectFundCategory}
        />
      )}

      {mobileSectionKind === "banking" && (
        <MobileSectionPickerSheet
          open={sectionSheetOpen}
          onOpenChange={setSectionSheetOpen}
          title="Banking & Fixed Income"
          subtitle="Compare bank deposits, SACCOs, and T-Bills"
          headerIcon="Landmark"
          ariaLabel="Choose savings and fixed income view"
          closeAriaLabel="Close banking view selector"
          options={bankingOptions}
          selectedId={activeBankingTab}
          onSelect={handleSelectBankingTab}
        />
      )}

      {mobileSectionKind === "macro" && (
        <MobileSectionPickerSheet
          open={sectionSheetOpen}
          onOpenChange={setSectionSheetOpen}
          title="FX & Commodities"
          subtitle="Switch between currency rates and commodities"
          headerIcon="Coins"
          ariaLabel="Choose FX or Commodities view"
          closeAriaLabel="Close FX and commodities selector"
          options={macroOptions}
          selectedId={activeMacroTab}
          onSelect={handleSelectMacroTab}
        />
      )}
    </>
  );
};

export default Navbar;
