import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchPublicData } from "@/lib/gateway";
import { formatMarketDate, formatMarketDateTime, decodeHtmlEntities } from "@/lib/utils";
import {
  downsampleStockHistory,
  fetchAllStockHistoryPages,
  filterStockHistory,
  STOCK_HISTORY_DAYS,
  STOCK_HISTORY_RANGES,
  type StockHistoryRange,
} from "@/lib/stockHistory";
import { useAssetWatchlist } from "@/hooks/useAssetWatchlist";
import { useIsMobile } from "@/hooks/use-mobile";
import { FeedItemDetailModal } from "@/components/feed/FeedItemDetailModal";
import { useFeedInteractions } from "@/hooks/useFeedInteractions";
import { type FeedItem } from "@/hooks/useSocialFeed";
import { CreateAlertDialog } from "@/components/alerts/PriceAlertComponents";
import { StockDisclosuresTab } from "@/components/stocks/StockDisclosuresTab";
import { getStockLogoUrl } from "@/lib/stockBranding";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, TrendingDown, Minus, ArrowLeft, Star, BarChart3, Activity,
  Calendar, Building2, DollarSign, Users, Newspaper, ChevronDown, ChevronUp, MoreHorizontal,
} from "lucide-react";
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, BarChart, Bar,
} from "recharts";

interface Stock {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  price: number;
  previous_price: number | null;
  day_change: number;
  day_change_percent: number;
  volume: number;
  market_cap: number | null;
  year_high: number | null;
  year_low: number | null;
  pe_ratio: number | null;
  dividend_yield: number | null;
  updated_at: string;
}

interface PriceHistory {
  snapshot_date: string;
  price: number;
}

const fmt = (n: number, d = 2) =>
  n.toLocaleString("en-KE", { minimumFractionDigits: d, maximumFractionDigits: d });

const fmtVol = (v: number) => {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(v);
};

const LONG_STOCK_RANGES_ENABLED = import.meta.env.VITE_STOCK_LONG_RANGES_ENABLED !== "false";
const longHistoryRanges = new Set<StockHistoryRange>(["1Y", "5Y", "10Y", "15Y"]);
const visibleHistoryRanges = STOCK_HISTORY_RANGES.filter((range) => LONG_STOCK_RANGES_ENABLED || !longHistoryRanges.has(range));

const fmtCap = (mc: number | null) => {
  if (mc == null) return "—";
  if (mc >= 1e12) return `KSh ${(mc / 1e12).toFixed(2)}T`;
  if (mc >= 1e9) return `KSh ${(mc / 1e9).toFixed(2)}B`;
  if (mc >= 1e6) return `KSh ${(mc / 1e6).toFixed(0)}M`;
  return `KSh ${mc.toLocaleString()}`;
};

const StockDetailPage = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { isFavourite, toggle: toggleFav } = useAssetWatchlist("stock");

  const [stock, setStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [range, setRange] = useState<StockHistoryRange>("3M");
  const historyCache = useRef(new Map<string, PriceHistory[]>());

  useDocumentTitle(
    stock ? `${stock.symbol} – ${stock.name} | Kenya Fund Finder` : "Stock Detail | Kenya Fund Finder",
    stock ? `${stock.name} (${stock.symbol}) stock price KSh ${stock.price.toLocaleString()}, daily change, volume, P/E ratio, and dividend yield on the Nairobi Securities Exchange.` : "",
    stock ? {
      title: `${stock.symbol} – ${stock.name} Stock Price | Kenya Fund Finder`,
      description: `${stock.name} (${stock.symbol}) at KSh ${stock.price.toLocaleString()}. Track price history, volume, and financials.`,
    } : undefined
  );
  useJsonLd(stock ? {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: `${stock.name} (${stock.symbol})`,
    description: `${stock.name} stock listed on the Nairobi Securities Exchange. Current price: KSh ${stock.price.toLocaleString()}.`,
    url: `https://kenyafundfinder.com/stocks/${stock.symbol}`,
  } : null);
  useJsonLd(stock ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://kenyafundfinder.com/" },
      { "@type": "ListItem", position: 2, name: "Stocks", item: "https://kenyafundfinder.com/stocks" },
      { "@type": "ListItem", position: 3, name: `${stock.symbol} – ${stock.name}`, item: `https://kenyafundfinder.com/stocks/${stock.symbol}` },
    ],
  } : null);

  useEffect(() => {
    if (!symbol) return;
    const fetchStock = async () => {
      try {
        const { data } = await fetchPublicData<any>("stocks", {
          select: [
            "id", "symbol", "name", "sector", "price", "previous_price",
            "day_change", "day_change_percent", "volume", "market_cap",
            "pe_ratio", "dividend_yield", "year_high", "year_low", "updated_at",
          ],
          filters: { symbol: symbol.toUpperCase() },
          limit: 1,
        });
        const row = data[0];
        if (!row) { setLoading(false); return; }
        setStock({
          ...row,
          price: Number(row.price),
          previous_price: row.previous_price != null ? Number(row.previous_price) : null,
          day_change: Number(row.day_change),
          day_change_percent: Number(row.day_change_percent),
          volume: Number(row.volume),
          market_cap: row.market_cap != null ? Number(row.market_cap) : null,
          year_high: row.year_high != null ? Number(row.year_high) : null,
          year_low: row.year_low != null ? Number(row.year_low) : null,
          pe_ratio: row.pe_ratio != null ? Number(row.pe_ratio) : null,
          dividend_yield: row.dividend_yield != null ? Number(row.dividend_yield) : null,
        } as Stock);
      } catch (e) {
        console.error("Failed to load stock", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStock();
  }, [symbol]);

  useEffect(() => {
    if (!stock) return undefined;
    const cacheKey = `${stock.id}:${range}`;
    const cached = historyCache.current.get(cacheKey);
    if (cached) {
      setHistory(cached);
      setHistoryLoading(false);
      return undefined;
    }

    let cancelled = false;
    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const normalized = await fetchAllStockHistoryPages(async (offset, limit) => {
          const response = await fetchPublicData<any>("stock-history", {
            select: ["id", "price", "snapshot_date"],
            id: stock.id,
            order: "snapshot_date.asc",
            days: STOCK_HISTORY_DAYS[range],
            limit,
            offset,
          });
          return {
            count: response.count,
            data: response.data.map((entry: any) => ({
              snapshot_date: entry.snapshot_date,
              price: Number(entry.price),
            })),
          };
        });
        historyCache.current.set(cacheKey, normalized);
        if (!cancelled) setHistory(normalized);
      } catch (e) {
        console.error("Failed to load stock history", e);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };
    fetchHistory();
    return () => { cancelled = true; };
  }, [stock?.id, range]);

  const filteredHistory = useMemo(() => {
    if (!history.length || !stock) return [];
    
    // Append today's data point if not already present
    const todayIso = new Date().toISOString().split("T")[0];
    const fullHistory = [...history];
    if (fullHistory.length > 0 && fullHistory[fullHistory.length - 1].snapshot_date < todayIso) {
      fullHistory.push({ snapshot_date: todayIso, price: stock.price });
    }

    return filterStockHistory(fullHistory, range);
  }, [history, range]);

  const chartHistory = useMemo(() => downsampleStockHistory(filteredHistory), [filteredHistory]);

  const priceStats = useMemo(() => {
    if (!filteredHistory.length) return null;
    const prices = filteredHistory.map((h) => h.price);
    return {
      high: Math.max(...prices),
      low: Math.min(...prices),
      avg: prices.reduce((a, b) => a + b, 0) / prices.length,
      change: prices[prices.length - 1] - prices[0],
      changePct: ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100,
    };
  }, [filteredHistory]);

  if (loading) {
    return (
      <div className="min-h-screen px-4 md:px-6 py-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full rounded-xl mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="min-h-screen px-4 md:px-6 py-6">
        <button onClick={() => navigate("/stocks")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Stocks
        </button>
        <div className="text-center py-20">
          <h2 className="text-lg font-semibold text-foreground mb-2">Stock not found</h2>
          <p className="text-sm text-muted-foreground">The symbol "{symbol}" was not found.</p>
        </div>
      </div>
    );
  }

  const s = stock;
  const yearRange = s.year_low != null && s.year_high != null;
  const pricePos = yearRange ? ((s.price - s.year_low!) / (s.year_high! - s.year_low!)) * 100 : 0;
  const isUp = s.day_change > 0;
  const isDown = s.day_change < 0;

  return (
    <div className="min-h-screen px-3 pb-6 pt-3 md:px-6 md:py-6 max-w-6xl mx-auto">
      {/* Header */}

      <div className="sticky top-0 z-40 -mx-3 -mt-3 mb-5 flex h-[58px] items-center justify-between border-b border-border bg-background/95 px-5 backdrop-blur-md md:hidden">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted/50"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <button
          type="button"
          aria-label="More options"
          className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted/50"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      <button
        onClick={() => navigate("/stocks")}
        className="hidden md:inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="mb-4 md:mb-6">
        <div className="md:hidden">
          <div className="flex items-center gap-3">
            <StockLogo symbol={s.symbol} name={s.name} />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black tracking-tight text-foreground">{s.name}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">NASE:{s.symbol} · Stock Report</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Market Cap {fmtCap(s.market_cap)}</p>
            </div>
          </div>

          <div className="my-4 grid grid-cols-2 gap-2">
            <div className="[&_button]:h-10 [&_button]:w-full [&_button]:rounded-full [&_button]:border-foreground [&_button]:bg-foreground [&_button]:px-3 [&_button]:text-xs [&_button]:font-semibold [&_button]:text-background [&_svg]:h-4 [&_svg]:w-4">
              <CreateAlertDialog assetType="stock" assetId={s.id} assetName={`${s.symbol} - ${s.name}`} currentPrice={s.price} unit="KSh" />
            </div>
            {user ? (
              <button onClick={() => toggleFav(s.id, `${s.symbol} - ${s.name}`)} className="flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground">
                <Star className={`h-4 w-4 ${isFavourite(s.id) ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} />
                {isFavourite(s.id) ? "Watching" : "Watch"}
              </button>
            ) : (
              <Link to="/auth" className="flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground"><Star className="h-4 w-4 text-muted-foreground" /> Watch</Link>
            )}
          </div>

          <div className="py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Last Price · {formatMarketDate(s.updated_at, "en-KE", { day: "numeric", month: "short", year: "numeric" })} · {formatMarketDateTime(s.updated_at, "en-KE", { hour: "numeric", minute: "2-digit", hour12: true })}</p>
            <p className="mt-3 text-[42px] font-black leading-none tracking-tight text-foreground tabular-nums">KSh {fmt(s.price)}</p>
            <div className="mt-1 flex items-center gap-2">
              {isUp && <TrendingUp className="h-4 w-4 text-emerald-500" />}
              {isDown && <TrendingDown className="h-4 w-4 text-destructive" />}
              {!isUp && !isDown && <Minus className="h-4 w-4 text-muted-foreground" />}
              <span className={`text-sm font-bold tabular-nums ${isUp ? "text-emerald-500" : isDown ? "text-destructive" : "text-muted-foreground"}`}>{isUp ? "+" : ""}{fmt(s.day_change)} ({isUp ? "+" : ""}{fmt(s.day_change_percent)}%)</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Nairobi Securities Exchange · Company financials</p>
        </div>

        <div className="hidden md:flex md:items-start md:justify-between md:gap-4">
          <div>
            <div className="mb-1 flex items-center gap-3"><h1 className="text-3xl font-bold text-foreground">{s.symbol}</h1><Badge variant="secondary" className="text-xs">{s.sector}</Badge>{user && <button onClick={() => toggleFav(s.id, `${s.symbol} - ${s.name}`)} className="rounded-lg p-1.5 transition-colors hover:bg-muted"><Star className={`h-5 w-5 ${isFavourite(s.id) ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} /></button>}</div>
            <p className="text-sm text-muted-foreground">{s.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">Nairobi Securities Exchange · Last updated: {formatMarketDateTime(s.updated_at)}</p>
          </div>
          <div className="text-right"><p className="text-4xl font-bold text-foreground tabular-nums">KSh {fmt(s.price)}</p><div className="mt-1 flex items-center justify-end gap-2">{isUp ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : isDown ? <TrendingDown className="h-4 w-4 text-destructive" /> : <Minus className="h-4 w-4 text-muted-foreground" />}<span className={`text-sm font-semibold tabular-nums ${isUp ? "text-emerald-500" : isDown ? "text-destructive" : "text-muted-foreground"}`}>{isUp ? "+" : ""}{fmt(s.day_change)} ({isUp ? "+" : ""}{fmt(s.day_change_percent)}%)</span></div><CreateAlertDialog assetType="stock" assetId={s.id} assetName={`${s.symbol} - ${s.name}`} currentPrice={s.price} unit="KSh" /></div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="-mx-3 mb-5 flex h-auto w-[calc(100%+1.5rem)] justify-start gap-0 overflow-x-auto rounded-none border-b border-border bg-transparent p-0 md:mx-0 md:mb-6 md:h-10 md:w-full md:justify-center md:rounded-xl md:border-0 md:bg-muted/40 md:p-1">
          <TabsTrigger value="summary" className="shrink-0 rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none md:flex-1 md:rounded-sm md:border-0 md:px-3 md:py-1.5 md:text-sm md:data-[state=active]:bg-background md:data-[state=active]:shadow-sm">Summary</TabsTrigger>
          <TabsTrigger value="financials" className="shrink-0 rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none md:flex-1 md:rounded-sm md:border-0 md:px-3 md:py-1.5 md:text-sm md:data-[state=active]:bg-background md:data-[state=active]:shadow-sm">Financials</TabsTrigger>
          <TabsTrigger value="statistics" className="shrink-0 rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none md:flex-1 md:rounded-sm md:border-0 md:px-3 md:py-1.5 md:text-sm md:data-[state=active]:bg-background md:data-[state=active]:shadow-sm">Statistics</TabsTrigger>
          <TabsTrigger value="historical" className="shrink-0 rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none md:flex-1 md:rounded-sm md:border-0 md:px-3 md:py-1.5 md:text-sm md:data-[state=active]:bg-background md:data-[state=active]:shadow-sm">Historical</TabsTrigger>
          <TabsTrigger value="news" className="shrink-0 rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none md:flex-1 md:rounded-sm md:border-0 md:px-3 md:py-1.5 md:text-sm md:data-[state=active]:bg-background md:data-[state=active]:shadow-sm">News</TabsTrigger>
          <TabsTrigger value="disclosures" className="shrink-0 rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none md:flex-1 md:rounded-sm md:border-0 md:px-3 md:py-1.5 md:text-sm md:data-[state=active]:bg-background md:data-[state=active]:shadow-sm">Disclosures</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4 md:space-y-6">
          {/* Price Chart */}
          <div className="border-0 bg-transparent p-0 shadow-none md:rounded-xl md:border md:border-border md:bg-card md:p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary md:h-4 md:w-4 md:text-muted-foreground" />
                <span className="text-base font-bold text-foreground md:text-sm md:font-semibold">Price Chart</span>
              </div>
              <div className="-mx-1 flex w-[calc(100%+0.5rem)] gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:w-auto sm:gap-1 sm:px-0 sm:pb-0">
                {visibleHistoryRanges.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all sm:rounded-md sm:px-2.5 sm:py-1 sm:font-medium ${
                      range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {historyLoading ? (
              <Skeleton className="h-[220px] w-full rounded-2xl md:h-[280px] md:rounded-lg" />
            ) : filteredHistory.length < 2 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground md:h-[280px]">
                No historical data for this range
              </div>
            ) : (
              <div className="-mx-3 h-[220px] w-[calc(100%+1.5rem)] md:mx-0 md:h-[280px] md:w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartHistory}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isUp ? "hsl(152 60% 42%)" : "hsl(var(--destructive))"} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={isUp ? "hsl(152 60% 42%)" : "hsl(var(--destructive))"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="snapshot_date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => formatMarketDate(v, "en-KE", { month: "short", day: "numeric" })}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    width={isMobile ? 44 : 55}
                    tickFormatter={(v) => v.toFixed(1)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(v) => formatMarketDate(v, "en-KE", { month: "long", day: "numeric", year: "numeric" })}
                    formatter={(value: number) => [`KSh ${fmt(value)}`, "Price"]}
                  />
                  <Area type="monotone" dataKey="price" stroke={isUp ? "hsl(152 60% 42%)" : "hsl(var(--destructive))"} strokeWidth={2} fill="url(#priceGradient)" />
                </AreaChart>
              </ResponsiveContainer>
              </div>
            )}

            {priceStats && (
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                <MiniStat label="Period High" value={`KSh ${fmt(priceStats.high)}`} />
                <MiniStat label="Period Low" value={`KSh ${fmt(priceStats.low)}`} />
                <MiniStat label="Average" value={`KSh ${fmt(priceStats.avg)}`} desktopOnly />
                <MiniStat label="Change" value={`${priceStats.change > 0 ? "+" : ""}${fmt(priceStats.change)}`} color={priceStats.change >= 0 ? "text-emerald-500" : "text-destructive"} desktopOnly />
                <MiniStat label="Change %" value={`${priceStats.changePct > 0 ? "+" : ""}${fmt(priceStats.changePct)}%`} color={priceStats.changePct >= 0 ? "text-emerald-500" : "text-destructive"} desktopOnly />
              </div>
            )}
          </div>

          {/* Key Stats Grid */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            <StatCard icon={<DollarSign className="h-4 w-4 text-emerald-500" />} label="Price" value={`KSh ${fmt(s.price)}`} />
            <StatCard icon={<Activity className="h-4 w-4 text-primary" />} label="Volume" value={fmtVol(s.volume)} />
            <StatCard icon={<Building2 className="h-4 w-4 text-muted-foreground" />} label="Market Cap" value={fmtCap(s.market_cap)} />
            <StatCard icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} label="Div Yield" value={s.dividend_yield != null ? `${fmt(s.dividend_yield)}%` : "—"} />
          </div>

          {/* 52 Week Range */}
          {yearRange && (
            <div className="rounded-[18px] border border-border bg-card p-4 shadow-[0_6px_18px_hsl(var(--foreground)/0.05)] md:rounded-xl md:shadow-none">
              <p className="mb-3 text-sm font-bold text-foreground md:text-sm md:font-semibold">52-Week Range</p>
              <div className="flex items-center gap-2.5">
                <span className="w-16 text-right text-[11px] tabular-nums text-muted-foreground md:w-20 md:text-xs">KSh {fmt(s.year_low!)}</span>
                <div className="relative h-2 flex-1 rounded-full bg-muted md:h-3">
                  <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-destructive via-yellow-500 to-emerald-500 rounded-full" style={{ width: "100%" }} />
                  <div
                    className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-card bg-foreground shadow-md md:h-4 md:w-4"
                    style={{ left: `${Math.min(Math.max(pricePos, 0), 100)}%`, transform: "translate(-50%, -50%)" }}
                  />
                </div>
                <span className="w-16 text-[11px] tabular-nums text-muted-foreground md:w-20 md:text-xs">KSh {fmt(s.year_high!)}</span>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground md:mt-2">Current: KSh {fmt(s.price)} · <strong className="text-foreground">{fmt(((s.price - s.year_low!) / s.year_low!) * 100, 1)}%</strong> above the 52-week low</p>
            </div>
          )}
        </TabsContent>

        {/* Financials Tab */}
        <TabsContent value="financials" className="space-y-4">
          <div className="rounded-[28px] border border-border bg-card p-5 shadow-[0_10px_28px_hsl(var(--foreground)/0.07)] md:rounded-xl md:p-4 md:shadow-none">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" /> Key Financial Metrics
            </h3>
            <div className="divide-y divide-border">
              <FinRow label="Current Price" value={`KSh ${fmt(s.price)}`} />
              <FinRow label="Previous Close" value={s.previous_price != null ? `KSh ${fmt(s.previous_price)}` : "—"} />
              <FinRow label="Day Change" value={`${s.day_change > 0 ? "+" : ""}KSh ${fmt(s.day_change)}`} color={isUp ? "text-emerald-500" : isDown ? "text-destructive" : undefined} />
              <FinRow label="Day Change %" value={`${s.day_change_percent > 0 ? "+" : ""}${fmt(s.day_change_percent)}%`} color={isUp ? "text-emerald-500" : isDown ? "text-destructive" : undefined} />
              <FinRow label="Volume" value={fmtVol(s.volume)} />
              <FinRow label="Market Capitalization" value={fmtCap(s.market_cap)} />
              <FinRow label="P/E Ratio" value={s.pe_ratio != null ? fmt(s.pe_ratio) : "—"} />
              <FinRow label="Dividend Yield" value={s.dividend_yield != null ? `${fmt(s.dividend_yield)}%` : "—"} />
              <FinRow label="52-Week High" value={s.year_high != null ? `KSh ${fmt(s.year_high)}` : "—"} />
              <FinRow label="52-Week Low" value={s.year_low != null ? `KSh ${fmt(s.year_low)}` : "—"} />
            </div>
          </div>

          <div className="rounded-[28px] border border-border bg-card p-5 shadow-[0_10px_28px_hsl(var(--foreground)/0.07)] md:rounded-xl md:p-4 md:shadow-none">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" /> Company Info
            </h3>
            <div className="divide-y divide-border">
              <FinRow label="Company" value={s.name} />
              <FinRow label="Sector" value={s.sector} />
              <FinRow label="Exchange" value="Nairobi Securities Exchange (NSE)" />
              <FinRow label="Currency" value="Kenyan Shilling (KSh)" />
            </div>
          </div>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics" className="space-y-4">
          <div className="rounded-[28px] border border-border bg-card p-5 shadow-[0_10px_28px_hsl(var(--foreground)/0.07)] md:rounded-xl md:p-4 md:shadow-none">
            <h3 className="text-sm font-semibold text-foreground mb-4">Trading Statistics</h3>
            <div className="divide-y divide-border">
              <FinRow label="Current Price" value={`KSh ${fmt(s.price)}`} />
              <FinRow label="Day Range" value={s.previous_price != null ? `KSh ${fmt(Math.min(s.price, s.previous_price))} – KSh ${fmt(Math.max(s.price, s.previous_price))}` : "—"} />
              <FinRow label="52-Week Range" value={yearRange ? `KSh ${fmt(s.year_low!)} – KSh ${fmt(s.year_high!)}` : "—"} />
              <FinRow label="Volume" value={s.volume.toLocaleString()} />
              <FinRow label="Market Cap" value={fmtCap(s.market_cap)} />
            </div>
          </div>

          <div className="rounded-[28px] border border-border bg-card p-5 shadow-[0_10px_28px_hsl(var(--foreground)/0.07)] md:rounded-xl md:p-4 md:shadow-none">
            <h3 className="text-sm font-semibold text-foreground mb-4">Valuation Ratios</h3>
            <div className="divide-y divide-border">
              <FinRow label="P/E Ratio (TTM)" value={s.pe_ratio != null ? fmt(s.pe_ratio) : "N/A"} />
              <FinRow label="Dividend Yield (TTM)" value={s.dividend_yield != null ? `${fmt(s.dividend_yield)}%` : "N/A"} />
              <FinRow label="Price-to-52W-High" value={s.year_high != null ? `${fmt((s.price / s.year_high) * 100)}%` : "N/A"} />
              <FinRow label="Price-to-52W-Low" value={s.year_low != null ? `${fmt((s.price / s.year_low) * 100)}%` : "N/A"} />
            </div>
          </div>

          {priceStats && (
            <div className="rounded-[28px] border border-border bg-card p-5 shadow-[0_10px_28px_hsl(var(--foreground)/0.07)] md:rounded-xl md:p-4 md:shadow-none">
              <h3 className="text-sm font-semibold text-foreground mb-4">Historical Performance ({range})</h3>
              <div className="divide-y divide-border">
                <FinRow label="Period Start Price" value={filteredHistory.length > 0 ? `KSh ${fmt(filteredHistory[0].price)}` : "—"} />
                <FinRow label="Period End Price" value={filteredHistory.length > 0 ? `KSh ${fmt(filteredHistory[filteredHistory.length - 1].price)}` : "—"} />
                <FinRow label="Period Change" value={`${priceStats.change > 0 ? "+" : ""}KSh ${fmt(priceStats.change)}`} color={priceStats.change >= 0 ? "text-emerald-500" : "text-destructive"} />
                <FinRow label="Period Change %" value={`${priceStats.changePct > 0 ? "+" : ""}${fmt(priceStats.changePct)}%`} color={priceStats.changePct >= 0 ? "text-emerald-500" : "text-destructive"} />
                <FinRow label="Period High" value={`KSh ${fmt(priceStats.high)}`} />
                <FinRow label="Period Low" value={`KSh ${fmt(priceStats.low)}`} />
                <FinRow label="Period Average" value={`KSh ${fmt(priceStats.avg)}`} />
              </div>
            </div>
          )}
        </TabsContent>

        {/* Historical Data Tab */}
        <TabsContent value="historical" className="space-y-4">
          <div className="overflow-hidden border-0 bg-transparent shadow-none md:rounded-xl md:border md:border-border md:bg-card">
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" /> Historical Prices
              </h3>
              <div className="flex w-full gap-2 overflow-x-auto pb-1 sm:w-auto sm:gap-1 sm:pb-0">
                {visibleHistoryRanges.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all sm:rounded-md sm:px-2.5 sm:py-1 sm:font-medium ${
                      range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {historyLoading ? (
              <div className="p-4"><Skeleton className="h-60 w-full" /></div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No historical data available</div>
            ) : (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                    <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                      <th className="text-right px-4 py-2.5 font-semibold">Price (KSh)</th>
                      <th className="text-right px-4 py-2.5 font-semibold">Change</th>
                      <th className="text-right px-4 py-2.5 font-semibold">Change %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...filteredHistory].reverse().map((h, i, arr) => {
                      const prevPrice = i < arr.length - 1 ? arr[i + 1].price : h.price;
                      const change = h.price - prevPrice;
                      const changePct = prevPrice > 0 ? (change / prevPrice) * 100 : 0;
                      return (
                        <tr key={h.snapshot_date} className={`border-t border-border/40 ${i % 2 !== 0 ? "bg-muted/20" : ""}`}>
                          <td className="px-4 py-2.5 text-foreground">
                            {new Date(h.snapshot_date).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-foreground">
                            {fmt(h.price)}
                          </td>
                          <td className={`px-4 py-2.5 text-right tabular-nums ${change > 0 ? "text-emerald-500" : change < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                            {change > 0 ? "+" : ""}{fmt(change)}
                          </td>
                          <td className={`px-4 py-2.5 text-right tabular-nums ${changePct > 0 ? "text-emerald-500" : changePct < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                            {changePct > 0 ? "+" : ""}{fmt(changePct)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* News Tab */}
        <TabsContent value="news">
          <StockNewsTab symbol={s.symbol} name={s.name} />
        </TabsContent>
        <TabsContent value="disclosures">
          <StockDisclosuresTab stockId={s.id} />
        </TabsContent>
      </Tabs>

      <div className="mt-4 rounded-[24px] border border-dashed border-border bg-muted/30 p-5 md:mt-6 md:rounded-lg md:border-solid md:border-border/50 md:p-3">
        <p className="text-xs leading-relaxed text-muted-foreground md:text-[10px]">
          Stock prices shown are indicative and may be delayed. Data is sourced from the Kenyan stock market.
          This information is for educational purposes only and should not be considered financial advice.
        </p>
      </div>
    </div>
  );
};

/* ─── News Tab Component ─── */
const StockNewsTab = ({ symbol, name }: { symbol: string; name: string }) => {
  const { toggleLike, addComment, getPostInteraction } = useFeedInteractions();
  const [selectedFeedItem, setSelectedFeedItem] = useState<FeedItem | null>(null);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      // Search for news mentioning this stock
      const { data } = await supabase
        .from("news_articles_public")
        .select("id, title, summary, date_published, created_at, source, category, image_url")
        .or(`title.ilike.%${symbol}%,title.ilike.%${name}%,summary.ilike.%${symbol}%,summary.ilike.%${name}%`)
        .order("created_at", { ascending: false })
        .limit(10);
      setNews(data || []);
      setLoading(false);
    };
    fetch();
  }, [symbol, name]);

  if (loading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;

  if (news.length === 0) {
    return (
      <div className="rounded-[28px] border border-border bg-card p-8 text-center shadow-[0_10px_28px_hsl(var(--foreground)/0.07)] md:rounded-xl md:shadow-none">
        <Newspaper className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No recent news articles found for {symbol}.</p>
        <Link to="/news" className="text-xs text-primary hover:underline mt-2 inline-block">Browse all market news →</Link>
      </div>
    );
  }

  const handleOpenItem = (n: any) => {
    const item: FeedItem = {
      id: `news-${n.id}`,
      type: "NEWS",
      authorName: n.source || "Market News",
      authorLabel: n.category || "News",
      title: decodeHtmlEntities(n.title),
      content: n.summary || "",
      mediaUrl: n.image_url || undefined,
      mediaType: n.image_url ? "image" : undefined,
      timestamp: new Date(n.created_at || n.date_published || Date.now()),
      likes: 0,
      comments: 0,
      url: "#",
      rawItem: n,
    };
    setSelectedFeedItem(item);
  };

  return (
    <div className="space-y-3">
      {news.map((n) => (
        <div
          key={n.id}
          onClick={() => handleOpenItem(n)}
          className="block cursor-pointer rounded-[24px] border border-border bg-card p-5 shadow-[0_10px_28px_hsl(var(--foreground)/0.07)] transition-colors hover:border-primary/30 md:rounded-xl md:p-4 md:shadow-none"
        >
          <div className="flex items-start gap-3">
            {n.image_url && (
              <img src={n.image_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground line-clamp-2">{n.title}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.summary}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-[9px]">{n.category}</Badge>
                <span className="text-[10px] text-muted-foreground">{n.source}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(n.date_published).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
      <Link to="/news" className="block text-center text-xs text-primary hover:underline py-2">View all market news →</Link>

      <FeedItemDetailModal
        item={selectedFeedItem}
        open={!!selectedFeedItem}
        onOpenChange={(open) => {
          if (!open) setSelectedFeedItem(null);
        }}
        interaction={selectedFeedItem ? getPostInteraction(selectedFeedItem.id, selectedFeedItem.likes || 0) : undefined}
        onLikeToggle={toggleLike}
        onAddComment={addComment}
      />
    </div>
  );
};

/* ─── Shared Components ─── */
const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex min-h-[72px] items-center gap-2.5 rounded-[16px] border border-border bg-card p-3 shadow-[0_5px_16px_hsl(var(--foreground)/0.05)] md:min-h-0 md:gap-3 md:rounded-xl md:p-3.5 md:shadow-none">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 md:rounded-lg md:bg-muted/60">{icon}</div>
    <div className="min-w-0">
      <p className="mb-1 truncate text-[10px] font-semibold uppercase leading-none tracking-wider text-muted-foreground md:font-medium">{label}</p>
      <p className="truncate text-base font-bold leading-tight tabular-nums text-foreground">{value}</p>
    </div>
  </div>
);

const MiniStat = ({ label, value, color, desktopOnly = false }: { label: string; value: string; color?: string; desktopOnly?: boolean }) => (
  <div className={`rounded-[14px] border border-border bg-muted/20 px-3 py-2.5 text-left md:rounded-lg md:border-0 md:bg-muted/40 md:py-2 md:text-center ${desktopOnly ? "hidden md:block" : ""}`}>
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:font-normal md:normal-case md:tracking-normal">{label}</p>
    <p className={`mt-1 text-sm font-bold tabular-nums md:mt-0 md:font-semibold ${color || "text-foreground"}`}>{value}</p>
  </div>
);

const FinRow = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="flex items-center justify-between py-2.5 px-1">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={`text-sm font-semibold tabular-nums ${color || "text-foreground"}`}>{value}</span>
  </div>
);

const StockLogo = ({ symbol, name }: { symbol: string; name: string }) => {
  const [failed, setFailed] = useState(false);
  const logoUrl = getStockLogoUrl(symbol);

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/40 md:hidden">
      {logoUrl && !failed ? (
        <img src={logoUrl} alt={`${name} logo`} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span className="text-sm font-black text-primary">{symbol.slice(0, 2)}</span>
      )}
    </div>
  );
};

export default StockDetailPage;
