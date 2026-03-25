import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpDown, Search, TrendingUp, BarChart3, Layers, Tag } from "lucide-react";
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

const currencyLabel = (unit: string) => {
  if (unit === "%") return "%";
  if (unit === "KES") return "KSh";
  return unit;
};

interface FundGridProps {
  funds: FundFromDB[];
  snapshots: Record<string, YieldSnapshot>;
  allSnapshots?: Record<string, YieldSnapshot[]>;
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

/* ─── Sparkline ─── */
const SPARK_W = 100;
const SPARK_H = 32;

const Sparkline = ({ data, currentValue }: { data: YieldSnapshot[]; currentValue: number }) => {
  const { points, isUp } = useMemo(() => {
    const vals = [...data.map((d) => d.annual_yield), currentValue];
    if (vals.length < 2) return { points: null, isUp: true };
    const last8 = vals.slice(-8);
    const min = Math.min(...last8);
    const max = Math.max(...last8);
    const range = max - min || 1;
    const pad = 2;
    const pts = last8.map((v, i) => ({
      x: pad + (i / (last8.length - 1)) * (SPARK_W - pad * 2),
      y: pad + (1 - (v - min) / range) * (SPARK_H - pad * 2),
    }));
    return { points: pts, isUp: pts[pts.length - 1].y <= pts[0].y };
  }, [data, currentValue]);

  if (!points) return <span className="text-[10px] text-muted-foreground">—</span>;

  const color = isUp ? "hsl(var(--accent))" : "hsl(var(--destructive))";
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaD = pathD + ` L${points[points.length - 1].x},${SPARK_H} L${points[0].x},${SPARK_H} Z`;
  const gradId = isUp ? "sg-up" : "sg-dn";

  return (
    <svg width={SPARK_W} height={SPARK_H} viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} className="inline-block">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2.5" fill={color} />
    </svg>
  );
};

/* ─── Skeleton ─── */
const TableSkeleton = () => (
  <div className="space-y-6">
    <div className="flex gap-1 border-b border-border pb-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-28 rounded-t-lg" />
      ))}
    </div>
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
        <div key={i} className={`flex items-center gap-6 px-5 py-3.5 border-t border-border ${i % 2 !== 0 ? "bg-muted/20" : ""}`}>
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

/* ─── Stat Card ─── */
const FundStatCard = ({ label, value, icon, valueColor }: { label: string; value: string; icon: React.ReactNode; valueColor?: string }) => (
  <div className="rounded-xl border border-border bg-card p-3.5 flex items-center gap-3">
    <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium leading-none mb-1">{label}</p>
      <p className={`text-lg font-bold tabular-nums leading-none ${valueColor || "text-foreground"}`}>{value}</p>
    </div>
  </div>
);

const FundGrid = ({ funds, snapshots, allSnapshots = {}, loading }: FundGridProps) => {
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

  const avgYield = useMemo(() => {
    const catFunds = funds.filter((f) => f.fund_type === activeTab);
    if (catFunds.length === 0) return 0;
    return catFunds.reduce((sum, f) => sum + f.annual_yield, 0) / catFunds.length;
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

      {/* Category stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <FundStatCard
          label="Funds"
          value={String(categoryCount[activeTab] || 0)}
          icon={<Layers className="h-4 w-4 text-primary" />}
        />
        <FundStatCard
          label="Best Yield"
          value={`${bestYield.toFixed(2)}%`}
          icon={<TrendingUp className="h-4 w-4 text-accent" />}
          valueColor="text-accent"
        />
        <FundStatCard
          label="Avg Yield"
          value={`${avgYield.toFixed(2)}%`}
          icon={<BarChart3 className="h-4 w-4 text-primary" />}
        />
        <FundStatCard
          label="Category"
          value={categoryLabels[activeTab] || activeTab}
          icon={<Tag className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Fund table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <colgroup>
              <col style={{ width: "3%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "5%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "18%" }} />
            </colgroup>
            <thead>
              <tr className="bg-muted/60 text-[11px] uppercase tracking-wider border-b border-border">
                <th className="text-left pl-4 pr-2 py-3 font-semibold text-muted-foreground">#</th>
                <th className="text-left px-3 py-3">
                  <SortHeader label="Fund Name" field="name" sortKey={sortKey} onToggleSort={toggleSort} />
                </th>
                <th className="text-center px-2 py-3 font-semibold text-muted-foreground">Trend</th>
                <th className="text-center px-2 py-3 font-semibold text-muted-foreground">Unit</th>
                <th className="text-right px-3 py-3">
                  <SortHeader label="Daily" field="daily_yield" sortKey={sortKey} onToggleSort={toggleSort} className="justify-end" />
                </th>
                <th className="text-right px-3 py-3">
                  <SortHeader label="Annual Rate" field="annual_yield" sortKey={sortKey} onToggleSort={toggleSort} className="justify-end" />
                </th>
                <th className="text-right px-3 py-3">
                  <SortHeader label="Min. Invest" field="minimum_investment" sortKey={sortKey} onToggleSort={toggleSort} className="justify-end" />
                </th>
                <th className="text-right px-3 py-3">
                  <SortHeader label="Mgmt Fee" field="management_fee" sortKey={sortKey} onToggleSort={toggleSort} className="justify-end" />
                </th>
                <th className="text-right pr-4 pl-2 py-3 font-semibold text-muted-foreground">Manager</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((fund, i) => (
                <tr
                  key={fund.id}
                  onClick={() => navigate(`/compare/${fund.slug}`)}
                  className={`border-t border-border/40 hover:bg-accent/8 transition-colors cursor-pointer group ${
                    i % 2 === 0 ? "bg-transparent" : "bg-muted/20"
                  }`}
                >
                  <td className="pl-4 pr-2 py-3.5 text-muted-foreground/60 text-xs tabular-nums">{i + 1}</td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Link
                        to={`/compare/${fund.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-semibold text-foreground group-hover:text-accent transition-colors truncate text-[13px]"
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
                  <td className="px-2 py-3.5 text-center text-xs font-medium text-muted-foreground">
                    {currencyLabel(fund.yield_unit)}
                  </td>
                  <td className="px-3 py-3.5 text-right tabular-nums whitespace-nowrap text-muted-foreground text-xs">
                    {fmtYield(fund.daily_yield, fund.yield_unit)}
                  </td>
                  <td className="px-3 py-3.5 text-right whitespace-nowrap tabular-nums">
                    <span className="font-bold text-accent text-[15px]">
                      {fmtYield(fund.annual_yield, fund.yield_unit)}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-right text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                    KSh {fund.minimum_investment.toLocaleString()}
                  </td>
                  <td className="px-3 py-3.5 text-right text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                    {fund.management_fee}%
                  </td>
                  <td className="px-2 py-3.5 text-center">
                    {allSnapshots[fund.id] && allSnapshots[fund.id].length > 0 ? (
                      <Sparkline data={allSnapshots[fund.id]} currentValue={fund.annual_yield} />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="pr-4 pl-2 py-3.5 text-right text-[11px] text-muted-foreground/70 truncate max-w-[140px]" title={fund.manager}>
                    {fund.manager}
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-14">
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
      <div className="flex items-center text-xs text-muted-foreground px-1">
        <span>
          Showing {filtered.length} of {categoryCount[activeTab] || 0} {categoryLabels[activeTab] || activeTab} funds
        </span>
      </div>
    </div>
  );
};

export default FundGrid;
