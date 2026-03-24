import { useEffect, useState, useMemo } from "react";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Search, ArrowUpDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

const ChangeCell = ({ change, pct }: { change: number; pct: number }) => {
  if (change > 0) return (
    <span className="inline-flex items-center gap-0.5 text-accent text-[11px] font-semibold tabular-nums">
      <TrendingUp className="h-3 w-3" /> +{formatNumber(pct)}%
    </span>
  );
  if (change < 0) return (
    <span className="inline-flex items-center gap-0.5 text-destructive text-[11px] font-semibold tabular-nums">
      <TrendingDown className="h-3 w-3" /> {formatNumber(pct)}%
    </span>
  );
  return <span className="inline-flex items-center gap-0.5 text-muted-foreground text-[11px]"><Minus className="h-3 w-3" /> 0.00%</span>;
};

const SECTORS = ["All", "Banking", "Telecommunications", "Manufacturing", "Insurance", "Energy"] as const;

const StocksPage = () => {
  useDocumentTitle(
    "NSE Stocks – Nairobi Securities Exchange | Kenya Fund Finder",
    "Track Nairobi Securities Exchange (NSE) stock prices, market cap, volumes, and performance for top Kenyan listed companies.",
    {
      title: "NSE Stocks – Nairobi Securities Exchange | Kenya Fund Finder",
      description: "Track Nairobi Securities Exchange (NSE) stock prices, volumes, and daily performance.",
    }
  );
  useJsonLd({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "NSE Stocks – Kenya Fund Finder",
    description: "Track Nairobi Securities Exchange (NSE) stock prices, market cap, and daily performance.",
    url: "https://kenyafundfinder.com/stocks",
  });

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("market_cap");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("stocks_public")
        .select("id, symbol, name, sector, price, previous_price, day_change, day_change_percent, volume, market_cap, year_high, year_low, pe_ratio, dividend_yield, updated_at")
        .order("sort_order");
      setStocks(
        (data || []).map((s: any) => ({
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
        }))
      );
      setLoading(false);
    };
    fetch();

    const channel = supabase
      .channel("stocks-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "stocks" }, () => fetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

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
    else { setSortKey(key); setSortDir(key === "symbol" ? "asc" : "desc"); }
  };

  const gainers = useMemo(() => stocks.filter((s) => s.day_change > 0).length, [stocks]);
  const losers = useMemo(() => stocks.filter((s) => s.day_change < 0).length, [stocks]);
  const unchanged = useMemo(() => stocks.filter((s) => s.day_change === 0).length, [stocks]);

  const latestUpdate = stocks.length > 0
    ? new Date(stocks.reduce((latest, s) => s.updated_at > latest ? s.updated_at : latest, stocks[0].updated_at))
    : null;

  return (
    <div className="min-h-screen">
      <div className="container py-8">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Nairobi Securities Exchange</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track NSE-listed stock prices, volumes, and daily performance.
            {latestUpdate && (
              <span className="ml-2 text-xs">
                Updated {latestUpdate.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
          </p>
        </div>

        {/* Summary stats */}
        {!loading && stocks.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Stocks</p>
              <p className="text-xl font-bold text-foreground tabular-nums">{stocks.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] text-accent uppercase tracking-wider">Gainers</p>
              <p className="text-xl font-bold text-accent tabular-nums">{gainers}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] text-destructive uppercase tracking-wider">Losers</p>
              <p className="text-xl font-bold text-destructive tabular-nums">{losers}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Unchanged</p>
              <p className="text-xl font-bold text-muted-foreground tabular-nums">{unchanged}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stocks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-lg text-[16px] sm:text-sm"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {sectors.map((s) => (
              <button
                key={s}
                onClick={() => setSector(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  sector === s
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
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
            <div className="rounded-xl border border-border overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/70 text-xs">
                      <th className="text-left px-3 py-3 font-semibold text-muted-foreground w-10">#</th>
                      <SortHeader label="Symbol" sortKey="symbol" currentKey={sortKey} dir={sortDir} onClick={toggleSort} />
                      <th className="text-left px-3 py-3 font-semibold text-muted-foreground">Company</th>
                      <th className="text-left px-3 py-3 font-semibold text-muted-foreground">Sector</th>
                      <SortHeader label="Price (KSh)" sortKey="price" currentKey={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                      <SortHeader label="Change" sortKey="day_change_percent" currentKey={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                      <SortHeader label="Volume" sortKey="volume" currentKey={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                      <SortHeader label="Mkt Cap" sortKey="market_cap" currentKey={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                      <th className="text-right px-3 py-3 font-semibold text-muted-foreground">52W Range</th>
                      <SortHeader label="Div Yield" sortKey="dividend_yield" currentKey={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => (
                      <tr key={s.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-3 text-muted-foreground text-xs tabular-nums">{i + 1}</td>
                        <td className="px-3 py-3 font-bold text-foreground tabular-nums">{s.symbol}</td>
                        <td className="px-3 py-3 text-foreground text-xs max-w-[180px] truncate">{s.name}</td>
                        <td className="px-3 py-3">
                          <Badge variant="secondary" className="text-[10px] font-medium">{s.sector}</Badge>
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-foreground tabular-nums">
                          {formatNumber(s.price)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <ChangeCell change={s.day_change} pct={s.day_change_percent} />
                        </td>
                        <td className="px-3 py-3 text-right text-muted-foreground text-xs tabular-nums">
                          {formatVolume(s.volume)}
                        </td>
                        <td className="px-3 py-3 text-right text-muted-foreground text-xs tabular-nums">
                          {formatMarketCap(s.market_cap)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {s.year_low != null && s.year_high != null ? (
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {formatNumber(s.year_low)} – {formatNumber(s.year_high)}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-3 text-right text-xs tabular-nums">
                          {s.dividend_yield != null ? (
                            <span className="text-accent font-semibold">{formatNumber(s.dividend_yield)}%</span>
                          ) : "—"}
                        </td>
                      </tr>
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
            filtered.map((s, i) => (
              <div key={s.id} className="rounded-xl border border-border bg-card p-3.5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{s.symbol}</span>
                      <Badge variant="secondary" className="text-[9px]">{s.sector}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.name}</p>
                  </div>
                  <ChangeCell change={s.day_change} pct={s.day_change_percent} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-muted/40 rounded-lg px-2 py-2 text-center">
                    <p className="text-[9px] text-muted-foreground">Price</p>
                    <p className="font-bold text-foreground text-sm tabular-nums">KSh {formatNumber(s.price)}</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg px-2 py-2 text-center">
                    <p className="text-[9px] text-muted-foreground">Volume</p>
                    <p className="font-semibold text-muted-foreground text-sm tabular-nums">{formatVolume(s.volume)}</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg px-2 py-2 text-center">
                    <p className="text-[9px] text-muted-foreground">Div Yield</p>
                    <p className="font-semibold text-accent text-sm tabular-nums">
                      {s.dividend_yield != null ? `${formatNumber(s.dividend_yield)}%` : "—"}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 rounded-lg bg-muted/40 border border-border/50 p-3">
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Stock prices shown are indicative and may be delayed. Data is sourced from the Nairobi Securities Exchange (NSE).
            This information is for educational purposes only and does not constitute investment advice.
          </p>
        </div>
      </div>
    </div>
  );
};

/* ─── Sortable Header ─── */
const SortHeader = ({
  label, sortKey, currentKey, dir, onClick, align = "left",
}: {
  label: string; sortKey: SortKey; currentKey: SortKey; dir: SortDir;
  onClick: (key: SortKey) => void; align?: "left" | "right";
}) => (
  <th
    className={`px-3 py-3 font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none ${
      align === "right" ? "text-right" : "text-left"
    }`}
    onClick={() => onClick(sortKey)}
  >
    <span className="inline-flex items-center gap-1">
      {label}
      {currentKey === sortKey && (
        <ArrowUpDown className="h-3 w-3 text-accent" />
      )}
    </span>
  </th>
);

const StockTableSkeleton = () => (
  <div className="rounded-xl border border-border overflow-hidden bg-card">
    <div className="bg-muted/70 px-3 py-3">
      <div className="flex gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-16" />
        ))}
      </div>
    </div>
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-3 py-3.5 border-t border-border">
        <Skeleton className="h-4 w-5" />
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16 ml-auto" />
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16" />
      </div>
    ))}
  </div>
);

export default StocksPage;
