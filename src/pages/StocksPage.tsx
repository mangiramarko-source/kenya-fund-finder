import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
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
} from "lucide-react";
import SectionLiveStatus from "@/components/SectionLiveStatus";
import { CreateAlertDialog } from "@/components/alerts/PriceAlertComponents";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ActiveAlertsCard from "@/components/alerts/ActiveAlertsCard";
import StockFavourites from "@/components/home/StockFavourites";
import { useAssetWatchlist } from "@/hooks/useAssetWatchlist";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area } from "recharts";

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

/* ─── Mini Sparkline ─── */
const MiniSparkline = ({ data, positive }: { data: PriceHistory[]; positive: boolean }) => {
  if (!data?.length || data.length < 2) return null;
  const color = positive ? "hsl(var(--accent))" : "hsl(var(--destructive))";
  const gradientId = `sparkline-fill-${positive ? "up" : "down"}`;

  return (
    <div className="w-[60px] h-[24px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin - 0.5", "dataMax + 0.5"]} />
          <Area type="monotone" dataKey="price" stroke="none" fill={`url(#${gradientId})`} isAnimationActive={false} />
          <Line type="monotone" dataKey="price" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const ChangeCell = ({ change, pct }: { change: number; pct: number }) => {
  if (change > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-accent text-[11px] font-semibold tabular-nums">
        <TrendingUp className="h-3 w-3" /> +{formatNumber(pct)}%
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

const StocksPage = () => {
  const navigate = useNavigate();
  useDocumentTitle(
    "Kenyan Stocks – Stock Market | Kenya Fund Finder",
    "Track Kenyan stock market prices, market cap, volumes, and performance.",
    {
      title: "Kenyan Stocks – Stock Market | Kenya Fund Finder",
      description: "Track Kenyan stock prices, volumes, and daily performance.",
    },
  );
  useJsonLd({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Kenyan Stocks – Kenya Fund Finder",
    description: "Track Kenyan stock market prices and performance.",
    url: "https://kenyafundfinder.com/stocks",
  });

  const { user } = useAuth();
  const { entries: favEntries, isFavourite, toggle: toggleFavourite } = useAssetWatchlist("stock");
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("market_cap");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, PriceHistory[]>>({});
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);
  const [mobileMovement, setMobileMovement] = useState<"all" | "gainers" | "losers" | "unchanged">("all");

  useEffect(() => {
    const fetchStocks = async () => {
      const { data } = await supabase
        .from("stocks_public")
        .select(
          "id, symbol, name, sector, price, previous_price, day_change, day_change_percent, volume, market_cap, year_high, year_low, pe_ratio, dividend_yield, updated_at",
        )
        .order("sort_order");
      setStocks(
        data?.map((s: any) => ({
          ...s,
          price: Number(s.price),
          previous_price: s.previous_price != null ? Number(s.previous_price) : null,
          day_change: Number(s.day_change),
          day_change_percent: Number(s.day_change_percent),
          volume: Number(s.volume),
          market_cap: s.market_cap != null ? Number(s.market_cap) : null,
          year_high: s.year_high != null ? Number(s.year_high) : null,
          year_low: s.year_low != null ? Number(s.year_low) : null,
          pe_ratio: s.pe_ratio != null ? Number(s.pe_ratio) : null,
          dividend_yield: s.dividend_yield != null ? Number(s.dividend_yield) : null,
        })) || [],
      );
      setLoading(false);
    };
    fetchStocks();
    const ch = supabase
      .channel("stocks-page-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "stocks" }, () => fetchStocks())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // Preload sparkline data for all stocks
  useEffect(() => {
    if (stocks.length === 0) return;
    const fetchAllHistory = async () => {
      const { data } = await supabase
        .from("stock_price_history" as any)
        .select("stock_id, price, snapshot_date")
        .order("snapshot_date", { ascending: true });
      if (data) {
        const grouped: Record<string, PriceHistory[]> = {};
        (data as any[]).forEach((d) => {
          const sid = d.stock_id;
          if (!grouped[sid]) grouped[sid] = [];
          grouped[sid].push({ snapshot_date: d.snapshot_date, price: Number(d.price) });
        });
        setHistory(grouped);
      }
    };
    fetchAllHistory();
  }, [stocks]);

  const toggleExpand = async (stockId: string) => {
    if (expanded === stockId) {
      setExpanded(null);
      return;
    }
    setExpanded(stockId);
    if (!history[stockId]) {
      setHistoryLoading(stockId);
      const { data } = await supabase
        .from("stock_price_history" as any)
        .select("price, snapshot_date")
        .eq("stock_id", stockId)
        .order("snapshot_date", { ascending: true })
        .limit(90);
      setHistory((prev) => ({
        ...prev,
        [stockId]: ((data as any) || []).map((d: any) => ({ snapshot_date: d.snapshot_date, price: Number(d.price) })),
      }));
      setHistoryLoading(null);
    }
  };

  const sectors = useMemo(() => {
    const s = new Set(stocks.map((st) => st.sector));
    return ["All", ...Array.from(s).sort()];
  }, [stocks]);

  const filtered = useMemo(() => {
    let result = stocks;
    if (sector !== "All") result = result.filter((s) => s.sector === sector);
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
  }, [stocks, sector, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "symbol" ? "asc" : "desc");
    }
  };

  const gainers = useMemo(() => stocks.filter((s) => s.day_change > 0).length, [stocks]);
  const losers = useMemo(() => stocks.filter((s) => s.day_change < 0).length, [stocks]);
  const unchanged = useMemo(() => stocks.filter((s) => s.day_change === 0).length, [stocks]);
  const totalVolume = useMemo(() => stocks.reduce((sum, s) => sum + s.volume, 0), [stocks]);

  const latestUpdate =
    stocks.length > 0
      ? new Date(stocks.reduce((latest, s) => (s.updated_at > latest ? s.updated_at : latest), stocks[0].updated_at))
      : null;

  return (
    <div className="min-h-screen">
      <div className="px-4 md:px-6 py-6">
        <div className="mb-6">
          <div className="hidden md:flex items-start justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Kenyan Stocks</h1>
              <p className="text-sm text-muted-foreground md:mt-1">
                Track Kenyan stock market prices, market cap, volumes, and performance.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <SectionLiveStatus section="stocks" fallbackDate={latestUpdate} hideDate />
              <span className="text-xs text-muted-foreground/70">Updated {latestUpdate?.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
          </div>
          <div className="md:hidden flex items-center justify-between w-full">
            <span className="text-xs text-muted-foreground/70">Updated {latestUpdate?.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}</span>
            <SectionLiveStatus section="stocks" fallbackDate={latestUpdate} hideDate />
          </div>
          <div className="md:hidden border-b border-border mt-3" />
        </div>

        <ActiveAlertsCard assetType="stock" />

        {user && favEntries.length > 0 && <StockFavourites entries={favEntries} stocks={stocks} />}

        {/* Sector filters + Search */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
          {/* Sector filters */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {sectors.map((s) => (
              <button
                key={s}
                onClick={() => setSector(s)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  sector === s
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-64 shrink-0 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
            <Input
              placeholder="Search stocks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 md:h-9 text-[16px] sm:text-sm rounded-lg bg-muted/30 border-border w-full"
            />
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block">
          {loading ? (
            <StockTableSkeleton />
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-border bg-card text-center py-14">
              <p className="text-sm text-muted-foreground">No stocks found</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <colgroup>
                    <col style={{ width: "3%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "4%" }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-muted/60 text-[11px] uppercase tracking-wider border-b border-border">
                      <th className="text-left pl-4 pr-2 py-3 font-semibold text-muted-foreground">#</th>
                      <SortHeader
                        label="Symbol"
                        sortKey="symbol"
                        currentKey={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                      />
                      <th className="text-left px-3 py-3 font-semibold text-muted-foreground">Company</th>
                      <th className="text-left px-2 py-3 font-semibold text-muted-foreground">Sector</th>
                      <th className="px-2 py-3 font-semibold text-muted-foreground text-center">Trend</th>
                      <SortHeader
                        label="Price (KSh)"
                        sortKey="price"
                        currentKey={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                        align="right"
                      />
                      <SortHeader
                        label="Change"
                        sortKey="day_change_percent"
                        currentKey={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                        align="right"
                      />
                      <SortHeader
                        label="Volume"
                        sortKey="volume"
                        currentKey={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                        align="right"
                      />
                      <SortHeader
                        label="Mkt Cap"
                        sortKey="market_cap"
                        currentKey={sortKey}
                        dir={sortDir}
                        onClick={toggleSort}
                        align="right"
                      />
                      {user && <th className="w-8"></th>}
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => (
                      <StockRow
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
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

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
            filtered.map((s) => (
              <MobileStockCard
                key={s.id}
                stock={s}
                onNavigate={() => navigate(`/stocks/${s.symbol}`)}
                history={history[s.id]}
                isFavourite={user ? isFavourite(s.id) : undefined}
                onToggleFavourite={user ? () => toggleFavourite(s.id, `${s.symbol} - ${s.name}`) : undefined}
              />
            ))
          )}
        </div>

        {/* Summary footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-4 px-1">
          <span>
            Showing {filtered.length} of {stocks.length} stocks
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
          color={s.day_change > 0 ? "text-accent" : s.day_change < 0 ? "text-destructive" : undefined}
        />
        <DetailBox label="Volume" value={formatVolume(s.volume)} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <DetailBox label="Market Cap" value={formatMarketCap(s.market_cap)} />
        <DetailBox label="P/E Ratio" value={s.pe_ratio != null ? formatNumber(s.pe_ratio) : "—"} />
        <DetailBox
          label="Div Yield"
          value={s.dividend_yield != null ? `${formatNumber(s.dividend_yield)}%` : "—"}
          color={s.dividend_yield != null ? "text-accent" : undefined}
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
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-destructive to-accent rounded-full"
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
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="snapshot_date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => new Date(v).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
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
                  new Date(v).toLocaleDateString("en-KE", { month: "long", day: "numeric", year: "numeric" })
                }
                formatter={(value: number) => [`KSh ${formatNumber(value)}`, "Price"]}
              />
              <Line type="monotone" dataKey="price" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex items-center justify-between mt-2">
        <p className="text-[10px] text-muted-foreground">
          Last updated: {new Date(s.updated_at).toLocaleString("en-KE")}
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

/* ─── Desktop Row ─── */
const StockRow = ({
  stock: s,
  index,
  isExpanded,
  onToggle,
  onNavigate,
  history,
  historyLoading,
  isFavourite,
  onToggleFavourite,
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
}) => (
  <>
    <tr
      className={`border-t border-border/40 hover:bg-accent/8 transition-colors cursor-pointer group ${
        index % 2 === 0 ? "bg-transparent" : "bg-muted/20"
      }`}
      onClick={onNavigate}
    >
      <td className="pl-4 pr-2 py-3.5 text-muted-foreground/60 text-xs tabular-nums">{index + 1}</td>
      <td className="px-3 py-3.5">
        <span className="font-bold text-foreground text-sm tracking-wide">{s.symbol}</span>
      </td>
      <td className="px-3 py-3.5 text-foreground text-xs max-w-[200px] truncate" title={s.name}>
        {s.name}
      </td>
      <td className="px-2 py-3.5">
        <span className="inline-block text-[10px] font-medium text-muted-foreground bg-muted/60 rounded-md px-1.5 py-0.5 whitespace-nowrap">
          {s.sector}
        </span>
      </td>
      <td className="px-2 py-3.5 text-center">
        <MiniSparkline data={history || []} positive={s.day_change >= 0} />
      </td>
      <td className="px-3 py-3.5 text-right">
        <span className="font-bold text-accent text-[15px] tabular-nums">{formatNumber(s.price)}</span>
      </td>
      <td className="px-3 py-3.5 text-right">
        <ChangeCell change={s.day_change} pct={s.day_change_percent} />
      </td>
      <td className="px-3 py-3.5 text-right text-muted-foreground text-xs tabular-nums">{formatVolume(s.volume)}</td>
      <td className="px-3 py-3.5 text-right text-muted-foreground text-xs tabular-nums">
        {formatMarketCap(s.market_cap)}
      </td>
      {onToggleFavourite !== undefined && (
        <td className="px-2 py-3.5 text-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavourite();
            }}
            className="p-1 rounded-md hover:bg-muted transition-colors"
            aria-label={isFavourite ? "Remove from watchlist" : "Add to watchlist"}
          >
            <Star
              className={`h-3.5 w-3.5 transition-colors ${isFavourite ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/40 hover:text-yellow-500"}`}
            />
          </button>
        </td>
      )}
      <td className="px-3 py-3.5 text-center">
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-accent" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground" />
        )}
      </td>
    </tr>
    {isExpanded && (
      <tr className="border-t border-border bg-muted/20">
        <td colSpan={onToggleFavourite !== undefined ? 11 : 10}>
          <StockDetailPanel stock={s} history={history} historyLoading={historyLoading} />
        </td>
      </tr>
    )}
  </>
);

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
}) => (
  <Link
    to={`/stocks/${s.symbol}`}
    className="block rounded-xl border border-border bg-card hover:border-accent/30 transition-all active:scale-[0.99] overflow-hidden"
  >
    <div className="flex items-center gap-3 p-3.5">
      {/* Left: Symbol + Name */}
      <div className="flex-1 min-w-0">
        <span className="font-bold text-foreground text-sm">{s.symbol}</span>
        <p className="text-[11px] text-muted-foreground truncate">{s.name}</p>
      </div>

      {/* Center: Sparkline */}
      <div className="shrink-0">
        <MiniSparkline data={history || []} positive={s.day_change >= 0} />
      </div>

      {/* Right: Price + Change */}
      <div className="text-right shrink-0">
        <p className="font-bold text-foreground text-sm tabular-nums">KES {formatNumber(s.price)}</p>
        <ChangeCell change={s.day_change} pct={s.day_change_percent} />
      </div>

      {/* Watchlist button */}
      {onToggleFavourite !== undefined && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavourite();
          }}
          className="p-1 shrink-0"
          aria-label={isFavourite ? "Remove from watchlist" : "Add to watchlist"}
        >
          <Star
            className={`h-4 w-4 transition-colors ${isFavourite ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/40"}`}
          />
        </button>
      )}
    </div>
  </Link>
);
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

export default StocksPage;
