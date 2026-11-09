import { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { PiggyBank, ArrowRight } from "lucide-react";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { fetchFunds, fetchLatestSnapshots, fetchAllFundSnapshots, type FundFromDB, type YieldSnapshot } from "@/lib/api";
import { FALLBACK_KENYAN_FUNDS } from "@/lib/fundDataFallback";
import ResearchLinks from "@/components/ResearchLinks";
import { useFundWatchlist } from "@/hooks/useFundWatchlist";
import { useAuth } from "@/hooks/useAuth";
import FundGrid from "@/components/home/FundGrid";
import FundFavourites from "@/components/home/FundFavourites";
import { fundCache } from "@/lib/fundCache";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import FundBuyerQuestions from "@/components/funds/FundBuyerQuestions";
import MarketPageLoader from "@/components/MarketPageLoader";
import { useMinimumLoadingDuration } from "@/hooks/useMinimumLoadingDuration";

import SectionLiveStatus from "@/components/SectionLiveStatus";
import { useLiveStatus } from "@/hooks/useLiveStatus";
import { getMarketPageMemory, setMarketPageMemory } from "@/lib/marketPageMemory";
import FloatingPageCalculator from "@/components/calculator/FloatingPageCalculator";
import MmfCalculator from "@/components/calculator/MmfCalculator";
import StoriesHeader from "@/components/stories/StoriesHeader";
import LiveMarketWireTicker from "@/components/news/LiveMarketWireTicker";
import ContextualFundNewsCard from "@/components/news/ContextualFundNewsCard";

interface FundsPageMemory {
  funds: FundFromDB[];
  snapshots: Record<string, YieldSnapshot>;
  allSnapshots: Record<string, YieldSnapshot[]>;
}

const Index = () => {
  useDocumentTitle(
    "Money Market Funds in Kenya (2026) – Compare 40 KES & USD Yields",
    "Compare all 40 CMA-regulated Money Market Funds (27 KES & 13 USD) and unit trusts in Kenya by daily yield, annual EAR, net return after tax, management fee, and minimum investment. Updated Mon–Fri.",
    {
      title: "Money Market Funds in Kenya – Compare 40 KES & USD Yields",
      description: "Compare all 40 CMA-regulated Money Market Funds and unit trusts in Kenya by yield, manager, fee, and minimum deposit. Updated Mon–Fri.",
    }
  );
  const [initialPageMemory] = useState(() => getMarketPageMemory<FundsPageMemory>("funds"));
  const [cachedFunds] = useState(() => fundCache.loadFunds());
  const [cachedSnaps] = useState(() => fundCache.loadSnapshots());
  const [cachedAllSnaps] = useState(() => fundCache.loadAllSnapshots());
  const [funds, setFunds] = useState<FundFromDB[]>(() => {
    if (initialPageMemory?.funds && initialPageMemory.funds.length > 0) return initialPageMemory.funds;
    if (cachedFunds?.funds && cachedFunds.funds.length > 0) return cachedFunds.funds;
    return FALLBACK_KENYAN_FUNDS;
  });
  const [snapshots, setSnapshots] = useState<Record<string, YieldSnapshot>>(initialPageMemory?.snapshots ?? cachedSnaps?.snapshots ?? {});
  const [allSnapshots, setAllSnapshots] = useState<Record<string, YieldSnapshot[]>>(initialPageMemory?.allSnapshots ?? cachedAllSnaps?.allSnapshots ?? {});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);
  const [cacheSavedAt, setCacheSavedAt] = useState<number | null>(cachedFunds?.savedAt ?? null);
  const online = useOnlineStatus();
  const { user } = useAuth();
  const { entries: favEntries, isFavourite, toggle } = useFundWatchlist();
  const { sections } = useLiveStatus();

  const load = useCallback(async () => {
    if (!initialPageMemory && !cachedFunds) setLoading(true);
    setLoadError(null);
    try {
      const f = await fetchFunds();
      setFunds(f);

      const [snapshotsResult, allSnapshotsResult] = await Promise.allSettled([
        fetchLatestSnapshots(),
        fetchAllFundSnapshots(),
      ]);

      if (snapshotsResult.status === "fulfilled") {
        const map: Record<string, YieldSnapshot> = {};
        snapshotsResult.value.forEach((snap) => {
          map[snap.fund_id] = snap;
        });
        setSnapshots(map);
        fundCache.saveSnapshots(map);
      } else {
        console.error("Failed to load yield snapshots", snapshotsResult.reason);
        if (cachedSnaps) setSnapshots(cachedSnaps.snapshots);
        else setSnapshots({});
      }

      if (allSnapshotsResult.status === "fulfilled") {
        setAllSnapshots(allSnapshotsResult.value);
        fundCache.saveAllSnapshots(allSnapshotsResult.value);
      } else {
        console.error("Failed to load fund history", allSnapshotsResult.reason);
        if (cachedAllSnaps) setAllSnapshots(cachedAllSnaps.allSnapshots);
        else setAllSnapshots({});
      }

      setUsingCache(false);
      setCacheSavedAt(Date.now());
      fundCache.saveFunds(f);
    } catch (e) {
      console.error("Failed to load funds", e);
      if (cachedFunds) {
        setUsingCache(true);
      } else {
        setFunds([]);
        setLoadError(
          e instanceof Error ? e.message : "Could not load funds. Check Supabase connection and browser console."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [cachedFunds, cachedSnaps, initialPageMemory]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!loading) {
      setMarketPageMemory<FundsPageMemory>("funds", { funds, snapshots, allSnapshots });
    }
  }, [allSnapshots, funds, loading, snapshots]);

  const published = funds.filter((f) => f.is_published);

  const mmfListSchema = useMemo(() => {
    const mmfs = [...published]
      .filter((f) => f.fund_type === "money_market")
      .sort((a, b) => b.annual_yield - a.annual_yield);
    if (mmfs.length === 0) return null;
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Dataset",
          name: "Money Market Funds in Kenya (KES & USD Yields)",
          description:
            "Daily and effective annual yields, management fees, and minimum investments for CMA-regulated Money Market Funds in Kenya.",
          url: "https://kenyafundfinder.com/funds",
          creator: { "@type": "Organization", name: "Kenya Fund Finder", url: "https://kenyafundfinder.com/" },
        },
        {
          "@type": "ItemList",
          name: "Top Money Market Funds in Kenya by Annual Yield",
          numberOfItems: mmfs.length,
          itemListElement: mmfs.slice(0, 40).map((f, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            name: `${f.name} Money Market Fund (${f.manager})`,
            url: `https://kenyafundfinder.com/compare/${encodeURIComponent(f.slug)}`,
          })),
        },
      ],
    };
  }, [published]);

  useJsonLd(mmfListSchema);

  // Strictly derive fund update date from actual published fund fact_sheet_date (or fund section status).
  // Never bleed stock market date or wall-clock date into fund freshness.
  const latestFundTimestamp = published.reduce<number>((maxTs, f) => {
    if (!f.fact_sheet_date) return maxTs;
    const candidate = new Date(`${f.fact_sheet_date}T12:00:00+03:00`).getTime();
    return Number.isFinite(candidate) && candidate > maxTs ? candidate : maxTs;
  }, 0);

  const fundSectionTs = sections.funds?.last_update_date
    ? new Date(`${sections.funds.last_update_date}T12:00:00+03:00`).getTime()
    : 0;
  const bestTimestamp = latestFundTimestamp > 0 ? latestFundTimestamp : (Number.isFinite(fundSectionTs) ? fundSectionTs : 0);
  const lastUpdate = bestTimestamp > 0 ? new Date(bestTimestamp) : null;
  const showLoading = useMinimumLoadingDuration(loading);

  if (showLoading) {
    return (
      <div className="px-4 md:px-6 py-5 md:py-6 min-h-screen">
        <MarketPageLoader message="Loading latest fund data…" />
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-5 md:py-6 space-y-4 animate-in fade-in-50 duration-500">
      <LiveMarketWireTicker />
      <StoriesHeader className="mb-2" />
      <div className="mb-2 md:mb-4">
        {/* Semantic title for A11y & SEO */}
        <h1 className="sr-only">Money Market Funds</h1>

        <div className="md:hidden mb-3 space-y-2">
          <p className="text-sm text-muted-foreground">
            Compare CMA-regulated Money Market Funds and unit trust yields in Kenya.
          </p>
          <div>
            <Link
              to="/savings"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/15 transition-all group"
            >
              <PiggyBank className="h-3.5 w-3.5" />
              <span>Comparing fixed savings? View Bank Deposits & SACCOs</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        <div className="hidden md:flex items-end justify-between gap-6 mb-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-500">Kenyan Investment Funds</p>
            <h1 className="mt-2 text-5xl font-black tracking-tight">Money Market Funds</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">Track listed Money Market, Fixed Income, Bond, Balanced, Equity and Special funds in Kenya.</p>
            <div className="mt-3">
              <Link
                to="/savings"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/15 transition-all group"
              >
                <PiggyBank className="h-3.5 w-3.5" />
                <span>Looking for Bank Fixed Deposits or SACCO Dividends? View Savings Rates</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
          <SectionLiveStatus section="funds" fallbackDate={lastUpdate} isLoading={loading} />
        </div>
      </div>
      {(usingCache || !online) && cacheSavedAt && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
          <span className="font-medium">Cached data shown.</span>{" "}
          <span className="text-muted-foreground">
            Last synced {new Date(cacheSavedAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}.
          </span>
        </div>
      )}
      {loadError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">Failed to load fund data</p>
          <p className="mt-1 text-destructive/90">{loadError}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Confirm <code className="text-foreground">VITE_SUPABASE_URL</code> and{" "}
            <code className="text-foreground">VITE_SUPABASE_PUBLISHABLE_KEY</code> in{" "}
            <code className="text-foreground">.env</code> match your Supabase project dashboard, then restart{" "}
            <code className="text-foreground">npm run dev</code>.
          </p>
        </div>
      )}
      {!loading && !loadError && published.length === 0 && funds.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Funds exist in the database but none are published. Mark funds as published in the admin panel or Supabase
          dashboard.
        </div>
      )}
      {!loading && !loadError && funds.length === 0 && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          No funds found in Supabase (<code className="text-foreground">funds_public</code>). Check your Supabase project
          has published fund rows.
        </div>
      )}
      {user && favEntries.length > 0 && (
        <FundFavourites entries={favEntries} funds={published} snapshots={snapshots} />
      )}
      <FundGrid
        funds={published}
        snapshots={snapshots}
        allSnapshots={allSnapshots}
        loading={loading}
        lastUpdate={lastUpdate}
        isFavourite={user ? isFavourite : undefined}
        onToggleFavourite={user ? toggle : undefined}
      />
      <ContextualFundNewsCard />
      <FundBuyerQuestions />
      <ResearchLinks pillar="mmf" />

      {/* Floating Action Button & Calculator for MMF Returns */}
      <FloatingPageCalculator
        buttonLabel="MMF Calculator"
        title="MMF Calculator"
        description="Estimate net daily compounding returns after 15% withholding tax"
      >
        <MmfCalculator />
      </FloatingPageCalculator>
    </div>
  );
};

export default Index;
