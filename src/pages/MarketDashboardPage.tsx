import { useEffect, useState, useMemo } from "react";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMarketData, type ExchangeRate, type Commodity, type Stock } from "@/components/home/MarketTicker";
import { TrendingUp, TrendingDown, Minus, ArrowUpDown, Search, DollarSign, Gem } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveStatus } from "@/hooks/useLiveStatus";
import StatBar from "@/components/home/StatBar";

/* ─── Types ─── */
interface RateHistory { snapshot_date: string; rate: number; currency_code: string; }

type MarketCategory = "fx_rates" | "commodities" | "stocks";
type SortDir = "asc" | "desc";

const categoryLabels: Record<MarketCategory, string> = {
  fx_rates: "FX Rates",
  commodities: "Commodities",
  stocks: "NSE Stocks",
};
const categoryIcons: Record<MarketCategory, typeof DollarSign> = {
  fx_rates: DollarSign,
  commodities: Gem,
  stocks: TrendingUp,
};
const categoryOrder: MarketCategory[] = ["fx_rates", "commodities"];

/* ─── Change Indicator ─── */
const ChangeIndicator = ({ current, previous }: { current: number; previous: number | null }) => {
  if (previous == null) return <span className="text-muted-foreground text-xs">—</span>;
  const diff = current - previous;
  const pct = previous !== 0 ? ((diff / previous) * 100).toFixed(2) : "0.00";
  if (diff > 0) return <span className="inline-flex items-center gap-0.5 text-accent text-[11px] font-semibold"><TrendingUp className="h-3 w-3" /> +{pct}%</span>;
  if (diff < 0) return <span className="inline-flex items-center gap-0.5 text-destructive text-[11px] font-semibold"><TrendingDown className="h-3 w-3" /> {pct}%</span>;
  return <span className="inline-flex items-center gap-0.5 text-muted-foreground text-[11px]"><Minus className="h-3 w-3" /> 0.00%</span>;
};

/* ─── Sort Header ─── */
const SortHeader = ({ label, field, sortKey, onToggle, className = "" }: {
  label: string; field: string; sortKey: string; onToggle: (key: string) => void; className?: string;
}) => (
  <button onClick={() => onToggle(field)} className={`inline-flex items-center gap-1 font-semibold hover:text-accent transition-colors ${className}`}>
    {label}
    <ArrowUpDown className={`h-3 w-3 ${sortKey === field ? "text-accent" : "text-muted-foreground/50"}`} />
  </button>
);

/* ─── Table Skeleton ─── */
const TableSkeleton = () => (
  <div className="space-y-6">
    <div className="flex gap-1 border-b border-border pb-0">
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-9 w-28 rounded-t-lg" />)}
    </div>
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <div className="bg-muted/70 px-5 py-3"><div className="flex gap-6"><Skeleton className="h-4 w-8" /><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-20 ml-auto" /><Skeleton className="h-4 w-16" /></div></div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 px-5 py-3.5 border-t border-border">
          <Skeleton className="h-4 w-5" /><div className="flex-1"><Skeleton className="h-4 w-44 mb-1" /><Skeleton className="h-3 w-28" /></div><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  </div>
);

/* ─── Main Page ─── */
const MarketDashboardPage = () => {
  useDocumentTitle(
    "Market Overview – Kenya Fund Finder",
    "Combined view of NSE stocks, FX exchange rates, and commodity prices.",
    { title: "Market Overview – Kenya Fund Finder", description: "Combined market overview dashboard." }
  );
  useJsonLd({ "@context": "https://schema.org", "@type": "WebPage", name: "Market Overview – Kenya Fund Finder", url: "https://kenyafundfinder.com/markets" });

  const { rates, commodities, stocks, loading } = useMarketData();
  const { lastUpdateDate, isLive, showDate } = useLiveStatus();

  const [activeTab, setActiveTab] = useState<MarketCategory>("fx_rates");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("sort");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const lastUpdate = showDate && lastUpdateDate ? new Date(lastUpdateDate) : null;

  const categoryCount: Record<MarketCategory, number> = {
    fx_rates: rates.length,
    commodities: commodities.length,
    stocks: stocks.length,
  };

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "name" ? "asc" : "desc"); }
  };

  // Filtered & sorted data
  const filteredRates = useMemo(() => {
    let result = [...rates];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r => r.currency_code.toLowerCase().includes(q) || r.currency_name.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return mul * a.currency_code.localeCompare(b.currency_code);
      if (sortKey === "rate") return mul * (Number(a.rate) - Number(b.rate));
      return 0; // default order
    });
    return result;
  }, [rates, search, sortKey, sortDir]);

  const filteredCommodities = useMemo(() => {
    let result = [...commodities];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return mul * a.name.localeCompare(b.name);
      if (sortKey === "price") return mul * (Number(a.price) - Number(b.price));
      return 0;
    });
    return result;
  }, [commodities, search, sortKey, sortDir]);

  const filteredStocks = useMemo(() => {
    let result = [...stocks];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q) || s.symbol.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return mul * a.symbol.localeCompare(b.symbol);
      if (sortKey === "price") return mul * (a.price - b.price);
      if (sortKey === "change") return mul * (a.day_change_percent - b.day_change_percent);
      if (sortKey === "volume") return mul * (a.volume - b.volume);
      return 0;
    });
    return result;
  }, [stocks, search, sortKey, sortDir]);

  const activeCount = activeTab === "fx_rates" ? filteredRates.length
    : activeTab === "commodities" ? filteredCommodities.length
    : filteredStocks.length;

  if (loading) {
    return (
      <div className="min-h-screen">
        <StatBar isLive={false} lastUpdate={null} fundCount={0} bestYield={0} avgYield={0} loading={true} hideYields />
        <div className="px-4 md:px-6 py-5"><TableSkeleton /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <StatBar
        isLive={isLive}
        lastUpdate={lastUpdate}
        fundCount={activeCount}
        bestYield={0}
        avgYield={0}
        loading={loading}
        hideYields
      />

      <div className="px-4 md:px-6 py-5">
        <p className="text-[10px] text-muted-foreground mb-3">Market data is indicative and may be delayed. For educational purposes only.</p>

        <div className="space-y-4">
          {/* Category tabs + search */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {categoryOrder.map(cat => {
                const Icon = categoryIcons[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => { setActiveTab(cat); setSearch(""); setSortKey("sort"); setSortDir("asc"); }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                      activeTab === cat
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {categoryLabels[cat]}
                    <span className={`ml-0.5 tabular-nums text-[10px] ${activeTab === cat ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>{categoryCount[cat]}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={`Search ${categoryLabels[activeTab].toLowerCase()}…`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-xs rounded-lg bg-muted/30 border-border"
              />
            </div>
          </div>

          {/* ─── FX Rates Table ─── */}
          {activeTab === "fx_rates" && (
            <div className="rounded-xl border border-border overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <colgroup>
                    <col className="w-[3%]" />
                    <col className="w-[10%]" />
                    <col className="w-[27%]" />
                    <col className="w-[18%]" />
                    <col className="w-[18%]" />
                    <col className="w-[12%]" />
                    <col className="w-[12%]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-muted/50 text-[11px] uppercase tracking-wider">
                      <th className="text-left pl-4 pr-2 py-2.5 font-semibold text-muted-foreground">#</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Code</th>
                      <th className="text-left px-3 py-2.5"><SortHeader label="Currency" field="name" sortKey={sortKey} onToggle={toggleSort} /></th>
                      <th className="text-right px-3 py-2.5"><SortHeader label="Buy (KES)" field="rate" sortKey={sortKey} onToggle={toggleSort} className="justify-end" /></th>
                      <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Previous</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Change</th>
                      <th className="text-right pr-4 px-3 py-2.5 font-semibold text-muted-foreground">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRates.map((r, i) => (
                      <tr key={r.id} className="border-t border-border/50 hover:bg-accent/5 transition-colors group">
                        <td className="pl-4 pr-2 py-3 text-muted-foreground/60 text-xs tabular-nums">{i + 1}</td>
                        <td className="px-3 py-3">
                          <span className="font-bold text-foreground text-xs tracking-wide">{r.currency_code}</span>
                        </td>
                        <td className="px-3 py-3 text-sm text-muted-foreground">{r.currency_name}</td>
                        <td className="px-3 py-3 text-right">
                          <span className="font-bold text-accent text-[15px] tabular-nums">{Number(r.rate).toFixed(2)}</span>
                        </td>
                        <td className="px-3 py-3 text-right text-xs tabular-nums text-muted-foreground">
                          {r.previous_rate != null ? Number(r.previous_rate).toFixed(2) : "—"}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <ChangeIndicator current={Number(r.rate)} previous={r.previous_rate != null ? Number(r.previous_rate) : null} />
                        </td>
                        <td className="pr-4 px-3 py-3 text-right text-[10px] text-muted-foreground/60">
                          {r.updated_at ? new Date(r.updated_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" }) : "—"}
                        </td>
                      </tr>
                    ))}
                    {filteredRates.length === 0 && <EmptyRow colSpan={7} search={search} onClear={() => setSearch("")} />}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── Commodities Table ─── */}
          {activeTab === "commodities" && (
            <div className="rounded-xl border border-border overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <colgroup>
                    <col className="w-[3%]" />
                    <col className="w-[10%]" />
                    <col className="w-[25%]" />
                    <col className="w-[10%]" />
                    <col className="w-[16%]" />
                    <col className="w-[16%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                  </colgroup>
                  <thead>
                    <tr className="bg-muted/50 text-[11px] uppercase tracking-wider">
                      <th className="text-left pl-4 pr-2 py-2.5 font-semibold text-muted-foreground">#</th>
                      <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Symbol</th>
                      <th className="text-left px-3 py-2.5"><SortHeader label="Commodity" field="name" sortKey={sortKey} onToggle={toggleSort} /></th>
                      <th className="text-center px-2 py-2.5 font-semibold text-muted-foreground">Unit</th>
                      <th className="text-right px-3 py-2.5"><SortHeader label="Price" field="price" sortKey={sortKey} onToggle={toggleSort} className="justify-end" /></th>
                      <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Previous</th>
                      <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Change</th>
                      <th className="text-right pr-4 px-3 py-2.5 font-semibold text-muted-foreground">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCommodities.map((c, i) => (
                      <tr key={c.id} className="border-t border-border/50 hover:bg-accent/5 transition-colors group">
                        <td className="pl-4 pr-2 py-3 text-muted-foreground/60 text-xs tabular-nums">{i + 1}</td>
                        <td className="px-3 py-3">
                          <span className="font-bold text-foreground text-xs tracking-wide">{c.symbol}</span>
                        </td>
                        <td className="px-3 py-3 text-sm text-muted-foreground">{c.name}</td>
                        <td className="px-2 py-3 text-center text-xs font-medium text-muted-foreground">{c.unit}</td>
                        <td className="px-3 py-3 text-right">
                          <span className="font-bold text-accent text-[15px] tabular-nums">{Number(c.price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </td>
                        <td className="px-3 py-3 text-right text-xs tabular-nums text-muted-foreground">
                          {c.previous_price != null ? Number(c.previous_price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <ChangeIndicator current={Number(c.price)} previous={c.previous_price != null ? Number(c.previous_price) : null} />
                        </td>
                        <td className="pr-4 px-3 py-3 text-right text-[10px] text-muted-foreground/60">
                          {c.updated_at ? new Date(c.updated_at).toLocaleDateString("en-KE", { day: "numeric", month: "short" }) : "—"}
                        </td>
                      </tr>
                    ))}
                    {filteredCommodities.length === 0 && <EmptyRow colSpan={8} search={search} onClear={() => setSearch("")} />}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── Stocks Table ─── */}
          {activeTab === "stocks" && (
            <div className="rounded-xl border border-border overflow-hidden bg-card">
              <table className="w-full text-sm">
                <colgroup>
                  <col style={{ width: "3%" }} />
                  <col style={{ width: "30%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "16%" }} />
                </colgroup>
                <thead>
                  <tr className="bg-muted/70 text-xs">
                    <th className="text-left pl-5 pr-2 py-3 font-semibold text-muted-foreground">#</th>
                    <th className="text-left px-3 py-3"><SortHeader label="Stock" field="name" sortKey={sortKey} onToggle={toggleSort} /></th>
                    <th className="text-center px-2 py-3 font-semibold text-muted-foreground">Sector</th>
                    <th className="text-right px-3 py-3"><SortHeader label="Price (KES)" field="price" sortKey={sortKey} onToggle={toggleSort} className="justify-end" /></th>
                    <th className="text-right px-3 py-3"><SortHeader label="Change" field="change" sortKey={sortKey} onToggle={toggleSort} className="justify-end" /></th>
                    <th className="text-right pr-5 px-3 py-3"><SortHeader label="Volume" field="volume" sortKey={sortKey} onToggle={toggleSort} className="justify-end" /></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStocks.map((s, i) => (
                    <tr key={s.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="pl-5 pr-2 py-3 text-muted-foreground text-xs tabular-nums">{i + 1}</td>
                      <td className="px-3 py-3">
                        <span className="font-semibold text-foreground">{s.symbol}</span>
                        <span className="block text-[10px] text-muted-foreground truncate" title={s.name}>{s.name}</span>
                      </td>
                      <td className="px-2 py-3 text-center text-[10px] text-muted-foreground">{s.sector}</td>
                      <td className="px-3 py-3 text-right">
                        <span className="font-bold text-accent text-base tabular-nums">{s.price.toFixed(2)}</span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <ChangeIndicator current={s.price} previous={s.previous_price} />
                      </td>
                      <td className="pr-5 px-3 py-3 text-right text-xs tabular-nums text-muted-foreground">
                        {s.volume.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {filteredStocks.length === 0 && <EmptyRow colSpan={6} search={search} onClear={() => setSearch("")} />}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>Showing {activeCount} {categoryLabels[activeTab].toLowerCase()}</span>
            {activeTab === "stocks" && (
              <Link to="/stocks" className="text-accent hover:text-accent/80 font-medium transition-colors">View stock details →</Link>
            )}
            {activeTab === "fx_rates" && (
              <Link to="/rates" className="text-accent hover:text-accent/80 font-medium transition-colors">View all rates →</Link>
            )}
            {activeTab === "commodities" && (
              <Link to="/commodities" className="text-accent hover:text-accent/80 font-medium transition-colors">View all commodities →</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Empty Row ─── */
const EmptyRow = ({ colSpan, search, onClear }: { colSpan: number; search: string; onClear: () => void }) => (
  <tr>
    <td colSpan={colSpan} className="text-center py-14">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center"><span className="text-2xl">📊</span></div>
        <p className="text-sm text-muted-foreground font-medium">No results found</p>
        {search.trim() && (
          <button onClick={onClear} className="text-xs text-accent hover:text-accent/80 font-medium transition-colors">Clear search</button>
        )}
      </div>
    </td>
  </tr>
);

export default MarketDashboardPage;
