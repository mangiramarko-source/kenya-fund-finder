import { useEffect, useState, useMemo, useId } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import StockDetailDesktopDemoPage from "@/pages/StockDetailDesktopDemoPage";
import { useAuth } from "@/hooks/useAuth";
import InlineDataGate from "@/components/auth/InlineDataGate";
import { isBotOrPrerender } from "@/hooks/useSoftWallTrigger";
import { supabase } from "@/integrations/supabase/client";
import { fetchPublicData } from "@/lib/gateway";
import { startMarketRefresh } from "@/lib/marketRefresh";
import { normalizeStock, stockCache, type CachedStock } from "@/lib/stockCache";
import { FALLBACK_KENYAN_STOCKS } from "@/lib/stockDataFallback";
import { getStockLogoUrl } from "@/lib/stockBranding";
import { getMarketPageMemory, setMarketPageMemory } from "@/lib/marketPageMemory";
import { formatMarketDate, formatMarketDateTime, toLastWeekday } from "@/lib/utils";
import { useUniversalCompare } from "@/hooks/useUniversalCompare";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Activity,
  Star,
  SlidersHorizontal,
  LayoutGrid,
  List,
  X,
  GitCompareArrows,
  Check,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import SectionLiveStatus from "@/components/SectionLiveStatus";
import { CreateAlertDialog } from "@/components/alerts/PriceAlertComponents";
import { MarketSummary } from "@/components/MarketSummary";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ActiveAlertsCard from "@/components/alerts/ActiveAlertsCard";
import StockFavourites from "@/components/home/StockFavourites";
import MarketPageLoader from "@/components/MarketPageLoader";
import { useMinimumLoadingDuration } from "@/hooks/useMinimumLoadingDuration";
import { useAssetWatchlist, type WatchlistEntry } from "@/hooks/useAssetWatchlist";
import { useIsMobile } from "@/hooks/use-mobile";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type Stock = CachedStock;

interface PriceHistory {
  snapshot_date: string;
  price: number;
}

interface StocksPageMemory {
  stocks: Stock[];
  marketHistory: any[];
  history: Record<string, PriceHistory[]>;
}

type SortKey = "symbol" | "price" | "day_change_percent" | "volume" | "market_cap" | "dividend_yield";
type SortDir = "asc" | "desc";

const formatNumber = (n: number, decimals = 2) =>
  n.toLocaleString("en-KE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const formatVolume = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
};

const formatMarketCap = (mc: number | null) => {
  if (mc == null) return "—";
  if (mc >= 1e12) return `KSh ${(mc / 1e12).toFixed(1)}T`;
  if (mc >= 1e9) return `KSh ${(mc / 1e9).toFixed(1)}B`;
  if (mc >= 1e6) return `KSh ${(mc / 1e6).toFixed(0)}M`;
  return `KSh ${mc.toLocaleString()}`;
};

const getInitials = (name, symbol) => {
  if (!name) return symbol.substring(0, 2);
  const parts = name.split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return symbol.substring(0, 2).toUpperCase();
};

const getAvatarColor = (symbol) => {
  const colors = [
    "bg-blue-500", "bg-purple-500", "bg-pink-500", 
    "bg-indigo-500", "bg-rose-500", "bg-orange-500", 
    "bg-emerald-500", "bg-cyan-500"
  ];
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const StockLogoAvatar = ({ stock, size = 48 }: { stock: Stock; size?: number }) => {
  const logoUrl = getStockLogoUrl(stock.symbol, stock.logo_url);

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60 text-xs font-bold text-white shadow-sm ${getAvatarColor(stock.symbol)}`}
      style={{ width: size, height: size }}
      aria-hidden={logoUrl ? undefined : true}
    >
      <span>{getInitials(stock.name, stock.symbol)}</span>
      {logoUrl && (
        <img
          src={logoUrl}
          alt={`${stock.name} logo`}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}
    </div>
  );
};

/* ─── Mini Sparkline ─── */
export const MiniSparkline = ({
  data,
  trend,
  price,
  dayChange,
  width = 64,
  height = 24,
}: {
  data?: PriceHistory[];
  trend?: "up" | "down" | "flat";
  price?: number;
  dayChange?: number;
  width?: number;
  height?: number;
}) => {
  const uid = useId();

  const result = useMemo(() => {
    // 1. Clean and sort historical points chronologically ascending
    const cleanData = (data || [])
      .filter((d) => Number.isFinite(d.price) && d.price > 0)
      .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));

    const todayIso = new Date().toISOString().split("T")[0];
    const vals: number[] = cleanData.map((d) => d.price);
    const lastSnap = cleanData[cleanData.length - 1];

    // Only append live price if newer than the latest snapshot, or update today's point
    if (price !== undefined && Number.isFinite(price) && price > 0) {
      if (!lastSnap || lastSnap.snapshot_date < todayIso) {
        vals.push(price);
      } else if (lastSnap && lastSnap.snapshot_date === todayIso) {
        vals[vals.length - 1] = price;
      }
    }

    // Fallback: If no multi-point history exists, use 1-day change if non-zero
    if (vals.length < 2) {
      if (price !== undefined && dayChange !== undefined && Math.abs(dayChange) > 0.001) {
        vals.unshift(price - dayChange);
      } else {
        return null;
      }
    }

    const recent = vals.slice(-30);
    const min = Math.min(...recent);
    const max = Math.max(...recent);
    const range = max - min;
    const isFlat = range < 0.0001;
    const pad = 2;
    const w = width - pad * 2;
    const h = height - pad * 2;

    const pts = recent.map((v, i) => ({
      x: pad + (i / (recent.length - 1)) * w,
      y: isFlat
        ? height / 2
        : pad + h - ((v - min) / range) * h,
    }));

    // Auto-detect direction unless overridden
    const calculatedTrend: "up" | "down" | "flat" = isFlat
      ? "flat"
      : pts[pts.length - 1].y < pts[0].y
      ? "up"
      : "down";

    const finalTrend = trend && trend !== "flat" ? trend : calculatedTrend;

    const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const areaD = pathD + ` L${pts[pts.length - 1].x.toFixed(1)},${height} L${pts[0].x.toFixed(1)},${height} Z`;

    return { pts, finalTrend, isFlat, pathD, areaD };
  }, [data, price, dayChange, trend, width, height]);

  if (!result) {
    return <span className="text-[13px] text-muted-foreground">—</span>;
  }

  const { pts, finalTrend, isFlat, pathD, areaD } = result;
  const color = isFlat
    ? "hsl(var(--muted-foreground))"
    : finalTrend === "up"
    ? "hsl(152 60% 42%)"
    : "hsl(var(--destructive))";

  const gradId = `${uid}-${finalTrend}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={isFlat ? 0.05 : 0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {!isFlat && <path d={areaD} fill={`url(#${gradId})`} />}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2" fill={color} />
    </svg>
  );
};

const ChangeCell = ({ change, pct }: { change: number; pct: number }) => {
  if (change > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold tabular-nums">
        <TrendingUp className="h-3 w-3 shrink-0" /> +{formatNumber(pct)}%
      </span>
    );
  if (change < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-destructive text-[11px] font-semibold tabular-nums">
        <TrendingDown className="h-3 w-3" /> {formatNumber(pct)}%
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-muted-foreground text-[11px]">
      <Minus className="h-3 w-3" /> 0.00%
    </span>
  );
};

export const StocksPage = ({ desktopDemo = false }: { desktopDemo?: boolean }) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  useDocumentTitle(
    "NSE Share Prices Today – Nairobi Securities Exchange Stocks (2026)",
    "Track live Nairobi Securities Exchange (NSE) share prices today, daily gainers and losers, market cap, P/E ratios, and dividend yields for Safaricom (SCOM), Equity (EQTY), KCB, EABL, and all Kenyan listed stocks.",
    {
      title: "NSE Share Prices Today – Kenyan Stocks & Dividend Yields",
      description: "Track Nairobi Securities Exchange (NSE) share prices, daily movement, volume, market cap, P/E ratios, and dividend yields in Kenya.",
    },
  );

  const { user, loading: authLoading } = useAuth();
  const isGated = !authLoading && !user && !isBotOrPrerender();
  const { entries: favEntries, isFavourite, toggle: toggleFavourite } = useAssetWatchlist("stock");
  const [initialPageMemory] = useState(() => getMarketPageMemory<StocksPageMemory>("stocks"));
  const [cachedStocks] = useState(() => stockCache.loadStocks());
  const [stocks, setStocks] = useState<Stock[]>(() => {
    if (initialPageMemory?.stocks && initialPageMemory.stocks.length > 0) return initialPageMemory.stocks;
    if (cachedStocks?.stocks && cachedStocks.stocks.length > 0) return cachedStocks.stocks;
    return FALLBACK_KENYAN_STOCKS;
  });

  const stocksJsonLd = useMemo(() => {
    const sorted = [...stocks].sort((a, b) => Number(b.market_cap ?? 0) - Number(a.market_cap ?? 0));
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Dataset",
          name: "Nairobi Securities Exchange (NSE) Share Prices & Market Data",
          description:
            "Daily share prices, price changes, trading volume, market capitalisation, P/E ratios, and dividend yields for companies listed on the Nairobi Securities Exchange (NSE) in Kenya.",
          url: "https://kenyafundfinder.com/stocks",
          creator: { "@type": "Organization", name: "Kenya Fund Finder", url: "https://kenyafundfinder.com/" },
        },
        {
          "@type": "ItemList",
          name: "Top Nairobi Securities Exchange (NSE) Companies by Market Cap",
          numberOfItems: sorted.length,
          itemListElement: sorted.slice(0, 50).map((s, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            name: `${s.name} (${s.symbol})`,
            url: `https://kenyafundfinder.com/stocks/${encodeURIComponent(s.symbol)}`,
          })),
        },
      ],
    };
  }, [stocks]);

  useJsonLd(stocksJsonLd);
  const [marketHistory, setMarketHistory] = useState<any[]>(initialPageMemory?.marketHistory ?? []);
  const [loading, setLoading] = useState(false);
  const [marketHistoryReady, setMarketHistoryReady] = useState(true);
  const [sparklineHistoryReady, setSparklineHistoryReady] = useState(true);
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("market_cap");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, PriceHistory[]>>(() => {
    if (initialPageMemory?.history && Object.keys(initialPageMemory.history).length > 0) {
      return initialPageMemory.history;
    }
    const cachedBulk = stockCache.loadStockHistoryBulk();
    if (cachedBulk && Object.keys(cachedBulk).length > 0) {
      return cachedBulk;
    }
    return {};
  });
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);
  const [mobileMovement, setMobileMovement] = useState<"all" | "gainers" | "losers" | "unchanged">("all");
  const [sectorSheetOpen, setSectorSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");

  useEffect(() => {
    if (desktopDemo && isMobile) navigate("/stocks", { replace: true });
  }, [desktopDemo, isMobile, navigate]);

  useEffect(() => {
    let fetchingStocks = false;
    let disposed = false;
    const fetchStocks = async () => {
      if (fetchingStocks || disposed) return;
      fetchingStocks = true;
      try {
        let fetchedData: any[] = [];

        // 1. Primary: Edge function gateway
        try {
          const { data } = await fetchPublicData<any>("stocks", {
            select: [
              "id", "symbol", "name", "sector", "price", "previous_price",
              "day_change", "day_change_percent", "volume", "market_cap",
              "year_high", "year_low", "pe_ratio", "dividend_yield", "logo_url", "updated_at",
            ],
            order: "sort_order.asc",
            limit: 200,
          });
          if (Array.isArray(data) && data.length > 0) {
            fetchedData = data;
          }
        } catch (gwErr) {
          console.warn("fetchPublicData gateway failed, trying direct table fallback:", gwErr);
        }

        // 2. Direct Supabase table fallback if gateway failed
        if (fetchedData.length === 0) {
          try {
            const { data, error } = await supabase
              .from("stocks")
              .select("id, symbol, name, sector, price, previous_price, day_change, day_change_percent, volume, market_cap, year_high, year_low, pe_ratio, dividend_yield, logo_url, updated_at")
              .order("sort_order", { ascending: true })
              .limit(200);
            if (!error && Array.isArray(data) && data.length > 0) {
              fetchedData = data;
            }
          } catch (dbErr) {
            console.warn("Direct stocks query failed:", dbErr);
          }
        }

        // 3. Cached or curated fallback if offline
        if (fetchedData.length === 0) {
          const cached = stockCache.loadStocks();
          if (cached?.stocks && cached.stocks.length > 0) {
            fetchedData = cached.stocks;
          } else {
            fetchedData = FALLBACK_KENYAN_STOCKS;
          }
        }

        const normalized = fetchedData.map(normalizeStock);
        if (normalized.length === 0) throw new Error("No stock data returned from any source");
        if (disposed) return;
        setStocks(normalized);
        stockCache.saveStocks(normalized);
      } catch (e) {
        console.error("Failed to load stocks", e);
      } finally {
        fetchingStocks = false;
        if (!disposed) setLoading(false);
      }
    };
    
    const fetchMarketHistory = async () => {
      try {
        const { data } = await supabase
          .from("market_summary_history" as any)
          .select("*")
          .order("date", { ascending: true })
          .limit(30);
        if (data) setMarketHistory(data);
      } catch (e) {
        console.error("Failed to load market history", e);
      } finally {
        setMarketHistoryReady(true);
      }
    };

    fetchStocks();
    fetchMarketHistory();
    const stopRefresh = startMarketRefresh(fetchStocks);
    const ch = supabase
      .channel("stocks-page-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "stocks" }, () => fetchStocks())
      .subscribe();
    return () => {
      disposed = true;
      stopRefresh();
      supabase.removeChannel(ch);
    };
  }, [cachedStocks]);

  // Preload sparkline data for all stocks (recent window via gateway).
  useEffect(() => {
    if (stocks.length === 0) return;
    let cancelled = false;
    const fetchAllHistory = async () => {
      try {
        const { data } = await fetchPublicData<any>("stock-history-bulk", {
          select: ["stock_id", "price", "snapshot_date"],
          order: "snapshot_date.desc",
          days: 30,
          limit: 3000,
        });
        if (Array.isArray(data)) {
          const grouped: Record<string, PriceHistory[]> = {};
          data.forEach((d: any) => {
            const sid = d.stock_id;
            if (!grouped[sid]) grouped[sid] = [];
            grouped[sid].push({ snapshot_date: d.snapshot_date, price: Number(d.price) });
          });
          for (const sid of Object.keys(grouped)) {
            grouped[sid].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
          }
          stockCache.saveStockHistoryBulk(grouped);
          if (!cancelled) setHistory(grouped);
        }
      } catch (e) {
        console.error("Failed to load stock sparkline data", e);
      } finally {
        if (!cancelled) setSparklineHistoryReady(true);
      }
    };
    fetchAllHistory();
    return () => {
      cancelled = true;
    };
  }, [stocks.length]);

  const toggleExpand = async (stockId: string) => {
    if (expanded === stockId) {
      setExpanded(null);
      return;
    }
    setExpanded(stockId);
    if (!history[stockId]) {
      setHistoryLoading(stockId);
      try {
        const { data } = await fetchPublicData<any>("stock-history", {
          select: ["price", "snapshot_date"],
          id: stockId,
          days: 90,
          order: "snapshot_date.asc",
          limit: 200,
        });
        setHistory((prev) => ({
          ...prev,
          [stockId]: data.map((d: any) => ({ snapshot_date: d.snapshot_date, price: Number(d.price) })),
        }));
      } catch (e) {
        console.error("Failed to load stock history", e);
      } finally {
        setHistoryLoading(null);
      }
    }
  };

  const sectors = useMemo(() => {
    const s = new Set(stocks.map((st) => st.sector));
    return ["All", ...Array.from(s).sort()];
  }, [stocks]);

  const sectorStockCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of stocks) {
      if (s.sector) {
        map[s.sector] = (map[s.sector] || 0) + 1;
      }
    }
    return map;
  }, [stocks]);

  const defaultSortedStocks = useMemo(
    () => [...stocks].sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0)),
    [stocks],
  );
  const isStocksGated = isGated && defaultSortedStocks.length > 3;
  const teaserStocks = useMemo(
    () => (isStocksGated ? defaultSortedStocks.slice(3, 5) : []),
    [isStocksGated, defaultSortedStocks],
  );

  const filtered = useMemo(() => {
    let result = isStocksGated ? defaultSortedStocks.slice(0, 3) : stocks;
    if (sector !== "All") result = result.filter((s) => s.sector === sector);
    if (mobileMovement === "gainers") result = result.filter((s) => s.day_change > 0);
    else if (mobileMovement === "losers") result = result.filter((s) => s.day_change < 0);
    else if (mobileMovement === "unchanged") result = result.filter((s) => s.day_change === 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    const mul = sortDir === "asc" ? 1 : -1;
    result = [...result].sort((a, b) => {
      if (sortKey === "symbol") return mul * a.symbol.localeCompare(b.symbol);
      const av = (a[sortKey] as number) ?? 0;
      const bv = (b[sortKey] as number) ?? 0;
      return mul * (av - bv);
    });
    return result;
  }, [stocks, defaultSortedStocks, isStocksGated, sector, search, sortKey, sortDir, mobileMovement]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "symbol" ? "asc" : "desc");
    }
  };

  const displayStocks = isStocksGated ? filtered.slice(0, 3) : filtered;

  const gainers = useMemo(() => stocks.filter((s) => s.day_change > 0).length, [stocks]);
  const losers = useMemo(() => stocks.filter((s) => s.day_change < 0).length, [stocks]);
  const unchanged = useMemo(() => stocks.filter((s) => s.day_change === 0).length, [stocks]);
  const totalVolume = useMemo(() => stocks.reduce((sum, s) => sum + s.volume, 0), [stocks]);

  const latestUpdate =
    stocks.length > 0
      ? toLastWeekday(stocks.reduce((latest, s) => (s.updated_at > latest ? s.updated_at : latest), stocks[0].updated_at))
      : null;

  const maxMarketCap = useMemo(() => Math.max(...stocks.map((s) => s.market_cap || 0)), [stocks]);
  const pageLoading = loading || !marketHistoryReady || !sparklineHistoryReady;
  const showPageLoading = useMinimumLoadingDuration(pageLoading);

  useEffect(() => {
    if (!pageLoading) {
      setMarketPageMemory<StocksPageMemory>("stocks", { stocks, marketHistory, history });
    }
  }, [history, marketHistory, pageLoading, stocks]);

  if (desktopDemo) {
    if (isMobile) return null;
    return (
      <MobileInspiredDesktopDemo
        stocks={stocks}
        filtered={filtered}
        history={history}
        loading={loading}
        latestUpdate={latestUpdate}
        search={search}
        setSearch={setSearch}
        sector={sector}
        setSector={setSector}
        sectors={sectors}
        movement={mobileMovement}
        setMovement={setMobileMovement}
        gainers={gainers}
        losers={losers}
        unchanged={unchanged}
        sortKey={sortKey}
        toggleSort={toggleSort}
        maxMarketCap={maxMarketCap}
        signedIn={Boolean(user)}
        favouriteEntries={favEntries}
        isFavourite={isFavourite}
        toggleFavourite={toggleFavourite}
        navigate={navigate}
      />
    );
  }

  if (showPageLoading) {
    return (
      <div className="min-h-screen px-4 md:px-6 py-5 md:py-6">
        <MarketPageLoader message="Loading latest stock data…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-in fade-in-50 duration-500">
      <div className="px-4 md:px-6 py-5 md:py-6">
        {/* Semantic title for A11y & SEO */}
        <h1 className="sr-only">Kenyan Stocks</h1>

        <div className="md:hidden mb-3">
          <p className="text-sm text-muted-foreground">
            Live Nairobi Securities Exchange (NSE) share prices and daily market movements.
          </p>
        </div>

        {/* Desktop Header Live Status */}
        <div className="hidden md:flex justify-end items-center mb-4">
          <SectionLiveStatus section="stocks" fallbackDate={latestUpdate} isLoading={loading} />
        </div>
        
        {/* Market Summary for Desktop */}
        <div className="hidden md:block">
          <MarketSummary stocks={stocks as any} history={marketHistory} />
        </div>

        <ActiveAlertsCard assetType="stock" />

        {user && favEntries.length > 0 && <StockFavourites entries={favEntries} stocks={stocks} />}

        {/* Horizontal Tabs for Sectors (Desktop only) */}
        <div className="hidden md:block w-full overflow-x-auto scrollbar-hide mb-6 border-b border-border">
          <div className="flex items-center gap-6 min-w-max px-1">
            {sectors.map((s) => {
              const active = sector === s;
              return (
                <button
                  key={s}
                  onClick={() => setSector(s)}
                  className={`relative pb-3 text-[14px] font-medium transition-colors ${
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s}
                  {active && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-accent rounded-t-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop Premium Toolbar */}
        <div className="hidden md:flex items-center justify-between gap-4 mb-6 bg-card border border-border/40 p-1.5 rounded-xl shadow-sm">
          <div className="flex items-center gap-1 pl-1">

            {/* Movement segmented control */}
            {sector === "All" && (
              <div className="inline-flex items-center gap-1">
                {([
                  { key: "all", label: "All", count: stocks.length },
                  { key: "gainers", label: "Gainers", count: gainers },
                  { key: "losers", label: "Losers", count: losers },
                  { key: "unchanged", label: "Unchanged", count: unchanged },
                ] as const).map((opt) => {
                  const active = mobileMovement === opt.key;
                  let activeStyle = "bg-muted text-foreground";
                  if (opt.key === "gainers") activeStyle = "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 shadow-sm";
                  if (opt.key === "losers") activeStyle = "bg-destructive/15 text-destructive shadow-sm";
                  if (opt.key === "unchanged") activeStyle = "bg-muted-foreground/15 text-foreground shadow-sm";
                  
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setMobileMovement(opt.key)}
                      className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[13px] font-medium transition-all whitespace-nowrap ${
                        active ? activeStyle : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                    >
                      {opt.key === "gainers" && <TrendingUp className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-60"}`} />}
                      {opt.key === "losers" && <TrendingDown className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-60"}`} />}
                      {opt.key === "unchanged" && <Minus className={`h-3.5 w-3.5 ${active ? "opacity-100" : "opacity-60"}`} />}
                      {opt.label}
                      <span className={`text-[11px] tabular-nums ${active ? "opacity-90" : "opacity-50"}`}>{opt.count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pr-1">
            {/* Search bar */}
            <div className="relative w-[220px] shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70" />
              <Input
                placeholder="Search symbol or company"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-[13px] rounded-md bg-transparent border-border/40 w-full placeholder:text-muted-foreground/50 hover:border-border transition-colors focus-visible:ring-1"
              />
            </div>
            
            {/* View toggles */}
            <div className="flex items-center bg-muted/20 border border-border/40 rounded-md p-0.5 shrink-0">
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-[4px] transition-colors ${viewMode === "list" ? "bg-card text-foreground shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"}`}
                aria-label="List View"
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-[4px] transition-colors ${viewMode === "grid" ? "bg-card text-foreground shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"}`}
                aria-label="Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile: Filter Pills Row */}
        <div className="md:hidden mb-4 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {/* 1. All / Sector Pill (triggers Bottom Sheet) */}
          <button
            type="button"
            onClick={() => setSectorSheetOpen(true)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
              sector !== "All"
                ? "bg-emerald-600 text-white shadow-sm"
                : mobileMovement === "all"
                  ? "bg-foreground text-background shadow-sm"
                  : "border border-border bg-background text-muted-foreground hover:bg-muted/30 hover:text-foreground"
            }`}
          >
            <span>{sector === "All" ? "All" : sector}</span>
            <ChevronDown className={`h-3.5 w-3.5 ${sector !== "All" || mobileMovement === "all" ? "opacity-90" : "opacity-60"}`} />
            <span className={`text-[11px] tabular-nums font-normal ${sector !== "All" || mobileMovement === "all" ? "text-inherit opacity-90" : "text-muted-foreground/80"}`}>
              {sector === "All" ? stocks.length : (sectorStockCounts[sector] || 0)}
            </span>
          </button>

          {/* 2. Movement Quick Filters: Gainers, Losers, Unchanged */}
          {([
            { key: "gainers", label: "Gainers", count: gainers },
            { key: "losers", label: "Losers", count: losers },
            { key: "unchanged", label: "Unchanged", count: unchanged },
          ] as const).map((opt) => {
            const active = mobileMovement === opt.key && sector === "All";
            return (
              <button
                key={opt.key}
                type="button"
                onClick={(e) => {
                  setSector("All");
                  setMobileMovement(opt.key);
                  e.currentTarget.scrollIntoView({
                    behavior: "smooth",
                    inline: "center",
                    block: "nearest",
                  });
                }}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "border border-border bg-background text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                }`}
              >
                {opt.key === "gainers" && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
                {opt.key === "losers" && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
                {opt.key === "unchanged" && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                <span>{opt.label}</span>
                <span className={`text-[11px] tabular-nums font-normal ${active ? "text-background/80" : "text-muted-foreground/80"}`}>
                  {opt.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sector Bottom Sheet */}
        <Sheet open={sectorSheetOpen} onOpenChange={setSectorSheetOpen}>
          <SheetContent side="bottom" hideCloseButton className="rounded-t-3xl border-border max-h-[80vh] overflow-y-auto px-5 pt-4 pb-8">
            <SheetHeader className="text-left pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <SheetTitle className="text-base font-bold text-foreground">Filter by Sector</SheetTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Select an industry to filter listed companies</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSectorSheetOpen(false)}
                  className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-1.5">
                {sectors.map((s) => {
                  const active = sector === s;
                  const count = s === "All" ? stocks.length : (sectorStockCounts[s] || 0);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setSector(s);
                        if (s === "All") setMobileMovement("all");
                        setSectorSheetOpen(false);
                      }}
                      className={`flex items-center justify-between w-full px-4 py-3 rounded-2xl text-left text-sm font-semibold transition-all ${
                        active
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-muted/40 hover:bg-muted text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`h-2 w-2 rounded-full ${active ? "bg-white" : "bg-emerald-500"}`} />
                        <span>{s === "All" ? "All Sectors" : s}</span>
                      </div>
                      <span className={`text-xs tabular-nums px-2 py-0.5 rounded-full font-medium ${
                        active ? "bg-white/20 text-white" : "bg-background text-muted-foreground"
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {sector !== "All" && (
                <button
                  type="button"
                  onClick={() => {
                    setSector("All");
                    setMobileMovement("all");
                    setSectorSheetOpen(false);
                  }}
                  className="w-full h-10 rounded-full border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Reset to All Stocks ({stocks.length})
                </button>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Mobile Live Status (Between filter pills and first card) */}
        <div className="md:hidden mb-3.5 flex items-center justify-between px-0.5">
          <SectionLiveStatus section="stocks" fallbackDate={latestUpdate} isLoading={loading} className="w-full justify-between" />
        </div>

        {/* Desktop View */}
        <div className="hidden md:block mb-10">
          {loading ? (
            viewMode === "list" ? <StockTableSkeleton /> : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-5 h-[220px]"><Skeleton className="h-full w-full" /></div>
                ))}
              </div>
            )
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-border bg-card text-center py-14">
              <p className="text-sm text-muted-foreground">No stocks found</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayStocks.map((s) => (
                <DesktopStockCard
                  key={s.id}
                  stock={s}
                  onNavigate={() => navigate(`/stocks/${s.symbol}`)}
                  history={history[s.id]}
                  isFavourite={user ? isFavourite(s.id) : undefined}
                  onToggleFavourite={user ? () => toggleFavourite(s.id, `${s.symbol} - ${s.name}`) : undefined}
                />
              ))}
              {isStocksGated && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none select-none blur-[2px] opacity-40 rounded-xl border border-border bg-card p-5 h-[220px] flex flex-col justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted" />
                    <div className="space-y-1">
                      <div className="h-4 w-24 bg-muted rounded" />
                      <div className="h-3 w-16 bg-muted rounded" />
                    </div>
                  </div>
                  <div className="h-6 w-20 bg-muted rounded" />
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <colgroup>
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "7%" }} />
                    {user && <col style={{ width: "4%" }} />}
                  </colgroup>
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/55 text-[12px] text-muted-foreground dark:bg-muted/10">
                      <th className="text-left pl-5 pr-2 py-3 font-normal cursor-pointer hover:text-foreground" onClick={() => toggleSort("symbol")}>
                        <span className="inline-flex items-center gap-1">Company {sortKey === "symbol" && <ArrowUpDown className="h-3 w-3 text-accent" />}</span>
                      </th>
                      <th className="text-left px-3 py-3 font-normal cursor-pointer hover:text-foreground" onClick={() => toggleSort("price")}>
                        <span className="inline-flex items-center gap-1">Last Price {sortKey === "price" && <ArrowUpDown className="h-3 w-3 text-accent" />}</span>
                      </th>
                      <th className="text-left px-3 py-3 font-normal cursor-pointer hover:text-foreground" onClick={() => toggleSort("day_change_percent")}>
                        <span className="inline-flex items-center gap-1">1D Return {sortKey === "day_change_percent" && <ArrowUpDown className="h-3 w-3 text-accent" />}</span>
                      </th>
                      <th className="text-left px-3 py-3 font-normal">7D Return</th>
                      <th className="text-left px-3 py-3 font-normal">1M Return</th>
                      <th className="text-left px-3 py-3 font-normal">3M Return</th>
                      <th className="text-left px-3 py-3 font-normal">52W Range</th>
                      <th className="text-left px-3 py-3 font-normal cursor-pointer hover:text-foreground" onClick={() => toggleSort("volume")}>
                        <span className="inline-flex items-center gap-1">Volume {sortKey === "volume" && <ArrowUpDown className="h-3 w-3 text-accent" />}</span>
                      </th>
                      <th className="text-left px-3 py-3 font-normal cursor-pointer hover:text-foreground whitespace-nowrap" onClick={() => toggleSort("market_cap")}>
                        <span className="inline-flex items-center gap-1">Market Cap <span className="inline-flex items-center justify-center w-3 h-3 rounded-full border border-muted-foreground/60 text-[8px]">i</span> {sortKey === "market_cap" && <ArrowUpDown className="h-3 w-3 text-accent" />}</span>
                      </th>
                      <th className="text-left px-3 py-3 font-normal">
                        <span className="inline-flex items-center gap-1">Valuation <span className="inline-flex items-center justify-center w-3 h-3 rounded-full border border-muted-foreground/60 text-[8px]">i</span></span>
                      </th>
                      <th className="text-left px-3 py-3 font-normal">Industry</th>
                      {user && <th className="w-10"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {displayStocks.map((s, i) => (
                      <DesktopStockRow
                        key={s.id}
                        stock={s}
                        index={i}
                        isExpanded={expanded === s.id}
                        onToggle={() => toggleExpand(s.id)}
                        onNavigate={() => navigate(`/stocks/${s.symbol}`)}
                        history={history[s.id]}
                        historyLoading={historyLoading === s.id}
                        isFavourite={user ? isFavourite(s.id) : undefined}
                        onToggleFavourite={user ? () => toggleFavourite(s.id, `${s.symbol} - ${s.name}`) : undefined}
                        maxMarketCap={maxMarketCap}
                      />
                    ))}
                    {isStocksGated && teaserStocks.map((s, idx) => (
                      <tr
                        key={`stock-teaser-${s.id || idx}`}
                        aria-hidden="true"
                        className="pointer-events-none select-none blur-[2px] opacity-40 bg-card border-b border-border/40"
                      >
                        <td className="pl-5 pr-2 py-3.5">
                          <div className="font-semibold text-foreground text-sm">{s.symbol}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{s.name}</div>
                        </td>
                        <td className="px-3 py-3.5 font-semibold text-sm">KSh •••.••</td>
                        <td className="px-3 py-3.5 font-semibold text-sm text-emerald-500">+•.••%</td>
                        <td className="px-3 py-3.5 text-muted-foreground">—</td>
                        <td className="px-3 py-3.5 text-muted-foreground">—</td>
                        <td className="px-3 py-3.5 text-muted-foreground">—</td>
                        <td className="px-3 py-3.5 text-muted-foreground">—</td>
                        <td className="px-3 py-3.5 text-muted-foreground">•••K</td>
                        <td className="px-3 py-3.5 text-muted-foreground">KSh ••.•B</td>
                        <td className="px-3 py-3.5 text-muted-foreground">••.•</td>
                        <td className="px-3 py-3.5 text-muted-foreground">•••</td>
                        {user && <td />}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {isStocksGated && (
          <div className="hidden md:block mb-8">
            <InlineDataGate
              category="stocks"
              totalCount={stocks.length}
              visibleCount={3}
              title="Unlock All 60+ NSE Stocks & Live Market Data"
              description="Showing top 3 stocks. Create a free account to track live prices, price alerts, full valuation ratios, and daily market movers."
            />
          </div>
        )}

        {/* Mobile Cards */}
        <div className="md:hidden space-y-2.5">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-3.5">
                <Skeleton className="h-5 w-20 mb-2" />
                <Skeleton className="h-4 w-40 mb-3" />
                <Skeleton className="h-12 rounded-lg" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-border bg-card text-center py-14">
              <p className="text-sm text-muted-foreground">No stocks found</p>
            </div>
          ) : (
            <>
              {displayStocks.map((s) => (
                <MobileStockCard
                  key={s.id}
                  stock={s}
                  onNavigate={() => navigate(`/stocks/${s.symbol}`)}
                  history={history[s.id]}
                  isFavourite={user ? isFavourite(s.id) : undefined}
                  onToggleFavourite={user ? () => toggleFavourite(s.id, `${s.symbol} - ${s.name}`) : undefined}
                />
              ))}
              {isStocksGated && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none select-none blur-[2px] opacity-40 rounded-xl border border-border bg-card p-4 space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-28 bg-muted rounded" />
                    <div className="h-5 w-16 bg-muted rounded" />
                  </div>
                  <div className="h-3 w-40 bg-muted rounded" />
                </div>
              )}
              {isStocksGated && (
                <InlineDataGate
                  category="stocks"
                  totalCount={stocks.length}
                  visibleCount={3}
                  title="Unlock All 60+ NSE Stocks & Live Market Data"
                  description="Showing top 3 stocks. Create a free account to track live prices, price alerts, full valuation ratios, and daily market movers."
                />
              )}
            </>
          )}
        </div>

        {/* Summary footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-4 px-1">
          <span>
            {isStocksGated
              ? `Showing ${displayStocks.length} of ${stocks.length} stocks (preview)`
              : `Showing ${filtered.length} of ${stocks.length} stocks`}
          </span>
        </div>

        <div className="mt-4 rounded-lg bg-muted/40 border border-border/50 p-3">
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Stock prices shown are indicative and may be delayed. Data is sourced from the Kenyan stock market. Click on
            any stock to view price history and detailed metrics. This information is for educational purposes only.
          </p>
        </div>
      </div>
    </div>
  );
};

const MobileInspiredDesktopDemo = ({
  stocks,
  filtered,
  history,
  loading,
  latestUpdate,
  search,
  setSearch,
  sector,
  setSector,
  sectors,
  movement,
  setMovement,
  gainers,
  losers,
  unchanged,
  sortKey,
  toggleSort,
  maxMarketCap,
  signedIn,
  favouriteEntries,
  isFavourite,
  toggleFavourite,
  navigate,
}: {
  stocks: Stock[];
  filtered: Stock[];
  history: Record<string, PriceHistory[]>;
  loading: boolean;
  latestUpdate: string | null;
  search: string;
  setSearch: (value: string) => void;
  sector: string;
  setSector: (value: string) => void;
  sectors: string[];
  movement: "all" | "gainers" | "losers" | "unchanged";
  setMovement: (value: "all" | "gainers" | "losers" | "unchanged") => void;
  gainers: number;
  losers: number;
  unchanged: number;
  sortKey: SortKey;
  toggleSort: (key: SortKey) => void;
  maxMarketCap: number;
  signedIn: boolean;
  favouriteEntries: WatchlistEntry[];
  isFavourite: (id: string) => boolean;
  toggleFavourite: (id: string, name: string) => Promise<void>;
  navigate: (path: string) => void;
}) => {
  const movementOptions = [
    { key: "all", label: "All", count: stocks.length },
    { key: "gainers", label: "Gainers", count: gainers },
    { key: "losers", label: "Losers", count: losers },
    { key: "unchanged", label: "Unchanged", count: unchanged },
  ] as const;

  return (
    <div className="min-h-screen bg-background px-6 py-7 text-foreground">
      <div className="mx-auto max-w-[1500px]">
        <h1 className="sr-only">Kenyan Stocks</h1>
        <div className="mb-5 flex items-center justify-end">
          <SectionLiveStatus section="stocks" fallbackDate={latestUpdate} isLoading={loading} />
        </div>

        <ActiveAlertsCard assetType="stock" />
        {signedIn && favouriteEntries.length > 0 && <StockFavourites entries={favouriteEntries} stocks={stocks} />}

        <div className="mb-4 mt-5 flex items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
            <Input placeholder="Search stocks..." value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 w-full rounded-full border-border/80 bg-card pl-11 text-[15px] shadow-sm placeholder:text-muted-foreground/60 focus-visible:ring-1" />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <button type="button" className="relative inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-border/80 bg-card px-5 text-sm font-semibold shadow-sm transition-colors hover:bg-muted/40">
                <SlidersHorizontal className="h-4 w-4" /> Filter
                {sector !== "All" && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500" />}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[70vh] rounded-t-2xl border-border p-5">
              <SheetHeader className="border-b border-border/50 pb-3 text-left"><SheetTitle className="text-base font-bold">Filters</SheetTitle></SheetHeader>
              <div className="mt-4">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sector</h4>
                <div className="flex flex-wrap gap-2">
                  {sectors.map((item) => <button key={item} type="button" onClick={() => setSector(item)} className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${sector === item ? "bg-emerald-600 text-white" : "bg-muted/60 text-muted-foreground hover:text-foreground"}`}>{item}</button>)}
                </div>
                <SheetClose asChild><button type="button" className="mt-5 h-11 w-full rounded-full bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700">Apply Filters</button></SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto py-0.5 scrollbar-hide">
          {movementOptions.map((option) => (
            <button key={option.key} onClick={() => setMovement(option.key)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${movement === option.key ? "bg-foreground text-background shadow-sm" : "bg-muted/60 text-muted-foreground hover:text-foreground"}`}>
              {option.key === "gainers" && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
              {option.key === "losers" && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
              {option.key === "unchanged" && <Minus className="h-3.5 w-3.5" />}
              <span>{option.label}</span><span className="font-normal opacity-75">{option.count}</span>
            </button>
          ))}
        </div>

        {loading ? <StockTableSkeleton /> : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-16 text-center text-sm text-muted-foreground">No stocks found</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1240px] text-sm">
                <colgroup><col style={{ width: "18%" }} /><col style={{ width: "8%" }} /><col style={{ width: "7%" }} /><col style={{ width: "7%" }} /><col style={{ width: "7%" }} /><col style={{ width: "7%" }} /><col style={{ width: "10%" }} /><col style={{ width: "8%" }} /><col style={{ width: "9%" }} /><col style={{ width: "7%" }} /><col style={{ width: "7%" }} />{signedIn && <col style={{ width: "4%" }} stroke-none="true" />}</colgroup>
                <thead><tr className="border-b border-border/60 bg-muted/55 text-[12px] text-muted-foreground dark:bg-muted/10">
                  <th className="cursor-pointer py-3 pl-5 pr-2 text-left font-normal hover:text-foreground" onClick={() => toggleSort("symbol")}>Company {sortKey === "symbol" && <ArrowUpDown className="ml-1 inline h-3 w-3 text-accent" />}</th>
                  <th className="cursor-pointer px-3 py-3 text-left font-normal hover:text-foreground" onClick={() => toggleSort("price")}>Last Price</th>
                  <th className="cursor-pointer px-3 py-3 text-left font-normal hover:text-foreground" onClick={() => toggleSort("day_change_percent")}>1D Return</th>
                  <th className="px-3 py-3 text-left font-normal">7D Return</th><th className="px-3 py-3 text-left font-normal">1M Return</th><th className="px-3 py-3 text-left font-normal">3M Return</th><th className="px-3 py-3 text-left font-normal">52W Range</th>
                  <th className="cursor-pointer px-3 py-3 text-left font-normal hover:text-foreground" onClick={() => toggleSort("volume")}>Volume</th>
                  <th className="cursor-pointer px-3 py-3 text-left font-normal hover:text-foreground" onClick={() => toggleSort("market_cap")}>Market Cap</th>
                  <th className="px-3 py-3 text-left font-normal">Valuation</th><th className="px-3 py-3 text-left font-normal">Industry</th>{signedIn && <th />}
                </tr></thead>
                <tbody>
                  {(signedIn ? filtered : filtered.slice(0, 3)).map((stock, index) => (
                    <DesktopStockRow
                      key={stock.id}
                      stock={stock}
                      index={index}
                      isExpanded={false}
                      onToggle={() => undefined}
                      onNavigate={() => navigate(`/stocks/${stock.symbol}`)}
                      history={history[stock.id]}
                      historyLoading={false}
                      isFavourite={signedIn ? isFavourite(stock.id) : undefined}
                      onToggleFavourite={signedIn ? () => toggleFavourite(stock.id, `${stock.symbol} - ${stock.name}`) : undefined}
                      maxMarketCap={maxMarketCap}
                    />
                  ))}
                  {!signedIn && stocks.length > 3 && stocks.slice(3, 5).map((s, idx) => (
                    <tr
                      key={`demo-teaser-${s.id || idx}`}
                      aria-hidden="true"
                      className="pointer-events-none select-none blur-[2px] opacity-40 bg-card border-b border-border/40"
                    >
                      <td className="py-3 pl-5 pr-2">
                        <div className="font-semibold text-foreground text-sm">{s.symbol}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{s.name}</div>
                      </td>
                      <td className="px-3 py-3 font-semibold text-sm">KSh •••.••</td>
                      <td className="px-3 py-3 font-semibold text-sm text-emerald-500">+•.••%</td>
                      <td className="px-3 py-3 text-muted-foreground">—</td>
                      <td className="px-3 py-3 text-muted-foreground">—</td>
                      <td className="px-3 py-3 text-muted-foreground">—</td>
                      <td className="px-3 py-3 text-muted-foreground">—</td>
                      <td className="px-3 py-3 text-muted-foreground">•••K</td>
                      <td className="px-3 py-3 text-muted-foreground">KSh ••.•B</td>
                      <td className="px-3 py-3 text-muted-foreground">••.•</td>
                      <td className="px-3 py-3 text-muted-foreground">•••</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!signedIn && filtered.length > 3 && (
          <div className="mt-4 mb-4">
            <InlineDataGate
              category="stocks"
              totalCount={stocks.length}
              visibleCount={3}
              title="Unlock All 60+ NSE Stocks & Live Market Data"
              description="Showing top 3 stocks. Create a free account to track live prices, price alerts, full valuation ratios, and daily market movers."
            />
          </div>
        )}

        <div className="mt-4 flex items-center justify-between px-1 text-xs text-muted-foreground"><span>Showing {filtered.length} of {stocks.length} stocks</span></div>
        <div className="mt-4 rounded-xl border border-border/50 bg-muted/40 p-3"><p className="text-[10px] leading-relaxed text-muted-foreground">Stock prices shown are indicative and may be delayed. Data is sourced from the Kenyan stock market. Click any stock to view price history and detailed metrics. This information is for educational purposes only.</p></div>
      </div>
    </div>
  );
};

/* ─── Stock Detail Panel ─── */
const StockDetailPanel = ({
  stock: s,
  history,
  historyLoading,
}: {
  stock: Stock;
  history?: PriceHistory[];
  historyLoading: boolean;
}) => {
  const yearRange = s.year_low != null && s.year_high != null;
  const pricePosition = yearRange ? ((s.price - s.year_low!) / (s.year_high! - s.year_low!)) * 100 : 0;

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <DetailBox label="Price" value={`KSh ${formatNumber(s.price)}`} />
        <DetailBox label="Previous" value={s.previous_price != null ? `KSh ${formatNumber(s.previous_price)}` : "—"} />
        <DetailBox
          label="Day Change"
          value={`${s.day_change > 0 ? "+" : ""}${formatNumber(s.day_change)}`}
          color={s.day_change > 0 ? "text-emerald-500" : s.day_change < 0 ? "text-destructive" : undefined}
        />
        <DetailBox label="Volume" value={formatVolume(s.volume)} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <DetailBox label="Market Cap" value={formatMarketCap(s.market_cap)} />
        <DetailBox label="P/E Ratio" value={s.pe_ratio != null ? formatNumber(s.pe_ratio) : "—"} />
        <DetailBox
          label="Div Yield"
          value={s.dividend_yield != null ? `${formatNumber(s.dividend_yield)}%` : "—"}
          color={s.dividend_yield != null ? "text-emerald-500" : undefined}
        />
        <DetailBox label="Sector" value={s.sector} />
      </div>

      {yearRange && (
        <div className="rounded-lg border border-border bg-card p-3 mb-4">
          <p className="text-xs font-semibold text-foreground mb-2">52-Week Range</p>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground tabular-nums w-16 text-right">
              {formatNumber(s.year_low!)}
            </span>
            <div className="flex-1 relative h-2 bg-muted rounded-full">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-destructive to-emerald-500 rounded-full"
                style={{ width: "100%" }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-foreground rounded-full border-2 border-card shadow-sm"
                style={{ left: `${Math.min(Math.max(pricePosition, 0), 100)}%`, transform: "translate(-50%, -50%)" }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums w-16">{formatNumber(s.year_high!)}</span>
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-1">Current: KSh {formatNumber(s.price)}</p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Price History (Last 90 Days)</span>
        </div>
        {historyLoading ? (
          <div className="h-[200px] flex items-center justify-center">
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
        ) : !history || history.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            No historical data available yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            {(() => {
              const todayIso = new Date().toISOString().split("T")[0];
              const effectiveHistory = [...history];
              if (effectiveHistory.length > 0 && effectiveHistory[effectiveHistory.length - 1].snapshot_date < todayIso) {
                effectiveHistory.push({ snapshot_date: todayIso, price: s.price });
              }
              return (
                <LineChart data={effectiveHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="snapshot_date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => formatMarketDate(v, "en-KE", { month: "short", day: "numeric" })}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    width={55}
                    tickFormatter={(v) => v.toFixed(1)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(v) =>
                      formatMarketDate(v, "en-KE", { month: "long", day: "numeric", year: "numeric" })
                    }
                    formatter={(value: number) => [`KSh ${formatNumber(value)}`, "Price"]}
                  />
                  <Line type="monotone" dataKey="price" stroke="hsl(152 60% 42%)" strokeWidth={2} dot={false} />
                </LineChart>
              );
            })()}
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex items-center justify-between mt-2">
        <p className="text-[10px] text-muted-foreground">
          Last updated: {formatMarketDateTime(s.updated_at)}
        </p>
        <CreateAlertDialog
          assetType="stock"
          assetId={s.id}
          assetName={`${s.symbol} - ${s.name}`}
          currentPrice={s.price}
          unit="KSh"
        />
      </div>
    </div>
  );
};

/* ─── Grid View Desktop Card ─── */
const DesktopStockCard = ({
  stock: s,
  onNavigate,
  history,
  isFavourite,
  onToggleFavourite,
}: {
  stock: Stock;
  onNavigate: () => void;
  history?: PriceHistory[];
  isFavourite?: boolean;
  onToggleFavourite?: () => void;
}) => (
  <Link
    to={`/stocks/${s.symbol}`}
    className="group flex flex-col rounded-2xl border border-border bg-card hover:border-accent/40 hover:shadow-md transition-all overflow-hidden relative"
  >
    <div className="p-4 flex-1 flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-inner ${getAvatarColor(s.symbol)}`}>
            {getInitials(s.name, s.symbol)}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-foreground text-base tracking-tight truncate">{s.symbol}</h3>
            <p className="text-xs text-muted-foreground truncate">{s.name}</p>
          </div>
        </div>
        {onToggleFavourite !== undefined && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavourite();
            }}
            className="p-1.5 -mr-1.5 rounded-full hover:bg-muted transition-colors z-10 shrink-0"
            aria-label={isFavourite ? "Remove from watchlist" : "Add to watchlist"}
          >
            <Star className={`h-4 w-4 transition-colors ${isFavourite ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/40 hover:text-yellow-500"}`} />
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center py-2">
        <div className="h-[40px] w-full flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
          <MiniSparkline
            data={history || []}
            price={s.price}
            dayChange={s.day_change}
            width={120}
            height={36}
          />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-x-2 gap-y-3">
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Price (KSh)</p>
          <p className="font-bold text-foreground text-sm tabular-nums">{formatNumber(s.price)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground mb-0.5">Return (1D)</p>
          <ChangeCell change={s.day_change} pct={s.day_change_percent} />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Market Cap</p>
          <p className="font-medium text-foreground text-xs tabular-nums">{formatMarketCap(s.market_cap)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground mb-0.5">P/E Ratio</p>
          <p className="font-medium text-foreground text-xs tabular-nums">{s.pe_ratio != null ? formatNumber(s.pe_ratio) : "—"}</p>
        </div>
      </div>
    </div>
  </Link>
);

/* ─── Shared components ─── */
const getReturnForDays = (history: PriceHistory[] | undefined, currentPrice: number, days: number): number | null => {
  if (!history || history.length === 0 || currentPrice <= 0) return null;
  const targetTime = Date.now() - days * 86400000;
  
  let oldPrice = 0;
  let minDiff = Infinity;
  const maxDiff = Math.max(7 * 86400000, days * 0.6 * 86400000);
  for (let i = 0; i < history.length; i++) {
    const ptTime = new Date(history[i].snapshot_date).getTime();
    if (isNaN(ptTime)) continue;
    const diff = Math.abs(ptTime - targetTime);
    if (diff < minDiff && diff <= maxDiff) {
      minDiff = diff;
      oldPrice = history[i].price;
    }
  }
  
  // Fallback to oldest snapshot if exact cutoff baseline not found
  if (oldPrice === 0 && history.length > 0) {
    const oldest = [...history].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))[0];
    if (oldest && oldest.price > 0) oldPrice = oldest.price;
  }

  if (oldPrice <= 0) return null;
  return ((currentPrice - oldPrice) / oldPrice) * 100;
};

/* ─── List View Desktop Row ─── */
const DesktopStockRow = ({
  stock: s,
  index,
  isExpanded,
  onToggle,
  onNavigate,
  history,
  historyLoading,
  isFavourite,
  onToggleFavourite,
  maxMarketCap,
}: {
  stock: Stock;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onNavigate: () => void;
  history?: PriceHistory[];
  historyLoading: boolean;
  isFavourite?: boolean;
  onToggleFavourite?: () => void;
  maxMarketCap: number;
}) => {
  const yearRange = s.year_low != null && s.year_high != null && s.year_high > s.year_low;
  const pricePosition = yearRange ? ((s.price - s.year_low!) / (s.year_high! - s.year_low!)) * 100 : 0;
  
  const return7d = getReturnForDays(history, s.price, 7);
  const return30d = getReturnForDays(history, s.price, 30);
  const return90d = getReturnForDays(history, s.price, 90);
  
  const displayName = s.name.length > 12 ? s.name.substring(0, 12) + "..." : s.name;
  const displaySector = (s.sector || "").replace(/Telecommunication(s?)/gi, "Telcom");

  return (
    <>
      <tr
        className={`border-b border-border/40 transition-colors cursor-pointer group bg-card hover:bg-muted/30`}
        onClick={onNavigate}
      >
        <td className="pl-5 pr-2 py-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[11px] shrink-0 shadow-inner ${getAvatarColor(s.symbol)}`}>
              {getInitials(s.name, s.symbol)}
            </div>
            <div className="min-w-0 flex flex-col justify-center leading-tight">
              <span className="font-bold text-foreground text-sm tracking-wide truncate">{s.symbol}</span>
              <span className="text-muted-foreground text-[12px] opacity-90 mt-0.5">{displayName}</span>
            </div>
          </div>
        </td>
        <td className="px-3 py-4 text-left">
          <span className="font-medium text-foreground text-[13px] tabular-nums">KSh {formatNumber(s.price)}</span>
        </td>
        <td className="px-3 py-4 text-left">
          <span className={`text-[13px] tabular-nums font-medium ${s.day_change > 0 ? "text-emerald-500" : s.day_change < 0 ? "text-destructive" : "text-muted-foreground"}`}>
            {s.day_change > 0 ? "+" : ""}{formatNumber(s.day_change_percent)}%
          </span>
        </td>
        <td className="px-3 py-4 text-left">
          {return7d != null ? (
            <span className={`text-[13px] tabular-nums font-medium ${return7d > 0 ? "text-emerald-500" : return7d < 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {return7d > 0 ? "+" : ""}{formatNumber(return7d)}%
            </span>
          ) : (
            <span className="text-muted-foreground text-[13px]">—</span>
          )}
        </td>
        <td className="px-3 py-4 text-left">
          {return30d != null ? (
            <span className={`text-[13px] tabular-nums font-medium ${return30d > 0 ? "text-emerald-500" : return30d < 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {return30d > 0 ? "+" : ""}{formatNumber(return30d)}%
            </span>
          ) : (
            <span className="text-muted-foreground text-[13px]">—</span>
          )}
        </td>
        <td className="px-3 py-4 text-left">
          {return90d != null ? (
            <span className={`text-[13px] tabular-nums font-medium ${return90d > 0 ? "text-emerald-500" : return90d < 0 ? "text-destructive" : "text-muted-foreground"}`}>
              {return90d > 0 ? "+" : ""}{formatNumber(return90d)}%
            </span>
          ) : (
            <span className="text-muted-foreground text-[13px]">—</span>
          )}
        </td>
        <td className="px-3 py-4 text-left">
          {yearRange ? (
            <span className="font-medium text-foreground text-[13px] tabular-nums whitespace-nowrap">
              {formatNumber(s.year_low!)} <span className="text-muted-foreground font-normal mx-0.5">-</span> {formatNumber(s.year_high!)}
            </span>
          ) : (
            <span className="text-muted-foreground text-[13px]">—</span>
          )}
        </td>
        <td className="px-3 py-4 text-left">
          <span className="font-medium text-muted-foreground text-[13px] tabular-nums">{formatVolume(s.volume)}</span>
        </td>
        <td className="px-3 py-4 text-left">
          <span className="font-medium text-muted-foreground text-[13px] tabular-nums">{formatMarketCap(s.market_cap)}</span>
        </td>
        <td className="px-3 py-4 text-left">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            {s.pe_ratio != null && (
              <span className="font-medium text-muted-foreground text-[13px] tabular-nums">
                PE {formatNumber(s.pe_ratio, 1)}
              </span>
            )}
            {s.pe_ratio != null && s.dividend_yield != null && s.dividend_yield > 0 && (
              <span className="text-muted-foreground/40 text-xs">•</span>
            )}
            {s.dividend_yield != null && s.dividend_yield > 0 && (
              <span className="font-medium text-muted-foreground text-[13px] tabular-nums">
                Div {formatNumber(s.dividend_yield, 1)}%
              </span>
            )}
            {s.pe_ratio == null && (s.dividend_yield == null || s.dividend_yield <= 0) && <span className="text-[13px] text-muted-foreground">—</span>}
          </div>
        </td>
        <td className="px-3 py-4 text-left">
          <span className="text-[13px] font-medium text-muted-foreground opacity-90 truncate max-w-[120px] block">
            {displaySector}
          </span>
        </td>
        {onToggleFavourite !== undefined && (
          <td className="px-3 py-4 text-right">
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onToggleFavourite();
              }}
              className="w-8 h-8 rounded-full border border-border/40 bg-muted/20 flex items-center justify-center hover:bg-muted transition-colors opacity-70 group-hover:opacity-100 focus:opacity-100"
              aria-label={isFavourite ? "Remove from watchlist" : "Add to watchlist"}
            >
              <Star
                className={`h-3.5 w-3.5 transition-colors ${isFavourite ? "text-yellow-500 fill-yellow-500 opacity-100" : "text-muted-foreground hover:text-yellow-500"}`}
              />
            </button>
          </td>
        )}
      </tr>
      {isExpanded && (
        <tr className="border-b border-border bg-muted/10">
          <td colSpan={onToggleFavourite !== undefined ? 11 : 10}>
            <StockDetailPanel stock={s} history={history} historyLoading={historyLoading} />
          </td>
        </tr>
      )}
    </>
  );
};

/* ─── Mobile Card ─── */
const MobileStockCard = ({
  stock: s,
  onNavigate,
  history,
  isFavourite,
  onToggleFavourite,
}: {
  stock: Stock;
  onNavigate: () => void;
  history?: PriceHistory[];
  isFavourite?: boolean;
  onToggleFavourite?: () => void;
}) => {
  const { add, remove, isSelected } = useUniversalCompare();
  const isCompared = isSelected(s.id);

  const handleToggleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCompared) {
      remove(s.id);
    } else {
      add({
        id: s.id,
        category: "stock",
        title: s.name,
        subtitle: s.symbol,
        data: s,
      });
    }
  };

  return (
    <Link
      to={`/stocks/${s.symbol}`}
      className={`block rounded-[20px] border bg-slate-50/80 dark:bg-card p-4 shadow-sm transition-all active:scale-[0.99] overflow-hidden mb-3 ${
        isCompared
          ? "border-emerald-500 ring-2 ring-emerald-500/20 dark:border-emerald-400 bg-emerald-500/[0.04]"
          : "border-border/80 hover:border-emerald-500/30"
      }`}
    >
      {/* Top Row: Symbol/Name (Left), Sparkline (Center), Price/Return (Right) */}
      <div className="flex items-center justify-between gap-2.5">
        {/* Symbol + Name */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <StockLogoAvatar stock={s} />
          <div className="min-w-0">
            <span className="block truncate font-extrabold text-base tracking-tight text-foreground">{s.symbol}</span>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.name}</p>
          </div>
        </div>

        {/* Sparkline in Center */}
        <div className="shrink-0 px-1 flex items-center justify-center min-w-[64px]">
          <MiniSparkline
            data={history || []}
            price={s.price}
            dayChange={s.day_change}
            width={64}
            height={24}
          />
        </div>

        {/* Price + Return % */}
        <div className="text-right shrink-0">
          <p className="font-extrabold text-foreground text-base tabular-nums">KES {formatNumber(s.price)}</p>
          <div className="mt-0.5 flex justify-end">
            <ChangeCell change={s.day_change} pct={s.day_change_percent} />
          </div>
        </div>
      </div>

      {/* Thin Divider Line */}
      <div className="border-t border-border/40 my-3" />

      {/* Bottom Section: Vol & Cap (with Star on right), Sector & Compare below */}
      <div className="space-y-2.5 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>
              Vol <strong className="font-semibold text-foreground ml-0.5">{formatVolume(s.volume)}</strong>
            </span>
            <span>
              Cap <strong className="font-semibold text-foreground ml-0.5">{formatMarketCap(s.market_cap)}</strong>
            </span>
          </div>

          {onToggleFavourite !== undefined && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavourite();
              }}
              className="p-1 -mr-1"
              aria-label={isFavourite ? "Remove from watchlist" : "Add to watchlist"}
            >
              <Star
                className={`h-4 w-4 transition-colors ${
                  isFavourite ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30 hover:text-yellow-500"
                }`}
              />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <span className="text-xs font-medium text-muted-foreground truncate max-w-[65%]">
            {s.sector || "General"}
          </span>

          <button
            type="button"
            onClick={handleToggleCompare}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
              isCompared
                ? "bg-emerald-600 text-white shadow-xs"
                : "border border-border/80 bg-background text-foreground hover:bg-muted"
            }`}
            aria-label={isCompared ? `Remove ${s.symbol} from compare` : `Compare ${s.symbol}`}
          >
            {isCompared ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <GitCompareArrows className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>{isCompared ? "Added" : "Compare"}</span>
          </button>
        </div>
      </div>
    </Link>
  );
};
/* ─── Shared components ─── */
const StatCard = ({
  label,
  value,
  icon,
  valueColor,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueColor?: string;
}) => (
  <div className="rounded-xl border border-border bg-card p-3.5 flex items-center gap-3">
    <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">{icon}</div>
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium leading-none mb-1">
        {label}
      </p>
      <p className={`text-lg font-bold tabular-nums leading-none ${valueColor || "text-foreground"}`}>{value}</p>
    </div>
  </div>
);

const DetailBox = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="bg-muted/40 rounded-lg px-3 py-2">
    <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
    <p className={`font-semibold text-sm tabular-nums ${color || "text-foreground"}`}>{value}</p>
  </div>
);

const SortHeader = ({
  label,
  sortKey,
  currentKey,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onClick: (key: SortKey) => void;
  align?: "left" | "right";
}) => (
  <th
    className={`px-3 py-3 font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none ${
      align === "right" ? "text-right" : "text-left"
    }`}
    onClick={() => onClick(sortKey)}
  >
    <span className="inline-flex items-center gap-1">
      {label}
      {currentKey === sortKey && <ArrowUpDown className="h-3 w-3 text-accent" />}
    </span>
  </th>
);

const StockTableSkeleton = () => (
  <div className="rounded-xl border border-border overflow-hidden bg-card">
    <div className="bg-muted/70 px-3 py-3">
      <div className="flex gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-16" />
        ))}
      </div>
    </div>
    {Array.from({ length: 8 }).map((_, i) => (
      <div
        key={i}
        className={`flex items-center gap-3 px-3 py-3.5 border-t border-border ${i % 2 !== 0 ? "bg-muted/20" : ""}`}
      >
        <Skeleton className="h-4 w-5" />
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-16 ml-auto" />
      </div>
    ))}
  </div>
);

const StocksRoutePage = () => {
  const isMobile = useIsMobile();
  return isMobile ? <StocksPage /> : <StockDetailDesktopDemoPage production />;
};

export default StocksRoutePage;
