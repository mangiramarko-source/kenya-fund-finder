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
import RateFavourites from "../components/home/RateFavourites";
import { useAssetWatchlist } from "@/hooks/useAssetWatchlist";

interface Rate {
  id: string;
  currency_code: string;
  currency_name: string;
  rate: number;
  previous_rate: number | null;
  updated_at: string;
}

interface RateHistory {
  snapshot_date: string;
  rate: number;
}

const ChangeIndicator = ({ current, previous }: { current: number; previous: number | null }) => {
  if (previous == null) return <span className="text-muted-foreground text-sm">—</span>;
  const diff = current - previous;
  const pct = previous !== 0 ? ((diff / previous) * 100).toFixed(2) : "0.00";
  if (diff > 0)
    return (
      <span className="inline-flex items-center gap-1 text-emerald-500 dark:text-emerald-400 text-sm font-semibold">
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

/* ─── Mini Sparkline (matches Stocks page) ─── */
const MiniSparkline = ({ data, positive, livePoint }: { data: RateHistory[]; positive: boolean; livePoint?: { snapshot_date: string, rate: number } }) => {
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
  const gradientId = `rate-sparkline-fill-${positive ? "up" : "down"}`;

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
          <YAxis hide domain={["dataMin - 0.01", "dataMax + 0.01"]} />
          <Area type="monotone" dataKey="rate" stroke="none" fill={`url(#${gradientId})`} isAnimationActive={false} />
          <Line type="monotone" dataKey="rate" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

const RatesPage = () => {
  useDocumentTitle(
    "FX Exchange Rates – Kenya Fund Finder",
    "Live foreign exchange rates against the Kenya Shilling. Track USD, EUR, GBP and more.",
    {
      title: "FX Exchange Rates – Kenya Fund Finder",
      description: "Live foreign exchange rates against the Kenya Shilling. Track USD, EUR, GBP and more.",
    }
  );
  useJsonLd({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "FX Exchange Rates – Kenya Fund Finder",
    description: "Live foreign exchange rates against the Kenya Shilling.",
    url: "https://kenyafundfinder.com/rates",
  });

  const { user } = useAuth();
  const { entries: favEntries, isFavourite, toggle: toggleFavourite } = useAssetWatchlist("currency");

  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, RateHistory[]>>({});
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("exchange_rates_public" as any)
        .select("id, currency_code, currency_name, rate, previous_rate, updated_at")
        .order("sort_order");
      setRates(
        ((data as any) || []).map((r: any) => ({
          ...r,
          rate: Number(r.rate),
          previous_rate: r.previous_rate != null ? Number(r.previous_rate) : null,
        }))
      );
      setLoading(false);
    };
    fetch();
    const ch = supabase
      .channel("rates-page-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "exchange_rates" }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Preload sparkline history for all rates (last ~90 days, refreshed periodically)
  useEffect(() => {
    if (rates.length === 0) return;
    let cancelled = false;
    const fetchAllHistory = async () => {
      // Pull the most recent ~90 days across all currencies. Order DESC so the
      // 1000-row Supabase default cap drops the OLDEST rows, not the newest.
      const sinceIso = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const { data } = await supabase
        .from("exchange_rate_history_public" as any)
        .select("exchange_rate_id, rate, snapshot_date")
        .gte("snapshot_date", sinceIso)
        .order("snapshot_date", { ascending: false })
        .limit(2000);
      if (cancelled || !data) return;
      const grouped: Record<string, RateHistory[]> = {};
      (data as any[]).forEach((d) => {
        const rid = d.exchange_rate_id;
        if (!grouped[rid]) grouped[rid] = [];
        grouped[rid].push({ snapshot_date: d.snapshot_date, rate: Number(d.rate) });
      });
      // Sort ascending for chart rendering
      Object.keys(grouped).forEach((k) => {
        grouped[k].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
      });
      setHistory(grouped);
    };
    fetchAllHistory();
    // Refresh every 5 minutes so newly-snapshotted points appear without reload
    const intervalId = window.setInterval(() => void fetchAllHistory(), 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [rates]);

  const toggleExpand = async (rateId: string) => {
    if (expanded === rateId) {
      setExpanded(null);
      return;
    }
    setExpanded(rateId);
    if (!history[rateId]) {
      setHistoryLoading(rateId);
      const { data } = await supabase
        .from("exchange_rate_history_public" as any)
        .select("id, exchange_rate_id, rate, snapshot_date")
        .eq("exchange_rate_id", rateId)
        .order("snapshot_date", { ascending: false })
        .limit(90);
      const points = ((data as any) || [])
        .map((d: any) => ({ snapshot_date: d.snapshot_date, rate: Number(d.rate) }))
        .sort((a: RateHistory, b: RateHistory) => a.snapshot_date.localeCompare(b.snapshot_date));
      setHistory((prev) => ({ ...prev, [rateId]: points }));
      setHistoryLoading(null);
    }
  };

  const latestUpdate = rates.length > 0
    ? toLastWeekday(rates.reduce((l, r) => (r.updated_at > l ? r.updated_at : l), rates[0].updated_at))
    : null;

  const strengthened = useMemo(() => rates.filter((r) => r.previous_rate != null && r.rate < r.previous_rate).length, [rates]);
  const weakened = useMemo(() => rates.filter((r) => r.previous_rate != null && r.rate > r.previous_rate).length, [rates]);
  const unchanged = useMemo(() => rates.filter((r) => r.previous_rate == null || r.rate === r.previous_rate).length, [rates]);

  const [mobileMovement, setMobileMovement] = useState<"all" | "gainers" | "losers" | "unchanged">("all");
  type SortKey = "default" | "rate_desc" | "rate_asc" | "change_desc" | "change_asc" | "name_asc" | "name_desc";
  const [mobileSort, setMobileSort] = useState<SortKey>("default");

  const filtered = useMemo(() => {
    let result = rates;
    if (mobileMovement === "gainers") result = result.filter((r) => r.previous_rate != null && r.rate < r.previous_rate);
    else if (mobileMovement === "losers") result = result.filter((r) => r.previous_rate != null && r.rate > r.previous_rate);
    else if (mobileMovement === "unchanged") result = result.filter((r) => r.previous_rate == null || r.rate === r.previous_rate);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r => r.currency_code.toLowerCase().includes(q) || r.currency_name.toLowerCase().includes(q));
    }
    if (mobileSort !== "default") {
      const pct = (r: Rate) => (r.previous_rate != null && r.previous_rate !== 0 ? ((r.rate - r.previous_rate) / r.previous_rate) * 100 : 0);
      const arr = [...result];
      switch (mobileSort) {
        case "rate_desc": arr.sort((a, b) => b.rate - a.rate); break;
        case "rate_asc": arr.sort((a, b) => a.rate - b.rate); break;
        case "change_desc": arr.sort((a, b) => pct(b) - pct(a)); break;
        case "change_asc": arr.sort((a, b) => pct(a) - pct(b)); break;
        case "name_asc": arr.sort((a, b) => a.currency_code.localeCompare(b.currency_code)); break;
        case "name_desc": arr.sort((a, b) => b.currency_code.localeCompare(a.currency_code)); break;
      }
      result = arr;
    }
    return result;
  }, [rates, search, mobileMovement, mobileSort]);

  return (
    <div className="min-h-screen">
      <div className="px-4 md:px-6 py-5 md:py-6">
        <div className="mb-4">
          <div className="hidden md:flex items-end justify-between gap-6 mb-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-500">Global Currency Market</p>
              <h1 className="mt-2 text-5xl font-black tracking-tight">FX Rates</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Live exchange rates against the Kenyan Shilling (KES).</p>
            </div>
            <SectionLiveStatus section="rates" fallbackDate={latestUpdate} isLoading={loading} />
          </div>
          <div className="md:hidden">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">FX Rates</h1>
            <p className="text-sm text-muted-foreground mt-1">Live exchange rates against the Kenyan Shilling (KES).</p>
          </div>
        </div>

        <ActiveAlertsCard assetType="currency" />

        {user && favEntries.length > 0 && <RateFavourites entries={favEntries} rates={rates} />}

        {/* Desktop Premium Toolbar */}
        <div className="hidden md:flex items-center justify-between gap-4 mb-5 mt-7">
          <div className="flex items-center gap-3 pl-1">
            <div className="inline-flex items-center gap-1">
              {([
                { key: "all", label: "All", count: rates.length },
                { key: "gainers", label: "Gainers", count: strengthened },
                { key: "losers", label: "Losers", count: weakened },
                { key: "unchanged", label: "Unchanged", count: unchanged },
              ] as const).map((opt) => {
                const active = mobileMovement === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setMobileMovement(opt.key)}
                    className={`inline-flex h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors whitespace-nowrap ${
                      active ? "border-foreground bg-foreground text-background" : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.key === "gainers" && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
                    {opt.key === "losers" && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
                    {opt.key === "unchanged" && <Minus className="h-3.5 w-3.5" />}
                    {opt.label}
                    <span className={`font-normal tabular-nums ${active ? "text-background/70" : "text-muted-foreground"}`}>{opt.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3 pr-1">
            <div className="relative w-80 shrink-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search currencies"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 rounded-full border-border bg-card pl-11 text-sm shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-1"
              />
            </div>
          </div>
        </div>

        {/* Mobile: combined search + filter button */}
        <div className="md:hidden flex items-center gap-2.5 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
            <Input
              placeholder="Search currencies..."
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
                      { key: "rate_desc", label: "Rate: High → Low" },
                      { key: "rate_asc", label: "Rate: Low → High" },
                      { key: "change_desc", label: "Change %: High → Low" },
                      { key: "change_asc", label: "Change %: Low → High" },
                      { key: "name_asc", label: "Currency: A → Z" },
                      { key: "name_desc", label: "Currency: Z → A" },
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

        {/* Desktop Table */}
        <div className="hidden md:block">
          {loading ? (
            <TableSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState label="exchange rates" />
          ) : (
            <div className="rounded-[22px] border border-border overflow-hidden bg-card shadow-sm">
              <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed min-w-[900px] lg:min-w-0">
                <colgroup>
                  <col style={{ width: "3%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "12%" }} />
                  {user && <col style={{ width: "3%" }} />}
                  <col style={{ width: "4%" }} />
                </colgroup>
                <thead>
                  <tr className="bg-background text-[12px] text-muted-foreground border-b border-border/40">
                    <th className="text-left pl-4 pr-2 py-3 font-normal">#</th>
                    <th className="text-left px-3 py-3 font-normal">Symbol</th>
                    <th className="text-left px-3 py-3 font-normal">Currency</th>
                    <th className="text-left px-3 py-3 font-normal">Rate (KES)</th>
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
                  {filtered.map((r, i) => (
                    <RateRow
                      key={r.id}
                      rate={r}
                      index={i}
                      isExpanded={expanded === r.id}
                      onToggle={() => toggleExpand(r.id)}
                      history={history[r.id]}
                      historyLoading={historyLoading === r.id}
                      isFavourite={user ? isFavourite(r.id) : undefined}
                      onToggleFavourite={user ? () => toggleFavourite(r.id, `${r.currency_code} - ${r.currency_name}`) : undefined}
                    />
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>

        {/* Mobile movement pills */}
        <div className="md:hidden mb-4 flex gap-2 overflow-x-auto no-scrollbar py-0.5">
          {([
            { key: "all", label: "All", count: rates.length },
            { key: "gainers", label: "Gainers", count: strengthened },
            { key: "losers", label: "Losers", count: weakened },
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

        {/* Mobile Live Status (Between filter pills and first card) */}
        <div className="md:hidden mb-3.5 flex items-center justify-between px-0.5">
          <SectionLiveStatus section="rates" fallbackDate={latestUpdate} isLoading={loading} className="w-full justify-between" />
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
            <EmptyState label="exchange rates" />
          ) : (
            filtered.map((r) => {
              const positive = r.previous_rate != null ? r.rate >= r.previous_rate : true;
              return (
                <MobileRateCard
                  key={r.id}
                  rate={r}
                  history={history[r.id]}
                  historyLoading={historyLoading === r.id}
                  positive={positive}
                  isExpanded={expanded === r.id}
                  onToggle={() => toggleExpand(r.id)}
                  isFavourite={user ? isFavourite(r.id) : undefined}
                  onToggleFavourite={user ? () => toggleFavourite(r.id, `${r.currency_code} - ${r.currency_name}`) : undefined}
                />
              );
            })
          )}
        </div>

        {/* Summary footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-4 px-1">
          <span>Showing {filtered.length} of {rates.length} currencies</span>
        </div>

        <div className="mt-4 rounded-lg bg-muted/40 border border-border/50 p-3">
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Exchange rates shown are indicative and sourced from the Central Bank of Kenya and international markets.
            Click on any currency to view historical rate trends. This information is for educational purposes only.
          </p>
        </div>
      </div>
    </div>
  );
};

/* ─── Mobile Card (matches Stocks page layout) ─── */
const MobileRateCard = ({
  rate: r,
  history,
  historyLoading,
  positive,
  isExpanded,
  onToggle,
  isFavourite,
  onToggleFavourite,
}: {
  rate: Rate;
  history?: RateHistory[];
  historyLoading?: boolean;
  positive: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  isFavourite?: boolean;
  onToggleFavourite?: () => void;
}) => {
  const change = r.previous_rate != null ? r.rate - r.previous_rate : null;
  const changePct = r.previous_rate != null && r.previous_rate !== 0 ? ((change! / r.previous_rate) * 100) : null;

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
            <span className="font-extrabold text-foreground text-base tracking-tight">{r.currency_code}</span>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{r.currency_name}</p>
          </div>

          {/* Sparkline in Center */}
          <div className="shrink-0 px-1">
            <MiniSparkline data={history || []} positive={positive} livePoint={{ snapshot_date: new Date().toISOString().split("T")[0], rate: r.rate }} />
          </div>

          {/* Rate + Change % */}
          <div className="text-right shrink-0">
            <p className="font-extrabold text-foreground text-base tabular-nums">
              KES {r.rate.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="mt-0.5 flex justify-end">
              <ChangeIndicator current={r.rate} previous={r.previous_rate} />
            </div>
          </div>
        </div>

        {/* Thin Divider Line */}
        <div className="border-t border-border/40 my-3" />

        {/* Bottom Row: Prev Rate (Left) and Watchlist / Expand Chevron (Right) */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>
              Prev <strong className="font-semibold text-foreground ml-0.5">{r.previous_rate != null ? `KES ${r.previous_rate.toFixed(2)}` : "—"}</strong>
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
          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-2">
            <DetailBox label="Current Rate" value={`KES ${r.rate.toFixed(2)}`} />
            <DetailBox
              label="Previous Rate"
              value={r.previous_rate != null ? `KES ${r.previous_rate.toFixed(2)}` : "—"}
            />
            <DetailBox
              label="Change (Abs)"
              value={change != null ? `${change > 0 ? "+" : ""}${change.toFixed(4)}` : "—"}
              color={change != null ? (change > 0 ? "text-destructive" : change < 0 ? "text-accent" : undefined) : undefined}
            />
            <DetailBox
              label="Change (%)"
              value={changePct != null ? `${changePct > 0 ? "+" : ""}${changePct.toFixed(2)}%` : "—"}
              color={changePct != null ? (changePct > 0 ? "text-destructive" : changePct < 0 ? "text-accent" : undefined) : undefined}
            />
          </div>

          {/* History chart */}
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-semibold text-foreground">Rate History (Last 90 Days)</span>
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
                    effectiveHistory.push({ snapshot_date: todayIso, rate: r.rate });
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
                    itemStyle={{ color: "#10b981" }}
                    labelFormatter={(v) => formatMarketDate(v, "en-KE", { month: "long", day: "numeric", year: "numeric" })}
                    formatter={(value: number) => [`KES ${value.toFixed(4)}`, "Rate"]}
                  />
                  <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ fill: "#10b981", stroke: "#10b981" }} />
                </LineChart>
                  );
                })()}
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] text-muted-foreground">
              Updated: {formatMarketDateTime(r.updated_at)}
            </p>
            <CreateAlertDialog
              assetType="currency"
              assetId={r.id}
              assetName={`${r.currency_code}/KES`}
              currentPrice={r.rate}
              unit="KES"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const RateRow = ({
  rate, index, isExpanded, onToggle, history, historyLoading, isFavourite, onToggleFavourite,
}: {
  rate: Rate; index: number; isExpanded: boolean; onToggle: () => void;
  history?: RateHistory[]; historyLoading: boolean;
  isFavourite?: boolean; onToggleFavourite?: () => void;
}) => {
  const change = rate.previous_rate != null ? rate.rate - rate.previous_rate : null;
  const changePct = rate.previous_rate != null && rate.previous_rate !== 0
    ? ((change! / rate.previous_rate) * 100)
    : null;

  const positive = rate.previous_rate != null ? rate.rate >= rate.previous_rate : true;
  const direction =
    change == null || change === 0
      ? { label: "Flat", className: "text-muted-foreground bg-muted/40" }
      : change > 0
      ? { label: "Up", className: "text-emerald-500 dark:text-emerald-400 bg-emerald-500/10" }
      : { label: "Down", className: "text-destructive bg-destructive/10" };
  const updatedShort = formatMarketDate(rate.updated_at);

  return (
    <>
      <tr
        className="border-b border-border/40 hover:bg-accent/5 transition-colors cursor-pointer group"
        onClick={onToggle}
      >
        <td className="pl-4 pr-2 py-4 text-muted-foreground/60 text-sm tabular-nums">{index + 1}</td>
        <td className="px-3 py-4">
          <span className="font-bold text-foreground text-sm tracking-wide">{rate.currency_code}</span>
        </td>
        <td className="px-3 py-4">
          <span className="block text-sm text-foreground truncate" title={rate.currency_name}>{rate.currency_name}</span>
        </td>
        <td className="px-3 py-4 tabular-nums whitespace-nowrap">
          <span className="font-bold text-foreground text-sm">
            {rate.rate.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </span>
        </td>
        <td className="px-3 py-4 tabular-nums whitespace-nowrap text-sm text-muted-foreground">
          {rate.previous_rate != null
            ? rate.previous_rate.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })
            : "—"}
        </td>
        <td className="px-3 py-4 tabular-nums whitespace-nowrap text-sm">
          {change == null ? (
            <span className="text-muted-foreground">—</span>
          ) : change > 0 ? (
            <span className="text-emerald-500 dark:text-emerald-400 font-semibold">+{change.toFixed(4)}</span>
          ) : change < 0 ? (
            <span className="text-destructive font-semibold">{change.toFixed(4)}</span>
          ) : (
            <span className="text-muted-foreground">0.0000</span>
          )}
        </td>
        <td className="px-3 py-4">
          <ChangeIndicator current={rate.rate} previous={rate.previous_rate} />
        </td>
        <td className="px-3 py-4">
          {history && history.length >= 2 ? (
            <MiniSparkline data={history} positive={positive} livePoint={{ snapshot_date: new Date().toISOString().split("T")[0], rate: rate.rate }} />
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
          <td colSpan={onToggleFavourite !== undefined ? 11 : 10} className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <DetailBox label="Current Rate" value={`KES ${rate.rate.toFixed(2)}`} />
              <DetailBox label="Previous Rate" value={rate.previous_rate != null ? `KES ${rate.previous_rate.toFixed(2)}` : "—"} />
              <DetailBox label="Change (Abs)" value={change != null ? `${change > 0 ? "+" : ""}${change.toFixed(4)}` : "—"} color={change != null ? (change > 0 ? "text-destructive" : change < 0 ? "text-emerald-500 dark:text-emerald-400" : undefined) : undefined} />
              <DetailBox label="Change (%)" value={changePct != null ? `${changePct > 0 ? "+" : ""}${changePct.toFixed(2)}%` : "—"} color={changePct != null ? (changePct > 0 ? "text-destructive" : changePct < 0 ? "text-emerald-500 dark:text-emerald-400" : undefined) : undefined} />
            </div>

            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">Rate History (Last 90 Days)</span>
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
                      effectiveHistory.push({ snapshot_date: todayIso, rate: rate.rate });
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
                      tickFormatter={(v) => v.toFixed(2)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      itemStyle={{ color: "#10b981" }}
                      labelFormatter={(v) => formatMarketDate(v, "en-KE", { month: "long", day: "numeric", year: "numeric" })}
                      formatter={(value: number) => [`KES ${value.toFixed(4)}`, "Rate"]}
                    />
                      <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ fill: "#10b981", stroke: "#10b981" }} />
                    </LineChart>
                    );
                  })()}
                </ResponsiveContainer>
              )}
            </div>

            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-muted-foreground">
                Last updated: {formatMarketDateTime(rate.updated_at)}
              </p>
              <CreateAlertDialog
                assetType="currency"
                assetId={rate.id}
                assetName={`${rate.currency_code}/KES`}
                currentPrice={rate.rate}
                unit="KES"
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const StatCard = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="rounded-xl border border-border bg-card p-3">
    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    <p className={`text-xl font-bold tabular-nums ${color || "text-foreground"}`}>{value}</p>
  </div>
);

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

export default RatesPage;
