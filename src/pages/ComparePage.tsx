import { useState, useMemo, useEffect } from "react";
import { Filter, TrendingUp, Search, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchFunds, fetchLatestSnapshots, type FundFromDB, type FundType, type YieldSnapshot, FUND_TYPE_LABELS } from "@/lib/api";
import { getDisclaimer } from "@/lib/disclaimers";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveStatus } from "@/hooks/useLiveStatus";
import FundSubTable from "@/components/compare/FundSubTable";

type SortKey = "annual_yield" | "minimum_investment" | "management_fee";

const fundTypes: FundType[] = ["money_market", "fixed_income", "balanced", "equity", "bond"];

const ComparePage = () => {
  useDocumentTitle("Compare Unit Trust Funds – Kenya Fund Comparison", "Side-by-side comparison of Kenya's top unit trust funds by yield, fees, and minimum investment.");
  const [funds, setFunds] = useState<FundFromDB[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, YieldSnapshot>>({});
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("annual_yield");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [managerFilter, setManagerFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeType, setActiveType] = useState<FundType>("money_market");
  const { isLive, lastUpdateDate } = useLiveStatus();

  useEffect(() => {
    Promise.all([fetchFunds(), fetchLatestSnapshots()]).then(([fundsData, snapshotsData]) => {
      setFunds(fundsData);
      const map: Record<string, YieldSnapshot> = {};
      snapshotsData.forEach((s) => { map[s.fund_id] = s; });
      setSnapshots(map);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filteredByType = useMemo(() => funds.filter((f) => f.fund_type === activeType), [funds, activeType]);

  const managers = useMemo(() => [...new Set(filteredByType.map((f) => f.manager))].sort(), [filteredByType]);

  const sorted = useMemo(() => {
    let list = filteredByType;
    if (managerFilter !== "all") list = list.filter((f) => f.manager === managerFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q) || f.manager.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortDir === "desc" ? -diff : diff;
    });
  }, [filteredByType, sortKey, sortDir, managerFilter, searchQuery]);

  const lastUpdated = useMemo(() => {
    if (lastUpdateDate) {
      return new Date(lastUpdateDate + "T00:00:00").toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
    }
    if (filteredByType.length === 0) return null;
    const latest = filteredByType.reduce((max, f) => {
      const d = new Date(f.updated_at);
      return d > max ? d : max;
    }, new Date(0));
    return latest.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
  }, [filteredByType, lastUpdateDate]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    funds.forEach((f) => { counts[f.fund_type] = (counts[f.fund_type] || 0) + 1; });
    return counts;
  }, [funds]);

  // Split sorted funds into percentage and currency groups
  const percentFunds = useMemo(() => sorted.filter((f) => f.yield_unit === "%"), [sorted]);
  const currencyFunds = useMemo(() => sorted.filter((f) => f.yield_unit !== "%"), [sorted]);

  // Best yield in current category for highlighting
  const bestYield = useMemo(() => {
    if (filteredByType.length === 0) return 0;
    return Math.max(...filteredByType.map((f) => f.annual_yield));
  }, [filteredByType]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const handleTypeChange = (val: string) => {
    setActiveType(val as FundType);
    setManagerFilter("all");
    setSearchQuery("");
  };

  if (loading) {
    return (
      <div className="container py-10">
        <Skeleton className="h-9 w-80 mb-2" />
        <Skeleton className="h-5 w-96 mb-6" />
        <Skeleton className="h-10 w-full mb-6" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-bold">Compare Unit Trust Funds</h1>
          {isLive && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold">
              <Radio className="h-3 w-3 animate-pulse" />
              Live · Updated Today
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-sm md:text-base">
          All funds listed are regulated by the Capital Markets Authority of Kenya.
        </p>
      </div>

      {/* Fund type tabs */}
      <Tabs value={activeType} onValueChange={handleTypeChange} className="mb-6">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1 gap-1">
          {fundTypes.map((type) => (
            <TabsTrigger
              key={type}
              value={type}
              className="whitespace-nowrap gap-1.5 px-4 py-2 text-sm data-[state=active]:shadow-sm"
            >
              {FUND_TYPE_LABELS[type]}
              {typeCounts[type] ? (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">
                  {typeCounts[type]}
                </Badge>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-start sm:items-center">
        {lastUpdated && (
          <p className="text-xs text-muted-foreground flex-1">
            Data last updated: <strong>{lastUpdated}</strong> · Yields are gross annual effective rates before 15% withholding tax.
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search fund or manager..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {managers.length > 1 && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={managerFilter} onValueChange={setManagerFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="All Fund Managers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fund Managers</SelectItem>
                {managers.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="text-xs text-muted-foreground self-center hidden sm:block">
          {sorted.length} fund{sorted.length !== 1 ? "s" : ""} shown
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-lg font-medium mb-1">
            {searchQuery ? "No matching funds found" : `No ${FUND_TYPE_LABELS[activeType]}s yet`}
          </p>
          <p className="text-sm">
            {searchQuery ? "Try adjusting your search or filters." : "Check back soon — we're adding more funds regularly."}
          </p>
        </div>
      ) : (
        <>
          {percentFunds.length > 0 && (
            <FundSubTable
              title="Percentage Yields (%)"
              funds={percentFunds}
              snapshots={snapshots}
              sortKey={sortKey}
              sortDir={sortDir}
              toggleSort={toggleSort}
              bestYield={bestYield}
              totalInCategory={filteredByType.length}
            />
          )}
          {currencyFunds.length > 0 && (
            <FundSubTable
              title="Currency Yields (KSh / USD / GBP)"
              funds={currencyFunds}
              snapshots={snapshots}
              sortKey={sortKey}
              sortDir={sortDir}
              toggleSort={toggleSort}
              bestYield={bestYield}
              totalInCategory={filteredByType.length}
            />
          )}

          {/* Summary bar */}
          <div className="hidden md:flex items-center justify-between mt-3 px-2 text-xs text-muted-foreground">
            <span>{sorted.length} fund{sorted.length !== 1 ? "s" : ""} · Sorted by {
              sortKey === "annual_yield" ? "annual rate" : sortKey === "minimum_investment" ? "min. investment" : "mgmt fee"
            } ({sortDir === "desc" ? "highest first" : "lowest first"})</span>
            <span>Click column headers to sort · Click "Details" to view full fund info</span>
          </div>
        </>
      )}

      {/* Disclaimer */}
      <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Disclaimer:</strong> {getDisclaimer(activeType)}
        </p>
      </div>
    </div>
  );
};

export default ComparePage;
