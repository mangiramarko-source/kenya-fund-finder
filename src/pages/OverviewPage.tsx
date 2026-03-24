import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/hooks/useAuth";
import { useMarketData } from "@/components/home/MarketTicker";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, TrendingDown, Minus, Bell, BellPlus, ArrowRight,
  BarChart3, DollarSign, Gem, LineChart, Search, Activity, Eye,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { toast } from "sonner";
import { fetchFunds, type FundFromDB } from "@/lib/api";

/* ─── Types ─── */
interface RateHistory { snapshot_date: string; rate: number; currency_code: string; }

/* ─── Change Indicator ─── */
const Change = ({ current, previous }: { current: number; previous: number | null }) => {
  if (previous == null) return <span className="text-muted-foreground text-xs">—</span>;
  const diff = current - previous;
  const pct = previous !== 0 ? ((diff / previous) * 100).toFixed(2) : "0.00";
  if (diff > 0) return <span className="inline-flex items-center gap-0.5 text-accent text-[11px] font-semibold"><TrendingUp className="h-3 w-3" />+{pct}%</span>;
  if (diff < 0) return <span className="inline-flex items-center gap-0.5 text-destructive text-[11px] font-semibold"><TrendingDown className="h-3 w-3" />{pct}%</span>;
  return <span className="inline-flex items-center gap-0.5 text-muted-foreground text-[11px]"><Minus className="h-3 w-3" />0.00%</span>;
};

/* ─── Inline Alert Dialog ─── */
const QuickAlertDialog = ({
  open, onClose, assetType, assetId, assetName, currentPrice, unit,
}: {
  open: boolean; onClose: () => void;
  assetType: "stock" | "currency" | "commodity";
  assetId: string; assetName: string; currentPrice: number; unit?: string;
}) => {
  const { createAlert } = usePriceAlerts();
  const [targetPrice, setTargetPrice] = useState("");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) { toast.error("Enter a valid price"); return; }
    setSaving(true);
    const result = await createAlert({ asset_type: assetType, asset_id: assetId, asset_name: assetName, target_price: price, condition });
    setSaving(false);
    if (result?.error) toast.error("Failed to create alert");
    else { toast.success(`Alert set: ${assetName} ${condition} ${price}`); onClose(); setTargetPrice(""); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader><DialogTitle className="text-base">Set Price Alert</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-1">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Asset</p>
            <p className="font-semibold text-sm text-foreground">{assetName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Current: <span className="font-semibold text-accent">{currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} {unit}</span></p>
          </div>
          <Select value={condition} onValueChange={(v) => setCondition(v as any)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="above"><span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3 text-accent" /> Above</span></SelectItem>
              <SelectItem value="below"><span className="inline-flex items-center gap-1"><TrendingDown className="h-3 w-3 text-destructive" /> Below</span></SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" step="0.01" placeholder={`Target price`} value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} className="text-[16px] sm:text-sm h-9" />
          <Button onClick={handleCreate} disabled={saving} className="w-full h-9 text-sm">{saving ? "Creating…" : "Create Alert"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ─── Sector Pie Colors ─── */
const SECTOR_COLORS = [
  "hsl(152, 55%, 42%)", "hsl(210, 80%, 52%)", "hsl(38, 92%, 50%)",
  "hsl(280, 60%, 55%)", "hsl(0, 84%, 60%)", "hsl(180, 50%, 45%)",
  "hsl(320, 60%, 50%)", "hsl(60, 70%, 45%)",
];

/* ─── Main Page ─── */
const OverviewPage = () => {
  useDocumentTitle("Market Overview | Kenya Fund Finder", "Comprehensive overview of Kenyan stocks, money markets, FX rates, and commodities with analytics and price alerts.");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { rates, commodities, stocks, loading: marketLoading } = useMarketData();
  const { alerts } = usePriceAlerts();

  const [funds, setFunds] = useState<FundFromDB[]>([]);
  const [fundsLoading, setFundsLoading] = useState(true);
  const [rateHistory, setRateHistory] = useState<RateHistory[]>([]);
  const [search, setSearch] = useState("");

  // Alert dialog state
  const [alertDialog, setAlertDialog] = useState<{
    open: boolean; assetType: "stock" | "currency" | "commodity";
    assetId: string; assetName: string; currentPrice: number; unit?: string;
  }>({ open: false, assetType: "stock", assetId: "", assetName: "", currentPrice: 0 });

  useEffect(() => {
    fetchFunds().then(setFunds).catch(() => {}).finally(() => setFundsLoading(false));
    supabase.from("exchange_rate_history_public" as any)
      .select("snapshot_date, rate, currency_code")
      .order("snapshot_date", { ascending: true }).limit(500)
      .then(({ data }) => setRateHistory(((data as any) || []).map((h: any) => ({ ...h, rate: Number(h.rate) }))));
  }, []);

  // Derived data
  const stockGainers = useMemo(() => stocks.filter(s => s.day_change > 0).length, [stocks]);
  const stockLosers = useMemo(() => stocks.filter(s => s.day_change < 0).length, [stocks]);
  const topGainers = useMemo(() => [...stocks].filter(s => s.day_change > 0).sort((a, b) => b.day_change_percent - a.day_change_percent).slice(0, 5), [stocks]);
  const topLosers = useMemo(() => [...stocks].filter(s => s.day_change < 0).sort((a, b) => a.day_change_percent - b.day_change_percent).slice(0, 5), [stocks]);

  const usdHistory = useMemo(() => rateHistory.filter(h => h.currency_code === "USD").slice(-30), [rateHistory]);
  const gbpHistory = useMemo(() => rateHistory.filter(h => h.currency_code === "GBP").slice(-30), [rateHistory]);
  const eurHistory = useMemo(() => rateHistory.filter(h => h.currency_code === "EUR").slice(-30), [rateHistory]);

  const mmFunds = useMemo(() => funds.filter(f => f.fund_type === "money_market"), [funds]);
  const avgMMYield = useMemo(() => mmFunds.length ? mmFunds.reduce((s, f) => s + f.annual_yield, 0) / mmFunds.length : 0, [mmFunds]);
  const bestMMYield = useMemo(() => mmFunds.length ? Math.max(...mmFunds.map(f => f.annual_yield)) : 0, [mmFunds]);

  const sectorData = useMemo(() => {
    const map: Record<string, number> = {};
    stocks.forEach(s => { map[s.sector] = (map[s.sector] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [stocks]);

  const totalMarketCap = useMemo(() => {
    const t = stocks.reduce((s, st) => s + (st.market_cap || 0), 0);
    if (t >= 1e12) return `KSh ${(t / 1e12).toFixed(1)}T`;
    if (t >= 1e9) return `KSh ${(t / 1e9).toFixed(1)}B`;
    return `KSh ${(t / 1e6).toFixed(0)}M`;
  }, [stocks]);

  // Volume bar data (top 10 by volume)
  const volumeData = useMemo(() => [...stocks].sort((a, b) => b.volume - a.volume).slice(0, 8).map(s => ({
    name: s.symbol, volume: s.volume, fill: s.day_change >= 0 ? "hsl(152, 55%, 42%)" : "hsl(0, 84%, 60%)",
  })), [stocks]);

  const openAlert = (assetType: "stock" | "currency" | "commodity", assetId: string, assetName: string, currentPrice: number, unit?: string) => {
    if (!user) { navigate("/auth"); return; }
    setAlertDialog({ open: true, assetType, assetId, assetName, currentPrice, unit });
  };

  const loading = marketLoading || fundsLoading;
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "there";
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  if (loading) {
    return (
      <div className="px-4 md:px-6 py-6 space-y-6">
        <Skeleton className="h-12 w-80" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <div className="grid md:grid-cols-2 gap-4">{[1,2].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-6 space-y-6 max-w-[1600px]">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            {user ? `${greeting}, ${displayName}` : "Market Overview"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {user ? "Here's your market snapshot" : "Stocks, money markets, FX rates & commodities at a glance"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <Button asChild variant="outline" size="sm" className="text-xs h-8">
              <Link to="/alerts"><Bell className="h-3.5 w-3.5 mr-1.5" />{alerts.length} Alert{alerts.length !== 1 ? "s" : ""}</Link>
            </Button>
          )}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Activity className="h-3 w-3 text-accent animate-pulse" />
            <span>Live</span>
          </div>
        </div>
      </div>

      {/* ─── Stat Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={BarChart3} label="NSE Stocks" value={String(stocks.length)} sub={`${stockGainers}↑ ${stockLosers}↓`} color="text-info" />
        <StatCard icon={LineChart} label="Total Mkt Cap" value={totalMarketCap} color="text-accent" />
        <StatCard icon={DollarSign} label="Avg MM Yield" value={`${avgMMYield.toFixed(2)}%`} sub={`Best: ${bestMMYield.toFixed(2)}%`} color="text-warning" />
        <StatCard icon={Gem} label="Commodities" value={String(commodities.length)} sub={`${rates.length} FX pairs`} color="text-primary" />
      </div>

      {/* ─── Charts Row 1: USD + Sentiment ─── */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* USD/KES Chart */}
        <ChartPanel title="USD/KES (30 Days)" link="/rates" linkLabel="All rates">
          {usdHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
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
          ) : <EmptyChart label="No USD history yet" />}
        </ChartPanel>

        {/* Market Sentiment */}
        <ChartPanel title="NSE Market Sentiment" link="/stocks" linkLabel="All stocks">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden flex">
                {stocks.length > 0 && (
                  <>
                    <div className="bg-accent h-full transition-all" style={{ width: `${(stockGainers / stocks.length) * 100}%` }} />
                    <div className="bg-muted-foreground/30 h-full" style={{ width: `${((stocks.length - stockGainers - stockLosers) / stocks.length) * 100}%` }} />
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-semibold text-accent uppercase tracking-wider mb-1.5">Top Gainers</p>
              {topGainers.map(s => (
                <div key={s.id} className="flex justify-between items-center py-1 group cursor-pointer" onClick={() => openAlert("stock", s.id, s.name, s.price, "KES")}>
                  <span className="text-xs font-medium text-foreground">{s.symbol}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-accent font-semibold">+{s.day_change_percent.toFixed(2)}%</span>
                    <BellPlus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
              {topGainers.length === 0 && <p className="text-[10px] text-muted-foreground">No gainers</p>}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-destructive uppercase tracking-wider mb-1.5">Top Losers</p>
              {topLosers.map(s => (
                <div key={s.id} className="flex justify-between items-center py-1 group cursor-pointer" onClick={() => openAlert("stock", s.id, s.name, s.price, "KES")}>
                  <span className="text-xs font-medium text-foreground">{s.symbol}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-destructive font-semibold">{s.day_change_percent.toFixed(2)}%</span>
                    <BellPlus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
              {topLosers.length === 0 && <p className="text-[10px] text-muted-foreground">No losers</p>}
            </div>
          </div>
        </ChartPanel>
      </div>

      {/* ─── Charts Row 2: Volume + Sector Breakdown ─── */}
      <div className="grid md:grid-cols-2 gap-4">
        <ChartPanel title="Top Stocks by Volume" link="/stocks" linkLabel="View all">
          {volumeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={volumeData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(v)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={45} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [v.toLocaleString(), "Volume"]} />
                <Bar dataKey="volume" radius={[0, 4, 4, 0]}>
                  {volumeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart label="No stock data" />}
        </ChartPanel>

        <ChartPanel title="NSE Sector Breakdown">
          {sectorData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={sectorData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} strokeWidth={2} stroke="hsl(var(--card))">
                    {sectorData.map((_, i) => <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {sectorData.slice(0, 6).map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: SECTOR_COLORS[i % SECTOR_COLORS.length] }} />
                    <span className="text-[11px] text-foreground truncate flex-1">{s.name}</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <EmptyChart label="No sector data" />}
        </ChartPanel>
      </div>

      {/* ─── Multi-Currency Chart ─── */}
      <ChartPanel title="Major Currencies vs KES (30 Days)" link="/rates" linkLabel="All rates">
        {(usdHistory.length > 0 || gbpHistory.length > 0 || eurHistory.length > 0) ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { data: usdHistory, label: "USD/KES", color: "hsl(152, 55%, 42%)" },
              { data: gbpHistory, label: "GBP/KES", color: "hsl(210, 80%, 52%)" },
              { data: eurHistory, label: "EUR/KES", color: "hsl(38, 92%, 50%)" },
            ].map(({ data, label, color }) => (
              <div key={label}>
                <p className="text-[11px] font-semibold text-muted-foreground mb-2">{label}</p>
                {data.length > 0 ? (
                  <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={data}>
                      <defs>
                        <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="snapshot_date" tick={false} axisLine={false} />
                      <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={42} />
                      <Area type="monotone" dataKey="rate" stroke={color} strokeWidth={2} fill={`url(#grad-${label})`} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <div className="h-[120px] flex items-center justify-center text-[10px] text-muted-foreground">No data</div>}
              </div>
            ))}
          </div>
        ) : <EmptyChart label="No FX history data" />}
      </ChartPanel>

      {/* ─── Data Tables with Alert Buttons ─── */}
      <Tabs defaultValue="money_market" className="w-full">
        <div className="flex items-center justify-between gap-3 mb-3">
          <TabsList className="h-9">
            <TabsTrigger value="money_market" className="text-xs">Money Market</TabsTrigger>
            <TabsTrigger value="stocks" className="text-xs">Stocks</TabsTrigger>
            <TabsTrigger value="fx" className="text-xs">FX Rates</TabsTrigger>
            <TabsTrigger value="commodities" className="text-xs">Commodities</TabsTrigger>
          </TabsList>
          <div className="relative hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 w-48 text-xs" />
          </div>
        </div>

        {/* Money Market */}
        <TabsContent value="money_market">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/70 text-xs">
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">#</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Fund</th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Daily</th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Annual</th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Min. Invest</th>
                <th className="text-center px-4 py-2.5 font-semibold text-muted-foreground">Details</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {mmFunds.filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.manager.toLowerCase().includes(search.toLowerCase())).map((f, i) => (
                  <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-semibold text-foreground">{f.name}</span>
                      <span className="block text-[10px] text-muted-foreground">{f.manager}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums font-medium text-foreground">{f.daily_yield.toFixed(4)}%</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`text-xs tabular-nums font-bold ${f.annual_yield === bestMMYield ? "text-accent" : "text-foreground"}`}>{f.annual_yield.toFixed(2)}%</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums text-muted-foreground">KSh {f.minimum_investment.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Link to={`/compare/${f.slug}`} className="text-[10px] text-accent hover:underline inline-flex items-center gap-0.5"><Eye className="h-3 w-3" /> View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Stocks */}
        <TabsContent value="stocks">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/70 text-xs">
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">#</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Stock</th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Price (KES)</th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Change</th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Volume</th>
                <th className="text-center px-4 py-2.5 font-semibold text-muted-foreground">Alert</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {stocks.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.symbol.toLowerCase().includes(search.toLowerCase())).slice(0, 20).map((s, i) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-semibold text-foreground">{s.symbol}</span>
                      <span className="block text-[10px] text-muted-foreground">{s.name}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums font-bold text-foreground">{s.price.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right"><Change current={s.price} previous={s.previous_price} /></td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums text-muted-foreground">{s.volume.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button onClick={() => openAlert("stock", s.id, s.name, s.price, "KES")} className="text-muted-foreground hover:text-accent transition-colors"><BellPlus className="h-3.5 w-3.5 mx-auto" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* FX Rates */}
        <TabsContent value="fx">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/70 text-xs">
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">#</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Currency</th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Rate (KES)</th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Change</th>
                <th className="text-center px-4 py-2.5 font-semibold text-muted-foreground">Alert</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {rates.filter(r => !search || r.currency_code.toLowerCase().includes(search.toLowerCase()) || r.currency_name.toLowerCase().includes(search.toLowerCase())).map((r, i) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-semibold text-foreground">{r.currency_code}</span>
                      <span className="block text-[10px] text-muted-foreground">{r.currency_name}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums font-bold text-foreground">{Number(r.rate).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right"><Change current={Number(r.rate)} previous={r.previous_rate != null ? Number(r.previous_rate) : null} /></td>
                    <td className="px-4 py-2.5 text-center">
                      <button onClick={() => openAlert("currency", r.id, `${r.currency_code}/KES`, Number(r.rate), "KES")} className="text-muted-foreground hover:text-accent transition-colors"><BellPlus className="h-3.5 w-3.5 mx-auto" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Commodities */}
        <TabsContent value="commodities">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/70 text-xs">
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">#</th>
                <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Commodity</th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Price</th>
                <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Change</th>
                <th className="text-center px-4 py-2.5 font-semibold text-muted-foreground">Alert</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {commodities.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.symbol.toLowerCase().includes(search.toLowerCase())).map((c, i) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-semibold text-foreground">{c.name}</span>
                      <span className="block text-[10px] text-muted-foreground">{c.symbol}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs tabular-nums font-bold text-foreground">{Number(c.price).toLocaleString("en-US", { minimumFractionDigits: 2 })} <span className="text-[9px] text-muted-foreground">{c.unit}</span></td>
                    <td className="px-4 py-2.5 text-right"><Change current={Number(c.price)} previous={c.previous_price != null ? Number(c.previous_price) : null} /></td>
                    <td className="px-4 py-2.5 text-center">
                      <button onClick={() => openAlert("commodity", c.id, c.name, Number(c.price), c.unit)} className="text-muted-foreground hover:text-accent transition-colors"><BellPlus className="h-3.5 w-3.5 mx-auto" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Disclaimer */}
      <div className="rounded-lg bg-muted/40 border border-border/50 p-3">
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Market data is indicative and may be delayed. This information is for educational purposes only and does not constitute investment advice. Click the bell icon on any asset to set a price alert.
        </p>
      </div>

      {/* Alert Dialog */}
      <QuickAlertDialog
        open={alertDialog.open}
        onClose={() => setAlertDialog(prev => ({ ...prev, open: false }))}
        assetType={alertDialog.assetType}
        assetId={alertDialog.assetId}
        assetName={alertDialog.assetName}
        currentPrice={alertDialog.currentPrice}
        unit={alertDialog.unit}
      />
    </div>
  );
};

/* ─── Reusable Components ─── */
const StatCard = ({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color?: string }) => (
  <div className="rounded-xl border border-border bg-card p-4 hover:border-accent/30 transition-colors">
    <div className="flex items-center gap-2 mb-1.5">
      <Icon className={`h-4 w-4 ${color || "text-muted-foreground"}`} />
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
    </div>
    <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
    {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

const ChartPanel = ({ title, link, linkLabel, children }: { title: string; link?: string; linkLabel?: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-semibold text-foreground">{title}</span>
      {link && <Link to={link} className="text-[10px] text-accent hover:underline inline-flex items-center gap-1">{linkLabel} <ArrowRight className="h-3 w-3" /></Link>}
    </div>
    {children}
  </div>
);

const EmptyChart = ({ label }: { label: string }) => (
  <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">{label}</div>
);

export default OverviewPage;
