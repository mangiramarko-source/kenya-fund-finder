import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchPublicData } from "@/lib/gateway";
import { formatMarketDate, formatMarketDateTime, decodeHtmlEntities } from "@/lib/utils";
import { useAssetWatchlist } from "@/hooks/useAssetWatchlist";
import { FeedItemDetailModal } from "@/components/feed/FeedItemDetailModal";
import { useFeedInteractions } from "@/hooks/useFeedInteractions";
import { type FeedItem } from "@/hooks/useSocialFeed";
import { CreateAlertDialog } from "@/components/alerts/PriceAlertComponents";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, TrendingDown, Minus, ArrowLeft, Star, BarChart3, Activity,
  Calendar, Building2, DollarSign, Users, Newspaper, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
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
  const { isFavourite, toggle: toggleFav } = useAssetWatchlist("stock");

  const [stock, setStock] = useState<Stock | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [range, setRange] = useState<"1W" | "1M" | "3M" | "ALL">("3M");

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
    if (!stock) return;
    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        const { data } = await fetchPublicData<any>("stock-history", {
          select: ["price", "snapshot_date"],
          id: stock.id,
          order: "snapshot_date.asc",
          days: 90,
          limit: 200,
        });
        setHistory(
          data.map((d: any) => ({
            snapshot_date: d.snapshot_date,
            price: Number(d.price),
          }))
        );
      } catch (e) {
        console.error("Failed to load stock history", e);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [stock?.id]);

  const filteredHistory = useMemo(() => {
    if (!history.length || !stock) return [];
    
    // Append today's data point if not already present
    const todayIso = new Date().toISOString().split("T")[0];
    const fullHistory = [...history];
    if (fullHistory.length > 0 && fullHistory[fullHistory.length - 1].snapshot_date < todayIso) {
      fullHistory.push({ snapshot_date: todayIso, price: stock.price });
    }

    const now = new Date();
    let cutoff: Date;
    switch (range) {
      case "1W": cutoff = new Date(now.getTime() - 7 * 86400000); break;
      case "1M": cutoff = new Date(now.getTime() - 30 * 86400000); break;
      case "3M": cutoff = new Date(now.getTime() - 90 * 86400000); break;
      default: return fullHistory;
    }
    return fullHistory.filter((h) => new Date(h.snapshot_date) >= cutoff);
  }, [history, range]);

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
    <div className="min-h-screen px-4 md:px-6 py-6 max-w-6xl mx-auto">
      {/* Header */}

      <button
        onClick={() => navigate("/stocks")}
        className="hidden md:inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{s.symbol}</h1>
            <Badge variant="secondary" className="text-xs">{s.sector}</Badge>
            {user && (
              <button
                onClick={() => toggleFav(s.id, `${s.symbol} - ${s.name}`)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <Star className={`h-5 w-5 ${isFavourite(s.id) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{s.name}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Nairobi Securities Exchange · Last updated: {formatMarketDateTime(s.updated_at)}
          </p>
        </div>

        <div className="text-left md:text-right">
          <p className="text-3xl md:text-4xl font-bold text-foreground tabular-nums">KSh {fmt(s.price)}</p>
          <div className="flex items-center gap-2 md:justify-end mt-1">
            {isUp && <TrendingUp className="h-4 w-4 text-accent" />}
            {isDown && <TrendingDown className="h-4 w-4 text-destructive" />}
            {!isUp && !isDown && <Minus className="h-4 w-4 text-muted-foreground" />}
            <span className={`text-sm font-semibold tabular-nums ${isUp ? "text-accent" : isDown ? "text-destructive" : "text-muted-foreground"}`}>
              {isUp ? "+" : ""}{fmt(s.day_change)} ({isUp ? "+" : ""}{fmt(s.day_change_percent)}%)
            </span>
          </div>
          <CreateAlertDialog assetType="stock" assetId={s.id} assetName={`${s.symbol} - ${s.name}`} currentPrice={s.price} unit="KSh" />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="w-full flex overflow-x-auto gap-0 mb-6 bg-muted/40 p-1 rounded-xl">
          <TabsTrigger value="summary" className="flex-1 text-xs md:text-sm">Summary</TabsTrigger>
          <TabsTrigger value="financials" className="flex-1 text-xs md:text-sm">Financials</TabsTrigger>
          <TabsTrigger value="statistics" className="flex-1 text-xs md:text-sm">Statistics</TabsTrigger>
          <TabsTrigger value="historical" className="flex-1 text-xs md:text-sm">Historical</TabsTrigger>
          <TabsTrigger value="news" className="flex-1 text-xs md:text-sm">News</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          {/* Price Chart */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Price Chart</span>
              </div>
              <div className="flex gap-1">
                {(["1W", "1M", "3M", "ALL"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {historyLoading ? (
              <Skeleton className="h-[280px] w-full rounded-lg" />
            ) : filteredHistory.length < 2 ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                No historical data for this range
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={filteredHistory}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isUp ? "hsl(var(--accent))" : "hsl(var(--destructive))"} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={isUp ? "hsl(var(--accent))" : "hsl(var(--destructive))"} stopOpacity={0} />
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
                    labelFormatter={(v) => formatMarketDate(v, "en-KE", { month: "long", day: "numeric", year: "numeric" })}
                    formatter={(value: number) => [`KSh ${fmt(value)}`, "Price"]}
                  />
                  <Area type="monotone" dataKey="price" stroke={isUp ? "hsl(var(--accent))" : "hsl(var(--destructive))"} strokeWidth={2} fill="url(#priceGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {priceStats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                <MiniStat label="Period High" value={`KSh ${fmt(priceStats.high)}`} />
                <MiniStat label="Period Low" value={`KSh ${fmt(priceStats.low)}`} />
                <MiniStat label="Average" value={`KSh ${fmt(priceStats.avg)}`} />
                <MiniStat label="Change" value={`${priceStats.change > 0 ? "+" : ""}${fmt(priceStats.change)}`} color={priceStats.change >= 0 ? "text-accent" : "text-destructive"} />
                <MiniStat label="Change %" value={`${priceStats.changePct > 0 ? "+" : ""}${fmt(priceStats.changePct)}%`} color={priceStats.changePct >= 0 ? "text-accent" : "text-destructive"} />
              </div>
            )}
          </div>

          {/* Key Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={<DollarSign className="h-4 w-4 text-accent" />} label="Price" value={`KSh ${fmt(s.price)}`} />
            <StatCard icon={<Activity className="h-4 w-4 text-primary" />} label="Volume" value={fmtVol(s.volume)} />
            <StatCard icon={<Building2 className="h-4 w-4 text-muted-foreground" />} label="Market Cap" value={fmtCap(s.market_cap)} />
            <StatCard icon={<TrendingUp className="h-4 w-4 text-accent" />} label="Div Yield" value={s.dividend_yield != null ? `${fmt(s.dividend_yield)}%` : "—"} />
          </div>

          {/* 52 Week Range */}
          {yearRange && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground mb-3">52-Week Range</p>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground tabular-nums w-20 text-right">KSh {fmt(s.year_low!)}</span>
                <div className="flex-1 relative h-3 bg-muted rounded-full">
                  <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-destructive via-yellow-500 to-accent rounded-full" style={{ width: "100%" }} />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-foreground rounded-full border-2 border-card shadow-md"
                    style={{ left: `${Math.min(Math.max(pricePos, 0), 100)}%`, transform: "translate(-50%, -50%)" }}
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums w-20">KSh {fmt(s.year_high!)}</span>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-2">Current: KSh {fmt(s.price)}</p>
            </div>
          )}
        </TabsContent>

        {/* Financials Tab */}
        <TabsContent value="financials" className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-accent" /> Key Financial Metrics
            </h3>
            <div className="divide-y divide-border">
              <FinRow label="Current Price" value={`KSh ${fmt(s.price)}`} />
              <FinRow label="Previous Close" value={s.previous_price != null ? `KSh ${fmt(s.previous_price)}` : "—"} />
              <FinRow label="Day Change" value={`${s.day_change > 0 ? "+" : ""}KSh ${fmt(s.day_change)}`} color={isUp ? "text-accent" : isDown ? "text-destructive" : undefined} />
              <FinRow label="Day Change %" value={`${s.day_change_percent > 0 ? "+" : ""}${fmt(s.day_change_percent)}%`} color={isUp ? "text-accent" : isDown ? "text-destructive" : undefined} />
              <FinRow label="Volume" value={fmtVol(s.volume)} />
              <FinRow label="Market Capitalization" value={fmtCap(s.market_cap)} />
              <FinRow label="P/E Ratio" value={s.pe_ratio != null ? fmt(s.pe_ratio) : "—"} />
              <FinRow label="Dividend Yield" value={s.dividend_yield != null ? `${fmt(s.dividend_yield)}%` : "—"} />
              <FinRow label="52-Week High" value={s.year_high != null ? `KSh ${fmt(s.year_high)}` : "—"} />
              <FinRow label="52-Week Low" value={s.year_low != null ? `KSh ${fmt(s.year_low)}` : "—"} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
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
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Trading Statistics</h3>
            <div className="divide-y divide-border">
              <FinRow label="Current Price" value={`KSh ${fmt(s.price)}`} />
              <FinRow label="Day Range" value={s.previous_price != null ? `KSh ${fmt(Math.min(s.price, s.previous_price))} – KSh ${fmt(Math.max(s.price, s.previous_price))}` : "—"} />
              <FinRow label="52-Week Range" value={yearRange ? `KSh ${fmt(s.year_low!)} – KSh ${fmt(s.year_high!)}` : "—"} />
              <FinRow label="Volume" value={s.volume.toLocaleString()} />
              <FinRow label="Market Cap" value={fmtCap(s.market_cap)} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Valuation Ratios</h3>
            <div className="divide-y divide-border">
              <FinRow label="P/E Ratio (TTM)" value={s.pe_ratio != null ? fmt(s.pe_ratio) : "N/A"} />
              <FinRow label="Dividend Yield (TTM)" value={s.dividend_yield != null ? `${fmt(s.dividend_yield)}%` : "N/A"} />
              <FinRow label="Price-to-52W-High" value={s.year_high != null ? `${fmt((s.price / s.year_high) * 100)}%` : "N/A"} />
              <FinRow label="Price-to-52W-Low" value={s.year_low != null ? `${fmt((s.price / s.year_low) * 100)}%` : "N/A"} />
            </div>
          </div>

          {priceStats && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-4">Historical Performance ({range})</h3>
              <div className="divide-y divide-border">
                <FinRow label="Period Start Price" value={filteredHistory.length > 0 ? `KSh ${fmt(filteredHistory[0].price)}` : "—"} />
                <FinRow label="Period End Price" value={filteredHistory.length > 0 ? `KSh ${fmt(filteredHistory[filteredHistory.length - 1].price)}` : "—"} />
                <FinRow label="Period Change" value={`${priceStats.change > 0 ? "+" : ""}KSh ${fmt(priceStats.change)}`} color={priceStats.change >= 0 ? "text-accent" : "text-destructive"} />
                <FinRow label="Period Change %" value={`${priceStats.changePct > 0 ? "+" : ""}${fmt(priceStats.changePct)}%`} color={priceStats.changePct >= 0 ? "text-accent" : "text-destructive"} />
                <FinRow label="Period High" value={`KSh ${fmt(priceStats.high)}`} />
                <FinRow label="Period Low" value={`KSh ${fmt(priceStats.low)}`} />
                <FinRow label="Period Average" value={`KSh ${fmt(priceStats.avg)}`} />
              </div>
            </div>
          )}
        </TabsContent>

        {/* Historical Data Tab */}
        <TabsContent value="historical" className="space-y-4">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" /> Historical Prices
              </h3>
              <div className="flex gap-1">
                {(["1W", "1M", "3M", "ALL"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
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
                          <td className={`px-4 py-2.5 text-right tabular-nums ${change > 0 ? "text-accent" : change < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                            {change > 0 ? "+" : ""}{fmt(change)}
                          </td>
                          <td className={`px-4 py-2.5 text-right tabular-nums ${changePct > 0 ? "text-accent" : changePct < 0 ? "text-destructive" : "text-muted-foreground"}`}>
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
      </Tabs>

      <div className="mt-6 rounded-lg bg-muted/40 border border-border/50 p-3">
        <p className="text-[10px] leading-relaxed text-muted-foreground">
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
        .order("date_published", { ascending: false })
        .limit(10);
      setNews(data || []);
      setLoading(false);
    };
    fetch();
  }, [symbol, name]);

  if (loading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;

  if (news.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
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
          className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors cursor-pointer"
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
  <div className="rounded-xl border border-border bg-card p-3.5 flex items-center gap-3">
    <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">{icon}</div>
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium leading-none mb-1">{label}</p>
      <p className="text-base font-bold tabular-nums leading-none text-foreground">{value}</p>
    </div>
  </div>
);

const MiniStat = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="bg-muted/40 rounded-lg px-3 py-2 text-center">
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className={`font-semibold text-sm tabular-nums ${color || "text-foreground"}`}>{value}</p>
  </div>
);

const FinRow = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="flex items-center justify-between py-2.5 px-1">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={`text-sm font-semibold tabular-nums ${color || "text-foreground"}`}>{value}</span>
  </div>
);

export default StockDetailPage;
