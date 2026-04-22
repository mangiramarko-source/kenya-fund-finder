import { useEffect, useState, useCallback } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { fetchFunds, fetchLatestSnapshots, fetchAllFundSnapshots, type FundFromDB, type YieldSnapshot } from "@/lib/api";
import { useFundWatchlist } from "@/hooks/useFundWatchlist";
import FundGrid from "@/components/home/FundGrid";

import SectionLiveStatus from "@/components/SectionLiveStatus";

const Index = () => {
  useDocumentTitle("Funds – Kenya Fund Finder");
  const [funds, setFunds] = useState<FundFromDB[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, YieldSnapshot>>({});
  const [allSnapshots, setAllSnapshots] = useState<Record<string, YieldSnapshot[]>>({});
  const [loading, setLoading] = useState(true);
  const { isFavourite, toggle } = useFundWatchlist();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, s, as] = await Promise.all([fetchFunds(), fetchLatestSnapshots(), fetchAllFundSnapshots()]);
      setFunds(f);
      setAllSnapshots(as);
      const map: Record<string, YieldSnapshot> = {};
      s.forEach((snap) => { map[snap.fund_id] = snap; });
      setSnapshots(map);
    } catch (e) {
      console.error("Failed to load funds", e);
    } finally {
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
        <div className="hidden md:flex items-start justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Unit Trusts</h1>
            <p className="text-sm text-muted-foreground md:mt-1">
              Track listed unit trust funds in Kenya.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <SectionLiveStatus section="funds" fallbackDate={lastUpdate} hideDate />
            <span className="text-xs text-muted-foreground/70">Updated {lastUpdate?.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}</span>
          </div>
        </div>
        <div className="md:hidden flex items-center justify-between w-full">
          <span className="text-xs text-muted-foreground/70">Updated {lastUpdate?.toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}</span>
          <SectionLiveStatus section="funds" fallbackDate={lastUpdate} hideDate />
        </div>
        <div className="md:hidden border-b border-border mt-3" />
      </div>
      <FundGrid
        funds={published}
        snapshots={snapshots}
        allSnapshots={allSnapshots}
        loading={loading}
        isFavourite={isFavourite}
        onToggleFavourite={toggle}
      />
    </div>
  );
};

export default Index;
