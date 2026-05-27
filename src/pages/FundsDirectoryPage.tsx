import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Shield, Filter, LayoutGrid, List, X, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  fetchFunds, fetchLatestSnapshots, fetchAllFundSnapshots,
  FUND_TYPE_LABELS,
  type FundFromDB, type FundType, type YieldSnapshot,
} from "@/lib/api";
import { computePeerMedians, computeFundScore } from "@/lib/fundScore";
import FundCard from "@/components/fund/FundCard";
import FundScoreDiamond from "@/components/fund/FundScoreDiamond";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useFundWatchlist } from "@/hooks/useFundWatchlist";
import { useAuth } from "@/hooks/useAuth";
import SectionLiveStatus from "@/components/SectionLiveStatus";

type Sort = "score" | "yield" | "fee" | "min";

const SORT_LABEL: Record<Sort, string> = {
  score: "Kenya Fund Score",
  yield: "Highest yield",
  fee: "Lowest fee",
  min: "Lowest minimum",
};

const FundsDirectoryPage = () => {
  useDocumentTitle(
    "Kenyan Unit Trusts & Money Market Funds — Compare CMA-Regulated Funds",
    "Browse every CMA-regulated unit trust and money market fund in Kenya. Filter by risk, withdrawal speed, minimum investment and view each fund's Kenya Fund Score.",
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { isFavourite, toggle } = useFundWatchlist();

  const [funds, setFunds] = useState<FundFromDB[]>([]);
  const [allSnaps, setAllSnaps] = useState<Record<string, YieldSnapshot[]>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "table">(
    (searchParams.get("view") as "grid" | "table") || "grid",
  );

  // Filters from URL
  const q = searchParams.get("q") ?? "";
  const category = (searchParams.get("category") as FundType | null) ?? null;
  const risks = (searchParams.get("risk") ?? "").split(",").filter(Boolean);
  const cmaOnly = searchParams.get("cma") !== "off"; // default on
  const beginner = searchParams.get("beginner") === "1";
  const fastWithdraw = searchParams.get("fast") === "1";
  const minCap = Number(searchParams.get("min") ?? 0) || 0;
  const sort = (searchParams.get("sort") as Sort) || "score";

  const setParam = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, v);
    }
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchFunds(), fetchAllFundSnapshots(), fetchLatestSnapshots()])
      .then(([f, all]) => {
        setFunds(f.filter((x) => x.is_published));
        setAllSnaps(all);
      })
      .finally(() => setLoading(false));
  }, []);

  const peerMedians = useMemo(() => computePeerMedians(funds), [funds]);

  const filtered = useMemo(() => {
    let out = funds.slice();
    if (cmaOnly) out = out.filter((f) => f.cma_licensed);
    if (category) out = out.filter((f) => f.fund_type === category);
    if (risks.length > 0) out = out.filter((f) => risks.includes(f.risk_level || "low"));
    if (fastWithdraw) out = out.filter((f) => (f.withdrawal_days ?? 99) <= 2);
    if (minCap > 0) out = out.filter((f) => f.minimum_investment <= minCap);
    if (beginner) {
      out = out.filter(
        (f) => (f.risk_level || "low") === "low"
          && f.cma_licensed
          && (f.minimum_investment ?? 0) <= 5000,
      );
    }
    if (q.trim()) {
      const s = q.toLowerCase();
      out = out.filter((f) => f.name.toLowerCase().includes(s) || f.manager.toLowerCase().includes(s));
    }
    out.sort((a, b) => {
      if (sort === "yield") return b.annual_yield - a.annual_yield;
      if (sort === "fee") return (a.management_fee ?? 99) - (b.management_fee ?? 99);
      if (sort === "min") return (a.minimum_investment ?? 0) - (b.minimum_investment ?? 0);
      const sa = computeFundScore(a, peerMedians).total;
      const sb = computeFundScore(b, peerMedians).total;
      return sb - sa;
    });
    return out;
  }, [funds, cmaOnly, category, risks, fastWithdraw, minCap, beginner, q, sort, peerMedians]);

  const totalCount = funds.filter((f) => (cmaOnly ? f.cma_licensed : true)).length;
  const activeFilterCount =
    (category ? 1 : 0) + (risks.length > 0 ? 1 : 0) + (beginner ? 1 : 0) +
    (fastWithdraw ? 1 : 0) + (minCap > 0 ? 1 : 0) + (cmaOnly ? 0 : 1);

  const FilterPanel = () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Compliance</h4>
        <label className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2.5">
          <span className="text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-accent" /> CMA regulated only</span>
          <Switch checked={cmaOnly} onCheckedChange={(v) => setParam({ cma: v ? null : "off" })} />
        </label>
      </div>

      <div>
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Risk level</h4>
        <div className="flex flex-wrap gap-1.5">
          {(["low", "medium", "high"] as const).map((r) => {
            const active = risks.includes(r);
            return (
              <button
                key={r}
                onClick={() => {
                  const set = new Set(risks);
                  active ? set.delete(r) : set.add(r);
                  setParam({ risk: Array.from(set).join(",") || null });
                }}
                className={`px-3 h-8 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? r === "low"
                      ? "bg-accent text-accent-foreground border-accent"
                      : r === "medium"
                      ? "bg-warning text-warning-foreground border-warning"
                      : "bg-destructive text-destructive-foreground border-destructive"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {r === "low" ? "Low" : r === "medium" ? "Medium" : "High"}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Quick filters</h4>
        <div className="space-y-1.5">
          <ToggleRow label="Fast withdrawals (≤2 days)" active={fastWithdraw} onChange={(v) => setParam({ fast: v ? "1" : null })} />
          <ToggleRow label="Beginner friendly" active={beginner} onChange={(v) => setParam({ beginner: v ? "1" : null })} />
        </div>
      </div>

      <div>
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Minimum investment</h4>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { v: 0, l: "Any" },
            { v: 1000, l: "≤ KES 1,000" },
            { v: 5000, l: "≤ KES 5,000" },
            { v: 10000, l: "≤ KES 10,000" },
          ].map((opt) => (
            <button
              key={opt.v}
              onClick={() => setParam({ min: opt.v ? String(opt.v) : null })}
              className={`px-2 h-8 rounded-md text-[11px] font-medium border ${
                minCap === opt.v ? "bg-accent/15 text-accent border-accent/40" : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Category</h4>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setParam({ category: null })}
            className={`px-2 h-8 rounded-md text-[11px] font-medium border ${
              !category ? "bg-accent/15 text-accent border-accent/40" : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {(Object.keys(FUND_TYPE_LABELS) as FundType[]).map((c) => (
            <button
              key={c}
              onClick={() => setParam({ category: c })}
              className={`px-2 h-8 rounded-md text-[11px] font-medium border ${
                category === c ? "bg-accent/15 text-accent border-accent/40" : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {FUND_TYPE_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      <Button variant="ghost" size="sm" onClick={() => setSearchParams(new URLSearchParams(), { replace: true })} className="w-full text-xs">
        <X className="h-3 w-3 mr-1" /> Reset all filters
      </Button>
    </div>
  );

  return (
    <div className="px-4 md:px-6 py-4 md:py-6 max-w-[1500px] mx-auto">
      {/* Page header */}
      <div className="mb-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-semibold text-foreground">
              Unit Trusts &amp; Money Market Funds
              {category && (
                <span className="text-muted-foreground font-normal"> · <span className="text-accent">{FUND_TYPE_LABELS[category]}</span></span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Every CMA-regulated fund in Kenya in one place.
            </p>
          </div>
          <SectionLiveStatus section="funds" fallbackDate={new Date()} />
        </div>
      </div>

      {/* Category pills — always visible so users know what they're viewing */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-3 mb-3">
        <button
          onClick={() => setParam({ category: null })}
          className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border ${
            !category
              ? "bg-accent text-accent-foreground border-accent shadow-sm"
              : "bg-muted/60 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
          }`}
        >
          All funds
          <span className={`ml-1.5 tabular-nums ${!category ? "text-accent-foreground/70" : "text-muted-foreground/60"}`}>
            {funds.filter((f) => (cmaOnly ? f.cma_licensed : true)).length}
          </span>
        </button>
        {(Object.keys(FUND_TYPE_LABELS) as FundType[]).map((c) => {
          const count = funds.filter((f) => f.fund_type === c && (cmaOnly ? f.cma_licensed : true)).length;
          const active = category === c;
          return (
            <button
              key={c}
              onClick={() => setParam({ category: active ? null : c })}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border ${
                active
                  ? "bg-accent text-accent-foreground border-accent shadow-sm"
                  : "bg-muted/60 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
              }`}
            >
              {FUND_TYPE_LABELS[c]}
              <span className={`ml-1.5 tabular-nums ${active ? "text-accent-foreground/70" : "text-muted-foreground/60"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setParam({ q: e.target.value || null })}
            placeholder="Search by fund or manager…"
            className="pl-9 h-10 rounded-lg bg-card border-border text-[16px] md:text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setParam({ sort: e.target.value === "score" ? null : e.target.value })}
            className="h-10 rounded-lg border border-border bg-card text-xs px-3 text-foreground"
          >
            {(Object.keys(SORT_LABEL) as Sort[]).map((s) => (
              <option key={s} value={s}>Sort: {SORT_LABEL[s]}</option>
            ))}
          </select>

          {/* View toggle */}
          <div className="hidden md:inline-flex rounded-lg border border-border bg-card p-0.5">
            <button
              onClick={() => { setView("grid"); setParam({ view: null }); }}
              className={`h-8 w-8 inline-flex items-center justify-center rounded-md ${view === "grid" ? "bg-accent/15 text-accent" : "text-muted-foreground"}`}
              aria-label="Card view"
            ><LayoutGrid className="h-4 w-4" /></button>
            <button
              onClick={() => { setView("table"); setParam({ view: "table" }); }}
              className={`h-8 w-8 inline-flex items-center justify-center rounded-md ${view === "table" ? "bg-accent/15 text-accent" : "text-muted-foreground"}`}
              aria-label="Table view"
            ><List className="h-4 w-4" /></button>
          </div>

          {/* Filters popup (all breakpoints) */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 gap-1.5">
                <Filter className="h-3.5 w-3.5" /> Filters
                {activeFilterCount > 0 && <span className="ml-1 text-[10px] bg-accent text-accent-foreground rounded-full px-1.5">{activeFilterCount}</span>}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
              <div className="mt-4"><FilterPanel /></div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        Showing <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span> of {totalCount} {cmaOnly ? "CMA-regulated " : ""}funds.
      </p>

      <div>


        {/* Results */}
        <section className="min-w-0">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
              <Info className="h-6 w-6 mx-auto mb-2 opacity-50" />
              No funds match these filters. Try resetting or broadening your search.
            </div>
          ) : view === "table" ? (
            <FundsTable funds={filtered} peerMedians={peerMedians} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((f) => (
                <FundCard
                  key={f.id}
                  fund={f}
                  peerMedians={peerMedians}
                  history={allSnaps[f.id]}
                  isFavourite={user ? isFavourite(f.id) : undefined}
                  onToggleFavourite={user ? toggle : undefined}
                />
              ))}
            </div>
          )}

          <div className="mt-8 rounded-xl border border-border bg-card/60 p-4 text-xs text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground mb-1">This is information, not financial advice.</p>
            Past performance does not guarantee future returns. All funds shown are regulated by the Capital Markets Authority of Kenya. A 15% withholding tax applies on interest income.
          </div>
        </section>
      </div>
    </div>
  );
};

const ToggleRow = ({ label, active, onChange }: { label: string; active: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 cursor-pointer">
    <span className="text-xs text-foreground">{label}</span>
    <Switch checked={active} onCheckedChange={onChange} />
  </label>
);

const FundsTable = ({ funds, peerMedians }: { funds: FundFromDB[]; peerMedians: Record<string, number> }) => (
  <div className="overflow-x-auto rounded-xl border border-border bg-card">
    <table className="w-full text-sm">
      <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
        <tr>
          <th className="text-left px-3 py-2 font-semibold">Fund</th>
          <th className="text-center px-3 py-2 font-semibold">Score</th>
          <th className="text-right px-3 py-2 font-semibold">Annual</th>
          <th className="text-right px-3 py-2 font-semibold">Daily</th>
          <th className="text-right px-3 py-2 font-semibold hidden sm:table-cell">Min</th>
          <th className="text-right px-3 py-2 font-semibold hidden md:table-cell">Fee</th>
          <th className="text-left px-3 py-2 font-semibold hidden md:table-cell">Withdraw</th>
          <th className="text-left px-3 py-2 font-semibold hidden lg:table-cell">Risk</th>
        </tr>
      </thead>
      <tbody>
        {funds.map((f) => {
          const sc = computeFundScore(f, peerMedians);
          return (
            <tr key={f.id} className="border-t border-border/60 hover:bg-muted/20">
              <td className="px-3 py-2.5">
                <Link to={`/funds/${f.slug}`} className="block min-w-0">
                  <div className="font-medium text-foreground truncate">{f.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{f.manager}</div>
                </Link>
              </td>
              <td className="px-3 py-2.5 text-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="inline-block"><FundScoreDiamond score={sc} size={36} /></div>
                  </TooltipTrigger>
                  <TooltipContent>Kenya Fund Score: {sc.total}/100</TooltipContent>
                </Tooltip>
              </td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-accent font-semibold">{f.annual_yield.toFixed(2)}%</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums">{f.daily_yield.toFixed(3)}%</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums hidden sm:table-cell">{f.minimum_investment.toLocaleString()}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums hidden md:table-cell">{f.management_fee?.toFixed(2)}%</td>
              <td className="px-3 py-2.5 hidden md:table-cell text-muted-foreground">{f.withdrawal_time}</td>
              <td className="px-3 py-2.5 hidden lg:table-cell">
                <Badge variant="outline" className="text-[10px] capitalize">{f.risk_level}</Badge>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default FundsDirectoryPage;
