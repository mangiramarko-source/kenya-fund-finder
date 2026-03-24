import { useEffect, useState, useMemo, forwardRef } from "react";
import { Link } from "react-router-dom";
import { Calculator, Search } from "lucide-react";
import { useLiveStatus } from "@/hooks/useLiveStatus";
import { useAuth } from "@/hooks/useAuth";
import AuthGate from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchFunds, fetchLatestSnapshots, fetchPublishedNews, type FundFromDB, type NewsFromDB, type YieldSnapshot } from "@/lib/api";
import { getDisclaimer } from "@/lib/disclaimers";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { formatYield } from "@/components/YieldChange";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import StatBar from "@/components/home/StatBar";
import CategoryTabs from "@/components/home/CategoryTabs";
import FundMobileCards from "@/components/home/FundMobileCards";
import FundGrid from "@/components/home/FundGrid";
import NewsSidebar from "@/components/home/NewsSidebar";
import AdBanner from "@/components/AdBanner";
import { useMarketData, RatesMobileCards, CommoditiesMobileCards } from "@/components/home/MarketTicker";

type SortKey = "annual_yield" | "daily_yield" | "name";
type SortDir = "asc" | "desc";

const categoryLabels: Record<string, string> = {
  money_market: "Money Market",
  fixed_income: "Fixed Income",
  balanced: "Balanced",
  equity: "Equity",
  bond: "Bond",
  fx_rates: "Currency",
  commodities: "Commodities",
};

const MARKET_TABS = ["fx_rates", "commodities"] as const;

const Index = forwardRef<HTMLDivElement>((_, ref) => {
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
  useJsonLd({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Kenya Fund Finder",
    url: "https://kenyafundfinder.com",
    logo: "https://kenyafundfinder.com/og-image.png",
    description: "Kenya's leading platform for comparing CMA-regulated unit trust funds. Daily-updated yields, fees, and investment calculators.",
    sameAs: [
      "https://twitter.com/kaborafundfind",
      "https://www.facebook.com/kenyafundfinder",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: "https://kenyafundfinder.com",
      availableLanguage: "English",
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
  
  const { lastUpdateDate, isLive, showDate } = useLiveStatus();
  const { user } = useAuth();

  const { rates, commodities, stocks, loading: marketLoading } = useMarketData();

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
    counts["fx_rates"] = rates.length;
    counts["commodities"] = commodities.length;
    return counts;
  }, [funds, rates, commodities]);

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

  const lastUpdate = showDate && lastUpdateDate ? new Date(lastUpdateDate) : showDate && funds[0] ? new Date(funds[0].updated_at) : null;
  const latestNews = news.slice(0, 4);

  const isMarketTab = MARKET_TABS.includes(selectedCategory as any);
  const isFundTab = !isMarketTab;

  // Mobile tabs: fund categories + market
  const allTabs = useMemo(() => [
    ...categories.map((c) => ({ key: c, label: categoryLabels[c] || c })),
    { key: "fx_rates", label: "FX Rates" },
    { key: "commodities", label: "Commodities" },
  ], [categories]);

  return (
    <div ref={ref} className="min-h-screen">
      <h1 className="sr-only">Kenya Fund Finder – Compare Investment Funds</h1>

      <StatBar
        isLive={isLive}
        lastUpdate={lastUpdate}
        fundCount={isFundTab ? processedFunds.length : (selectedCategory === "fx_rates" ? rates.length : commodities.length)}
        bestYield={isFundTab ? bestYield : 0}
        avgYield={isFundTab ? avgYield : 0}
        loading={loading}
        hideYields={isMarketTab}
      />

      <div className="px-4 md:px-6 py-5">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
          {/* Main area */}
          <div className="min-w-0">
            {/* Desktop: unified grid with all fund categories + market data */}
            <div className="hidden md:block">
              <p className="text-[10px] text-muted-foreground mb-3">Yields are gross annual effective rates before 15% withholding tax.</p>
              <FundGrid
                funds={funds}
                snapshots={snapshots}
                rates={rates}
                commodities={commodities}
                stocks={stocks}
                loading={loading}
                marketLoading={marketLoading}
              />
            </div>

            {/* Mobile: tabbed view with cards */}
            <div className="md:hidden">
              <CategoryTabs
                tabs={allTabs}
                selectedCategory={selectedCategory}
                categoryCount={categoryCount}
                onSelect={setSelectedCategory}
                loading={loading}
              />

              {isFundTab && (
                <>
                  <p className="text-[10px] text-muted-foreground -mt-1 mb-3">Yields are gross annual effective rates before 15% withholding tax.</p>

                  <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                       <Input
                        placeholder="Search funds or managers…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9 rounded-lg text-[16px]"
                      />
                    </div>
                  </div>

                  <FundMobileCards
                    funds={processedFunds}
                    snapshots={snapshots}
                    bestYield={bestYield}
                    loading={loading}
                    onClearSearch={clearSearch}
                    hasSearch={!!debouncedSearch.trim()}
                  />

                  <div className="mt-4 rounded-lg bg-muted/40 border border-border/50 p-3">
                    <p className="text-[10px] leading-relaxed text-muted-foreground">
                      {getDisclaimer(selectedCategory as any)}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Currency content - mobile only */}
            {selectedCategory === "fx_rates" && (
              <div className="md:hidden">
                <p className="text-[10px] text-muted-foreground -mt-1 mb-3">Exchange rates are indicative and updated manually by administrators.</p>
                {user ? (
                  <RatesMobileCards rates={rates} loading={marketLoading} />
                ) : (
                  <AuthGate
                    source="currency_tab"
                    title="Sign up to view exchange rates"
                    description="Create a free account to access live currency exchange rates, trends, and our currency converter tool."
                  />
                )}
              </div>
            )}

            {/* Commodities content - mobile only */}
            {selectedCategory === "commodities" && (
              <div className="md:hidden">
                <p className="text-[10px] text-muted-foreground -mt-1 mb-3">Commodity prices are indicative and updated manually by administrators.</p>
                <CommoditiesMobileCards commodities={commodities} loading={marketLoading} />
              </div>
            )}

            {/* Mobile quick actions */}
            <div className="flex items-center gap-2 mt-4 flex-wrap sm:hidden">
              <Button asChild variant="outline" size="sm" className="rounded-lg text-xs h-8">
                <Link to="/calculator"><Calculator className="mr-1.5 h-3.5 w-3.5" /> Calculate Returns</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="rounded-lg text-xs h-8">
                <Link to="/learn">Learn About Funds</Link>
              </Button>
            </div>

            {/* Mobile news + ads */}
            <div className="xl:hidden mt-6 space-y-4">
              <AdBanner placement="in-feed" />
              <NewsSidebar news={latestNews} loading={loading} />
            </div>
          </div>

          {/* Desktop right sidebar */}
          <aside className="hidden xl:block space-y-4">
            <AdBanner placement="sidebar" />
            <NewsSidebar news={latestNews} loading={loading} />
            <AdBanner placement="banner" />
          </aside>
        </div>
      </div>
    </div>
  );
});

Index.displayName = "Index";

export default Index;
