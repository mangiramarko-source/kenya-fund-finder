import { useEffect, useState, useMemo } from "react";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatMarketDate, formatMarketDateTime, toLastWeekday } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, BarChart3, Search, Star, SlidersHorizontal } from "lucide-react";
import SectionLiveStatus from "@/components/SectionLiveStatus";
import { CreateAlertDialog } from "@/components/alerts/PriceAlertComponents";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, ComposedChart } from "recharts";
import ActiveAlertsCard from "@/components/alerts/ActiveAlertsCard";
import CommodityFavourites from "../components/home/CommodityFavourites";
import { useAssetWatchlist } from "@/hooks/useAssetWatchlist";
import DesktopMarketOverviewStrip from "@/components/desktop/DesktopMarketOverviewStrip";

interface Commodity {
  id: string;
  name: string;
  symbol: string;
  price: number;
  previous_price: number | null;
  unit: string;
  updated_at: string;
}

interface PriceHistory {
  snapshot_date: string;
  price: number;
}

const ChangeIndicator = ({ current, previous }: { current: number; previous: number | null }) => {
  if (previous == null) return <span className="text-muted-foreground text-sm">—</span>;
  const diff = current - previous;
  const pct = previous !== 0 ? ((diff / previous) * 100).toFixed(2) : "0.00";
  if (diff > 0)
    return (
      <span className="inline-flex items-center gap-1 text-accent text-sm font-semibold">
        <TrendingUp className="h-3.5 w-3.5" /> +{pct}%
      </span>
    );
  if (diff < 0)
    return (
      <span className="inline-flex items-center gap-1 text-destructive text-sm font-semibold">
        <TrendingDown className="h-3.5 w-3.5" /> {pct}%
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
      <Minus className="h-3.5 w-3.5" /> 0.00%
    </span>
  );
};

/* ─── Mini Sparkline (matches Rates / Stocks page) ─── */
const MiniSparkline = ({ data, positive, livePoint }: { data: PriceHistory[]; positive: boolean; livePoint?: { snapshot_date: string, price: number } }) => {
  const effectiveData = useMemo(() => {
    if (!data?.length) return [];
    const arr = [...data];
    if (livePoint && arr.length > 0 && arr[arr.length - 1].snapshot_date < livePoint.snapshot_date) {
      arr.push(livePoint);
    }
    return arr;
  }, [data, livePoint]);

  if (effectiveData.length < 2) return null;
  const color = positive ? "hsl(152 60% 42%)" : "hsl(var(--destructive))";
  const gradientId = `commodity-sparkline-fill-${positive ? "up" : "down"}`;

  return (
    <div className="w-[60px] h-[24px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={effectiveData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
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
};

const CommoditiesPage = () => {
  useDocumentTitle(
    "Commodity Prices – Kenya Fund Finder",
    "Track gold, oil, and cryptocurrency prices. Indicative commodity pricing updated regularly.",
    {
      title: "Commodity Prices – Kenya Fund Finder",
      description: "Track gold, oil, and cryptocurrency prices. Indicative commodity pricing updated regularly.",
    }
  );
  useJsonLd({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Commodity Prices – Kenya Fund Finder",
    description: "Track gold, oil, and cryptocurrency prices.",
    url: "https://kenyafundfinder.com/commodities",
  });

  const { user } = useAuth();
  const { entries: favEntries, isFavourite, toggle: toggleFavourite } = useAssetWatchlist("commodity");

  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, PriceHistory[]>>({});
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);
  const [mobileMovement, setMobileMovement] = useState<"all" | "gainers" | "losers" | "unchanged">("all");
  type SortKey = "default" | "price_desc" | "price_asc" | "change_desc" | "change_asc" | "name_asc" | "name_desc";
  const [mobileSort, setMobileSort] = useState<SortKey>("default");

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("commodities_public" as any)
        .select("id, name, symbol, price, previous_price, unit, updated_at")
        .order("sort_order");
      setCommodities(
        ((data as any) || []).map((c: any) => ({
          ...c,
          price: Number(c.price),
          previous_price: c.previous_price != null ? Number(c.previous_price) : null,
        }))
      );
      setLoading(false);
    };
    fetchData();

    const ch = supabase
      .channel("commodities-page-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "commodities" }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Preload sparkline history for all commodities (last ~90 days, refreshed periodically)
  useEffect(() => {
    if (commodities.length === 0) return;
    let cancelled = false;
    const fetchAllHistory = async () => {
      const sinceIso = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const { data } = await supabase
        .from("commodity_price_history" as any)
        .select("commodity_id, price, snapshot_date")
        .gte("snapshot_date", sinceIso)
        .order("snapshot_date", { ascending: false })
        .limit(2000);
      if (cancelled || !data) return;
      const grouped: Record<string, PriceHistory[]> = {};
      (data as any[]).forEach((d) => {
        const cid = d.commodity_id;
        if (!grouped[cid]) grouped[cid] = [];
        grouped[cid].push({ snapshot_date: d.snapshot_date, price: Number(d.price) });
      });
      Object.keys(grouped).forEach((k) => {
        grouped[k].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
      });
      setHistory(grouped);
    };
    fetchAllHistory();
    const intervalId = window.setInterval(() => void fetchAllHistory(), 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [commodities]);

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!history[id] || history[id].length === 0) {
      setHistoryLoading(id);
      const { data } = await supabase
        .from("commodity_price_history" as any)
        .select("price, snapshot_date")
        .eq("commodity_id", id)
        .order("snapshot_date", { ascending: false })
        .limit(90);
      const points = ((data as any) || [])
        .map((d: any) => ({ snapshot_date: d.snapshot_date, price: Number(d.price) }))
        .sort((a: PriceHistory, b: PriceHistory) => a.snapshot_date.localeCompare(b.snapshot_date));
      setHistory((prev) => ({ ...prev, [id]: points }));
      setHistoryLoading(null);
    }
  };

  const latestUpdate = commodities.length > 0
    ? toLastWeekday(commodities.reduce((l, c) => (c.updated_at > l ? c.updated_at : l), commodities[0].updated_at))
    : null;

  const gainers = useMemo(() => commodities.filter((c) => c.previous_price != null && c.price > c.previous_price).length, [commodities]);
  const losers = useMemo(() => commodities.filter((c) => c.previous_price != null && c.price < c.previous_price).length, [commodities]);
  const unchanged = useMemo(() => commodities.filter((c) => c.previous_price == null || c.price === c.previous_price).length, [commodities]);
  const desktopWatchlist = useMemo(() => {
    const selected = user
      ? favEntries.map((entry) => commodities.find((commodity) => commodity.id === entry.item_id)).filter((commodity): commodity is Commodity => Boolean(commodity))
      : commodities.slice(0, 4);
    return selected.slice(0, 4).map((commodity) => ({
      id: commodity.id,
      symbol: commodity.symbol,
      name: commodity.name,
      value: `${commodity.price.toFixed(2)} ${commodity.unit}`,
      change: commodity.previous_price ? ((commodity.price - commodity.previous_price) / commodity.previous_price) * 100 : 0,
    }));
  }, [commodities, favEntries, user]);

  const filtered = useMemo(() => {
    let result = commodities;
    if (mobileMovement === "gainers") result = result.filter((c) => c.previous_price != null && c.price > c.previous_price);
    else if (mobileMovement === "losers") result = result.filter((c) => c.previous_price != null && c.price < c.previous_price);
    else if (mobileMovement === "unchanged") result = result.filter((c) => c.previous_price == null || c.price === c.previous_price);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q));
    }
    if (mobileSort !== "default") {
      const pct = (c: Commodity) => (c.previous_price != null && c.previous_price !== 0 ? ((c.price - c.previous_price) / c.previous_price) * 100 : 0);
      const arr = [...result];
      switch (mobileSort) {
        case "price_desc": arr.sort((a, b) => b.price - a.price); break;
        case "price_asc": arr.sort((a, b) => a.price - b.price); break;
        case "change_desc": arr.sort((a, b) => pct(b) - pct(a)); break;
        case "change_asc": arr.sort((a, b) => pct(a) - pct(b)); break;
        case "name_asc": arr.sort((a, b) => a.name.localeCompare(b.name)); break;
        case "name_desc": arr.sort((a, b) => b.name.localeCompare(a.name)); break;
      }
      result = arr;
    }
    return result;
  }, [commodities, search, mobileMovement, mobileSort]);

  return (
    <div className="min-h-screen">
      <div className="px-4 md:px-6 py-6">
        <div className="mb-6">
          <div className="hidden md:flex items-end justify-between gap-6 mb-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-500">Global Markets</p>
              <h1 className="mt-2 text-5xl font-black tracking-tight">Commodities</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Global commodity prices and daily movements.</p>
            </div>
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-xs font-bold tracking-[0.16em] text-emerald-500">{commodities.length} TRACKED</span>
          </div>
          <div className="md:hidden">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Commodities</h1>
            <p className="text-sm text-muted-foreground mt-1">Global commodity prices and daily movements.</p>
          </div>
          <div className="md:hidden mb-2">
            <div className="flex items-center justify-between w-full">
              <SectionLiveStatus section="commodities" fallbackDate={latestUpdate} isLoading={loading} />
            </div>
          </div>
        </div>

        <DesktopMarketOverviewStrip
          title="Global Commodities Market"
          status={<SectionLiveStatus section="commodities" fallbackDate={latestUpdate} isLoading={loading} />}
          metrics={[
            { label: "Tracked", value: String(commodities.length) },
            { label: "Gainers", value: String(gainers), change: commodities.length ? (gainers / commodities.length) * 100 : 0 },
            { label: "Losers", value: String(losers), change: commodities.length ? -(losers / commodities.length) * 100 : 0 },
            { label: "Unchanged", value: String(unchanged) },
          ]}
          watchlist={desktopWatchlist}
          demo={!user}
          footer="Global commodities trade during their respective market sessions. Prices are indicative and may be delayed."
        />

        <ActiveAlertsCard assetType="commodity" />

        {user && favEntries.length > 0 && <CommodityFavourites entries={favEntries} commodities={commodities} />}

        {/* Desktop Premium Toolbar */}
        <div className="hidden md:flex items-center justify-between gap-4 mb-5 mt-7">
          <div className="flex items-center gap-3 pl-1">
            <div className="inline-flex items-center gap-1">
              {([
                { key: "all", label: "All", count: commodities.length },
                { key: "gainers", label: "Gainers", count: gainers },
                { key: "losers", label: "Losers", count: losers },
                { key: "unchanged", label: "Unchanged", count: unchanged },
              ] as const).map((opt) => {
                const active = mobileMovement === opt.key;
                let activeStyle = "bg-muted text-foreground";
                if (opt.key === "gainers") activeStyle = "bg-accent/15 text-accent shadow-sm";
                if (opt.key === "losers") activeStyle = "bg-destructive/15 text-destructive shadow-sm";
                if (opt.key === "unchanged") activeStyle = "bg-muted-foreground/15 text-foreground shadow-sm";
                
                return (
                  <button
                    key={opt.key}
                    onClick={() => setMobileMovement(opt.key)}
                    className={`inline-flex items-center gap-1.5 px-4 h-10 rounded-full border text-[12px] font-semibold transition-all whitespace-nowrap ${
                      active ? `${activeStyle} border-transparent` : "border-border bg-background text-muted-foreground hover:text-foreground"
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
          </div>
          <div className="flex items-center gap-3 pr-1 w-full justify-between sm:justify-end">
            <div className="relative w-full sm:w-[320px] shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70" />
              <Input
                placeholder="Search commodities"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 text-[13px] rounded-full bg-background border-border w-full placeholder:text-muted-foreground/60 focus-visible:ring-1"
              />
            </div>
          </div>
        </div>

        {/* Mobile: combined search + filter button */}
        <div className="md:hidden flex items-center gap-2.5 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
            <Input
              placeholder="Search commodities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-full bg-card border-border/80 w-full text-[15px] shadow-sm placeholder:text-muted-foreground/60 focus-visible:ring-1"
            />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className="relative inline-flex items-center justify-center gap-1.5 h-11 px-4 shrink-0 rounded-full border border-border/80 bg-card text-foreground text-sm font-semibold shadow-sm transition-colors active:scale-95"
                aria-label="Filters"
              >
                <SlidersHorizontal className="h-4 w-4 text-foreground/80" />
                <span>Filter</span>
                {mobileSort !== "default" && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl border-border max-h-[80vh] overflow-y-auto p-5">
              <SheetHeader className="text-left pb-2 border-b border-border/50">
                <SheetTitle className="text-base font-bold">Sort & Filter</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-5">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Sort by</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {([
                      { key: "default", label: "Default order" },
                      { key: "price_desc", label: "Price: High → Low" },
                      { key: "price_asc", label: "Price: Low → High" },
                      { key: "change_desc", label: "Change %: High → Low" },
                      { key: "change_asc", label: "Change %: Low → High" },
                      { key: "name_asc", label: "Name: A → Z" },
                      { key: "name_desc", label: "Name: Z → A" },
                    ] as const).map((opt) => {
                      const active = mobileSort === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setMobileSort(opt.key)}
                          className={`inline-flex items-center justify-between px-4 h-11 rounded-full text-xs font-semibold transition-all ${
                            active
                              ? "bg-foreground text-background shadow-sm"
                              : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <span>{opt.label}</span>
                          {active && <span className="text-[10px] opacity-80">Selected</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <SheetClose asChild>
                  <button
                    type="button"
                    className="w-full h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors mt-4"
                  >
                    Apply Filters
                  </button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Mobile movement pills */}
        <div className="md:hidden mb-4 flex gap-2 overflow-x-auto no-scrollbar py-0.5">
          {([
            { key: "all", label: "All", count: commodities.length },
            { key: "gainers", label: "Gainers", count: gainers },
            { key: "losers", label: "Losers", count: losers },
            { key: "unchanged", label: "Unchanged", count: unchanged },
          ] as const).map((opt) => {
            const active = mobileMovement === opt.key;
            return (
              <button
                key={opt.key}
                onClick={(e) => {
                  setMobileMovement(opt.key);
                  e.currentTarget.scrollIntoView({
                    behavior: "smooth",
                    inline: "center",
                    block: "nearest",
                  });
                }}
                className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
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

        {/* Desktop Table */}
        <div className="hidden md:block">
          {loading ? (
            <TableSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState label="commodities" />
          ) : (
            <div className="rounded-[22px] border border-border overflow-hidden bg-card shadow-sm">
              <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed min-w-[960px] lg:min-w-0">
                <colgroup>
                  <col style={{ width: "3%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "10%" }} />
                  {user && <col style={{ width: "3%" }} />}
                  <col style={{ width: "4%" }} />
                </colgroup>
                <thead>
                  <tr className="bg-background text-[12px] text-muted-foreground border-b border-border/40">
                    <th className="text-left pl-4 pr-2 py-3 font-normal">#</th>
                    <th className="text-left px-3 py-3 font-normal">Symbol</th>
                    <th className="text-left px-3 py-3 font-normal">Name</th>
                    <th className="text-left px-3 py-3 font-normal">Price</th>
                    <th className="text-left px-3 py-3 font-normal">Unit</th>
                    <th className="text-left px-3 py-3 font-normal">Previous</th>
                    <th className="text-left px-3 py-3 font-normal">Change</th>
                    <th className="text-left px-3 py-3 font-normal">Change %</th>
                    <th className="text-left px-3 py-3 font-normal">Trend</th>
                    <th className="text-left px-3 py-3 font-normal">Updated</th>
                    {user && <th className="w-8"></th>}
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <CommodityRow
                      key={c.id}
                      commodity={c}
                      index={i}
                      isExpanded={expanded === c.id}
                      onToggle={() => toggleExpand(c.id)}
                      history={history[c.id]}
                      historyLoading={historyLoading === c.id}
                      isFavourite={user ? isFavourite(c.id) : undefined}
                      onToggleFavourite={user ? () => toggleFavourite(c.id, c.name) : undefined}
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
            <EmptyState label="commodities" />
          ) : (
            filtered.map((c) => {
              const positive = c.previous_price != null ? c.price >= c.previous_price : true;
              return (
                <MobileCommodityCard
                  key={c.id}
                  commodity={c}
                  history={history[c.id]}
                  historyLoading={historyLoading === c.id}
                  positive={positive}
                  isExpanded={expanded === c.id}
                  onToggle={() => toggleExpand(c.id)}
                  isFavourite={user ? isFavourite(c.id) : undefined}
                  onToggleFavourite={user ? () => toggleFavourite(c.id, c.name) : undefined}
                />
              );
            })
          )}
        </div>

        {/* Summary footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-4 px-1">
          <span>Showing {filtered.length} of {commodities.length} commodities</span>
          {!loading && commodities.length > 0 && (
            <span className="hidden sm:inline">
              <span className="text-accent font-semibold">{gainers}</span> gainers ·{" "}
              <span className="text-destructive font-semibold">{losers}</span> losers
            </span>
          )}
        </div>

        <div className="mt-4 rounded-lg bg-muted/40 border border-border/50 p-3">
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Commodity prices are indicative and sourced from international markets. Click on any commodity to view price history.
            This information is for educational purposes only and does not constitute investment advice.
          </p>
        </div>
      </div>
    </div>
  );
};

/* ─── Mobile Card (expandable, matches Rates page) ─── */
const MobileCommodityCard = ({
  commodity: c,
  history,
  historyLoading,
  positive,
  isExpanded,
  onToggle,
  isFavourite,
  onToggleFavourite,
}: {
  commodity: Commodity;
  history?: PriceHistory[];
  historyLoading?: boolean;
  positive: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  isFavourite?: boolean;
  onToggleFavourite?: () => void;
}) => {
  const change = c.previous_price != null ? c.price - c.previous_price : null;
  const changePct = c.previous_price != null && c.previous_price !== 0
    ? ((change! / c.previous_price) * 100)
    : null;

  return (
    <div className="block rounded-[20px] border border-border/80 bg-card p-4 shadow-sm hover:border-emerald-500/30 transition-all overflow-hidden mb-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left"
        aria-expanded={isExpanded}
      >
        {/* Top Row: Symbol/Name (Left), Sparkline (Center), Price/Change (Right) */}
        <div className="flex items-center justify-between gap-2">
          {/* Symbol + Name */}
          <div className="min-w-0 flex-1">
            <span className="font-extrabold text-foreground text-base tracking-tight">{c.symbol}</span>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{c.name}</p>
          </div>

          {/* Sparkline in Center */}
          <div className="shrink-0 px-1">
            <MiniSparkline data={history || []} positive={positive} livePoint={{ snapshot_date: new Date().toISOString().split("T")[0], price: c.price }} />
          </div>

          {/* Price + Change % */}
          <div className="text-right shrink-0">
            <p className="font-extrabold text-foreground text-base tabular-nums">
              {c.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-muted-foreground ml-1 text-[10px]">{c.unit}</span>
            </p>
            <div className="mt-0.5 flex justify-end">
              <ChangeIndicator current={c.price} previous={c.previous_price} />
            </div>
          </div>
        </div>

        {/* Thin Divider Line */}
        <div className="border-t border-border/40 my-3" />

        {/* Bottom Row: Unit & Prev Price (Left) and Watchlist / Expand Chevron (Right) */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>
              Unit <strong className="font-semibold text-foreground ml-0.5">{c.unit}</strong>
            </span>
            <span>
              Prev <strong className="font-semibold text-foreground ml-0.5">{c.previous_price != null ? c.previous_price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onToggleFavourite !== undefined && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavourite();
                }}
                className="p-1"
                aria-label={isFavourite ? "Remove from watchlist" : "Add to watchlist"}
              >
                <Star
                  className={`h-4 w-4 transition-colors ${isFavourite ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30 hover:text-yellow-500"}`}
                />
              </span>
            )}

            <span className="text-muted-foreground p-1">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-border bg-muted/20 p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <DetailBox label="Current Price" value={c.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />
            <DetailBox
              label="Previous Price"
              value={c.previous_price != null ? c.previous_price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
            />
            <DetailBox
              label="Change (Abs)"
              value={change != null ? `${change > 0 ? "+" : ""}${change.toFixed(2)}` : "—"}
              color={change != null ? (change > 0 ? "text-accent" : change < 0 ? "text-destructive" : undefined) : undefined}
            />
            <DetailBox
              label="Change (%)"
              value={changePct != null ? `${changePct > 0 ? "+" : ""}${changePct.toFixed(2)}%` : "—"}
              color={changePct != null ? (changePct > 0 ? "text-accent" : changePct < 0 ? "text-destructive" : undefined) : undefined}
            />
          </div>

          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-semibold text-foreground">Price History (Last 90 Days)</span>
            </div>
            {historyLoading ? (
              <div className="h-[180px] flex items-center justify-center">
                <Skeleton className="h-full w-full rounded-lg" />
              </div>
            ) : !history || history.length === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
                No historical data available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                {(() => {
                  const todayIso = new Date().toISOString().split("T")[0];
                  const effectiveHistory = [...history];
                  if (effectiveHistory.length > 0 && effectiveHistory[effectiveHistory.length - 1].snapshot_date < todayIso) {
                    effectiveHistory.push({ snapshot_date: todayIso, price: c.price });
                  }
                  return (
                    <LineChart data={effectiveHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="snapshot_date"
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => formatMarketDate(v, "en-KE", { month: "short", day: "numeric" })}
                    minTickGap={20}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    width={45}
                    tickFormatter={(v) => v.toFixed(2)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                    labelFormatter={(v) => formatMarketDate(v, "en-KE", { month: "long", day: "numeric", year: "numeric" })}
                    formatter={(value: number) => [value.toFixed(2), "Price"]}
                  />
                  <Line type="monotone" dataKey="price" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                </LineChart>
                  );
                })()}
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] text-muted-foreground">
              Updated: {formatMarketDateTime(c.updated_at)}
            </p>
            <CreateAlertDialog
              assetType="commodity"
              assetId={c.id}
              assetName={c.name}
              currentPrice={c.price}
              unit={c.unit}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const CommodityRow = ({
  commodity: c, index, isExpanded, onToggle, history, historyLoading, isFavourite, onToggleFavourite,
}: {
  commodity: Commodity; index: number; isExpanded: boolean; onToggle: () => void;
  history?: PriceHistory[]; historyLoading: boolean;
  isFavourite?: boolean; onToggleFavourite?: () => void;
}) => {
  const change = c.previous_price != null ? c.price - c.previous_price : null;
  const changePct = c.previous_price != null && c.previous_price !== 0
    ? ((change! / c.previous_price) * 100)
    : null;

  const positive = c.previous_price != null ? c.price >= c.previous_price : true;
  const direction =
    change == null || change === 0
      ? { label: "Flat", className: "text-muted-foreground bg-muted/40" }
      : change > 0
      ? { label: "Up", className: "text-accent bg-accent/10" }
      : { label: "Down", className: "text-destructive bg-destructive/10" };
  const updatedShort = formatMarketDate(c.updated_at);

  return (
    <>
      <tr
        className="border-b border-border/40 hover:bg-accent/5 transition-colors cursor-pointer group"
        onClick={onToggle}
      >
        <td className="pl-4 pr-2 py-4 text-muted-foreground/60 text-sm tabular-nums">{index + 1}</td>
        <td className="px-3 py-4">
          <span className="font-bold text-foreground text-sm tracking-wide">{c.symbol}</span>
        </td>
        <td className="px-3 py-4">
          <span className="block text-sm text-foreground truncate" title={c.name}>{c.name}</span>
        </td>
        <td className="px-3 py-4 tabular-nums whitespace-nowrap">
          <span className="font-bold text-foreground text-sm">
            {c.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </td>
        <td className="px-3 py-4 whitespace-nowrap text-sm text-muted-foreground">
          {c.unit}
        </td>
        <td className="px-3 py-4 tabular-nums whitespace-nowrap text-sm text-muted-foreground">
          {c.previous_price != null
            ? c.previous_price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : "—"}
        </td>
        <td className="px-3 py-4 tabular-nums whitespace-nowrap text-sm">
          {change == null ? (
            <span className="text-muted-foreground">—</span>
          ) : change > 0 ? (
            <span className="text-accent font-semibold">+{change.toFixed(2)}</span>
          ) : change < 0 ? (
            <span className="text-destructive font-semibold">{change.toFixed(2)}</span>
          ) : (
            <span className="text-muted-foreground">0.00</span>
          )}
        </td>
        <td className="px-3 py-4">
          <ChangeIndicator current={c.price} previous={c.previous_price} />
        </td>
        <td className="px-3 py-4">
          {history && history.length >= 2 ? (
            <MiniSparkline data={history} positive={positive} livePoint={{ snapshot_date: new Date().toISOString().split("T")[0], price: c.price }} />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-3 py-4 text-sm text-muted-foreground whitespace-nowrap">{updatedShort}</td>
        {onToggleFavourite !== undefined && (
          <td className="px-2 py-4 text-center">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavourite(); }}
              className="p-1 rounded-md hover:bg-muted transition-colors"
              aria-label={isFavourite ? "Remove from watchlist" : "Add to watchlist"}
            >
              <Star className={`h-4 w-4 transition-colors ${isFavourite ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/40 hover:text-yellow-500"}`} />
            </button>
          </td>
        )}
        <td className="px-2 py-4 text-center">
          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-t border-border bg-muted/20">
          <td colSpan={onToggleFavourite !== undefined ? 12 : 11} className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <DetailBox label="Current Price" value={`${c.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c.unit}`} />
              <DetailBox label="Previous Price" value={c.previous_price != null ? `${c.previous_price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c.unit}` : "—"} />
              <DetailBox label="Change (Abs)" value={change != null ? `${change > 0 ? "+" : ""}${change.toFixed(2)}` : "—"} color={change != null ? (change > 0 ? "text-accent" : change < 0 ? "text-destructive" : undefined) : undefined} />
              <DetailBox label="Change (%)" value={changePct != null ? `${changePct > 0 ? "+" : ""}${changePct.toFixed(2)}%` : "—"} color={changePct != null ? (changePct > 0 ? "text-accent" : changePct < 0 ? "text-destructive" : undefined) : undefined} />
            </div>

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
                      effectiveHistory.push({ snapshot_date: todayIso, price: c.price });
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
                      width={65}
                      tickFormatter={(v) => v.toLocaleString()}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelFormatter={(v) => formatMarketDate(v, "en-KE", { month: "long", day: "numeric", year: "numeric" })}
                      formatter={(value: number) => [`${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c.unit}`, "Price"]}
                    />
                      <Line type="monotone" dataKey="price" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                    </LineChart>
                    );
                  })()}
                </ResponsiveContainer>
              )}
            </div>

            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-muted-foreground">
                Last updated: {formatMarketDateTime(c.updated_at)}
              </p>
              <CreateAlertDialog
                assetType="commodity"
                assetId={c.id}
                assetName={c.name}
                currentPrice={c.price}
                unit={c.unit}
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const DetailBox = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="bg-muted/40 rounded-lg px-3 py-2">
    <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
    <p className={`font-semibold text-sm tabular-nums ${color || "text-foreground"}`}>{value}</p>
  </div>
);

const TableSkeleton = () => (
  <div className="rounded-xl border border-border overflow-hidden bg-card">
    <div className="bg-muted/60 px-4 py-3">
      <div className="flex gap-4">
        <Skeleton className="h-4 w-8" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24 ml-auto" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-t border-border">
        <Skeleton className="h-4 w-5" />
        <div className="flex-1">
          <Skeleton className="h-4 w-40 mb-1.5" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-14" />
      </div>
    ))}
  </div>
);

const EmptyState = ({ label }: { label: string }) => (
  <div className="rounded-xl border border-border bg-card text-center py-14">
    <div className="flex flex-col items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <span className="text-2xl">📊</span>
      </div>
      <p className="text-sm text-muted-foreground font-medium">No {label} available</p>
    </div>
  </div>
);

export default CommoditiesPage;
