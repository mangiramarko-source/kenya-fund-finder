import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Minus,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Area, ComposedChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import SectionLiveStatus from "@/components/SectionLiveStatus";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useIsMobile } from "@/hooks/use-mobile";
import { fetchPublicData } from "@/lib/gateway";
import { normalizeStock, stockCache, type CachedStock } from "@/lib/stockCache";
import { calculateDemoReturn, fetchCompleteDemoHistory, filterDemoStocks, findDemoStock, stockProductionPath, type DemoHistoryRow, type DemoPricePoint } from "@/lib/stockDetailDemo";
import { getStockLogoUrl } from "@/lib/stockBranding";

const formatPrice = (value: number) => value.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatCompact = (value: number | null) => {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-KE", { notation: "compact", maximumFractionDigits: 1 }).format(value);
};

export default function StockDetailDesktopDemoPage({ production = false }: { production?: boolean }) {
  const { symbol = "" } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [cachedStocks] = useState(() => stockCache.loadStocks()?.stocks ?? []);
  const [stocks, setStocks] = useState<CachedStock[]>(cachedStocks);
  const [history, setHistory] = useState<Record<string, DemoPricePoint[]>>({});
  const [loading, setLoading] = useState(cachedStocks.length === 0);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("All");
  const [movement, setMovement] = useState<"all" | "gainers" | "losers" | "unchanged">("all");

  useDocumentTitle(
    production ? "Kenyan Stocks – Stock Market | Kenya Fund Finder" : "Desktop Stock Detail Demo | Kenya Fund Finder",
    production ? "Track Kenyan stock market prices, market cap, volumes, and performance." : "Experimental three-column desktop stock page.",
  );

  useEffect(() => {
    if (isMobile && symbol) navigate(stockProductionPath(symbol), { replace: true });
  }, [isMobile, navigate, symbol]);

  useEffect(() => {
    let cancelled = false;
    const loadStocks = async () => {
      if (cachedStocks.length === 0) setLoading(true);
      setLoadError(false);
      try {
        const response = await fetchPublicData<CachedStock>("stocks", {
          select: [
            "id", "symbol", "name", "sector", "price", "previous_price", "day_change",
            "day_change_percent", "volume", "market_cap", "pe_ratio", "dividend_yield",
            "year_high", "year_low", "updated_at",
          ],
          limit: 200,
        });
        const normalized = response.data.map(normalizeStock);
        if (!cancelled) {
          setStocks(normalized);
          stockCache.saveStocks(normalized);
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to load desktop stock demo", error);
        if (!cancelled) {
          setLoadError(cachedStocks.length === 0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const loadHistory = async () => {
      try {
        const grouped = await fetchCompleteDemoHistory(async (offset, limit) => {
          const response = await fetchPublicData<DemoHistoryRow>("stock-history-bulk", {
            select: ["stock_id", "snapshot_date", "price"],
            order: "snapshot_date.asc",
            days: 365,
            offset,
            limit,
          });
          return { count: response.count, data: response.data };
        });
        if (!cancelled) setHistory(grouped);
      } catch (historyError) {
        console.error("Failed to load stock returns", historyError);
      }
    };
    loadStocks();
    loadHistory();
    return () => { cancelled = true; };
  }, [cachedStocks]);

  const selectedStock = useMemo(
    () => symbol ? findDemoStock(stocks, symbol) : stocks[0] ?? null,
    [stocks, symbol],
  );

  const filteredStocks = useMemo(() => {
    let result = sector === "All" ? stocks : stocks.filter((stock) => stock.sector === sector);
    if (movement === "gainers") result = result.filter((stock) => stock.day_change_percent > 0);
    if (movement === "losers") result = result.filter((stock) => stock.day_change_percent < 0);
    if (movement === "unchanged") result = result.filter((stock) => stock.day_change_percent === 0);
    return filterDemoStocks(result, search);
  }, [movement, search, sector, stocks]);

  const sectors = useMemo(() => ["All", ...Array.from(new Set(stocks.map((stock) => stock.sector))).sort()], [stocks]);
  const sectorStocks = useMemo(() => sector === "All" ? stocks : stocks.filter((stock) => stock.sector === sector), [sector, stocks]);

  const movementCounts = useMemo(() => ({
    all: sectorStocks.length,
    gainers: sectorStocks.filter((stock) => stock.day_change_percent > 0).length,
    losers: sectorStocks.filter((stock) => stock.day_change_percent < 0).length,
    unchanged: sectorStocks.filter((stock) => stock.day_change_percent === 0).length,
  }), [sectorStocks]);
  const latestUpdate = useMemo(() => stocks.length > 0
    ? stocks.reduce((latest, stock) => stock.updated_at > latest ? stock.updated_at : latest, stocks[0].updated_at)
    : null, [stocks]);

  if (isMobile) return null;

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground">
      <main className="mx-auto max-w-[1600px] px-6 py-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-[720px] rounded-2xl" />
          </div>
        ) : loadError ? (
          <DemoState title="Stock data is temporarily unavailable" detail="Please check your connection and refresh the demo." />
        ) : !selectedStock ? (
          <DemoState title="Stock not found" detail={`No listed stock matches “${symbol}”.`} />
        ) : (
          <div>
            <section className="min-w-0">
              <div className="mb-7 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-500">Nairobi Securities Exchange</p>
                  <h1 className="mt-2 text-5xl font-black tracking-tight">Stocks</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Browse current market prices, momentum across timeframes and open full stock reports.</p>
                </div>
                <SectionLiveStatus section="stocks" fallbackDate={latestUpdate} isLoading={loading} />
              </div>

              <div className="mb-5 overflow-hidden">
                <div className="flex items-center gap-2">
                  <div className="flex min-w-0 items-center gap-2 overflow-x-auto scrollbar-hide">
                    <MovementButton label="All" count={movementCounts.all} active={movement === "all"} onClick={() => setMovement("all")} />
                    <MovementButton label="Gainers" count={movementCounts.gainers} active={movement === "gainers"} onClick={() => setMovement("gainers")} icon={<TrendingUp className="h-3.5 w-3.5" />} tone="positive" />
                    <MovementButton label="Losers" count={movementCounts.losers} active={movement === "losers"} onClick={() => setMovement("losers")} icon={<TrendingDown className="h-3.5 w-3.5" />} tone="negative" />
                    <MovementButton label="Unchanged" count={movementCounts.unchanged} active={movement === "unchanged"} onClick={() => setMovement("unchanged")} icon={<Minus className="h-3.5 w-3.5" />} />
                  </div>
                  <div className="relative ml-auto w-80 shrink-0">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search stocks..." className="h-11 rounded-full border-border bg-card pl-11 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-emerald-500/50" />
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[22px] border border-border bg-card shadow-sm">
                <div className="flex gap-8 overflow-x-auto border-b border-border bg-black px-7 pt-3 scrollbar-hide">
                  {sectors.map((item) => (
                    <button key={item} onClick={() => setSector(item)} className={`relative shrink-0 pb-3 text-[13px] font-semibold transition-colors ${sector === item ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"}`}>
                      {item}
                      {sector === item && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-emerald-500" />}
                    </button>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1380px] table-fixed text-left">
                    <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-[0.18em] text-muted-foreground dark:bg-[#1b1c1f]">
                      <tr>
                        <th className="w-[18%] bg-background/60 px-6 py-3 font-semibold dark:bg-[#151619]">Company</th>
                        <th className="w-[10%] px-3 py-3 text-center font-semibold">Last Price</th>
                        <th className="w-[7%] px-3 py-3 text-right font-semibold">1D</th>
                        <th className="w-[7%] px-3 py-3 text-right font-semibold">7D</th>
                        <th className="w-[7%] px-3 py-3 text-right font-semibold">1M</th>
                        <th className="w-[7%] px-3 py-3 text-right font-semibold">3M</th>
                        <th className="w-[7%] px-3 py-3 text-right font-semibold">1Y</th>
                        <th className="w-[9%] px-3 py-3 text-center font-semibold">Trend</th>
                        <th className="w-[12%] px-3 py-3 text-left font-semibold">52W Range</th>
                        <th className="w-[7%] px-3 py-3 text-center font-semibold">Volume</th>
                        <th className="w-[9%] px-3 py-3 text-center font-semibold">Mkt Cap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-muted/20 dark:bg-[#191a1d]">
                      {filteredStocks.map((stock) => <StockTableRow key={stock.id} stock={stock} points={history[stock.id] ?? []} selected={stock.id === selectedStock.id} />)}
                    </tbody>
                  </table>
                </div>
                {filteredStocks.length === 0 && <DemoState title="No stocks found" detail="Try another company, ticker, or sector." compact />}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function StockTableRow({ stock, points, selected }: { stock: CachedStock; points: DemoPricePoint[]; selected: boolean }) {
  const sevenDay = calculateDemoReturn(points, stock.price, 7);
  const oneMonth = calculateDemoReturn(points, stock.price, 30);
  const threeMonth = calculateDemoReturn(points, stock.price, 90);
  const oneYear = calculateDemoReturn(points, stock.price, 365);
  const logoUrl = getStockLogoUrl(stock.symbol);
  return (
    <tr onClick={() => window.location.assign(stockProductionPath(stock.symbol))} className={`cursor-pointer bg-muted/20 transition-colors hover:bg-muted/35 dark:bg-[#191a1d] dark:hover:bg-[#202226] ${selected ? "ring-1 ring-inset ring-emerald-500/20" : ""}`}>
      <td className="bg-background/60 px-6 py-4 dark:bg-[#151619]"><div className="flex items-center gap-3"><div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted/60 text-[10px] font-bold text-muted-foreground"><span>{stock.symbol.slice(0, 2)}</span>{logoUrl && <img src={logoUrl} alt={`${stock.name} logo`} className="absolute inset-0 h-full w-full bg-white object-contain p-1" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} />}</div><div className="min-w-0"><p className="text-sm font-bold">{stock.symbol}</p><p className="max-w-[190px] truncate text-[11px] text-muted-foreground">{stock.name}</p></div></div></td>
      <td className="whitespace-nowrap px-3 py-4 text-center font-body text-sm font-bold tabular-nums"><span className="mr-1 text-[10px] font-medium text-muted-foreground">KSh</span>{formatPrice(stock.price)}</td>
      <td className="px-3 py-4 text-right"><ReturnValue value={stock.day_change_percent} /></td>
      <td className="px-3 py-4 text-right"><ReturnValue value={sevenDay} /></td>
      <td className="px-3 py-4 text-right"><ReturnValue value={oneMonth} /></td>
      <td className="px-3 py-4 text-right"><ReturnValue value={threeMonth} /></td>
      <td className="px-3 py-4 text-right"><ReturnValue value={oneYear} /></td>
      <td className="px-3 py-4"><div className="flex justify-center"><TrendSparkline points={points} positive={(oneMonth ?? stock.day_change_percent) >= 0} /></div></td>
      <td className="px-3 py-4"><RangeCell stock={stock} /></td>
      <td className="px-3 py-4 text-center font-body text-xs text-muted-foreground tabular-nums">{formatCompact(stock.volume)}</td>
      <td className="whitespace-nowrap px-3 py-4 text-center font-body text-sm font-bold tabular-nums">KSh {formatCompact(stock.market_cap)}</td>
    </tr>
  );
}

function ReturnValue({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-muted-foreground">—</span>;
  return <span className={`whitespace-nowrap font-body text-sm font-bold tabular-nums ${value > 0 ? "text-emerald-500" : value < 0 ? "text-destructive" : "text-muted-foreground"}`}>{value > 0 ? "+" : ""}{formatPrice(value)}%</span>;
}

function TrendSparkline({ points, positive }: { points: DemoPricePoint[]; positive: boolean }) {
  const recent = points.slice(-12);
  if (recent.length < 2) return <span className="text-xs text-muted-foreground">—</span>;
  const color = positive ? "hsl(152 60% 42%)" : "hsl(var(--destructive))";
  const gradientId = `stock-trend-${positive ? "up" : "down"}`;
  return (
    <div className="h-[24px] w-[60px]" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={recent} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Area type="monotone" dataKey="price" stroke="none" fill={`url(#${gradientId})`} isAnimationActive={false} />
          <Line type="monotone" dataKey="price" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function RangeCell({ stock }: { stock: CachedStock }) {
  if (stock.year_low == null || stock.year_high == null || stock.year_high <= stock.year_low) return <span className="text-xs text-muted-foreground">—</span>;
  const position = Math.min(100, Math.max(0, ((stock.price - stock.year_low) / (stock.year_high - stock.year_low)) * 100));
  return <div className="min-w-[130px]"><div className="flex justify-between font-body text-[10px] text-muted-foreground tabular-nums"><span>{formatPrice(stock.year_low)}</span><span>{formatPrice(stock.year_high)}</span></div><div className="relative mt-2 h-1.5 rounded-full bg-muted"><span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500 shadow-[0_0_8px_hsl(160_84%_39%/0.45)]" style={{ left: `${position}%` }} /></div></div>;
}

function MovementButton({ label, count, active, onClick, icon, tone }: { label: string; count: number; active: boolean; onClick: () => void; icon?: ReactNode; tone?: "positive" | "negative" }) {
  return (
    <button onClick={onClick} className={`flex h-11 shrink-0 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors ${active ? "border-foreground bg-foreground text-background" : "border-border bg-transparent text-muted-foreground hover:text-foreground"}`}>
      <span className={tone === "positive" ? "text-emerald-500" : tone === "negative" ? "text-destructive" : ""}>{icon}</span>
      <span>{label}</span><span className={`font-normal ${active ? "text-background/70" : "text-muted-foreground"}`}>{count}</span>
    </button>
  );
}

function DemoState({ title, detail, compact = false }: { title: string; detail: string; compact?: boolean }) {
  return <div className={`rounded-2xl border border-border bg-card text-center ${compact ? "p-8" : "p-16"}`}><h2 className="font-bold">{title}</h2><p className="mt-2 text-sm text-muted-foreground">{detail}</p></div>;
}
