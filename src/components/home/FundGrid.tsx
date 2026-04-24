import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowUpDown, Search, TrendingUp, TrendingDown, Minus, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LineChart, Line, YAxis, ResponsiveContainer, Area } from "recharts";
import FundMobileCards from "./FundMobileCards";
import type { FundFromDB, YieldSnapshot } from "@/lib/api";

type SortKey = "annual_yield" | "daily_yield" | "name" | "minimum_investment" | "management_fee" | "change";
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
  isFavourite?: (id: string) => boolean;
  onToggleFavourite?: (id: string, name: string) => void;
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

/* ─── MiniSparkline (matches StocksPage visual) ─── */
const MiniSparkline = ({ data, currentValue }: { data: YieldSnapshot[]; currentValue: number }) => {
  const series = useMemo(() => {
    const vals = [...data.map((d) => d.annual_yield), currentValue];
    if (vals.length < 2) return null;
    const last12 = vals.slice(-12);
    const min = Math.min(...last12);
    const max = Math.max(...last12);
    // Tight padding (5% of range, with a tiny floor) so micro-changes become visible
    const range = max - min;
    const pad = range > 0 ? range * 0.05 : Math.max(Math.abs(max) * 0.001, 0.01);
    return {
      points: last12.map((v, i) => ({ i, value: v })),
      positive: last12[last12.length - 1] >= last12[0],
      domain: [min - pad, max + pad] as [number, number],
    };
  }, [data, currentValue]);

  if (!series) return <span className="text-[10px] text-muted-foreground">—</span>;

  const color = series.positive ? "hsl(var(--accent))" : "hsl(var(--destructive))";
  const gradientId = `fund-spark-${series.positive ? "up" : "down"}`;

  return (
    <div className="w-[60px] h-[24px] inline-block">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series.points} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={series.domain} />
          <Area type="linear" dataKey="value" stroke="none" fill={`url(#${gradientId})`} isAnimationActive={false} />
          <Line type="linear" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ─── ChangeCell (matches StocksPage visual) ─── */
const ChangeCell = ({ change, unit }: { change: number; unit: string }) => {
  const suffix = unit === "%" ? "%" : "";
  const formatted = `${Math.abs(change).toFixed(2)}${suffix}`;
  if (change > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-accent text-[11px] font-semibold tabular-nums">
        <TrendingUp className="h-3 w-3" /> +{formatted}
      </span>
    );
  if (change < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-destructive text-[11px] font-semibold tabular-nums">
        <TrendingDown className="h-3 w-3" /> -{formatted}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-muted-foreground text-[11px]">
      <Minus className="h-3 w-3" /> 0.00{suffix}
    </span>
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

const VALID_SORT: SortKey[] = ["annual_yield", "daily_yield", "name", "minimum_investment", "management_fee", "change"];
const VALID_MOVEMENT = ["all", "gainers", "losers", "unchanged"] as const;
type Movement = typeof VALID_MOVEMENT[number];

const FundGrid = ({ funds, snapshots, allSnapshots = {}, loading, isFavourite, onToggleFavourite }: FundGridProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Derive state from URL with defaults
  const activeTab = searchParams.get("category") || "money_market";
  const search = searchParams.get("q") || "";
  const sortParam = searchParams.get("sort") as SortKey | null;
  const sortKey: SortKey = sortParam && VALID_SORT.includes(sortParam) ? sortParam : "annual_yield";
  const dirParam = searchParams.get("dir");
  const sortDir: SortDir = dirParam === "asc" || dirParam === "desc" ? dirParam : "desc";
  const movementParam = searchParams.get("movement") as Movement | null;
  const movement: Movement = movementParam && VALID_MOVEMENT.includes(movementParam) ? movementParam : "all";

  /** Update URL params; omits values equal to defaults to keep URLs clean */
  const updateParams = (patch: Partial<{ category: string; q: string; sort: SortKey; dir: SortDir; movement: Movement }>) => {
    const next = new URLSearchParams(searchParams);
    const defaults = { category: "money_market", q: "", sort: "annual_yield", dir: "desc", movement: "all" };
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "" || v === defaults[k as keyof typeof defaults]) next.delete(k);
      else next.set(k, String(v));
    });
    setSearchParams(next, { replace: true });
  };

  // Convenience setters used by Search input
  const setSearch = (val: string) => updateParams({ q: val });

  /** Compute per-category gainer/loser counts based on annual_yield change vs latest snapshot */
  const movementForFund = (f: FundFromDB): "gainer" | "loser" | "unchanged" => {
    const prev = snapshots[f.id]?.annual_yield;
    if (prev == null) return "unchanged";
    const diff = f.annual_yield - prev;
    if (diff > 0) return "gainer";
    if (diff < 0) return "loser";
    return "unchanged";
  };

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

  const categoryFunds = useMemo(
    () => funds.filter((f) => f.fund_type === activeTab),
    [funds, activeTab],
  );

  const movementCounts = useMemo(() => {
    const c = { gainers: 0, losers: 0, unchanged: 0 };
    categoryFunds.forEach((f) => {
      const m = movementForFund(f);
      if (m === "gainer") c.gainers++;
      else if (m === "loser") c.losers++;
      else c.unchanged++;
    });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFunds, snapshots]);

  const filtered = useMemo(() => {
    let result = categoryFunds;
    if (movement === "gainers") result = result.filter((f) => movementForFund(f) === "gainer");
    else if (movement === "losers") result = result.filter((f) => movementForFund(f) === "loser");
    else if (movement === "unchanged") result = result.filter((f) => movementForFund(f) === "unchanged");
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (f) => f.name.toLowerCase().includes(q) || f.manager.toLowerCase().includes(q)
      );
    }
    const yieldChange = (f: FundFromDB) => {
      const prev = snapshots[f.id]?.annual_yield;
      return prev == null ? 0 : f.annual_yield - prev;
    };
    result = [...result].sort((a, b) => {
      const mul = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return mul * a.name.localeCompare(b.name);
      if (sortKey === "change") return mul * (yieldChange(a) - yieldChange(b));
      return mul * ((a[sortKey] as number) - (b[sortKey] as number));
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFunds, search, sortKey, sortDir, movement, snapshots]);

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
    if (sortKey === key) {
      updateParams({ dir: sortDir === "asc" ? "desc" : "asc" });
    } else {
      updateParams({ sort: key, dir: key === "name" ? "asc" : "desc" });
    }
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      {/* Desktop toolbar: Category dropdown + Movement segmented + Search */}
      <div className="hidden md:flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select
            value={activeTab}
            onValueChange={(val) => {
              updateParams({ category: val, q: "", sort: "annual_yield", dir: "desc", movement: "all" });
            }}
          >
            <SelectTrigger className="h-9 w-[220px] rounded-lg bg-muted/30 border-border text-xs font-medium">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-muted-foreground shrink-0">Category:</span>
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat} className="text-xs">
                  <span className="inline-flex items-center gap-2">
                    {categoryLabels[cat] || cat}
                    <span className="text-[10px] tabular-nums text-muted-foreground/70">
                      {categoryCount[cat] || 0}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Movement segmented control */}
          <div className="inline-flex items-center rounded-lg bg-muted/30 border border-border p-0.5">
            {([
              { key: "all", label: "All", count: categoryFunds.length },
              { key: "gainers", label: "Gainers", count: movementCounts.gainers },
              { key: "losers", label: "Losers", count: movementCounts.losers },
              { key: "unchanged", label: "Unchanged", count: movementCounts.unchanged },
            ] as const).map((opt) => {
              const active = movement === opt.key;
              const activeColor =
                opt.key === "gainers"
                  ? "bg-accent text-accent-foreground"
                  : opt.key === "losers"
                  ? "bg-destructive text-destructive-foreground"
                  : opt.key === "unchanged"
                  ? "bg-muted-foreground/80 text-background"
                  : "bg-foreground text-background";
              return (
                <button
                  key={opt.key}
                  onClick={() => {
                    if (opt.key === "gainers") updateParams({ movement: opt.key, sort: "change", dir: "desc" });
                    else if (opt.key === "losers") updateParams({ movement: opt.key, sort: "change", dir: "asc" });
                    else updateParams({ movement: opt.key });
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 h-8 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                    active ? activeColor + " shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.key === "gainers" && <TrendingUp className="h-3 w-3" />}
                  {opt.key === "losers" && <TrendingDown className="h-3 w-3" />}
                  {opt.key === "unchanged" && <Minus className="h-3 w-3" />}
                  {opt.label}
                  <span className={`text-[10px] tabular-nums ${active ? "opacity-90" : "opacity-70"}`}>{opt.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search fund or manager"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs rounded-lg bg-muted/30 border-border w-full"
          />
        </div>
      </div>

      {/* Mobile: keep original pill tabs + search */}
      <div className="md:hidden flex flex-col gap-3">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                updateParams({ category: cat, q: "", sort: "annual_yield", dir: "desc", movement: "all" });
              }}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === cat
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {categoryLabels[cat] || cat}
              <span className={`ml-1.5 tabular-nums text-[10px] ${
                activeTab === cat ? "text-accent-foreground/70" : "text-muted-foreground/60"
              }`}>
                {categoryCount[cat] || 0}
              </span>
            </button>
          ))}
        </div>
        {/* Mobile movement pills */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {([
            { key: "all", label: "All", count: categoryFunds.length },
            { key: "gainers", label: "Gainers", count: movementCounts.gainers },
            { key: "losers", label: "Losers", count: movementCounts.losers },
            { key: "unchanged", label: "Unchanged", count: movementCounts.unchanged },
          ] as const).map((opt) => {
            const active = movement === opt.key;
            const activeColor =
              opt.key === "gainers"
                ? "bg-accent text-accent-foreground"
                : opt.key === "losers"
                ? "bg-destructive text-destructive-foreground"
                : opt.key === "unchanged"
                ? "bg-muted-foreground/80 text-background"
                : "bg-foreground text-background";
            return (
              <button
                key={opt.key}
                onClick={() => {
                  if (opt.key === "gainers") updateParams({ movement: opt.key, sort: "change", dir: "desc" });
                  else if (opt.key === "losers") updateParams({ movement: opt.key, sort: "change", dir: "asc" });
                  else updateParams({ movement: opt.key });
                }}
                className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  active ? activeColor + " shadow-sm" : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {opt.key === "gainers" && <TrendingUp className="h-3 w-3" />}
                {opt.key === "losers" && <TrendingDown className="h-3 w-3" />}
                {opt.key === "unchanged" && <Minus className="h-3 w-3" />}
                {opt.label}
                <span className={`text-[10px] tabular-nums ${active ? "opacity-90" : "opacity-70"}`}>{opt.count}</span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 rounded-lg bg-muted/30 border-border w-full text-[16px]"
          />
        </div>
      </div>


      {/* Mobile: card view */}
      <div className="md:hidden">
        <FundMobileCards
          funds={filtered}
          snapshots={snapshots}
          allSnapshots={allSnapshots}
          bestYield={bestYield}
          loading={loading}
          onClearSearch={() => setSearch("")}
          hasSearch={!!search.trim()}
          isFavourite={isFavourite}
          onToggleFavourite={onToggleFavourite}
        />
      </div>

      {/* Desktop: table view */}
      <div className="hidden md:block rounded-xl border border-border overflow-hidden bg-card shadow-sm">
        <div>
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col style={{ width: "3%" }} />
              <col style={{ width: "15%" }} />
              
              <col style={{ width: "10%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "6%" }} />
              {onToggleFavourite && <col style={{ width: "3%" }} />}
            </colgroup>
            <thead>
              <tr className="bg-muted/60 text-[11px] uppercase tracking-wider border-b border-border">
                <th className="text-left pl-4 pr-2 py-3 font-semibold text-muted-foreground">#</th>
                <th className="text-left px-3 py-3">
                  <SortHeader label="Fund" field="name" sortKey={sortKey} onToggleSort={toggleSort} />
                </th>
                
                <th className="text-right px-3 py-3">
                  <SortHeader label="Annual" field="annual_yield" sortKey={sortKey} onToggleSort={toggleSort} className="justify-end" />
                </th>
                <th className="text-right px-3 py-3">
                  <SortHeader label="Change" field="change" sortKey={sortKey} onToggleSort={toggleSort} className="justify-end" />
                </th>
                <th className="text-right px-3 py-3">
                  <SortHeader label="Daily" field="daily_yield" sortKey={sortKey} onToggleSort={toggleSort} className="justify-end" />
                </th>
                <th className="text-right px-3 py-3 font-semibold text-muted-foreground">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">Daily Δ</span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px] text-xs">
                      Difference between the current and previous daily yield.
                    </TooltipContent>
                  </Tooltip>
                </th>
                <th className="text-left px-3 py-3 font-semibold text-muted-foreground">Manager</th>
                <th className="text-right px-3 py-3">
                  <SortHeader label="Min Invest" field="minimum_investment" sortKey={sortKey} onToggleSort={toggleSort} className="justify-end" />
                </th>
                <th className="text-right px-3 py-3">
                  <SortHeader label="Fee" field="management_fee" sortKey={sortKey} onToggleSort={toggleSort} className="justify-end" />
                </th>
                {onToggleFavourite && <th className="w-8"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((fund, i) => {
                const prev = snapshots[fund.id]?.annual_yield;
                const change = prev != null ? fund.annual_yield - prev : 0;
                const prevDaily = snapshots[fund.id]?.daily_yield;
                const dailyChange = prevDaily != null ? fund.daily_yield - prevDaily : 0;
                
                return (
                  <tr
                    key={fund.id}
                    onClick={() => navigate(`/compare/${fund.slug}`)}
                    className={`border-t border-border/40 hover:bg-accent/8 transition-colors cursor-pointer group ${
                      i % 2 === 0 ? "bg-transparent" : "bg-muted/20"
                    }`}
                  >
                    <td className="pl-4 pr-2 py-3.5 text-muted-foreground/60 text-xs tabular-nums">{i + 1}</td>
                    <td className="px-3 py-3.5">
                      <Link
                        to={`/compare/${fund.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block max-w-[180px] font-bold text-foreground group-hover:text-accent transition-colors text-sm tracking-tight truncate"
                        title={fund.name}
                      >
                        {fund.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3.5 text-right whitespace-nowrap tabular-nums">
                      <span className="font-bold text-accent text-[15px]">
                        {fmtYield(fund.annual_yield, fund.yield_unit)}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <ChangeCell change={change} unit={fund.yield_unit} />
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums whitespace-nowrap">
                      <span className="font-bold text-accent text-[15px]">
                        {fmtYield(fund.daily_yield, fund.yield_unit)}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <ChangeCell change={dailyChange} unit={fund.yield_unit} />
                    </td>
                    <td className="px-3 py-3.5 text-foreground text-xs truncate" title={fund.manager}>
                      {fund.manager}
                    </td>
                    <td className="px-3 py-3.5 text-right text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                      KSh {fund.minimum_investment.toLocaleString()}
                    </td>
                    <td className="px-3 py-3.5 text-right text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                      {fund.management_fee}%
                    </td>
                    {onToggleFavourite && (
                      <td className="px-2 py-3.5 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); onToggleFavourite(fund.id, fund.name); }}
                          className="p-1 rounded-md hover:bg-muted transition-colors"
                          aria-label={isFavourite?.(fund.id) ? "Remove from watchlist" : "Add to watchlist"}
                        >
                          <Star className={`h-3.5 w-3.5 transition-colors ${isFavourite?.(fund.id) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/40 hover:text-yellow-500"}`} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={onToggleFavourite ? 11 : 10} className="text-center py-14">
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
