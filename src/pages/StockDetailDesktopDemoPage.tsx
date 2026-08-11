import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Minus,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import SectionLiveStatus from "@/components/SectionLiveStatus";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useIsMobile } from "@/hooks/use-mobile";
import { fetchPublicData } from "@/lib/gateway";
import { normalizeStock, stockCache, type CachedStock } from "@/lib/stockCache";
import { calculateDemoReturn, filterDemoStocks, findDemoStock, stockProductionPath, type DemoPricePoint } from "@/lib/stockDetailDemo";

const formatPrice = (value: number) => value.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatCompact = (value: number | null) => {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-KE", { notation: "compact", maximumFractionDigits: 1 }).format(value);
};

interface RawHistoryPoint {
  stock_id: string;
  snapshot_date: string;
  price: number | string;
}

export default function StockDetailDesktopDemoPage({ production = false }: { production?: boolean }) {
  const { symbol = "" } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [stocks, setStocks] = useState<CachedStock[]>([]);
  const [history, setHistory] = useState<Record<string, DemoPricePoint[]>>({});
  const [loading, setLoading] = useState(true);
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
      setLoading(true);
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
        }
        try {
          const historyResponse = await fetchPublicData<RawHistoryPoint>("stock-history-bulk", {
            select: ["stock_id", "snapshot_date", "price"],
            order: "snapshot_date.asc",
            days: 90,
            limit: 5000,
          });
          const grouped: Record<string, DemoPricePoint[]> = {};
          historyResponse.data.forEach((point) => {
            if (!grouped[point.stock_id]) grouped[point.stock_id] = [];
            grouped[point.stock_id].push({ snapshot_date: point.snapshot_date, price: Number(point.price) });
          });
          if (!cancelled) setHistory(grouped);
        } catch (historyError) {
          console.error("Failed to load demo stock returns", historyError);
        }
      } catch (error) {
        console.error("Failed to load desktop stock demo", error);
        const cached = stockCache.loadStocks()?.stocks ?? [];
        if (!cancelled) {
          setStocks(cached);
          setLoadError(cached.length === 0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadStocks();
    return () => { cancelled = true; };
  }, []);

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
                <div className="flex gap-8 overflow-x-auto border-b border-border bg-gradient-to-b from-muted/30 to-card px-7 pt-5 scrollbar-hide">
                  {sectors.map((item) => (
                    <button key={item} onClick={() => setSector(item)} className={`relative shrink-0 pb-4 text-sm font-semibold transition-colors ${sector === item ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"}`}>
                      {item}
                      {sector === item && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-emerald-500" />}
                    </button>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1120px] table-fixed text-left">
                    <thead className="border-b border-border bg-black text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      <tr>
                        <th className="w-[23%] px-6 py-4 font-semibold">Company</th>
                        <th className="w-[11%] px-3 py-4 font-semibold">Last Price</th>
                        <th className="w-[8%] px-3 py-4 font-semibold">1D</th>
                        <th className="w-[8%] px-3 py-4 font-semibold">7D</th>
                        <th className="w-[8%] px-3 py-4 font-semibold">1M</th>
                        <th className="w-[10%] px-3 py-4 font-semibold">Trend</th>
                        <th className="w-[14%] px-3 py-4 font-semibold">52W Range</th>
                        <th className="w-[8%] px-3 py-4 font-semibold">Volume</th>
                        <th className="w-[10%] px-6 py-4 text-right font-semibold">Mkt Cap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
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
  return (
    <tr onClick={() => window.location.assign(stockProductionPath(stock.symbol))} className={`cursor-pointer bg-card transition-colors hover:bg-muted/35 ${selected ? "ring-1 ring-inset ring-emerald-500/20" : ""}`}>
      <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-muted/60 text-[10px] font-bold text-muted-foreground">{stock.symbol.slice(0, 2)}</div><div className="min-w-0"><p className="text-sm font-bold">{stock.symbol}</p><p className="max-w-[190px] truncate text-xs text-muted-foreground">{stock.name}</p></div></div></td>
      <td className="whitespace-nowrap px-3 py-4 text-sm font-bold tabular-nums"><span className="mr-1 text-[10px] font-medium text-muted-foreground">KSh</span>{formatPrice(stock.price)}</td>
      <td className="px-3 py-4"><ReturnValue value={stock.day_change_percent} /></td>
      <td className="px-3 py-4"><ReturnValue value={sevenDay} /></td>
      <td className="px-3 py-4"><ReturnValue value={oneMonth} /></td>
      <td className="px-3 py-4"><TrendSparkline points={points} positive={(oneMonth ?? stock.day_change_percent) >= 0} /></td>
      <td className="px-3 py-4"><RangeCell stock={stock} /></td>
      <td className="px-3 py-4 text-xs text-muted-foreground tabular-nums">{formatCompact(stock.volume)}</td>
      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold tabular-nums">KSh {formatCompact(stock.market_cap)}</td>
    </tr>
  );
}

function ReturnValue({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-muted-foreground">—</span>;
  return <span className={`whitespace-nowrap text-sm font-bold tabular-nums ${value > 0 ? "text-emerald-500" : value < 0 ? "text-destructive" : "text-muted-foreground"}`}>{value > 0 ? "+" : ""}{formatPrice(value)}%</span>;
}

function TrendSparkline({ points, positive }: { points: DemoPricePoint[]; positive: boolean }) {
  const recent = points.slice(-12);
  if (recent.length < 2) return <span className="text-xs text-muted-foreground">—</span>;
  const prices = recent.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const spread = max - min || 1;
  const path = recent.map((point, index) => `${index === 0 ? "M" : "L"}${(index / (recent.length - 1)) * 92},${30 - ((point.price - min) / spread) * 24}`).join(" ");
  return <svg viewBox="0 0 92 34" className={`h-8 w-24 ${positive ? "text-emerald-500" : "text-destructive"}`} aria-hidden="true"><path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function RangeCell({ stock }: { stock: CachedStock }) {
  if (stock.year_low == null || stock.year_high == null || stock.year_high <= stock.year_low) return <span className="text-xs text-muted-foreground">—</span>;
  const position = Math.min(100, Math.max(0, ((stock.price - stock.year_low) / (stock.year_high - stock.year_low)) * 100));
  return <div className="min-w-[130px]"><div className="flex justify-between text-[10px] text-muted-foreground tabular-nums"><span>{formatPrice(stock.year_low)}</span><span>{formatPrice(stock.year_high)}</span></div><div className="relative mt-2 h-1.5 rounded-full bg-muted"><span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500 shadow-[0_0_8px_hsl(160_84%_39%/0.45)]" style={{ left: `${position}%` }} /></div></div>;
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
