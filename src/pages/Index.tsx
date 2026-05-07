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

const Index = () => {
  useDocumentTitle("Funds – Kenya Fund Finder");
  // Hydrate immediately from last-known cache so the page is never blank when offline.
  const cachedFunds = fundCache.loadFunds();
  const cachedSnaps = fundCache.loadSnapshots();
  const [funds, setFunds] = useState<FundFromDB[]>(cachedFunds?.funds ?? []);
  const [snapshots, setSnapshots] = useState<Record<string, YieldSnapshot>>(cachedSnaps?.snapshots ?? {});
  const [allSnapshots, setAllSnapshots] = useState<Record<string, YieldSnapshot[]>>({});
  const [loading, setLoading] = useState(!cachedFunds);
  const [usingCache, setUsingCache] = useState(false);
  const [cacheSavedAt, setCacheSavedAt] = useState<number | null>(cachedFunds?.savedAt ?? null);
  const online = useOnlineStatus();
  const { user } = useAuth();
  const { entries: favEntries, isFavourite, toggle } = useFundWatchlist();

  const load = useCallback(async () => {
    if (!cachedFunds) setLoading(true);
    try {
      // Critical path: funds + latest snapshots → renders the table.
      const [f, s] = await Promise.all([fetchFunds(), fetchLatestSnapshots()]);
      setFunds(f);
      const map: Record<string, YieldSnapshot> = {};
      s.forEach((snap) => { map[snap.fund_id] = snap; });
      setSnapshots(map);
      setUsingCache(false);
      setCacheSavedAt(Date.now());
      setLoading(false);
      fundCache.saveFunds(f);
      fundCache.saveSnapshots(map);

      // Deferred: sparkline history loads in the background after the table is visible.
      fetchAllFundSnapshots()
        .then(setAllSnapshots)
        .catch((e) => console.error("Failed to load sparkline data", e));
    } catch (e) {
      console.error("Failed to load funds", e);
      // If we have cached data, keep showing it and flag staleness.
      if (cachedFunds) setUsingCache(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const published = funds.filter((f) => f.is_published);
  const bestYield = published.length ? Math.max(...published.map((f) => f.annual_yield)) : 0;
  const avgYield = published.length
    ? published.reduce((a, f) => a + f.annual_yield, 0) / published.length
    : 0;

  const lastUpdate = published.length
    ? new Date(Math.max(...published.map((f) => new Date(f.updated_at).getTime())))
    : null;

  return (
    <div className="space-y-4 px-4 md:px-6 py-4 md:py-6">
      <div>
        <div className="hidden md:flex flex-row items-end justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Unit Trusts</h1>
            <p className="text-sm text-muted-foreground md:mt-1">
              Track listed unit trust funds in Kenya.
            </p>
          </div>
          <SectionLiveStatus section="funds" fallbackDate={lastUpdate} />
        </div>
        <div className="md:hidden flex items-center justify-between w-full">
          <span className="text-xs text-muted-foreground/70">Updated {lastUpdate?.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}</span>
          <SectionLiveStatus section="funds" fallbackDate={lastUpdate} hideDate />
        </div>
        <div className="md:hidden border-b border-border mt-3" />
      </div>
      {(usingCache || !online) && cacheSavedAt && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-foreground">
          <span className="font-medium">Cached data shown.</span>{" "}
          <span className="text-muted-foreground">
            Last synced {new Date(cacheSavedAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}.
          </span>
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
