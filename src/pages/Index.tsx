import { useEffect, useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpDown, Calculator, TrendingUp, Newspaper, Search } from "lucide-react";
import { useLiveStatus } from "@/hooks/useLiveStatus";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { fetchFunds, fetchLatestSnapshots, fetchPublishedNews, type FundFromDB, type NewsFromDB, type YieldSnapshot } from "@/lib/api";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import YieldChange, { formatYield } from "@/components/YieldChange";
import { cn } from "@/lib/utils";

type SortKey = "annual_yield" | "daily_yield" | "management_fee" | "minimum_investment" | "name";
type SortDir = "asc" | "desc";

const categoryLabels: Record<string, string> = {
  money_market: "Money Market",
  fixed_income: "Fixed Income",
  balanced: "Balanced",
  equity: "Equity",
  bond: "Bond",
};

const Index = () => {
  useDocumentTitle("Fund Finder Kenya – Compare Money Market Funds", "Compare CMA-regulated Money Market Funds in Kenya. See yields, fees, and calculate returns.");
  useJsonLd({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Fund Finder Kenya",
    url: "https://kenyafundfinder.com",
    description: "Compare CMA-regulated Money Market Funds in Kenya. See yields, fees, and calculate returns.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://kenyafundfinder.com/compare?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  });

  const [funds, setFunds] = useState<FundFromDB[]>([]);
  const [news, setNews] = useState<NewsFromDB[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, YieldSnapshot>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("money_market");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("annual_yield");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const { lastUpdateDate } = useLiveStatus();
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFunds().then(setFunds).catch(() => {});
    fetchPublishedNews().then(setNews).catch(() => {});
    fetchLatestSnapshots().then((data) => {
      const map: Record<string, YieldSnapshot> = {};
      data.forEach((s) => { map[s.fund_id] = s; });
      setSnapshots(map);
    }).catch(() => {});
  }, []);

  const categoryOrder = ["money_market", "fixed_income", "bond", "balanced", "equity"];
  const categories = useMemo(() => {
    const present = [...new Set(funds.map((f) => f.fund_type))];
    return [...present].sort((a, b) => {
      const ai = categoryOrder.indexOf(a);
      const bi = categoryOrder.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [funds]);
  const categoryCount = useMemo(() => {
    const counts: Record<string, number> = {};
    funds.forEach((f) => { counts[f.fund_type] = (counts[f.fund_type] || 0) + 1; });
    return counts;
  }, [funds]);

  const processedFunds = useMemo(() => {
    let result = funds;
    result = result.filter((f) => f.fund_type === selectedCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q) || f.manager.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return mul * a.name.localeCompare(b.name);
      return mul * ((a[sortKey] as number) - (b[sortKey] as number));
    });
    return result;
  }, [funds, selectedCategory, search, sortKey, sortDir]);

  const bestYield = useMemo(() => {
    const filtered = selectedCategory === "all" ? funds : funds.filter((f) => f.fund_type === selectedCategory);
    if (filtered.length === 0) return 0;
    return Math.max(...filtered.map((f) => f.annual_yield));
  }, [funds, selectedCategory]);

  const avgYield = useMemo(() => {
    if (processedFunds.length === 0) return 0;
    return processedFunds.reduce((s, f) => s + f.annual_yield, 0) / processedFunds.length;
  }, [processedFunds]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "name" ? "asc" : "desc"); }
  };

  const SortHeader = ({ label, field, className = "" }: { label: string; field: SortKey; className?: string }) => (
    <button onClick={() => toggleSort(field)} className={`inline-flex items-center gap-1 font-semibold hover:text-accent transition-colors ${className}`}>
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sortKey === field ? "text-accent" : "text-muted-foreground/50"}`} />
    </button>
  );

  const lastUpdate = lastUpdateDate ? new Date(lastUpdateDate) : funds[0] ? new Date(funds[0].updated_at) : null;
  const latestNews = news.slice(0, 4);
  const allTabs = categories.map((c) => ({ key: c, label: categoryLabels[c] || c }));

  return (
    <div className="min-h-screen">
      {/* Compact stat bar */}
      <div className="border-b border-border bg-card">
        <div className="container max-w-7xl py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Fund Dashboard</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lastUpdate ? `Updated ${lastUpdate.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}` : "CMA-regulated unit trusts"}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { label: "Funds", value: String(processedFunds.length) },
                { label: "Top Yield", value: bestYield ? formatYield(bestYield, "%") : "—", accent: true },
                { label: "Avg Yield", value: avgYield ? `${avgYield.toFixed(2)}%` : "—" },
              ].map(({ label, value, accent }) => (
                <div key={label} className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
                  <span className={`text-sm font-bold tabular-nums ${accent ? "text-accent" : "text-foreground"}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-7xl py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
          {/* Main table area */}
          <div>
            {/* Category tabs - horizontally scrollable */}
            <div ref={tabsRef} className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-3 scrollbar-none -mx-1 px-1">
              {allTabs.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={cn(
                    "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                    selectedCategory === key
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {label}
                  <span className={cn(
                    "ml-1.5 tabular-nums",
                    selectedCategory === key ? "text-accent-foreground/70" : "text-muted-foreground/60"
                  )}>
                    {categoryCount[key] || 0}
                  </span>
                </button>
              ))}
            </div>

            {/* Search + actions */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search funds or managers…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 rounded-lg text-sm"
                />
              </div>
              <Button asChild variant="outline" size="sm" className="h-9 rounded-lg text-xs shrink-0">
                <Link to="/compare">Full View <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block rounded-xl border border-border overflow-hidden bg-card">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-10" />
                  <col />
                  <col className="w-40" />
                  <col className="w-28" />
                  <col className="w-28" />
                  <col className="w-16" />
                  <col className="w-12" />
                </colgroup>
                <thead>
                  <tr className="bg-muted/70 text-xs">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">#</th>
                    <th className="text-left px-4 py-3"><SortHeader label="Fund" field="name" /></th>
                    <th className="text-right px-4 py-3"><SortHeader label="Annual Rate" field="annual_yield" className="justify-end" /></th>
                    <th className="text-right px-4 py-3"><SortHeader label="Daily Yield" field="daily_yield" className="justify-end" /></th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Change</th>
                    <th className="text-right px-4 py-3"><SortHeader label="Fee" field="management_fee" className="justify-end" /></th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {processedFunds.map((fund, i) => (
                    <tr key={fund.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3.5 text-muted-foreground text-xs tabular-nums">{i + 1}</td>
                      <td className="px-4 py-3.5">
                        <Link to={`/compare/${fund.slug}`} className="font-semibold hover:text-accent transition-colors">
                          {fund.name}
                        </Link>
                        {fund.annual_yield === bestYield && bestYield > 0 && (
                          <Badge variant="default" className="ml-2 text-[9px] px-1.5 py-0 h-4 bg-accent text-accent-foreground align-middle">TOP</Badge>
                        )}
                        <span className="block text-xs text-muted-foreground mt-0.5">{fund.manager}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap tabular-nums">
                        <span className="font-bold text-accent text-base">{formatYield(fund.annual_yield, fund.yield_unit)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums whitespace-nowrap text-muted-foreground">
                        {formatYield(fund.daily_yield, fund.yield_unit)}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {snapshots[fund.id] ? (
                          <YieldChange current={fund.annual_yield} previous={snapshots[fund.id]?.annual_yield} unit={fund.yield_unit} className="text-xs justify-end" />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link to={`/compare/${fund.slug}`} className="text-accent hover:text-accent/80 transition-colors">
                          <ArrowRight className="h-4 w-4 inline-block" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {processedFunds.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No funds match your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {processedFunds.map((fund, i) => (
                <Link key={fund.id} to={`/compare/${fund.slug}`} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-accent/30 transition-all active:scale-[0.99]">
                  <span className="text-xs font-bold text-muted-foreground tabular-nums text-center">{i + 1}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-sm truncate">{fund.name}</h3>
                      {fund.annual_yield === bestYield && bestYield > 0 && (
                        <Badge variant="default" className="text-[9px] px-1 py-0 h-3.5 bg-accent text-accent-foreground shrink-0">TOP</Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Daily: {formatYield(fund.daily_yield, fund.yield_unit)} · Fee {fund.management_fee}%</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-accent font-bold text-sm tabular-nums">{formatYield(fund.annual_yield, fund.yield_unit)}</span>
                    {snapshots[fund.id] && (
                      <YieldChange current={fund.annual_yield} previous={snapshots[fund.id]?.annual_yield} unit={fund.yield_unit} className="text-[10px] justify-end" />
                    )}
                  </div>
                </Link>
              ))}
              {processedFunds.length === 0 && (
                <p className="text-center py-8 text-muted-foreground text-sm">No funds match your filters.</p>
              )}
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <Button asChild variant="outline" size="sm" className="rounded-lg text-xs h-8">
                <Link to="/calculator"><Calculator className="mr-1.5 h-3.5 w-3.5" /> Calculate Returns</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-lg text-xs h-8">
                <Link to="/compare"><TrendingUp className="mr-1.5 h-3.5 w-3.5" /> Compare All</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-lg text-xs h-8">
                <Link to="/learn">Learn About Funds</Link>
              </Button>
            </div>
          </div>

          {/* News sidebar */}
          <aside className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Latest News</h2>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-accent text-xs h-7 px-2">
                <Link to="/news">All <ArrowRight className="ml-0.5 h-3 w-3" /></Link>
              </Button>
            </div>
            {latestNews.map((article) => (
              <article key={article.id} className="rounded-lg border border-border bg-card p-3 hover:border-accent/20 transition-all">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/10 text-accent uppercase tracking-wider">{article.category}</span>
                  <span className="text-[10px] text-muted-foreground">{article.read_time}</span>
                </div>
                <h3 className="font-medium text-xs leading-snug line-clamp-2 mb-1">{article.title}</h3>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{article.summary}</p>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {article.source && `${article.source} · `}
                  {new Date(article.date_published).toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
                </p>
              </article>
            ))}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Index;
