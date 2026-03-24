import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpDown, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import YieldChange from "@/components/YieldChange";
import type { FundFromDB, YieldSnapshot } from "@/lib/api";

type SortKey = "annual_yield" | "daily_yield" | "name";
type SortDir = "asc" | "desc";

const categoryLabels: Record<string, string> = {
  money_market: "Money Market",
  fixed_income: "Fixed Income",
  balanced: "Balanced",
  equity: "Equity",
  bond: "Bond",
};

const categoryOrder = ["money_market", "fixed_income", "bond", "balanced", "equity"];

const fmtYield = (value: number, unit: string) => {
  if (unit === "%") return `${value}%`;
  return value.toFixed(2);
};

const currencyLabel = (unit: string) => {
  if (unit === "%") return "%";
  if (unit === "KES") return "KSh";
  return unit;
};

interface FundGridProps {
  funds: FundFromDB[];
  snapshots: Record<string, YieldSnapshot>;
  loading: boolean;
}

const SortHeader = ({
  label,
  field,
  sortKey,
  onToggleSort,
  className = "",
}: {
  label: string;
  field: SortKey;
  sortKey: SortKey;
  onToggleSort: (key: SortKey) => void;
  className?: string;
}) => (
  <button
    onClick={() => onToggleSort(field)}
    className={`inline-flex items-center gap-1 font-semibold hover:text-accent transition-colors ${className}`}
  >
    {label}
    <ArrowUpDown className={`h-3 w-3 ${sortKey === field ? "text-accent" : "text-muted-foreground/50"}`} />
  </button>
);

/* ─── Skeleton ─── */
const TableSkeleton = () => (
  <div className="space-y-6">
    {/* Tab skeleton */}
    <div className="flex gap-1 border-b border-border pb-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-28 rounded-t-lg" />
      ))}
    </div>
    {/* Table skeleton */}
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <div className="bg-muted/70 px-5 py-3">
        <div className="flex gap-6">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-20 ml-auto" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 px-5 py-3.5 border-t border-border">
          <Skeleton className="h-4 w-5" />
          <div className="flex-1">
            <Skeleton className="h-4 w-44 mb-1" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  </div>
);

const FundGrid = ({ funds, snapshots, loading }: FundGridProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("money_market");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("annual_yield");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const categories = useMemo(() => {
    const present = [...new Set(funds.map((f) => f.fund_type))];
    return present.sort((a, b) => {
      const ai = categoryOrder.indexOf(a);
      const bi = categoryOrder.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [funds]);

  const categoryCount = useMemo(() => {
    const counts: Record<string, number> = {};
    funds.forEach((f) => {
      counts[f.fund_type] = (counts[f.fund_type] || 0) + 1;
    });
    return counts;
  }, [funds]);

  const filtered = useMemo(() => {
    let result = funds.filter((f) => f.fund_type === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (f) => f.name.toLowerCase().includes(q) || f.manager.toLowerCase().includes(q)
      );
    }
    result = [...result].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return mul * a.name.localeCompare(b.name);
      return mul * ((a[sortKey] as number) - (b[sortKey] as number));
    });
    return result;
  }, [funds, activeTab, search, sortKey, sortDir]);

  const bestYield = useMemo(() => {
    const catFunds = funds.filter((f) => f.fund_type === activeTab);
    if (catFunds.length === 0) return 0;
    return Math.max(...catFunds.map((f) => f.annual_yield));
  }, [funds, activeTab]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      {/* Category tabs + search */}
      <div className="flex items-end justify-between gap-4">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setActiveTab(cat);
                  setSearch("");
                  setSortKey("annual_yield");
                  setSortDir("desc");
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  activeTab === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {categoryLabels[cat] || cat}
                <span className={`ml-1.5 tabular-nums text-[10px] ${
                  activeTab === cat ? "text-primary-foreground/70" : "text-muted-foreground/60"
                }`}>
                  {categoryCount[cat] || 0}
                </span>
              </button>
            ))}
        </div>

        <div className="relative w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search funds or managers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-xs rounded-lg bg-muted/30 border-border"
          />
        </div>
      </div>

      {/* Fund table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <colgroup>
            <col style={{ width: "3%" }} />
            <col style={{ width: "38%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "9%" }} />
          </colgroup>
          <thead>
            <tr className="bg-muted/70 text-xs">
              <th className="text-left pl-5 pr-2 py-3 font-semibold text-muted-foreground">#</th>
              <th className="text-left px-3 py-3">
                <SortHeader label="Fund Name" field="name" sortKey={sortKey} onToggleSort={toggleSort} />
              </th>
              <th className="text-center px-2 py-3 font-semibold text-muted-foreground">Unit</th>
              <th className="text-right px-3 py-3">
                <SortHeader label="Daily Yield" field="daily_yield" sortKey={sortKey} onToggleSort={toggleSort} className="justify-end" />
              </th>
              <th className="text-right px-3 py-3">
                <SortHeader label="Annual Rate" field="annual_yield" sortKey={sortKey} onToggleSort={toggleSort} className="justify-end" />
              </th>
              <th className="text-right px-3 py-3 font-semibold text-muted-foreground">Change</th>
              <th className="text-right pr-5 pl-2 py-3 font-semibold text-muted-foreground">Manager</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((fund, i) => (
              <tr
                key={fund.id}
                onClick={() => navigate(`/compare/${fund.slug}`)}
                className="border-t border-border hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <td className="pl-5 pr-2 py-3 text-muted-foreground text-xs tabular-nums">{i + 1}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Link
                      to={`/compare/${fund.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold text-foreground hover:text-accent transition-colors truncate"
                      title={fund.name}
                    >
                      {fund.name}
                    </Link>
                    {fund.annual_yield === bestYield && bestYield > 0 && (
                      <Badge
                        variant="default"
                        className="text-[8px] px-1.5 py-0 h-4 bg-accent text-accent-foreground shrink-0"
                      >
                        TOP
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-2 py-3 text-center text-xs font-medium text-muted-foreground">
                  {currencyLabel(fund.yield_unit)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap text-muted-foreground">
                  {fmtYield(fund.daily_yield, fund.yield_unit)}
                </td>
                <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">
                  <span className="font-bold text-accent text-base">
                    {fmtYield(fund.annual_yield, fund.yield_unit)}
                  </span>
                </td>
                <td className="px-3 py-3 text-right whitespace-nowrap">
                  {snapshots[fund.id] ? (
                    <YieldChange
                      current={fund.annual_yield}
                      previous={snapshots[fund.id]?.annual_yield}
                      unit={fund.yield_unit}
                      className="text-xs justify-end"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="pr-5 pl-2 py-3 text-right text-xs text-muted-foreground truncate max-w-[120px]" title={fund.manager}>
                  {fund.manager}
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-14">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-2xl">📊</span>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">No funds match your filters</p>
                    {search.trim() && (
                      <button
                        onClick={() => setSearch("")}
                        className="text-xs text-accent hover:text-accent/80 font-medium transition-colors"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Showing {filtered.length} of {categoryCount[activeTab] || 0} {categoryLabels[activeTab] || activeTab} funds
        </span>
        <Link
          to={`/compare?type=${activeTab}`}
          className="text-accent hover:text-accent/80 font-medium transition-colors"
        >
          View all & compare →
        </Link>
      </div>
    </div>
  );
};

export default FundGrid;
