import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, ArrowUp, ArrowDown, Filter, Trophy, TrendingUp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchFunds, type FundFromDB, type FundType, FUND_TYPE_LABELS } from "@/lib/api";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type SortKey = "annual_yield" | "minimum_investment" | "management_fee";

const fundTypes: FundType[] = ["money_market", "fixed_income", "balanced", "equity", "bond"];

const ComparePage = () => {
  useDocumentTitle("Compare Unit Trust Funds – Kenya Fund Comparison", "Side-by-side comparison of Kenya's top unit trust funds by yield, fees, and minimum investment.");
  const [funds, setFunds] = useState<FundFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("annual_yield");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [managerFilter, setManagerFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeType, setActiveType] = useState<FundType>("money_market");

  useEffect(() => {
    fetchFunds().then((data) => { setFunds(data); setLoading(false); }).catch(() => setLoading(false));
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
    if (filteredByType.length === 0) return null;
    const latest = filteredByType.reduce((max, f) => {
      const d = new Date(f.updated_at);
      return d > max ? d : max;
    }, new Date(0));
    return latest.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
  }, [filteredByType]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    funds.forEach((f) => { counts[f.fund_type] = (counts[f.fund_type] || 0) + 1; });
    return counts;
  }, [funds]);

  // Best yield in current category for highlighting
  const bestYield = useMemo(() => {
    if (filteredByType.length === 0) return 0;
    return Math.max(...filteredByType.map((f) => f.annual_yield));
  }, [filteredByType]);

  // Yield range for visual bar
  const yieldRange = useMemo(() => {
    if (filteredByType.length === 0) return { min: 0, max: 1 };
    const yields = filteredByType.map((f) => f.annual_yield);
    return { min: Math.min(...yields), max: Math.max(...yields) };
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

  const SortIcon = ({ field }: { field: SortKey }) => {
    if (sortKey !== field) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
    return sortDir === "desc"
      ? <ArrowDown className="h-3 w-3 text-accent" />
      : <ArrowUp className="h-3 w-3 text-accent" />;
  };

  const SortBtn = ({ label, field }: { label: string; field: SortKey }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`flex items-center gap-1 font-semibold transition-colors ${sortKey === field ? "text-accent" : "hover:text-accent"}`}
    >
      {label} <SortIcon field={field} />
    </button>
  );

  const yieldBarWidth = (yield_: number) => {
    if (yieldRange.max === yieldRange.min) return 100;
    return Math.max(15, ((yield_ - yieldRange.min) / (yieldRange.max - yieldRange.min)) * 100);
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
        <h1 className="text-2xl md:text-3xl font-bold mb-1">Compare Unit Trust Funds</h1>
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
          {/* Desktop / Tablet table */}
          <div className="hidden md:block rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/70 border-b border-border">
                    <th className="text-left px-5 py-3.5 font-semibold w-[3%]">#</th>
                    <th className="text-left px-4 py-3.5 font-semibold">Fund Name</th>
                    <th className="text-left px-4 py-3.5 font-semibold hidden lg:table-cell">Manager</th>
                    <th className="text-right px-4 py-3.5 font-semibold hidden lg:table-cell">Daily Yield</th>
                    <th className="text-right px-4 py-3.5 min-w-[180px]">
                      <SortBtn label="Annual Rate" field="annual_yield" />
                    </th>
                    <th className="text-right px-4 py-3.5">
                      <SortBtn label="Min. Investment" field="minimum_investment" />
                    </th>
                    <th className="text-right px-4 py-3.5">
                      <SortBtn label="Mgmt Fee" field="management_fee" />
                    </th>
                    <th className="text-left px-4 py-3.5 font-semibold hidden lg:table-cell">Withdrawal</th>
                    <th className="px-4 py-3.5 w-[70px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((fund, i) => {
                    const isBest = fund.annual_yield === bestYield && filteredByType.length > 1;
                    return (
                      <tr
                        key={fund.id}
                        className={`border-t border-border transition-colors hover:bg-accent/5 ${
                          isBest ? "bg-accent/[0.03]" : i % 2 === 0 ? "bg-card" : "bg-muted/20"
                        }`}
                      >
                        <td className="px-5 py-3.5 text-xs text-muted-foreground font-medium">{i + 1}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{fund.name}</span>
                            {isBest && (
                              <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px] gap-0.5 h-5 px-1.5">
                                <Trophy className="h-2.5 w-2.5" /> Top
                              </Badge>
                            )}
                          </div>
                          {/* Show manager on tablet when lg column is hidden */}
                          <p className="text-xs text-muted-foreground mt-0.5 lg:hidden">{fund.manager}</p>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{fund.manager}</td>
                        <td className="px-4 py-3.5 text-right text-muted-foreground tabular-nums hidden lg:table-cell">
                          {fund.daily_yield}%
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <div className="hidden xl:block w-20 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-accent/60 transition-all"
                                style={{ width: `${yieldBarWidth(fund.annual_yield)}%` }}
                              />
                            </div>
                            <span className={`font-bold tabular-nums ${isBest ? "text-accent" : "text-accent/80"}`}>
                              {fund.annual_yield}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums">
                          KES {fund.minimum_investment.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums">{fund.management_fee}%</td>
                        <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell">{fund.withdrawal_time}</td>
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            to={`/compare/${fund.slug}`}
                            className="inline-flex items-center gap-1 text-accent hover:text-accent/80 text-xs font-semibold transition-colors"
                          >
                            Details <span className="text-sm">→</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary bar below table */}
          <div className="hidden md:flex items-center justify-between mt-3 px-2 text-xs text-muted-foreground">
            <span>{sorted.length} fund{sorted.length !== 1 ? "s" : ""} · Sorted by {
              sortKey === "annual_yield" ? "annual rate" : sortKey === "minimum_investment" ? "min. investment" : "mgmt fee"
            } ({sortDir === "desc" ? "highest first" : "lowest first"})</span>
            <span>Click column headers to sort · Click "Details" to view full fund info</span>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {sorted.map((fund, i) => {
              const isBest = fund.annual_yield === bestYield && filteredByType.length > 1;
              return (
                <Link
                  key={fund.id}
                  to={`/compare/${fund.slug}`}
                  className={`block rounded-xl border bg-card p-4 hover:shadow-md transition-all ${
                    isBest ? "border-accent/30 shadow-sm" : "border-border"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold truncate">{fund.name}</h3>
                        {isBest && (
                          <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px] gap-0.5 shrink-0">
                            <Trophy className="h-2.5 w-2.5" /> Top
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{fund.manager}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-accent font-bold text-xl">{fund.annual_yield}%</span>
                      <p className="text-[10px] text-muted-foreground">annual</p>
                    </div>
                  </div>
                  {/* Yield bar mobile */}
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full bg-accent/50 transition-all"
                      style={{ width: `${yieldBarWidth(fund.annual_yield)}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span className="block font-medium text-foreground text-[11px]">Daily Yield</span>
                      {fund.daily_yield}%
                    </div>
                    <div>
                      <span className="block font-medium text-foreground text-[11px]">Min. Invest</span>
                      KES {fund.minimum_investment.toLocaleString()}
                    </div>
                    <div>
                      <span className="block font-medium text-foreground text-[11px]">Fee</span>
                      {fund.management_fee}%
                    </div>
                    <div>
                      <span className="block font-medium text-foreground text-[11px]">Withdrawal</span>
                      {fund.withdrawal_time}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* Disclaimer */}
      <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Disclaimer:</strong> Yields shown are gross annual effective rates before the 15% withholding tax. Past performance is not indicative of future results. Data is sourced from publicly available fund fact sheets and may not reflect real-time values. This platform does not offer investment advice. Please consult a licensed financial advisor before making investment decisions.
        </p>
      </div>
    </div>
  );
};

export default ComparePage;
