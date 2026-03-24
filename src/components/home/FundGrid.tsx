import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpDown, ArrowDown, ArrowUp, Search, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import YieldChange from "@/components/YieldChange";
import type { FundFromDB, YieldSnapshot } from "@/lib/api";

type SortKey = "annual_yield" | "daily_yield" | "name" | "minimum_investment" | "management_fee";
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

interface FundGridProps {
  funds: FundFromDB[];
  snapshots: Record<string, YieldSnapshot>;
  loading: boolean;
}

const SortHeader = ({
  label,
  field,
  sortKey,
  sortDir,
  onToggleSort,
  className = "",
}: {
  label: string;
  field: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onToggleSort: (key: SortKey) => void;
  className?: string;
}) => {
  const isActive = sortKey === field;
  return (
    <button
      onClick={() => onToggleSort(field)}
      className={`inline-flex items-center gap-1 font-semibold hover:text-accent transition-colors ${className}`}
    >
      {label}
      {isActive ? (
        sortDir === "desc" ? <ArrowDown className="h-3 w-3 text-accent" /> : <ArrowUp className="h-3 w-3 text-accent" />
      ) : (
        <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />
      )}
    </button>
  );
};

/* ─── Yield Bar ─── */
const YieldBar = ({ value, max }: { value: number; max: number }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-8 h-2.5 rounded-full bg-muted/60 overflow-hidden">
      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
};

/* ─── Skeleton ─── */
const TableSkeleton = () => (
  <div className="space-y-6">
    <div className="flex gap-1.5 pb-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-28 rounded-full" />
      ))}
    </div>
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <div className="bg-muted/40 px-5 py-3">
        <div className="flex gap-6">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16 ml-auto" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 px-5 py-4 border-t border-border/40">
          <Skeleton className="h-4 w-5" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <colgroup>
              <col className="w-[3%]" />
              <col className="w-[14%]" />
              <col className="w-[16%]" />
              <col className="w-[11%]" />
              <col className="w-[13%]" />
              <col className="w-[9%]" />
              <col className="w-[10%]" />
              <col className="w-[7%]" />
              <col className="w-[11%]" />
              <col className="w-[6%]" />
            </colgroup>
            <thead>
              <tr className="bg-muted/40 text-[11px]">
                <th className="text-left pl-4 pr-2 py-3 font-semibold text-muted-foreground">#</th>
                <th className="text-left px-3 py-3">
                  <SortHeader label="Fund Name" field="name" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} />
                </th>
                <th className="text-left px-3 py-3 font-semibold text-muted-foreground">Manager</th>
                <th className="text-right px-3 py-3">
                  <SortHeader label="Daily Yield" field="daily_yield" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} className="justify-end" />
                </th>
                <th className="text-right px-3 py-3">
                  <SortHeader label="Annual Rate" field="annual_yield" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} className="justify-end" />
                </th>
                <th className="text-right px-3 py-3 font-semibold text-muted-foreground">Change</th>
                <th className="text-right px-3 py-3">
                  <SortHeader label="Min. Investment" field="minimum_investment" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} className="justify-end" />
                </th>
                <th className="text-right px-3 py-3">
                  <SortHeader label="Mgmt Fee" field="management_fee" sortKey={sortKey} sortDir={sortDir} onToggleSort={toggleSort} className="justify-end" />
                </th>
                <th className="text-left px-3 py-3 font-semibold text-muted-foreground">Withdrawal</th>
                <th className="text-right pr-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((fund, i) => (
                <tr
                  key={fund.id}
                  onClick={() => navigate(`/compare/${fund.slug}`)}
                  className="border-t border-border/40 hover:bg-accent/5 transition-colors cursor-pointer group"
                >
                  <td className="pl-4 pr-2 py-4 text-muted-foreground/50 text-xs tabular-nums">{i + 1}</td>
                  <td className="px-3 py-4">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-foreground group-hover:text-accent transition-colors truncate" title={fund.name}>
                        {fund.name}
                      </span>
                      {fund.annual_yield === bestYield && bestYield > 0 && (
                        <Badge className="text-[8px] px-1.5 py-0 h-4 bg-accent text-accent-foreground shrink-0 gap-0.5">
                          ☆ Top
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-xs text-muted-foreground truncate max-w-[160px]" title={fund.manager}>
                    {fund.manager}
                  </td>
                  <td className="px-3 py-4 text-right">
                    <span className="text-sm tabular-nums text-foreground">{fmtYield(fund.daily_yield, fund.yield_unit)}</span>
                    <div className="mt-0.5">
                      {snapshots[fund.id] ? (
                        <YieldChange
                          current={fund.daily_yield}
                          previous={snapshots[fund.id]?.daily_yield}
                          unit={fund.yield_unit}
                          className="text-[10px] justify-end"
                        />
                      ) : (
                        <span className="text-[10px] text-muted-foreground/50">— 0%</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <YieldBar value={fund.annual_yield} max={bestYield} />
                      <span className="font-bold text-accent text-base tabular-nums">
                        {fmtYield(fund.annual_yield, fund.yield_unit)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-right whitespace-nowrap">
                    {snapshots[fund.id] ? (
                      <YieldChange
                        current={fund.annual_yield}
                        previous={snapshots[fund.id]?.annual_yield}
                        unit={fund.yield_unit}
                        className="text-xs justify-end"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground/50">— 0%</span>
                    )}
                  </td>
                  <td className="px-3 py-4 text-right text-xs tabular-nums font-medium text-foreground whitespace-nowrap">
                    KES {fund.minimum_investment.toLocaleString()}
                  </td>
                  <td className="px-3 py-4 text-right text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                    {fund.management_fee}%
                  </td>
                  <td className="px-3 py-4 text-left text-xs text-muted-foreground whitespace-nowrap">
                    {fund.withdrawal_time || "—"}
                  </td>
                  <td className="pr-4 py-4 text-right">
                    <Link
                      to={`/compare/${fund.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-accent hover:text-accent/80 text-xs font-semibold inline-flex items-center gap-0.5 transition-colors"
                    >
                      Details <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-14">
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
