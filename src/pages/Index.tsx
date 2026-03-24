import { useEffect, useState, useMemo, forwardRef } from "react";
import { Link } from "react-router-dom";
import { Calculator, Search, TrendingUp, TrendingDown, Activity, ArrowRight, Newspaper, DollarSign, Gem, LineChart as LineChartIcon } from "lucide-react";
import { useLiveStatus } from "@/hooks/useLiveStatus";
import { useAuth } from "@/hooks/useAuth";
import AuthGate from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fetchFunds, fetchLatestSnapshots, fetchPublishedNews, type FundFromDB, type NewsFromDB, type YieldSnapshot } from "@/lib/api";
import { getDisclaimer } from "@/lib/disclaimers";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { formatYield } from "@/components/YieldChange";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
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

/* ── Hero Stat Card ── */
const HeroCard = ({
  icon: Icon,
  label,
  value,
  subLabel,
  change,
  colorVar,
  to,
}: {
  icon: any;
  label: string;
  value: string;
  subLabel: string;
  change?: number | null;
  colorVar: string;
  to: string;
}) => (
  <Link
    to={to}
    className="relative rounded-xl border border-border bg-card p-4 hover:border-accent/30 transition-all group card-lift overflow-hidden"
  >
    <div className="flex items-center gap-2 mb-3">
      <div
        className="flex items-center justify-center h-8 w-8 rounded-lg"
        style={{ background: `hsl(var(${colorVar}) / 0.12)` }}
      >
        <Icon className="h-4 w-4" style={{ color: `hsl(var(${colorVar}))` }} />
      </div>
      <span className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors">{label}</span>
      <ArrowRight className="h-3 w-3 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
    <p className="text-xl font-heading font-bold text-foreground tabular-nums">{value}</p>
    <div className="flex items-center gap-2 mt-1">
      {change != null && change !== 0 && (
        <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
          change > 0 ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
        }`}>
          {change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {change > 0 ? "+" : ""}{change.toFixed(2)}%
        </span>
      )}
      <span className="text-[11px] text-muted-foreground">{subLabel}</span>
    </div>
  </Link>
);

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
    sameAs: ["https://twitter.com/kaborafundfind", "https://www.facebook.com/kenyafundfinder"],
    contactPoint: { "@type": "ContactPoint", contactType: "customer support", url: "https://kenyafundfinder.com", availableLanguage: "English" },
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
    const mmFunds = funds.filter((f) => f.fund_type === "money_market");
    if (mmFunds.length === 0) return 0;
    return Math.max(...mmFunds.map((f) => f.annual_yield));
  }, [funds]);

  const avgYield = useMemo(() => {
    const mmFunds = funds.filter((f) => f.fund_type === "money_market");
    if (mmFunds.length === 0) return 0;
    return mmFunds.reduce((s, f) => s + f.annual_yield, 0) / mmFunds.length;
  }, [funds]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "name" ? "asc" : "desc"); }
  };

  const clearSearch = () => setSearch("");
  const lastUpdate = showDate && lastUpdateDate ? new Date(lastUpdateDate) : showDate && funds[0] ? new Date(funds[0].updated_at) : null;
  const latestNews = news.slice(0, 4);
  const isMarketTab = MARKET_TABS.includes(selectedCategory as any);
  const isFundTab = !isMarketTab;

  const allTabs = useMemo(() => [
    ...categories.map((c) => ({ key: c, label: categoryLabels[c] || c })),
    { key: "fx_rates", label: "FX Rates" },
    { key: "commodities", label: "Commodities" },
  ], [categories]);

  // Hero card data
  const topFund = useMemo(() => {
    const mm = funds.filter(f => f.fund_type === "money_market").sort((a, b) => b.annual_yield - a.annual_yield);
    return mm[0];
  }, [funds]);

  const topStock = useMemo(() => {
    if (stocks.length === 0) return null;
    return [...stocks].sort((a, b) => b.day_change_percent - a.day_change_percent)[0];
  }, [stocks]);

  const topRate = useMemo(() => {
    if (rates.length === 0) return null;
    return rates[0];
  }, [rates]);

  return (
    <div ref={ref} className="min-h-screen">
      <h1 className="sr-only">Kenya Fund Finder – Compare Investment Funds</h1>

      {/* ── Desktop Dashboard ── */}
      <div className="hidden md:block px-6 py-5">
        {/* Hero stat cards row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {topFund && (
            <HeroCard
              icon={TrendingUp}
              label="Top Money Market"
              value={`${topFund.annual_yield}%`}
              subLabel={`annual yield · ${topFund.name}`}
              change={null}
              colorVar="--cat-money-market"
              to={`/compare/${topFund.slug}`}
            />
          )}
          {topStock && (
            <HeroCard
              icon={LineChartIcon}
              label="Top Mover · NSE"
              value={`KES ${topStock.price.toFixed(2)}`}
              subLabel={topStock.name}
              change={topStock.day_change_percent}
              colorVar="--cat-stocks"
              to="/stocks"
            />
          )}
          {topRate && (
            <HeroCard
              icon={DollarSign}
              label={`${topRate.currency_code}/KES`}
              value={topRate.rate.toFixed(2)}
              subLabel={topRate.currency_name}
              change={topRate.previous_rate ? ((topRate.rate - topRate.previous_rate) / topRate.previous_rate * 100) : null}
              colorVar="--cat-fx"
              to="/rates"
            />
          )}
        </div>

        {/* Main content + Right sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
          {/* Main area */}
          <div>
            {/* Update info bar */}
            <div className="flex items-center gap-3 mb-4">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="inline-block h-1 w-1 rounded-full bg-accent/60" />
                {lastUpdate
                  ? `Updated ${lastUpdate.toLocaleDateString("en-KE", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}`
                  : "CMA-regulated unit trusts"}
                <span className="text-muted-foreground/40 mx-1">·</span>
                Yields are gross annual effective rates before 15% withholding tax.
              </p>
            </div>

            {/* Fund Grid */}
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

          {/* Right sidebar panel */}
          <aside className="hidden xl:flex flex-col gap-4">
            {/* Market Summary Card */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-accent" />
                <h3 className="text-xs font-bold uppercase tracking-wide">Market Summary</h3>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Best Yield</p>
                  <p className="text-sm font-bold text-accent tabular-nums">{bestYield ? `${bestYield}%` : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Avg Yield</p>
                  <p className="text-sm font-bold text-foreground tabular-nums">{avgYield ? `${avgYield.toFixed(2)}%` : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Funds</p>
                  <p className="text-sm font-bold text-foreground tabular-nums">{funds.length}</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-xs font-bold uppercase tracking-wide mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" size="sm" className="text-[11px] h-9 rounded-lg justify-start">
                  <Link to="/calculator"><Calculator className="mr-1.5 h-3.5 w-3.5 text-accent" /> Calculator</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="text-[11px] h-9 rounded-lg justify-start">
                  <Link to="/compare"><TrendingUp className="mr-1.5 h-3.5 w-3.5 text-accent" /> Compare</Link>
                </Button>
              </div>
            </div>

            <AdBanner placement="sidebar" />
            <NewsSidebar news={latestNews} loading={loading} />
            <AdBanner placement="banner" />
          </aside>
        </div>
      </div>

      {/* ── Mobile: existing tabbed view ── */}
      <div className="md:hidden">
        {/* StatBar for mobile */}
        <div className="border-b border-border bg-card">
          <div className="container py-2.5 flex items-center gap-2">
            {isLive && (
              <div className="flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 px-2 py-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
                </span>
                <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">Live</span>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              {lastUpdate
                ? `Updated ${lastUpdate.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}`
                : "CMA-regulated unit trusts"}
            </p>
          </div>
        </div>

        <div className="container py-4">
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

          {selectedCategory === "fx_rates" && (
            <div>
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

          {selectedCategory === "commodities" && (
            <div>
              <p className="text-[10px] text-muted-foreground -mt-1 mb-3">Commodity prices are indicative and updated manually by administrators.</p>
              <CommoditiesMobileCards commodities={commodities} loading={marketLoading} />
            </div>
          )}

          <div className="flex items-center gap-2 mt-4 flex-wrap sm:hidden">
            <Button asChild variant="outline" size="sm" className="rounded-lg text-xs h-8">
              <Link to="/calculator"><Calculator className="mr-1.5 h-3.5 w-3.5" /> Calculate Returns</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-lg text-xs h-8">
              <Link to="/learn">Learn About Funds</Link>
            </Button>
          </div>

          <div className="xl:hidden mt-6 space-y-4">
            <AdBanner placement="in-feed" />
            <NewsSidebar news={latestNews} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
});

Index.displayName = "Index";

export default Index;
