import { useEffect, useState, useMemo } from "react";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, BarChart3, Search } from "lucide-react";
import SectionLiveStatus from "@/components/SectionLiveStatus";
import { CreateAlertDialog } from "@/components/alerts/PriceAlertComponents";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import ActiveAlertsCard from "@/components/alerts/ActiveAlertsCard";

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

  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, PriceHistory[]>>({});
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);

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

    // Subscribe to commodity price changes for real-time updates
    const ch = supabase
      .channel("commodities-page-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "commodities" }, () => {
        fetchData();
        // Clear cached history so graphs re-fetch with latest data
        setHistory({});
        if (expanded) {
          // Re-fetch history for the currently expanded commodity
          (async () => {
            setHistoryLoading(expanded);
            const { data: histData } = await supabase
              .from("commodity_price_history" as any)
              .select("price, snapshot_date")
              .eq("commodity_id", expanded)
              .order("snapshot_date", { ascending: true })
              .limit(90);
            setHistory({ [expanded]: ((histData as any) || []).map((d: any) => ({ snapshot_date: d.snapshot_date, price: Number(d.price) })) });
            setHistoryLoading(null);
          })();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [expanded]);

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!history[id]) {
      setHistoryLoading(id);
      const { data } = await supabase
        .from("commodity_price_history" as any)
        .select("price, snapshot_date")
        .eq("commodity_id", id)
        .order("snapshot_date", { ascending: true })
        .limit(90);
      setHistory((prev) => ({
        ...prev,
        [id]: ((data as any) || []).map((d: any) => ({ snapshot_date: d.snapshot_date, price: Number(d.price) })),
      }));
      setHistoryLoading(null);
    }
  };

  const latestUpdate = commodities.length > 0
    ? new Date(commodities.reduce((l, c) => (c.updated_at > l ? c.updated_at : l), commodities[0].updated_at))
    : null;

  const gainers = useMemo(() => commodities.filter((c) => c.previous_price != null && c.price > c.previous_price).length, [commodities]);
  const losers = useMemo(() => commodities.filter((c) => c.previous_price != null && c.price < c.previous_price).length, [commodities]);

  const filtered = useMemo(() => {
    if (!search.trim()) return commodities;
    const q = search.toLowerCase();
    return commodities.filter(c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q));
  }, [commodities, search]);

  return (
    <div className="min-h-screen">
      <div className="px-4 md:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Commodity Prices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Indicative commodity prices including metals, energy, and cryptocurrency.
            <SectionLiveStatus section="commodities" fallbackDate={latestUpdate} />
          </p>
        </div>

        <ActiveAlertsCard assetType="commodity" />

        {/* Summary Stats */}
        {!loading && commodities.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <StatCard label="Commodities" value={String(commodities.length)} />
            <StatCard label="Gainers" value={String(gainers)} color="text-accent" />
            <StatCard label="Losers" value={String(losers)} color="text-destructive" />
          </div>
        )}

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search commodities…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-lg text-[16px] sm:text-sm"
            />
          </div>
        </div>

        {/* Table with expandable rows */}
        {loading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState label="commodities" />
        ) : (
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/60 text-[11px] uppercase tracking-wider border-b border-border">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-10">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Item</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Price</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Change</th>
                  <th className="w-10"></th>
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
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-4 px-1">
          <span>Showing {filtered.length} of {commodities.length} commodities</span>
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

const CommodityRow = ({
  commodity: c, index, isExpanded, onToggle, history, historyLoading,
}: {
  commodity: Commodity; index: number; isExpanded: boolean; onToggle: () => void;
  history?: PriceHistory[]; historyLoading: boolean;
}) => {
  const change = c.previous_price != null ? c.price - c.previous_price : null;
  const changePct = c.previous_price != null && c.previous_price !== 0
    ? ((change! / c.previous_price) * 100)
    : null;

  return (
    <>
      <tr className="border-t border-border/50 hover:bg-accent/5 transition-colors cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-3.5 text-muted-foreground/60 text-xs tabular-nums">{index + 1}</td>
        <td className="px-4 py-3.5">
          <span className="font-bold text-foreground text-xs tracking-wide">{c.name}</span>
          <span className="block text-xs text-muted-foreground mt-0.5">{c.symbol}</span>
        </td>
        <td className="px-4 py-3.5 text-right tabular-nums">
          <span className="font-bold text-accent text-[15px]">
            {c.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-muted-foreground ml-1 text-[10px]">{c.unit}</span>
        </td>
        <td className="px-4 py-3.5 text-right">
          <ChangeIndicator current={c.price} previous={c.previous_price} />
        </td>
        <td className="px-4 py-3.5 text-center">
          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-t border-border bg-muted/20">
          <td colSpan={5} className="p-4">
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
                      labelFormatter={(v) => new Date(v).toLocaleDateString("en-KE", { month: "long", day: "numeric", year: "numeric" })}
                      formatter={(value: number) => [`${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c.unit}`, "Price"]}
                    />
                    <Line type="monotone" dataKey="price" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-muted-foreground">
                Last updated: {new Date(c.updated_at).toLocaleString("en-KE")}
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

export default CommoditiesPage;