import { useEffect, useState, useMemo } from "react";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Minus, BarChart3, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from "recharts";

interface Rate { id: string; currency_code: string; currency_name: string; rate: number; previous_rate: number | null; }
interface Commodity { id: string; name: string; symbol: string; price: number; previous_price: number | null; unit: string; }
interface Stock { id: string; symbol: string; name: string; sector: string; price: number; previous_price: number | null; day_change: number; day_change_percent: number; volume: number; market_cap: number | null; }
interface RateHistory { snapshot_date: string; rate: number; currency_code: string; }

const ChangeIndicator = ({ current, previous }: { current: number; previous: number | null }) => {
  if (previous == null) return <span className="text-muted-foreground text-xs">—</span>;
  const diff = current - previous;
  const pct = previous !== 0 ? ((diff / previous) * 100).toFixed(2) : "0.00";
  if (diff > 0) return <span className="inline-flex items-center gap-0.5 text-accent text-[11px] font-semibold"><TrendingUp className="h-3 w-3" /> +{pct}%</span>;
  if (diff < 0) return <span className="inline-flex items-center gap-0.5 text-destructive text-[11px] font-semibold"><TrendingDown className="h-3 w-3" /> {pct}%</span>;
  return <span className="inline-flex items-center gap-0.5 text-muted-foreground text-[11px]"><Minus className="h-3 w-3" /> 0.00%</span>;
};

const MarketDashboardPage = () => {
  useDocumentTitle(
    "Market Overview – Kenya Fund Finder",
    "Combined view of NSE stocks, FX exchange rates, and commodity prices with charts and key metrics.",
    { title: "Market Overview – Kenya Fund Finder", description: "Combined market overview dashboard." }
  );
  useJsonLd({
    "@context": "https://schema.org", "@type": "WebPage",
    name: "Market Overview – Kenya Fund Finder",
    url: "https://kenyafundfinder.com/markets",
  });

  const [rates, setRates] = useState<Rate[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [rateHistory, setRateHistory] = useState<RateHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [rRes, cRes, sRes, hRes] = await Promise.all([
        supabase.from("exchange_rates_public" as any).select("id, currency_code, currency_name, rate, previous_rate").order("sort_order"),
        supabase.from("commodities_public" as any).select("id, name, symbol, price, previous_price, unit").order("sort_order"),
        supabase.from("stocks_public" as any).select("id, symbol, name, sector, price, previous_price, day_change, day_change_percent, volume, market_cap").order("sort_order"),
        supabase.from("exchange_rate_history_public" as any).select("snapshot_date, rate, currency_code").order("snapshot_date", { ascending: true }).limit(500),
      ]);
      setRates((rRes.data as any) || []);
      setCommodities(((cRes.data as any) || []).map((c: any) => ({ ...c, price: Number(c.price), previous_price: c.previous_price != null ? Number(c.previous_price) : null })));
      setStocks(((sRes.data as any) || []).map((s: any) => ({ ...s, price: Number(s.price), previous_price: s.previous_price != null ? Number(s.previous_price) : null, day_change: Number(s.day_change), day_change_percent: Number(s.day_change_percent), volume: Number(s.volume), market_cap: s.market_cap != null ? Number(s.market_cap) : null })));
      setRateHistory(((hRes.data as any) || []).map((h: any) => ({ ...h, rate: Number(h.rate) })));
      setLoading(false);
    };
    fetchAll();
  }, []);

  const stockGainers = useMemo(() => stocks.filter(s => s.day_change > 0).length, [stocks]);
  const stockLosers = useMemo(() => stocks.filter(s => s.day_change < 0).length, [stocks]);
  const topGainers = useMemo(() => [...stocks].filter(s => s.day_change > 0).sort((a, b) => b.day_change_percent - a.day_change_percent).slice(0, 5), [stocks]);
  const topLosers = useMemo(() => [...stocks].filter(s => s.day_change < 0).sort((a, b) => a.day_change_percent - b.day_change_percent).slice(0, 5), [stocks]);

  // Build USD chart data from history
  const usdHistory = useMemo(() => {
    return rateHistory.filter(h => h.currency_code === "USD").slice(-30);
  }, [rateHistory]);

  const totalMarketCap = useMemo(() => {
    const total = stocks.reduce((s, st) => s + (st.market_cap || 0), 0);
    if (total >= 1e12) return `KSh ${(total / 1e12).toFixed(1)}T`;
    if (total >= 1e9) return `KSh ${(total / 1e9).toFixed(1)}B`;
    return `KSh ${(total / 1e6).toFixed(0)}M`;
  }, [stocks]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container py-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96 mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Market Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Combined view of NSE stocks, FX exchange rates, and commodity prices
          </p>
        </div>

        {/* Top-level stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard label="NSE Stocks" value={String(stocks.length)} sub={`${stockGainers}↑ ${stockLosers}↓`} />
          <StatCard label="Total Mkt Cap" value={totalMarketCap} />
          <StatCard label="FX Pairs" value={String(rates.length)} />
          <StatCard label="Commodities" value={String(commodities.length)} />
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* USD/KES Chart */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">USD/KES (30 Days)</span>
              </div>
              <Link to="/rates" className="text-xs text-accent hover:underline inline-flex items-center gap-1">
                All rates <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {usdHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={usdHistory}>
                  <defs>
                    <linearGradient id="usdGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="snapshot_date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => new Date(v).toLocaleDateString("en-KE", { month: "short", day: "numeric" })} />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={50} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} labelFormatter={v => new Date(v).toLocaleDateString("en-KE", { month: "long", day: "numeric", year: "numeric" })} formatter={(v: number) => [`KES ${v.toFixed(2)}`, "Rate"]} />
                  <Area type="monotone" dataKey="rate" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#usdGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No USD history yet</div>
            )}
          </div>

          {/* Market Sentiment */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">NSE Market Sentiment</span>
              </div>
              <Link to="/stocks" className="text-xs text-accent hover:underline inline-flex items-center gap-1">
                All stocks <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden flex">
                  {stocks.length > 0 && (
                    <>
                      <div className="bg-accent h-full transition-all" style={{ width: `${(stockGainers / stocks.length) * 100}%` }} />
                      <div className="bg-muted-foreground/30 h-full transition-all" style={{ width: `${((stocks.length - stockGainers - stockLosers) / stocks.length) * 100}%` }} />
                      <div className="bg-destructive h-full transition-all" style={{ width: `${(stockLosers / stocks.length) * 100}%` }} />
                    </>
                  )}
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span className="text-accent font-semibold">{stockGainers} Gainers</span>
                <span>{stocks.length - stockGainers - stockLosers} Unchanged</span>
                <span className="text-destructive font-semibold">{stockLosers} Losers</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-semibold text-accent uppercase tracking-wider mb-1.5">Top Gainers</p>
                {topGainers.map(s => (
                  <div key={s.id} className="flex justify-between items-center py-1">
                    <span className="text-xs font-medium text-foreground">{s.symbol}</span>
                    <span className="text-[11px] text-accent font-semibold">+{s.day_change_percent.toFixed(2)}%</span>
                  </div>
                ))}
                {topGainers.length === 0 && <p className="text-[10px] text-muted-foreground">No gainers</p>}
              </div>
              <div>
                <p className="text-[10px] font-semibold text-destructive uppercase tracking-wider mb-1.5">Top Losers</p>
                {topLosers.map(s => (
                  <div key={s.id} className="flex justify-between items-center py-1">
                    <span className="text-xs font-medium text-foreground">{s.symbol}</span>
                    <span className="text-[11px] text-destructive font-semibold">{s.day_change_percent.toFixed(2)}%</span>
                  </div>
                ))}
                {topLosers.length === 0 && <p className="text-[10px] text-muted-foreground">No losers</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Tables Row */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* FX Rates */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-muted/70 border-b border-border">
              <span className="text-xs font-semibold text-foreground">FX Rates (KES)</span>
              <Link to="/rates" className="text-[10px] text-accent hover:underline">See all →</Link>
            </div>
            <div className="divide-y divide-border">
              {rates.slice(0, 8).map(r => (
                <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <span className="text-xs font-semibold text-foreground">{r.currency_code}</span>
                    <span className="block text-[10px] text-muted-foreground">{r.currency_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-foreground tabular-nums">{Number(r.rate).toFixed(2)}</span>
                    <span className="block"><ChangeIndicator current={Number(r.rate)} previous={r.previous_rate != null ? Number(r.previous_rate) : null} /></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Commodities */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-muted/70 border-b border-border">
              <span className="text-xs font-semibold text-foreground">Commodities</span>
              <Link to="/commodities" className="text-[10px] text-accent hover:underline">See all →</Link>
            </div>
            <div className="divide-y divide-border">
              {commodities.slice(0, 8).map(c => (
                <div key={c.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <span className="text-xs font-semibold text-foreground">{c.name}</span>
                    <span className="block text-[10px] text-muted-foreground">{c.symbol}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-foreground tabular-nums">{c.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-[9px] text-muted-foreground ml-0.5">{c.unit}</span>
                    <span className="block"><ChangeIndicator current={c.price} previous={c.previous_price} /></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Stocks by Volume */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-muted/70 border-b border-border">
              <span className="text-xs font-semibold text-foreground">NSE by Volume</span>
              <Link to="/stocks" className="text-[10px] text-accent hover:underline">See all →</Link>
            </div>
            <div className="divide-y divide-border">
              {[...stocks].sort((a, b) => b.volume - a.volume).slice(0, 8).map(s => (
                <div key={s.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <span className="text-xs font-semibold text-foreground">{s.symbol}</span>
                    <span className="block text-[10px] text-muted-foreground">{s.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-foreground tabular-nums">KSh {s.price.toFixed(2)}</span>
                    <span className="block">
                      {s.day_change > 0 ? (
                        <span className="text-accent text-[11px] font-semibold">+{s.day_change_percent.toFixed(2)}%</span>
                      ) : s.day_change < 0 ? (
                        <span className="text-destructive text-[11px] font-semibold">{s.day_change_percent.toFixed(2)}%</span>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">0.00%</span>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 border border-border/50 p-3">
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Market data is indicative and may be delayed. This information is for educational purposes only and does not constitute investment advice.
          </p>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="rounded-xl border border-border bg-card p-3">
    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
    {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

export default MarketDashboardPage;
