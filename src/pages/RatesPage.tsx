import { useEffect, useState, useMemo } from "react";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, BarChart3, Search, Star } from "lucide-react";
import SectionLiveStatus from "@/components/SectionLiveStatus";
import { CreateAlertDialog } from "@/components/alerts/PriceAlertComponents";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area } from "recharts";
import ActiveAlertsCard from "@/components/alerts/ActiveAlertsCard";
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
  if (previous == null) return <span className="text-muted-foreground text-xs">—</span>;
  const diff = current - previous;
  const pct = previous !== 0 ? ((diff / previous) * 100).toFixed(2) : "0.00";
  if (diff > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-accent text-[11px] font-semibold">
        <TrendingUp className="h-3 w-3" /> +{pct}%
      </span>
    );
  if (diff < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-destructive text-[11px] font-semibold">
        <TrendingDown className="h-3 w-3" /> {pct}%
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-muted-foreground text-[11px]">
      <Minus className="h-3 w-3" /> 0.00%
    </span>
  );
};

/* ─── Mini Sparkline (matches Stocks page) ─── */
const MiniSparkline = ({ data, positive }: { data: RateHistory[]; positive: boolean }) => {
  if (!data?.length || data.length < 2) return null;
  const color = positive ? "hsl(var(--accent))" : "hsl(var(--destructive))";
  const gradientId = `rate-sparkline-fill-${positive ? "up" : "down"}`;

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
          <YAxis hide domain={["dataMin - 0.01", "dataMax + 0.01"]} />
          <Area type="monotone" dataKey="rate" stroke="none" fill={`url(#${gradientId})`} isAnimationActive={false} />
          <Line type="monotone" dataKey="rate" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
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
  const { isFavourite, toggle: toggleFavourite } = useAssetWatchlist("currency");

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
      setRates((data as any as Rate[]) || []);
      setLoading(false);
    };
    fetch();
    const ch = supabase
      .channel("rates-page-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "exchange_rates" }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Preload sparkline history for all rates
  useEffect(() => {
    if (rates.length === 0) return;
    const fetchAllHistory = async () => {
      const { data } = await supabase
        .from("exchange_rate_history_public" as any)
        .select("exchange_rate_id, rate, snapshot_date")
        .order("snapshot_date", { ascending: true });
      if (data) {
        const grouped: Record<string, RateHistory[]> = {};
        (data as any[]).forEach((d) => {
          const rid = d.exchange_rate_id;
          if (!grouped[rid]) grouped[rid] = [];
          grouped[rid].push({ snapshot_date: d.snapshot_date, rate: Number(d.rate) });
        });
        setHistory(grouped);
      }
    };
    fetchAllHistory();
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
        .order("snapshot_date", { ascending: true })
        .limit(90);
      setHistory((prev) => ({
        ...prev,
        [rateId]: ((data as any) || []).map((d: any) => ({ snapshot_date: d.snapshot_date, rate: Number(d.rate) })),
      }));
      setHistoryLoading(null);
    }
  };

  const latestUpdate = rates.length > 0
    ? new Date(rates.reduce((l, r) => (r.updated_at > l ? r.updated_at : l), rates[0].updated_at))
    : null;

  const strengthened = useMemo(() => rates.filter((r) => r.previous_rate != null && r.rate < r.previous_rate).length, [rates]);
  const weakened = useMemo(() => rates.filter((r) => r.previous_rate != null && r.rate > r.previous_rate).length, [rates]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rates;
    const q = search.toLowerCase();
    return rates.filter(r => r.currency_code.toLowerCase().includes(q) || r.currency_name.toLowerCase().includes(q));
  }, [rates, search]);

  return (
    <div className="min-h-screen">
      <div className="px-4 md:px-6 py-6">
        <div className="mb-6">
          <div className="hidden md:flex items-start justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">FX Exchange Rates</h1>
              <p className="text-sm text-muted-foreground md:mt-1">
                Indicative exchange rates against the Kenya Shilling (KES).
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <SectionLiveStatus section="rates" fallbackDate={latestUpdate} hideDate />
              <span className="text-xs text-muted-foreground/70">Updated {latestUpdate?.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
          </div>
          <div className="md:hidden flex items-center justify-between w-full">
            <span className="text-xs text-muted-foreground/70">Updated {latestUpdate?.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}</span>
            <SectionLiveStatus section="rates" fallbackDate={latestUpdate} hideDate />
          </div>
          <div className="md:hidden border-b border-border mt-3" />
        </div>

        <ActiveAlertsCard assetType="currency" />


        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search "
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-lg text-[16px] sm:text-sm"
            />
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block">
          {loading ? (
            <TableSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState label="exchange rates" />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/60 text-[11px] uppercase tracking-wider border-b border-border">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-10">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Currency</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Rate (KES)</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Change</th>
                    <th className="w-10"></th>
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
            <EmptyState label="exchange rates" />
          ) : (
            filtered.map((r) => {
              const positive = r.previous_rate != null ? r.rate >= r.previous_rate : true;
              return (
                <MobileRateCard
                  key={r.id}
                  rate={r}
                  history={history[r.id]}
                  positive={positive}
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
  positive,
  isFavourite,
  onToggleFavourite,
}: {
  rate: Rate;
  history?: RateHistory[];
  positive: boolean;
  isFavourite?: boolean;
  onToggleFavourite?: () => void;
}) => (
  <div className="block rounded-xl border border-border bg-card hover:border-accent/30 transition-all overflow-hidden">
    <div className="flex items-center gap-3 p-3.5">
      {/* Left: Code + Name */}
      <div className="flex-1 min-w-0">
        <span className="font-bold text-foreground text-sm">{r.currency_code}</span>
        <p className="text-[11px] text-muted-foreground truncate">{r.currency_name}</p>
      </div>

      {/* Center: Sparkline */}
      <div className="shrink-0">
        <MiniSparkline data={history || []} positive={positive} />
      </div>

      {/* Right: Rate + Change */}
      <div className="text-right shrink-0">
        <p className="font-bold text-foreground text-sm tabular-nums">
          KES {r.rate.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <ChangeIndicator current={r.rate} previous={r.previous_rate} />
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
  </div>
);

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

  return (
    <>
      <tr
        className="border-t border-border/50 hover:bg-accent/5 transition-colors cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-4 py-3.5 text-muted-foreground/60 text-xs tabular-nums">{index + 1}</td>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2">
            {onToggleFavourite !== undefined && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavourite(); }}
                className="p-1 rounded-md hover:bg-muted transition-colors"
                aria-label={isFavourite ? "Remove from watchlist" : "Add to watchlist"}
              >
                <Star className={`h-3.5 w-3.5 transition-colors ${isFavourite ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/40 hover:text-yellow-500"}`} />
              </button>
            )}
            <div>
              <span className="font-bold text-foreground text-xs tracking-wide">{rate.currency_code}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">{rate.currency_name}</span>
            </div>
          </div>
        </td>
        <td className="px-4 py-3.5 text-right tabular-nums">
          <span className="font-bold text-accent text-[15px]">
            {rate.rate.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </td>
        <td className="px-4 py-3.5 text-right">
          <ChangeIndicator current={rate.rate} previous={rate.previous_rate} />
        </td>
        <td className="px-4 py-3.5 text-center">
          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-t border-border bg-muted/20">
          <td colSpan={5} className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <DetailBox label="Current Rate" value={`KES ${rate.rate.toFixed(2)}`} />
              <DetailBox label="Previous Rate" value={rate.previous_rate != null ? `KES ${rate.previous_rate.toFixed(2)}` : "—"} />
              <DetailBox label="Change (Abs)" value={change != null ? `${change > 0 ? "+" : ""}${change.toFixed(4)}` : "—"} color={change != null ? (change > 0 ? "text-destructive" : change < 0 ? "text-accent" : undefined) : undefined} />
              <DetailBox label="Change (%)" value={changePct != null ? `${changePct > 0 ? "+" : ""}${changePct.toFixed(2)}%` : "—"} color={changePct != null ? (changePct > 0 ? "text-destructive" : changePct < 0 ? "text-accent" : undefined) : undefined} />
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
                      tickFormatter={(v) => v.toFixed(2)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelFormatter={(v) => new Date(v).toLocaleDateString("en-KE", { month: "long", day: "numeric", year: "numeric" })}
                      formatter={(value: number) => [`KES ${value.toFixed(4)}`, "Rate"]}
                    />
                    <Line type="monotone" dataKey="rate" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-muted-foreground">
                Last updated: {new Date(rate.updated_at).toLocaleString("en-KE")}
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
