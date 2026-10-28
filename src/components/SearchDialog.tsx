import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Newspaper,
  TrendingUp,
  LineChart,
  Coins,
  ArrowRightLeft,
  Calculator,
  Briefcase,
  Bell,
  Star,
  LayoutGrid,
  Clock,
  X,
  CornerDownLeft,
  ArrowLeft,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { fetchFunds, fetchPublishedNews, type FundFromDB, type NewsFromDB } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import SaveToWatchlistButton from "@/components/watchlist/SaveToWatchlistButton";
import { trackEvent } from "@/lib/analytics";
import { canonicalEntityFromSearch } from "@/lib/aiLab/canonicalCatalog";
import { rankCanonicalEntities } from "../../supabase/functions/_shared/universal-query";
import { useIsMobile } from "@/hooks/use-mobile";

interface SearchDialogProps {
  variant?: "default" | "topbar" | "icon";
}

type Category = "all" | "funds" | "stocks" | "rates" | "commodities" | "news" | "pages";

interface StockRow { id: string; symbol: string; name: string; price: number; day_change_percent: number }
interface RateRow { id: string; currency_code: string; currency_name: string; rate: number }
interface CommodityRow { id: string; symbol: string; name: string; price: number; unit: string }

const RECENT_KEY = "kff:recent-searches";
const MAX_RECENT = 6;

const PAGES = [
  { label: "Overview", path: "/", icon: LayoutGrid, keywords: "home dashboard market overview" },
  { label: "Unit Trusts", path: "/funds", icon: TrendingUp, keywords: "funds money market mmf cma" },
  { label: "Stocks", path: "/stocks", icon: LineChart, keywords: "nse equities shares" },
  { label: "FX Rates", path: "/rates", icon: ArrowRightLeft, keywords: "currency forex exchange usd kes" },
  { label: "Commodities", path: "/commodities", icon: Coins, keywords: "gold oil silver" },
  { label: "News", path: "/news", icon: Newspaper, keywords: "articles updates" },
  { label: "Compare Funds", path: "/compare", icon: Briefcase, keywords: "compare funds" },
  { label: "Calculator", path: "/calculator", icon: Calculator, keywords: "investment paye currency calc" },
  { label: "Portfolio", path: "/portfolio", icon: Briefcase, keywords: "mock portfolio holdings" },
  { label: "Watchlist", path: "/watchlist", icon: Star, keywords: "favorites" },
  { label: "Price Alerts", path: "/alerts", icon: Bell, keywords: "notifications target price" },
];

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "all", label: "All" },
  { id: "funds", label: "Funds" },
  { id: "stocks", label: "Stocks" },
  { id: "rates", label: "FX" },
  { id: "commodities", label: "Commodities" },
  { id: "news", label: "News" },
  { id: "pages", label: "Pages" },
];

const SearchDialog = ({ variant = "default" }: SearchDialogProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [funds, setFunds] = useState<FundFromDB[]>([]);
  const [news, setNews] = useState<NewsFromDB[]>([]);
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [rates, setRates] = useState<RateRow[]>([]);
  const [commodities, setCommodities] = useState<CommodityRow[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Cmd+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Load recent searches
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      // Ignore invalid or unavailable local storage
    }
  }, []);

  // Prevent background scroll on mobile and auto-focus input
  useEffect(() => {
    if (open && isMobile) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const timer = setTimeout(() => {
        mobileInputRef.current?.focus();
      }, 60);
      return () => {
        document.body.style.overflow = originalOverflow;
        clearTimeout(timer);
      };
    }
  }, [open, isMobile]);

  // Load data when opened
  useEffect(() => {
    if (!open) return;
    if (funds.length === 0) fetchFunds().then(setFunds).catch(() => undefined);
    if (news.length === 0) fetchPublishedNews().then(setNews).catch(() => undefined);
    if (stocks.length === 0) {
      supabase
        .from("stocks")
        .select("id, symbol, name, price, day_change_percent")
        .eq("is_active", true)
        .order("symbol")
        .then(({ data }) => setStocks((data || []) as StockRow[]));
    }
    if (rates.length === 0) {
      supabase
        .from("exchange_rates")
        .select("id, currency_code, currency_name, rate")
        .eq("is_active", true)
        .order("sort_order")
        .then(({ data }) => setRates((data || []) as RateRow[]));
    }
    if (commodities.length === 0) {
      supabase
        .from("commodities")
        .select("id, symbol, name, price, unit")
        .eq("is_active", true)
        .order("sort_order")
        .then(({ data }) => setCommodities((data || []) as CommodityRow[]));
    }
  }, [open]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setCategory("all");
    }
  }, [open]);

  const pushRecent = useCallback((term: string) => {
    const t = term.trim();
    if (!t) return;
    setRecent((prev) => {
      const next = [t, ...prev.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // Recent searches remain available in-memory
      }
      return next;
    });
  }, []);

  const removeRecent = useCallback((term: string) => {
    setRecent((prev) => {
      const next = prev.filter((x) => x.toLowerCase() !== term.toLowerCase());
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // Fallback in-memory
      }
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecent([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      // In-memory state is already cleared
    }
  }, []);

  const go = useCallback((path: string, term?: string) => {
    if (term) pushRecent(term);
    trackEvent("search_used", {
      query: (term || query).trim(),
      destination: path,
      category,
    });
    setOpen(false);
    navigate(path);
  }, [navigate, pushRecent, query, category]);

  const q = query.trim().toLowerCase();
  const showCat = (c: Category) => category === "all" || category === c;

  const searchCatalog = useMemo(() => [
    ...funds.map((fund) => canonicalEntityFromSearch({
      id: fund.id,
      kind: "fund",
      subtype: fund.fund_type ?? "money_market",
      label: fund.name,
      sourceKey: fund.slug,
      manager: fund.manager,
      aliases: [fund.manager, fund.fund_type],
    })),
    ...stocks.map((stock) => canonicalEntityFromSearch({
      id: stock.id,
      kind: "stock",
      label: stock.name,
      sourceKey: stock.symbol,
      market: "NSE",
    })),
    ...rates.map((rate) => canonicalEntityFromSearch({
      id: rate.id,
      kind: "fx",
      label: rate.currency_name,
      sourceKey: rate.currency_code,
      market: "KES",
    })),
    ...commodities.map((commodity) => canonicalEntityFromSearch({
      id: commodity.id,
      kind: "commodity",
      label: commodity.name,
      sourceKey: commodity.symbol,
    })),
    ...news.map((article) => canonicalEntityFromSearch({
      id: article.id,
      kind: "news_topic",
      subtype: article.category ?? "market_news",
      label: article.title,
      sourceKey: String(article.id),
      aliases: [article.category, article.summary],
    })),
    ...PAGES.map((page) => canonicalEntityFromSearch({
      id: page.path,
      kind: page.path === "/calculator" ? "calculator" : page.path === "/portfolio" || page.path === "/watchlist" ? "portfolio" : "market_topic",
      label: page.label,
      sourceKey: page.path,
      aliases: [page.keywords],
    })),
  ], [funds, stocks, rates, commodities, news]);

  const rankedIds = useMemo(
    () => new Set(rankCanonicalEntities(q, searchCatalog, 120).map((entity) => entity.id)),
    [q, searchCatalog],
  );
  const hasRanked = useCallback((kind: string, id: string) => !q || rankedIds.has(`${kind}:${id}`), [q, rankedIds]);

  const filteredFunds = useMemo(
    () => (showCat("funds") ? funds.filter((f) => hasRanked("fund", f.id)).slice(0, 25) : []),
    [funds, category, hasRanked]
  );
  const filteredStocks = useMemo(
    () => (showCat("stocks") ? stocks.filter((s) => hasRanked("stock", s.id)).slice(0, 25) : []),
    [stocks, category, hasRanked]
  );
  const filteredRates = useMemo(
    () => (showCat("rates") ? rates.filter((r) => hasRanked("fx", r.id)).slice(0, 25) : []),
    [rates, category, hasRanked]
  );
  const filteredCommodities = useMemo(
    () => (showCat("commodities") ? commodities.filter((c) => hasRanked("commodity", c.id)).slice(0, 25) : []),
    [commodities, category, hasRanked]
  );
  const filteredNews = useMemo(
    () => (showCat("news") ? news.filter((n) => hasRanked("news_topic", n.id)).slice(0, 25) : []),
    [news, category, hasRanked]
  );
  const filteredPages = useMemo(
    () => (showCat("pages") ? PAGES.filter((p) => {
      const kind = p.path === "/calculator" ? "calculator" : p.path === "/portfolio" || pageMatchesPortfolio(p.path) ? "portfolio" : "market_topic";
      return hasRanked(kind, p.path);
    }) : []),
    [category, hasRanked]
  );

  function pageMatchesPortfolio(path: string) {
    return path === "/portfolio" || path === "/watchlist";
  }

  const hasAnyResults =
    filteredFunds.length + filteredStocks.length + filteredRates.length +
    filteredCommodities.length + filteredNews.length + filteredPages.length > 0;

  // ─── Dynamic Suggestions Based on Past Searches & Market Leaders ───
  const suggestedItems = useMemo(() => {
    const list: Array<{
      id: string;
      type: "fund" | "stock" | "fx" | "commodity";
      title: string;
      subtitle: string;
      badge?: string;
      path: string;
      metric: string;
      metricColor?: string;
      icon: React.ElementType;
      iconBg: string;
      iconColor: string;
    }> = [];

    const joinedRecent = recent.join(" ").toLowerCase();
    const hasFundAffinity = /fund|mmf|yield|money|kuza|etica|sanlam|britam|ncba|iceal|lofty/i.test(joinedRecent);
    const hasStockAffinity = /stock|share|nse|equity|safaricom|kcb|coop|eabl|bat/i.test(joinedRecent);

    const sortedFunds = [...funds]
      .filter((f) => f.annual_yield && Number(f.annual_yield) > 0)
      .sort((a, b) => Number(b.annual_yield) - Number(a.annual_yield));

    const safaricom = stocks.find((s) => s.symbol.toUpperCase() === "SCOM") || stocks[0];
    const equity = stocks.find((s) => s.symbol.toUpperCase() === "EQTY") || stocks[1];
    const usdRate = rates.find((r) => r.currency_code === "USD") || rates[0];
    const gold = commodities.find((c) => c.symbol.toLowerCase().includes("gold") || c.symbol === "XAU") || commodities[0];

    if (hasFundAffinity && sortedFunds.length > 0) {
      // User searched funds: prioritize top 3 MMFs, 1 stock, 1 FX
      sortedFunds.slice(0, 3).forEach((f) => {
        list.push({
          id: f.id,
          type: "fund",
          title: f.name,
          subtitle: `${f.manager} · ${f.fund_type === "money_market" ? "Money Market" : "Unit Trust"}`,
          badge: "MMF",
          path: `/compare/${f.slug}`,
          metric: `${Number(f.annual_yield).toFixed(2)}%`,
          metricColor: "text-emerald-600 dark:text-emerald-400",
          icon: TrendingUp,
          iconBg: "bg-emerald-500/10",
          iconColor: "text-emerald-600 dark:text-emerald-400",
        });
      });
      if (safaricom) {
        const up = Number(safaricom.day_change_percent) >= 0;
        list.push({
          id: safaricom.id,
          type: "stock",
          title: safaricom.name,
          subtitle: `NSE: ${safaricom.symbol} · Shares`,
          badge: "NSE",
          path: `/stocks/${safaricom.symbol}`,
          metric: `KES ${Number(safaricom.price).toFixed(2)}`,
          metricColor: up ? "text-emerald-500" : "text-red-500",
          icon: LineChart,
          iconBg: "bg-blue-500/10",
          iconColor: "text-blue-600 dark:text-blue-400",
        });
      }
      if (usdRate) {
        list.push({
          id: usdRate.id,
          type: "fx",
          title: `${usdRate.currency_code} / KES`,
          subtitle: usdRate.currency_name,
          badge: "FX",
          path: "/rates",
          metric: Number(usdRate.rate).toFixed(2),
          icon: ArrowRightLeft,
          iconBg: "bg-purple-500/10",
          iconColor: "text-purple-600 dark:text-purple-400",
        });
      }
    } else if (hasStockAffinity && stocks.length > 0) {
      // User searched stocks: prioritize blue chips, 1 MMF, 1 FX
      if (safaricom) {
        const up = Number(safaricom.day_change_percent) >= 0;
        list.push({
          id: safaricom.id,
          type: "stock",
          title: safaricom.name,
          subtitle: `NSE: ${safaricom.symbol} · Market Leader`,
          badge: "NSE",
          path: `/stocks/${safaricom.symbol}`,
          metric: `KES ${Number(safaricom.price).toFixed(2)}`,
          metricColor: up ? "text-emerald-500" : "text-red-500",
          icon: LineChart,
          iconBg: "bg-blue-500/10",
          iconColor: "text-blue-600 dark:text-blue-400",
        });
      }
      if (equity) {
        const up = Number(equity.day_change_percent) >= 0;
        list.push({
          id: equity.id,
          type: "stock",
          title: equity.name,
          subtitle: `NSE: ${equity.symbol} · Banking Anchor`,
          badge: "NSE",
          path: `/stocks/${equity.symbol}`,
          metric: `KES ${Number(equity.price).toFixed(2)}`,
          metricColor: up ? "text-emerald-500" : "text-red-500",
          icon: LineChart,
          iconBg: "bg-blue-500/10",
          iconColor: "text-blue-600 dark:text-blue-400",
        });
      }
      if (sortedFunds[0]) {
        list.push({
          id: sortedFunds[0].id,
          type: "fund",
          title: sortedFunds[0].name,
          subtitle: `${sortedFunds[0].manager} · Top Yield MMF`,
          badge: "MMF",
          path: `/compare/${sortedFunds[0].slug}`,
          metric: `${Number(sortedFunds[0].annual_yield).toFixed(2)}%`,
          metricColor: "text-emerald-600 dark:text-emerald-400",
          icon: TrendingUp,
          iconBg: "bg-emerald-500/10",
          iconColor: "text-emerald-600 dark:text-emerald-400",
        });
      }
      if (usdRate) {
        list.push({
          id: usdRate.id,
          type: "fx",
          title: `${usdRate.currency_code} / KES`,
          subtitle: usdRate.currency_name,
          badge: "FX",
          path: "/rates",
          metric: Number(usdRate.rate).toFixed(2),
          icon: ArrowRightLeft,
          iconBg: "bg-purple-500/10",
          iconColor: "text-purple-600 dark:text-purple-400",
        });
      }
    } else {
      // Default / balanced Kenyan benchmark leaders
      if (safaricom) {
        const up = Number(safaricom.day_change_percent) >= 0;
        list.push({
          id: safaricom.id,
          type: "stock",
          title: safaricom.name,
          subtitle: `NSE: ${safaricom.symbol} · Most Traded`,
          badge: "NSE",
          path: `/stocks/${safaricom.symbol}`,
          metric: `KES ${Number(safaricom.price).toFixed(2)}`,
          metricColor: up ? "text-emerald-500" : "text-red-500",
          icon: LineChart,
          iconBg: "bg-blue-500/10",
          iconColor: "text-blue-600 dark:text-blue-400",
        });
      }
      if (sortedFunds[0]) {
        list.push({
          id: sortedFunds[0].id,
          type: "fund",
          title: sortedFunds[0].name,
          subtitle: `${sortedFunds[0].manager} · Top Yielding MMF`,
          badge: "MMF",
          path: `/compare/${sortedFunds[0].slug}`,
          metric: `${Number(sortedFunds[0].annual_yield).toFixed(2)}%`,
          metricColor: "text-emerald-600 dark:text-emerald-400",
          icon: TrendingUp,
          iconBg: "bg-emerald-500/10",
          iconColor: "text-emerald-600 dark:text-emerald-400",
        });
      }
      if (usdRate) {
        list.push({
          id: usdRate.id,
          type: "fx",
          title: `${usdRate.currency_code} / KES`,
          subtitle: usdRate.currency_name,
          badge: "FX",
          path: "/rates",
          metric: Number(usdRate.rate).toFixed(2),
          icon: ArrowRightLeft,
          iconBg: "bg-purple-500/10",
          iconColor: "text-purple-600 dark:text-purple-400",
        });
      }
      if (equity) {
        const up = Number(equity.day_change_percent) >= 0;
        list.push({
          id: equity.id,
          type: "stock",
          title: equity.name,
          subtitle: `NSE: ${equity.symbol} · Banking Anchor`,
          badge: "NSE",
          path: `/stocks/${equity.symbol}`,
          metric: `KES ${Number(equity.price).toFixed(2)}`,
          metricColor: up ? "text-emerald-500" : "text-red-500",
          icon: LineChart,
          iconBg: "bg-blue-500/10",
          iconColor: "text-blue-600 dark:text-blue-400",
        });
      }
      if (gold) {
        list.push({
          id: gold.id,
          type: "commodity",
          title: gold.name,
          subtitle: `${gold.symbol} · Safe Haven Commodity`,
          badge: "COMMODITY",
          path: "/commodities",
          metric: `${Number(gold.price).toFixed(2)} ${gold.unit || ""}`,
          icon: Coins,
          iconBg: "bg-amber-500/10",
          iconColor: "text-amber-600 dark:text-amber-400",
        });
      }
    }
    return list;
  }, [recent, funds, stocks, rates, commodities]);

  return (
    <>
      {/* ─── Trigger Buttons ─── */}
      {variant === "icon" ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center h-9 w-9 rounded-full text-foreground hover:bg-muted transition-colors"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
      ) : variant === "topbar" ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 w-full px-3 py-2 h-10 rounded-xl bg-muted/60 border border-border text-muted-foreground text-sm hover:bg-muted/80 hover:border-accent/30 transition-all shadow-sm overflow-hidden"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left text-xs truncate whitespace-nowrap min-w-0">Search funds, stocks, FX, news…</span>
          <kbd className="hidden lg:inline-flex shrink-0 items-center gap-0.5 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors w-full md:w-8 md:h-8 md:p-0 md:items-center md:justify-center md:rounded-lg"
          aria-label="Open search"
        >
          <Search className="h-3.5 w-3.5 md:h-4 md:w-4" />
          <span className="flex-1 text-left md:hidden">Search…</span>
        </button>
      )}

      {/* ─── Mobile Full-Page Search Screen (< md) ─── */}
      {open && isMobile && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search"
          className="fixed inset-0 z-50 flex flex-col bg-background text-foreground md:hidden animate-in fade-in duration-200"
        >
          {/* Mobile Top Header */}
          <div className="flex items-center gap-2 px-3 pt-3 pb-2.5 border-b border-border/80 bg-background/95 backdrop-blur-md shrink-0">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 w-10 -ml-1 rounded-full flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all shrink-0"
              aria-label="Close search"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                ref={mobileInputRef}
                type="search"
                placeholder="Search funds, stocks, FX, news..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 w-full rounded-full bg-muted/80 pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted-foreground/20 text-muted-foreground hover:text-foreground flex items-center justify-center"
                  aria-label="Clear input"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Sticky Category Chips */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/60 overflow-x-auto scrollbar-none bg-background shrink-0">
            {CATEGORIES.map((c) => {
              const isActive = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? "bg-foreground text-background shadow-xs font-bold"
                      : "border border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-6">
            {!q ? (
              /* ─── Empty State: Recent Searches + Suggested For You ─── */
              <div className="space-y-6">
                {/* Recent Searches */}
                {recent.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Recent Searches</span>
                      </div>
                      <button
                        type="button"
                        onClick={clearRecent}
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Clear all
                      </button>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card divide-y divide-border/60 overflow-hidden shadow-xs">
                      {recent.map((term) => (
                        <div
                          key={term}
                          onClick={() => setQuery(term)}
                          className="flex items-center justify-between px-3.5 py-3 hover:bg-muted/40 active:bg-muted/70 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-sm font-medium text-foreground truncate">{term}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeRecent(term);
                              }}
                              className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              aria-label={`Remove ${term}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested For You */}
                {suggestedItems.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Suggested For You</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">Based on market activity</span>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card divide-y divide-border/60 overflow-hidden shadow-xs">
                      {suggestedItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <div
                            key={`${item.type}-${item.id}`}
                            onClick={() => go(item.path, item.title)}
                            className="flex items-center justify-between p-3.5 hover:bg-muted/40 active:bg-muted/70 transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg} ${item.iconColor}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm font-bold text-foreground truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                    {item.title}
                                  </span>
                                  {item.badge && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{item.subtitle}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0 pl-2">
                              <span className={`font-mono text-xs font-bold ${item.metricColor || "text-foreground"}`}>
                                {item.metric}
                              </span>
                              {(item.type === "fund" || item.type === "stock") && (
                                <span onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                                  <SaveToWatchlistButton itemType={item.type} itemId={item.id} itemName={item.title} variant="icon" />
                                </span>
                              )}
                              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ─── Active Query Results ─── */
              <div className="space-y-5">
                {!hasAnyResults ? (
                  <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border/80 bg-muted/20 space-y-2">
                    <p className="text-sm font-bold text-foreground">No matches found for "{query}"</p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      Try searching for fund names, NSE stock tickers, currency pairs, or news topics.
                    </p>
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted text-xs font-bold text-foreground hover:bg-muted/80"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Unit Trusts (Funds) */}
                    {filteredFunds.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                          Unit Trusts ({filteredFunds.length})
                        </h3>
                        <div className="rounded-2xl border border-border/80 bg-card divide-y divide-border/60 overflow-hidden shadow-xs">
                          {filteredFunds.map((f) => (
                            <div
                              key={f.id}
                              onClick={() => go(`/compare/${f.slug}`, f.name)}
                              className="flex items-center justify-between p-3.5 hover:bg-muted/40 active:bg-muted/70 transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                  <TrendingUp className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-bold text-foreground truncate block group-hover:text-emerald-600 transition-colors">
                                    {f.name}
                                  </span>
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">{f.manager}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2.5 shrink-0 pl-2">
                                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                  {Number(f.annual_yield).toFixed(2)}%
                                </span>
                                <span onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                                  <SaveToWatchlistButton itemType="fund" itemId={f.id} itemName={f.name} variant="icon" />
                                </span>
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stocks (NSE) */}
                    {filteredStocks.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                          NSE Stocks ({filteredStocks.length})
                        </h3>
                        <div className="rounded-2xl border border-border/80 bg-card divide-y divide-border/60 overflow-hidden shadow-xs">
                          {filteredStocks.map((s) => {
                            const up = Number(s.day_change_percent) >= 0;
                            return (
                              <div
                                key={s.id}
                                onClick={() => go(`/stocks/${s.symbol}`, s.symbol)}
                                className="flex items-center justify-between p-3.5 hover:bg-muted/40 active:bg-muted/70 transition-colors cursor-pointer group"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                    <LineChart className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm font-bold text-foreground truncate group-hover:text-blue-600 transition-colors">
                                        {s.symbol}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground truncate">
                                        {s.name}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">NSE Equities</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2.5 shrink-0 pl-2">
                                  <div className="text-right">
                                    <span className="font-mono text-xs font-bold text-foreground block">
                                      KES {Number(s.price).toFixed(2)}
                                    </span>
                                    <span className={`font-mono text-[10px] block ${up ? "text-emerald-500" : "text-red-500"}`}>
                                      {up ? "+" : ""}{Number(s.day_change_percent).toFixed(2)}%
                                    </span>
                                  </div>
                                  <span onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                                    <SaveToWatchlistButton itemType="stock" itemId={s.id} itemName={s.name} variant="icon" />
                                  </span>
                                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* FX Rates */}
                    {filteredRates.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                          FX Rates ({filteredRates.length})
                        </h3>
                        <div className="rounded-2xl border border-border/80 bg-card divide-y divide-border/60 overflow-hidden shadow-xs">
                          {filteredRates.map((r) => (
                            <div
                              key={r.id}
                              onClick={() => go("/rates", r.currency_code)}
                              className="flex items-center justify-between p-3.5 hover:bg-muted/40 active:bg-muted/70 transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                                  <ArrowRightLeft className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-bold text-foreground truncate block">
                                    {r.currency_code} / KES
                                  </span>
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">{r.currency_name}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 pl-2">
                                <span className="font-mono text-xs font-bold text-foreground">
                                  {Number(r.rate).toFixed(2)}
                                </span>
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Commodities */}
                    {filteredCommodities.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                          Commodities ({filteredCommodities.length})
                        </h3>
                        <div className="rounded-2xl border border-border/80 bg-card divide-y divide-border/60 overflow-hidden shadow-xs">
                          {filteredCommodities.map((c) => (
                            <div
                              key={c.id}
                              onClick={() => go("/commodities", c.symbol)}
                              className="flex items-center justify-between p-3.5 hover:bg-muted/40 active:bg-muted/70 transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                  <Coins className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-bold text-foreground truncate block">
                                    {c.name} ({c.symbol})
                                  </span>
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">Commodities</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 pl-2">
                                <span className="font-mono text-xs font-bold text-foreground">
                                  {Number(c.price).toFixed(2)} {c.unit}
                                </span>
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* News */}
                    {filteredNews.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                          News ({filteredNews.length})
                        </h3>
                        <div className="rounded-2xl border border-border/80 bg-card divide-y divide-border/60 overflow-hidden shadow-xs">
                          {filteredNews.map((a) => (
                            <div
                              key={a.id}
                              onClick={() => go(`/news/${a.id}`, a.title)}
                              className="flex items-center justify-between p-3.5 hover:bg-muted/40 active:bg-muted/70 transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                                  <Newspaper className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-sm font-bold text-foreground line-clamp-2 block group-hover:text-emerald-600 transition-colors">
                                    {a.title}
                                  </span>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                                    {a.category}
                                  </p>
                                </div>
                              </div>
                              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors shrink-0 ml-2" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pages */}
                    {filteredPages.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                          Pages ({filteredPages.length})
                        </h3>
                        <div className="rounded-2xl border border-border/80 bg-card divide-y divide-border/60 overflow-hidden shadow-xs">
                          {filteredPages.map((p) => {
                            const Icon = p.icon;
                            return (
                              <div
                                key={p.path}
                                onClick={() => go(p.path, p.label)}
                                className="flex items-center justify-between p-3.5 hover:bg-muted/40 active:bg-muted/70 transition-colors cursor-pointer group"
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <span className="text-sm font-bold text-foreground truncate block">
                                    {p.label}
                                  </span>
                                </div>
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors shrink-0 ml-2" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Desktop Centered Command Palette (md: and up) ─── */}
      {!isMobile && (
        <CommandDialog open={open} onOpenChange={setOpen} commandProps={{ shouldFilter: false }}>
          <CommandInput
            placeholder="Search funds, stocks, FX, commodities, news..."
            value={query}
            onValueChange={setQuery}
          />

          {/* Category chips */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-border overflow-x-auto scrollbar-none">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-medium uppercase tracking-wide transition-colors ${
                  category === c.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <CommandList className="h-[60vh] max-h-[60vh] min-h-[60vh]">
            {/* Recent searches — only when no query */}
            {!q && recent.length > 0 && (
              <>
                <CommandGroup
                  heading={
                    <div className="flex items-center justify-between w-full">
                      <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Recent</span>
                      <button
                        onClick={clearRecent}
                        className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
                      >
                        <X className="h-3 w-3" /> Clear
                      </button>
                    </div>
                  }
                >
                  {recent.map((term) => (
                    <CommandItem key={term} onSelect={() => setQuery(term)}>
                      <Search className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                      <span className="flex-1">{term}</span>
                      <CornerDownLeft className="h-3 w-3 text-muted-foreground/50" />
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {!hasAnyResults && q && <CommandEmpty>No results for "{query}".</CommandEmpty>}
            {!hasAnyResults && !q && recent.length === 0 && (
              <CommandEmpty>Start typing to search across the platform.</CommandEmpty>
            )}

            {filteredFunds.length > 0 && (
              <CommandGroup heading="Unit Trusts">
                {filteredFunds.map((f) => (
                  <CommandItem key={f.id} onSelect={() => go(`/compare/${f.slug}`, f.name)}>
                    <TrendingUp className="mr-2 h-4 w-4 text-accent" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className="text-[10px] text-muted-foreground mr-2 truncate max-w-[120px]">{f.manager}</span>
                    <span className="text-xs text-accent font-mono font-semibold mr-1">{Number(f.annual_yield).toFixed(2)}%</span>
                    <span onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                      <SaveToWatchlistButton itemType="fund" itemId={f.id} itemName={f.name} variant="icon" />
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredStocks.length > 0 && (
              <CommandGroup heading="Stocks (NSE)">
                {filteredStocks.map((s) => {
                  const up = Number(s.day_change_percent) >= 0;
                  return (
                    <CommandItem key={s.id} onSelect={() => go(`/stocks/${s.symbol}`, s.symbol)}>
                      <LineChart className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="font-mono font-semibold w-16 shrink-0">{s.symbol}</span>
                      <span className="flex-1 truncate text-muted-foreground text-xs">{s.name}</span>
                      <span className="font-mono text-xs mr-2">{Number(s.price).toFixed(2)}</span>
                      <span className={`font-mono text-[10px] mr-1 ${up ? "text-emerald-500" : "text-red-500"}`}>
                        {up ? "+" : ""}{Number(s.day_change_percent).toFixed(2)}%
                      </span>
                      <span onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                        <SaveToWatchlistButton itemType="stock" itemId={s.id} itemName={s.name} variant="icon" />
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {filteredRates.length > 0 && (
              <CommandGroup heading="FX Rates">
                {filteredRates.map((r) => (
                  <CommandItem key={r.id} onSelect={() => go("/rates", r.currency_code)}>
                    <ArrowRightLeft className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-mono font-semibold w-12 shrink-0">{r.currency_code}</span>
                    <span className="flex-1 truncate text-muted-foreground text-xs">{r.currency_name}</span>
                    <span className="font-mono text-xs">{Number(r.rate).toFixed(2)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredCommodities.length > 0 && (
              <CommandGroup heading="Commodities">
                {filteredCommodities.map((c) => (
                  <CommandItem key={c.id} onSelect={() => go("/commodities", c.symbol)}>
                    <Coins className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="font-mono font-semibold w-16 shrink-0">{c.symbol}</span>
                    <span className="flex-1 truncate text-muted-foreground text-xs">{c.name}</span>
                    <span className="font-mono text-xs">{Number(c.price).toFixed(2)} <span className="text-muted-foreground">{c.unit}</span></span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredNews.length > 0 && (
              <CommandGroup heading="News">
                {filteredNews.map((a) => (
                  <CommandItem key={a.id} onSelect={() => go(`/news/${a.id}`, a.title)}>
                    <Newspaper className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{a.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 uppercase tracking-wide">{a.category}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredPages.length > 0 && (
              <CommandGroup heading="Pages">
                {filteredPages.map((p) => {
                  const Icon = p.icon;
                  return (
                    <CommandItem key={p.path} onSelect={() => go(p.path, p.label)}>
                      <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="flex-1">{p.label}</span>
                      <span className="text-[10px] text-muted-foreground/60 font-mono">{p.path}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>

          {/* Footer hints */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-border text-[10px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-border bg-card px-1 py-0.5 font-mono">↑↓</kbd> navigate
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-border bg-card px-1 py-0.5 font-mono">↵</kbd> open
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-border bg-card px-1 py-0.5 font-mono">esc</kbd> close
              </span>
            </div>
            <span className="font-mono uppercase tracking-wide">Kenya Fund Finder</span>
          </div>
        </CommandDialog>
      )}
    </>
  );
};

export default SearchDialog;
