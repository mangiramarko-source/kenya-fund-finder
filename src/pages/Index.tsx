import { useEffect, useState, useCallback } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { fetchFunds, fetchLatestSnapshots, type FundFromDB, type YieldSnapshot } from "@/lib/api";
import { useFundWatchlist } from "@/hooks/useFundWatchlist";
import FundGrid from "@/components/home/FundGrid";
import StatBar from "@/components/home/StatBar";
import SectionLiveStatus from "@/components/SectionLiveStatus";

const Index = () => {
  useDocumentTitle("Funds – Kenya Fund Finder");
  const [funds, setFunds] = useState<FundFromDB[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, YieldSnapshot>>({});
  const [loading, setLoading] = useState(true);
  const { isFavourite, toggle } = useFundWatchlist();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, s] = await Promise.all([fetchFunds(), fetchLatestSnapshots()]);
      setFunds(f);
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
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Unit Trusts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track listed unit trust funds in Kenya.
          <SectionLiveStatus section="funds" fallbackDate={lastUpdate} />
        </p>
      </div>
      <StatBar
        isLive={false}
        lastUpdate={lastUpdate}
        fundCount={published.length}
        bestYield={bestYield}
        avgYield={avgYield}
        loading={loading}
        hideYields={false}
      />
      <FundGrid
        funds={published}
        snapshots={snapshots}
        loading={loading}
        isFavourite={isFavourite}
        onToggleFavourite={toggle}
      />
    </div>
  );
};

export default Index;
