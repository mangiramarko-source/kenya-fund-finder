import { useState, useEffect, useCallback, useMemo } from "react";
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

  // Load recent searches
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      // Ignore invalid or unavailable local storage and start with no history.
    }
  }, []);

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
        // Recent searches remain available for this session when storage fails.
      }
      return next;
    });
  }, []);

  const clearRecent = useCallback(() => {
    setRecent([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      // In-memory state is already cleared.
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

  const filteredFunds = useMemo(
    () => (showCat("funds") ? funds.filter((f) => !q || f.name.toLowerCase().includes(q) || f.manager?.toLowerCase().includes(q) || f.slug?.toLowerCase().includes(q)).slice(0, 25) : []),
    [funds, q, category]
  );
  const filteredStocks = useMemo(
    () => (showCat("stocks") ? stocks.filter((s) => !q || s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)).slice(0, 25) : []),
    [stocks, q, category]
  );
  const filteredRates = useMemo(
    () => (showCat("rates") ? rates.filter((r) => !q || r.currency_code.toLowerCase().includes(q) || r.currency_name.toLowerCase().includes(q)).slice(0, 25) : []),
    [rates, q, category]
  );
  const filteredCommodities = useMemo(
    () => (showCat("commodities") ? commodities.filter((c) => !q || c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)).slice(0, 25) : []),
    [commodities, q, category]
  );
  const filteredNews = useMemo(
    () => (showCat("news") ? news.filter((n) => !q || n.title.toLowerCase().includes(q) || n.category?.toLowerCase().includes(q) || n.summary?.toLowerCase().includes(q)).slice(0, 25) : []),
    [news, q, category]
  );
  const filteredPages = useMemo(
    () => (showCat("pages") ? PAGES.filter((p) => !q || p.label.toLowerCase().includes(q) || p.keywords.includes(q)) : []),
    [q, category]
  );

  const hasAnyResults =
    filteredFunds.length + filteredStocks.length + filteredRates.length +
    filteredCommodities.length + filteredNews.length + filteredPages.length > 0;

  return (
    <>
      {variant === "icon" ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center h-9 w-9 rounded-full text-foreground hover:bg-muted transition-colors"
          aria-label="Search"
        >
          <Search className="h-[18px] w-[18px]" />
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

      <CommandDialog open={open} onOpenChange={setOpen} commandProps={{ shouldFilter: false }}>
        <CommandInput
          placeholder="Search "
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
    </>
  );
};

export default SearchDialog;
