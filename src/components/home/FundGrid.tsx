import { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowUpDown, Search, TrendingUp, TrendingDown, Minus, Star, SlidersHorizontal, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import FundMobileCards from "./FundMobileCards";
import FundLogo from "./FundLogo";
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
    className={`inline-flex items-center gap-1 font-semibold uppercase tracking-wider hover:text-accent transition-colors ${className}`}
  >
    {label}
    <ArrowUpDown className={`h-3 w-3 ${sortKey === field ? "text-accent" : "text-muted-foreground/50"}`} />
  </button>
);

/* ─── ChangeCell (matches StocksPage visual) ─── */
const ChangeCell = ({ change, unit }: { change: number; unit: string }) => {
  const suffix = unit === "%" ? "%" : "";
  const formatted = `${Math.abs(change).toFixed(2)}${suffix}`;
  if (change > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-accent text-sm font-semibold tabular-nums">
        <TrendingUp className="h-3.5 w-3.5" /> +{formatted}
      </span>
    );
  if (change < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-destructive text-sm font-semibold tabular-nums">
        <TrendingDown className="h-3.5 w-3.5" /> -{formatted}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-muted-foreground text-sm">
      <Minus className="h-3.5 w-3.5" /> 0.00{suffix}
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

      {/* Mobile: combined search + filter button */}
      <div className="md:hidden flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search funds..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 rounded-lg bg-muted/30 border-border w-full text-[16px]"
          />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="relative inline-flex items-center justify-center gap-1.5 h-9 px-3 shrink-0 rounded-md border border-border bg-card text-foreground text-xs font-medium transition-colors"
              aria-label="Filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filter</span>
              {(activeTab !== "money_market" || movement !== "all") && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent" />
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl border-border max-h-[80vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-base">Filters</SheetTitle>
            </SheetHeader>

            <div className="mt-4 space-y-5">
              {/* Category */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Category</p>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => {
                    const active = activeTab === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          updateParams({ category: cat, q: "", sort: "annual_yield", dir: "desc", movement: "all" });
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs font-medium border transition-colors ${
                          active
                            ? "bg-foreground text-background border-foreground"
                            : "bg-card text-muted-foreground border-border"
                        }`}
                      >
                        {categoryLabels[cat] || cat}
                        <span className={`text-[10px] tabular-nums ${active ? "opacity-90" : "opacity-70"}`}>
                          {categoryCount[cat] || 0}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Movement */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Movement</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    { key: "all", label: "All", count: categoryFunds.length },
                    { key: "gainers", label: "Gainers", count: movementCounts.gainers },
                    { key: "losers", label: "Losers", count: movementCounts.losers },
                    { key: "unchanged", label: "Unchanged", count: movementCounts.unchanged },
                  ] as const).map((opt) => {
                    const active = movement === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => {
                          if (opt.key === "gainers") updateParams({ movement: opt.key, sort: "change", dir: "desc" });
                          else if (opt.key === "losers") updateParams({ movement: opt.key, sort: "change", dir: "asc" });
                          else updateParams({ movement: opt.key });
                        }}
                        className={`inline-flex items-center justify-center gap-1.5 h-9 rounded-md text-xs font-medium border transition-colors ${
                          active
                            ? "bg-foreground text-background border-foreground"
                            : "bg-card text-muted-foreground border-border"
                        }`}
                      >
                        {opt.key === "gainers" && <TrendingUp className="h-3 w-3" />}
                        {opt.key === "losers" && <TrendingDown className="h-3 w-3" />}
                        {opt.key === "unchanged" && <Minus className="h-3 w-3" />}
                        {opt.label}
                        <span className={`text-[10px] tabular-nums ${active ? "opacity-90" : "opacity-70"}`}>
                          {opt.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <SheetClose asChild>
                <button
                  type="button"
                  className="w-full h-10 rounded-md bg-accent text-accent-foreground text-sm font-semibold"
                >
                  Apply filters
                </button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Mobile movement pills (matches Stocks page UI) */}
      <div className="md:hidden -mt-1 mb-3 flex gap-1.5 overflow-x-auto scrollbar-hide rounded">
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
              onClick={(e) => {
                if (opt.key === "gainers") updateParams({ movement: opt.key, sort: "change", dir: "desc" });
                else if (opt.key === "losers") updateParams({ movement: opt.key, sort: "change", dir: "asc" });
                else updateParams({ movement: opt.key });
                e.currentTarget.scrollIntoView({
                  behavior: "smooth",
                  inline: "center",
                  block: "nearest",
                });
              }}
              className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
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

      {/* Mobile: active category label */}
      <div className="md:hidden -mt-2 mb-1 px-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">
          {categoryLabels[activeTab] || activeTab}
        </span>
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

      {/* Desktop/tablet: redesigned symmetric table */}
      <div className="hidden md:block rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed min-w-[960px] border-separate border-spacing-0">
            <colgroup>
              <col style={{ width: "56px" }} />
              <col style={{ width: "30%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "160px" }} />
              {onToggleFavourite && <col style={{ width: "44px" }} />}
            </colgroup>
            <thead>
              <tr className="bg-muted/50 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="text-center px-3 py-3 font-semibold border-b border-border">#</th>
                <th className="text-left px-4 py-3 font-semibold border-b border-border">
                  <SortHeader label="Fund" field="name" sortKey={sortKey} onToggleSort={toggleSort} />
                </th>
                <th className="text-center px-3 py-3 font-semibold border-b border-border">
                  <SortHeader label="Daily" field="daily_yield" sortKey={sortKey} onToggleSort={toggleSort} className="mx-auto" />
                </th>
                <th className="text-center px-3 py-3 font-semibold border-b border-border">
                  <SortHeader label="Annual Yield" field="annual_yield" sortKey={sortKey} onToggleSort={toggleSort} className="mx-auto" />
                </th>
                <th className="text-center px-3 py-3 font-semibold border-b border-border">
                  <SortHeader label="Min Invest" field="minimum_investment" sortKey={sortKey} onToggleSort={toggleSort} className="mx-auto" />
                </th>
                <th className="text-center px-3 py-3 font-semibold border-b border-border">Withdrawal</th>
                <th className="text-center px-3 py-3 font-semibold border-b border-border">Action</th>
                {onToggleFavourite && <th className="border-b border-border" aria-label="Watch" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((fund, i) => {
                const prev = snapshots[fund.id]?.annual_yield;
                const change = prev != null ? fund.annual_yield - prev : 0;
                const prevDaily = snapshots[fund.id]?.daily_yield;
                const dailyChange = prevDaily != null ? fund.daily_yield - prevDaily : 0;
                const suffix = fund.yield_unit === "%" ? "%" : "";

                const ChangeBadge = ({ delta }: { delta: number }) => {
                  const cls =
                    delta > 0
                      ? "text-accent bg-accent/10"
                      : delta < 0
                      ? "text-destructive bg-destructive/10"
                      : "text-muted-foreground bg-muted/60";
                  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
                  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
                  return (
                    <span className={`mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold tabular-nums ${cls}`}>
                      <Icon className="h-2.5 w-2.5" />
                      {sign}{Math.abs(delta).toFixed(2)}{suffix}
                    </span>
                  );
                };

                return (
                  <tr
                    key={fund.id}
                    onClick={() => navigate(`/compare/${fund.slug}`)}
                    className="group cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-3 py-4 text-center align-middle border-b border-border/40">
                      <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-muted text-[11px] font-bold text-muted-foreground tabular-nums">
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-middle border-b border-border/40">
                      <Link
                        to={`/compare/${fund.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-3 min-w-0"
                        title={fund.name}
                      >
                        <FundLogo name={fund.name} logoUrl={fund.logo_url} size={36} />
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground text-sm leading-tight truncate group-hover:text-accent transition-colors">
                            {fund.name}
                          </div>
                          <div className="text-xs text-muted-foreground leading-tight truncate mt-0.5">
                            {fund.manager}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-4 text-center align-middle border-b border-border/40">
                      <div className="flex flex-col items-center justify-center leading-none">
                        <span className="font-semibold text-foreground tabular-nums text-base">
                          {fmtYield(fund.daily_yield, fund.yield_unit)}
                        </span>
                        <ChangeBadge delta={dailyChange} />
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center align-middle border-b border-border/40">
                      <div className="flex flex-col items-center justify-center leading-none">
                        <span className="font-bold text-foreground text-base tabular-nums">
                          {fmtYield(fund.annual_yield, fund.yield_unit)}
                        </span>
                        <ChangeBadge delta={change} />
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center align-middle border-b border-border/40 text-sm tabular-nums text-foreground/80 whitespace-nowrap">
                      KSh {fund.minimum_investment.toLocaleString()}
                    </td>
                    <td className="px-3 py-4 text-center align-middle border-b border-border/40 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-muted/60 text-[11px] font-medium text-muted-foreground">
                        {fund.withdrawal_time?.replace('business days', 'days')}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-center align-middle border-b border-border/40">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          to={`/compare/${fund.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center h-8 w-16 rounded-md border border-border bg-card text-[11px] font-semibold uppercase tracking-wider text-foreground hover:bg-muted transition-colors"
                        >
                          View
                        </Link>
                        {fund.website && (
                          <a
                            href={fund.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center gap-1 h-8 w-16 rounded-md bg-accent text-accent-foreground text-[11px] font-semibold uppercase tracking-wider hover:bg-accent/90 transition-colors text-center"
                          >
                            VISIT <ArrowUpRight className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </td>
                    {onToggleFavourite && (
                      <td className="px-2 py-4 text-center align-middle border-b border-border/40">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavourite(fund.id, fund.name);
                          }}
                          className="p-1 rounded-md hover:bg-muted transition-colors"
                          aria-label={isFavourite?.(fund.id) ? "Remove from watchlist" : "Add to watchlist"}
                        >
                          <Star
                            className={`h-4 w-4 transition-colors ${isFavourite?.(fund.id) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/40 hover:text-yellow-500"}`}
                          />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={onToggleFavourite ? 8 : 7} className="text-center py-14">
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
