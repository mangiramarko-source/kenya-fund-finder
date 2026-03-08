import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Calculator, Search } from "lucide-react";
import { useLiveStatus } from "@/hooks/useLiveStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchFunds, fetchLatestSnapshots, fetchPublishedNews, type FundFromDB, type NewsFromDB, type YieldSnapshot } from "@/lib/api";
import { getDisclaimer } from "@/lib/disclaimers";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { formatYield } from "@/components/YieldChange";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import StatBar from "@/components/home/StatBar";
import CategoryTabs from "@/components/home/CategoryTabs";
import FundTable from "@/components/home/FundTable";
import FundMobileCards from "@/components/home/FundMobileCards";
import NewsSidebar from "@/components/home/NewsSidebar";
import AdBanner from "@/components/AdBanner";
import MarketTicker from "@/components/home/MarketTicker";

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
  useDocumentTitle("Kenya Fund Finder – Compare Investment Funds in Kenya", "Daily-updated data on all Kenyan unit trusts: equity, money market, fixed income, bonds, and balanced funds. Compare yields, fees, and calculate returns.");
  useJsonLd({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Kenya Fund Finder",
    url: "https://kenyafundfinder.com",
    description: "Compare CMA-regulated Money Market Funds in Kenya. See yields, fees, and calculate returns.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://kenyafundfinder.com/compare?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  });

  const [loading, setLoading] = useState(true);
  const [funds, setFunds] = useState<FundFromDB[]>([]);
  const [news, setNews] = useState<NewsFromDB[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, YieldSnapshot>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("money_market");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);
  const [sortKey, setSortKey] = useState<SortKey>("annual_yield");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [yieldFilter, setYieldFilter] = useState<"all" | "percent" | "currency">("all");
  const { lastUpdateDate, isLive } = useLiveStatus();

  useEffect(() => {
    Promise.all([
      fetchFunds().then(setFunds).catch(() => {}),
      fetchPublishedNews().then(setNews).catch(() => {}),
      fetchLatestSnapshots().then((data) => {
        const map: Record<string, YieldSnapshot> = {};
        data.forEach((s) => { map[s.fund_id] = s; });
        setSnapshots(map);
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
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
    let result = funds.filter((f) => f.fund_type === selectedCategory);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q) || f.manager.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return mul * a.name.localeCompare(b.name);
      return mul * ((a[sortKey] as number) - (b[sortKey] as number));
    });
    return result;
  }, [funds, selectedCategory, debouncedSearch, sortKey, sortDir]);

  const percentFunds = useMemo(() => processedFunds.filter((f) => f.yield_unit === "%"), [processedFunds]);
  const currencyFunds = useMemo(() => processedFunds.filter((f) => f.yield_unit !== "%"), [processedFunds]);
  const displayFunds = useMemo(() => {
    if (yieldFilter === "percent") return percentFunds;
    if (yieldFilter === "currency") return currencyFunds;
    return processedFunds;
  }, [yieldFilter, percentFunds, currencyFunds, processedFunds]);
  const hasBothTypes = percentFunds.length > 0 && currencyFunds.length > 0;

  const bestYield = useMemo(() => {
    const filtered = funds.filter((f) => f.fund_type === selectedCategory);
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

  const clearSearch = () => setSearch("");

  const lastUpdate = lastUpdateDate ? new Date(lastUpdateDate) : funds[0] ? new Date(funds[0].updated_at) : null;
  const latestNews = news.slice(0, 4);
  const allTabs = categories.map((c) => ({ key: c, label: categoryLabels[c] || c }));

  return (
    <div className="min-h-screen">
      <h1 className="sr-only">Kenya Fund Finder – Compare Investment Funds</h1>

      <StatBar
        isLive={isLive}
        lastUpdate={lastUpdate}
        fundCount={processedFunds.length}
        bestYield={bestYield}
        avgYield={avgYield}
        loading={loading}
      />

      <div className="container max-w-7xl py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
          {/* Main fund area */}
          <div>
            <CategoryTabs
              tabs={allTabs}
              selectedCategory={selectedCategory}
              categoryCount={categoryCount}
              onSelect={setSelectedCategory}
              loading={loading}
            />
            <p className="text-[10px] text-muted-foreground -mt-1 mb-3">Yields are gross annual effective rates before 15% withholding tax.</p>

            {/* Search */}
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
            </div>

            {/* Yield unit toggle */}
            {hasBothTypes && (
              <div className="flex items-center gap-1.5 mb-4">
                {(["all", "percent", "currency"] as const).map((opt) => {
                  const labels = { all: "All", percent: "% Yields", currency: "Currency" };
                  const counts = { all: processedFunds.length, percent: percentFunds.length, currency: currencyFunds.length };
                  return (
                    <button
                      key={opt}
                      onClick={() => setYieldFilter(opt)}
                      className={`inline-flex items-center gap-1.5 rounded-lg text-xs font-medium px-3 h-8 border transition-all ${
                        yieldFilter === opt
                          ? "bg-accent text-accent-foreground border-accent shadow-sm"
                          : "bg-card text-muted-foreground border-border hover:border-accent/30 hover:text-foreground"
                      }`}
                    >
                      {labels[opt]}
                      <span className={`text-[10px] tabular-nums ${yieldFilter === opt ? "text-accent-foreground/70" : "text-muted-foreground/60"}`}>
                        {counts[opt]}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Desktop table */}
            <div className="hidden md:block">
              <FundTable
                funds={displayFunds}
                snapshots={snapshots}
                bestYield={bestYield}
                sortKey={sortKey}
                sortDir={sortDir}
                onToggleSort={toggleSort}
                loading={loading}
                onClearSearch={clearSearch}
                hasSearch={!!debouncedSearch.trim()}
              />
            </div>

            {/* Mobile cards */}
            <div className="md:hidden">
              <FundMobileCards
                funds={displayFunds}
                snapshots={snapshots}
                bestYield={bestYield}
                loading={loading}
                onClearSearch={clearSearch}
                hasSearch={!!debouncedSearch.trim()}
              />
            </div>

            {/* Mobile disclaimer */}
            <div className="md:hidden mt-4 rounded-lg bg-muted/40 border border-border/50 p-3">
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                {getDisclaimer(selectedCategory as any)}
              </p>
            </div>

            {/* Mobile quick actions */}
            <div className="flex items-center gap-2 mt-4 flex-wrap sm:hidden">
              <Button asChild variant="outline" size="sm" className="rounded-lg text-xs h-8">
                <Link to="/calculator"><Calculator className="mr-1.5 h-3.5 w-3.5" /> Calculate Returns</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-lg text-xs h-8">
                <Link to="/learn">Learn About Funds</Link>
              </Button>
            </div>

            {/* Mobile news + ads section */}
            <div className="xl:hidden mt-6 space-y-4">
              <AdBanner placement="sidebar" />
              <AdBanner placement="in-feed" />
              <NewsSidebar news={latestNews} loading={loading} />
            </div>
          </div>

          {/* Desktop sidebar */}
          <aside className="hidden xl:block space-y-4">
            <AdBanner placement="sidebar" />
            <NewsSidebar news={latestNews} loading={loading} />
            <AdBanner placement="banner" />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Index;
