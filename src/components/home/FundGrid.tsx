import { useMemo, useId, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowUpDown, Search, TrendingUp, TrendingDown, Minus, Star, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import YieldChange from "@/components/YieldChange";
import FundMobileCards from "./FundMobileCards";
import FundLogo from "./FundLogo";
import type { FundFromDB, FundType, YieldSnapshot } from "@/lib/api";

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
    className={`inline-flex items-center gap-1 font-normal hover:text-foreground transition-colors ${className}`}
  >
    {label}
    {sortKey === field && <ArrowUpDown className="h-3 w-3 text-accent" />}
  </button>
);

/* ─── Sparkline ─── */
const SPARK_W = 120;
const SPARK_H = 36;

const Sparkline = ({ data, currentValue }: { data: YieldSnapshot[]; currentValue: number }) => {
  const uid = useId();
  const result = useMemo(() => {
    const vals = [...data.map((d) => d.annual_yield), currentValue];
    if (vals.length < 2) return null;
    const last12 = vals.slice(-12);
    const min = Math.min(...last12);
    const max = Math.max(...last12);
    const range = max - min || 1;
    const pad = 3;
    const pts = last12.map((v, i) => ({
      x: pad + (i / (last12.length - 1)) * (SPARK_W - pad * 2),
      y: pad + (1 - (v - min) / range) * (SPARK_H - pad * 2),
    }));
    const isUp = pts[pts.length - 1].y <= pts[0].y;
    return { pts, isUp };
  }, [data, currentValue]);

  if (!result) return <span className="text-[13px] text-muted-foreground">—</span>;

  const { pts, isUp } = result;
  const color = isUp ? "#10b981" : "hsl(var(--destructive))";
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaD = pathD + ` L${pts[pts.length - 1].x.toFixed(1)},${SPARK_H} L${pts[0].x.toFixed(1)},${SPARK_H} Z`;
  const gradId = `${uid}-${isUp ? "up" : "dn"}`;

  return (
    <svg width={SPARK_W} height={SPARK_H} viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} className="shrink-0 mx-auto">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2.5" fill={color} />
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
        <div className="flex gap-4">
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-6" />
        </div>
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={`flex items-center gap-4 px-5 py-3.5 border-t border-border ${i % 2 !== 0 ? "bg-muted/20" : ""}`}>
          <Skeleton className="h-4 w-5 shrink-0" />
          <Skeleton className="h-4 w-40 flex-1 min-w-[120px]" />
          <Skeleton className="h-4 w-12 shrink-0" />
          <Skeleton className="h-4 w-12 shrink-0" />
          <Skeleton className="h-4 w-12 shrink-0" />
          <Skeleton className="h-4 w-12 shrink-0" />
          <Skeleton className="h-9 w-[120px] shrink-0" />
          <Skeleton className="h-4 w-14 shrink-0" />
          <Skeleton className="h-4 w-10 shrink-0" />
          <Skeleton className="h-4 w-16 shrink-0" />
          <Skeleton className="h-4 w-5 shrink-0" />
        </div>
      ))}
    </div>
  </div>
);

const VALID_SORT: SortKey[] = ["annual_yield", "daily_yield", "name", "minimum_investment", "management_fee", "change"];
const VALID_MOVEMENT = ["all", "gainers", "losers", "unchanged"] as const;
type Movement = typeof VALID_MOVEMENT[number];

const FundGrid = ({ funds, snapshots, allSnapshots = {}, loading, isFavourite, onToggleFavourite }: FundGridProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get("category") || "money_market";
  const search = searchParams.get("q") || "";
  const sortParam = searchParams.get("sort") as SortKey | null;
  const sortKey: SortKey = sortParam && VALID_SORT.includes(sortParam) ? sortParam : "annual_yield";
  const dirParam = searchParams.get("dir");
  const sortDir: SortDir = dirParam === "asc" || dirParam === "desc" ? dirParam : "desc";
  const movementParam = searchParams.get("movement") as Movement | null;
  const movement: Movement = movementParam && VALID_MOVEMENT.includes(movementParam) ? movementParam : "all";

  const updateParams = (patch: Partial<{ category: string; q: string; sort: SortKey; dir: SortDir; movement: Movement }>) => {
    const next = new URLSearchParams(searchParams);
    const defaults = { category: "money_market", q: "", sort: "annual_yield", dir: "desc", movement: "all" };
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "" || v === defaults[k as keyof typeof defaults]) next.delete(k);
      else next.set(k, String(v));
    });
    setSearchParams(next, { replace: true });
  };

  const setSearch = (val: string) => updateParams({ q: val });

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

  useEffect(() => {
    if (categories.length === 0) return;
    if (!categories.includes(activeTab as FundType) || (categoryCount[activeTab] ?? 0) === 0) {
      updateParams({ category: categories[0] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, activeTab, categoryCount]);

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
      {/* Desktop toolbar: Movement segmented + Search */}
      <div className="hidden md:flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-1 pl-1">

          <div className="inline-flex items-center gap-1">
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
                  className={`inline-flex h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors whitespace-nowrap ${
                    active ? "border-foreground bg-foreground text-background" : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.key === "gainers" && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
                  {opt.key === "losers" && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
                  {opt.key === "unchanged" && <Minus className="h-3.5 w-3.5" />}
                  {opt.label}
                  <span className={`font-normal tabular-nums ${active ? "text-background/70" : "text-muted-foreground"}`}>{opt.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 pr-1">
          <div className="relative w-80 shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search fund or manager"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 rounded-full border-border bg-card pl-11 text-sm shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-1"
            />
          </div>
        </div>
      </div>

      {/* Mobile: combined search + filter button */}
      <div className="md:hidden flex items-center gap-2.5 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/80" />
          <Input
            placeholder="Search funds..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-full bg-card border-border/80 w-full text-[15px] shadow-sm placeholder:text-muted-foreground/60 focus-visible:ring-1"
          />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className="relative inline-flex items-center justify-center gap-1.5 h-11 px-4 shrink-0 rounded-full border border-border/80 bg-card text-foreground text-sm font-semibold shadow-sm transition-colors active:scale-95"
              aria-label="Filters"
            >
              <SlidersHorizontal className="h-4 w-4 text-foreground/80" />
              <span>Filter</span>
              {(activeTab !== "money_market" || movement !== "all") && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-500" />
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl border-border max-h-[80vh] overflow-y-auto p-5">
            <SheetHeader className="text-left pb-2 border-b border-border/50">
              <SheetTitle className="text-base font-bold">Filters</SheetTitle>
            </SheetHeader>

            <div className="mt-4 space-y-5">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Category
                </h4>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const active = activeTab === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          updateParams({ category: cat, q: "", sort: "annual_yield", dir: "desc", movement: "all" });
                        }}
                        className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all ${
                          active
                            ? "bg-emerald-600 dark:bg-emerald-600 text-white shadow-sm"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {categoryLabels[cat] || cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Movement
                </h4>
                <div className="grid grid-cols-2 gap-2">
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
                        type="button"
                        onClick={() => {
                          if (opt.key === "gainers") updateParams({ movement: opt.key, sort: "change", dir: "desc" });
                          else if (opt.key === "losers") updateParams({ movement: opt.key, sort: "change", dir: "asc" });
                          else updateParams({ movement: opt.key });
                        }}
                        className={`inline-flex items-center justify-center gap-1.5 h-10 rounded-full text-xs font-semibold transition-all ${
                          active
                            ? "bg-foreground text-background shadow-sm"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {opt.key === "gainers" && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
                        {opt.key === "losers" && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
                        {opt.key === "unchanged" && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span>{opt.label}</span>
                        <span className={`text-[11px] tabular-nums font-normal ${active ? "text-background/80" : "text-muted-foreground/80"}`}>
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
                  className="w-full h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors mt-4"
                >
                  Apply Filters
                </button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Mobile movement pills */}
      <div className="md:hidden mb-4 flex gap-2 overflow-x-auto no-scrollbar py-0.5">
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
              className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                active
                  ? "bg-foreground text-background shadow-sm"
                  : "border border-border bg-background text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              }`}
            >
              {opt.key === "gainers" && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
              {opt.key === "losers" && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
              {opt.key === "unchanged" && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
              <span>{opt.label}</span>
              <span className={`text-[11px] tabular-nums font-normal ${active ? "text-background/80" : "text-muted-foreground/80"}`}>
                {opt.count}
              </span>
            </button>
          );
        })}
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


      <div className="hidden md:block rounded-[22px] border border-border bg-card shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto border-b border-border bg-black px-7 pt-3 scrollbar-hide">
          <div className="flex min-w-max items-center gap-8">
            {categories.map((cat) => {
              const active = activeTab === cat;
              return (
                <button
                  key={cat}
                  onClick={() => updateParams({ category: cat, q: "", sort: "annual_yield", dir: "desc", movement: "all" })}
                  className={`relative pb-3 text-[13px] font-semibold transition-colors ${
                    active ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {categoryLabels[cat] || cat}
                  {active && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-emerald-500" />}
                </button>
              );
            })}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed min-w-[1100px] text-left text-sm">
            <colgroup>
              <col style={{ width: "24%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "11%" }} />
              {onToggleFavourite && <col style={{ width: "3%" }} />}
            </colgroup>
            <thead>
              <tr className="border-b border-border bg-muted/50 text-[10px] uppercase tracking-[0.16em] text-muted-foreground dark:bg-[#1b1c1f]">
                <th className="bg-background/60 text-left px-6 py-3 font-semibold dark:bg-[#151619]">
                  <SortHeader label="FUNDS" field="name" sortKey={sortKey} onToggleSort={toggleSort} />
                </th>
                <th className="text-right px-3 py-3 font-semibold">
                  <SortHeader label="DAILY" field="daily_yield" sortKey={sortKey} onToggleSort={toggleSort} className="justify-end" />
                </th>
                <th className="text-right px-2 py-3 font-semibold" title="vs prior snapshot">
                  <span className="sr-only">Daily </span>Change
                </th>
                <th className="text-right px-3 py-3 font-semibold">
                  <SortHeader label="ANNUAL" field="annual_yield" sortKey={sortKey} onToggleSort={toggleSort} className="justify-end" />
                </th>
                <th className="text-right px-2 py-3 font-semibold" title="vs prior snapshot">
                  <span className="sr-only">Annual </span>Change
                </th>
                <th className="text-center px-2 py-3 font-semibold">Trend</th>
                <th className="text-right px-3 py-3 font-semibold">
                  <SortHeader label="MIN INVEST" field="minimum_investment" sortKey={sortKey} onToggleSort={toggleSort} className="justify-end" />
                </th>
                <th className="text-right px-3 py-3 font-semibold">
                  <SortHeader label="FEE" field="management_fee" sortKey={sortKey} onToggleSort={toggleSort} className="justify-end" />
                </th>
                <th className="text-right pr-5 pl-2 py-3 font-semibold">WITHDRAW</th>
                {onToggleFavourite && <th className="w-8 pr-3 py-3 font-semibold" aria-label="Watch" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {filtered.map((fund) => (
                <tr
                  key={fund.id}
                  onClick={() => navigate(`/compare/${fund.slug}`)}
                  className="group cursor-pointer bg-card transition-colors hover:bg-muted/35"
                >
                  <td className="bg-muted/35 px-6 py-4 align-middle dark:bg-[#151619]">
                    <Link
                      to={`/compare/${fund.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-3 min-w-0"
                      title={fund.name}
                    >
                      <FundLogo name={fund.name} logoUrl={fund.logo_url} size={44} />
                      <div className="min-w-0">
                        <div className="font-bold text-foreground group-hover:text-emerald-500 transition-colors truncate text-[14px]">
                          {fund.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate mt-1">{fund.manager}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-4 text-right tabular-nums whitespace-nowrap align-middle">
                    <span className="font-black text-foreground text-[13px]">
                      {fmtYield(fund.daily_yield, fund.yield_unit)}
                    </span>
                  </td>
                  <td className="px-2 py-4 text-right whitespace-nowrap align-middle">
                    <div className="flex justify-end">
                      {snapshots[fund.id] ? (
                        <YieldChange
                          current={fund.daily_yield}
                          previous={snapshots[fund.id]?.daily_yield}
                          unit={fund.yield_unit}
                          className="text-[13px]"
                        />
                      ) : (
                        <span className="text-[13px] text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-right whitespace-nowrap tabular-nums align-middle">
                    <span className="font-black text-foreground text-[13px]">
                      {fmtYield(fund.annual_yield, fund.yield_unit)}
                    </span>
                  </td>
                  <td className="px-2 py-4 text-right whitespace-nowrap align-middle">
                    <div className="flex justify-end">
                      {snapshots[fund.id] ? (
                        <YieldChange
                          current={fund.annual_yield}
                          previous={snapshots[fund.id]?.annual_yield}
                          unit={fund.yield_unit}
                          className="text-[13px]"
                        />
                      ) : (
                        <span className="text-[13px] text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-4 text-center align-middle">
                    {allSnapshots[fund.id] && allSnapshots[fund.id].length > 0 ? (
                      <Sparkline data={allSnapshots[fund.id]} currentValue={fund.annual_yield} />
                    ) : (
                      <span className="text-[13px] text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-4 text-right text-[13px] font-semibold tabular-nums text-foreground whitespace-nowrap align-middle">
                    <span className="mr-1 text-[13px] font-medium text-muted-foreground">KSh</span>{fund.minimum_investment.toLocaleString()}
                  </td>
                  <td className="px-3 py-4 text-right text-[13px] font-semibold tabular-nums text-foreground whitespace-nowrap align-middle">
                    {fund.management_fee}%
                  </td>
                  <td className="pr-5 pl-2 py-4 text-right text-[13px] font-semibold text-foreground truncate max-w-[120px] align-middle" title={fund.withdrawal_time}>
                    {fund.withdrawal_time}
                  </td>
                  {onToggleFavourite && (
                    <td className="pr-3 py-4 text-center align-middle">
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
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={onToggleFavourite ? 10 : 9} className="text-center py-14">
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
