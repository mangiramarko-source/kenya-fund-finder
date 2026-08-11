import { useEffect, useState, useCallback } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { fetchFunds, fetchLatestSnapshots, fetchAllFundSnapshots, type FundFromDB, type YieldSnapshot } from "@/lib/api";
import { useFundWatchlist } from "@/hooks/useFundWatchlist";
import { useAuth } from "@/hooks/useAuth";
import FundGrid from "@/components/home/FundGrid";
import FundFavourites from "@/components/home/FundFavourites";
import { fundCache } from "@/lib/fundCache";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

import SectionLiveStatus from "@/components/SectionLiveStatus";
import { useLiveStatus } from "@/hooks/useLiveStatus";

const Index = () => {
  useDocumentTitle(
    "Unit Trust Funds in Kenya – Compare Yields | Kenya Fund Finder",
    "Compare CMA-regulated unit trusts and money market funds in Kenya by yield, manager, and minimum investment. Updated daily.",
    {
      title: "Unit Trust Funds in Kenya – Compare Yields",
      description: "Compare CMA-regulated unit trusts and MMFs in Kenya by yield, manager, and minimum investment. Updated daily.",
    }
  );
  const [cachedFunds] = useState(() => fundCache.loadFunds());
  const [cachedSnaps] = useState(() => fundCache.loadSnapshots());
  const [funds, setFunds] = useState<FundFromDB[]>(cachedFunds?.funds ?? []);
  const [snapshots, setSnapshots] = useState<Record<string, YieldSnapshot>>(cachedSnaps?.snapshots ?? {});
  const [allSnapshots, setAllSnapshots] = useState<Record<string, YieldSnapshot[]>>({});
  const [loading, setLoading] = useState(!cachedFunds);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);
  const [cacheSavedAt, setCacheSavedAt] = useState<number | null>(cachedFunds?.savedAt ?? null);
  const online = useOnlineStatus();
  const { user } = useAuth();
  const { entries: favEntries, isFavourite, toggle } = useFundWatchlist();
  const { lastUpdateDate } = useLiveStatus();

  const load = useCallback(async () => {
    if (!cachedFunds) setLoading(true);
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
      } else {
        console.error("Failed to load fund history", allSnapshotsResult.reason);
        setAllSnapshots({});
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
  }, [cachedFunds, cachedSnaps]);

  useEffect(() => { load(); }, [load]);

  const published = funds.filter((f) => f.is_published);

  const lastUpdate = lastUpdateDate 
    ? new Date(lastUpdateDate) 
    : null;

  return (
    <div className="space-y-4 px-4 md:px-6 py-4 md:py-6">
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4 md:mb-6">
          <div>
            <h1 className="text-2xl md:text-2xl font-bold text-foreground tracking-tight">Unit Trusts</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track listed unit trust funds in Kenya.
            </p>
          </div>
          <div className="hidden md:block">
            <SectionLiveStatus section="funds" fallbackDate={lastUpdate} isLoading={loading} />
          </div>
        </div>
        <div className="md:hidden mb-2">
          <div className="flex items-center justify-between w-full">
            <SectionLiveStatus section="funds" fallbackDate={lastUpdate} isLoading={loading} />
          </div>
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
        isFavourite={user ? isFavourite : undefined}
        onToggleFavourite={user ? toggle : undefined}
      />
    </div>
  );
};

export default Index;
