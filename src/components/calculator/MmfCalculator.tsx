import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  TrendingUp,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Search,
  ExternalLink,
  ShieldCheck,
  Building2,
  Landmark,
  X,
} from "lucide-react";
import { fetchFunds, FUND_TYPE_LABELS, type FundFromDB, type FundType } from "@/lib/api";
import { FALLBACK_KENYAN_FUNDS } from "@/lib/fundDataFallback";
import CalculatorTrajectoryChart, { type TrajectoryPoint } from "./CalculatorTrajectoryChart";

const WITHHOLDING_TAX_RATE = 0.15; // 15% KRA Withholding Tax on Kenyan fund interest

type FundCategoryFilter = "all" | "money_market" | "fixed_income" | "other";

const INITIAL_PRESETS = [
  { label: "10K", value: 10_000 },
  { label: "50K", value: 50_000 },
  { label: "100K", value: 100_000 },
  { label: "250K", value: 250_000 },
  { label: "500K", value: 500_000 },
  { label: "1M", value: 1_000_000 },
];

const MONTHLY_PRESETS = [
  { label: "None", value: 0 },
  { label: "2.5K", value: 2_500 },
  { label: "5K", value: 5_000 },
  { label: "10K", value: 10_000 },
  { label: "25K", value: 25_000 },
  { label: "50K", value: 50_000 },
];

const PERIOD_PRESETS = [
  { label: "3 Mo", value: 3 },
  { label: "6 Mo", value: 6 },
  { label: "1 Yr", value: 12 },
  { label: "2 Yrs", value: 24 },
  { label: "3 Yrs", value: 36 },
  { label: "5 Yrs", value: 60 },
];

const fmt = (n: number) => Math.round(n).toLocaleString("en-KE");

export const MmfCalculator = () => {
  const [funds, setFunds] = useState<FundFromDB[]>(FALLBACK_KENYAN_FUNDS);
  const [selectedFundId, setSelectedFundId] = useState<string | null>(null);
  const [fundSearch, setFundSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<FundCategoryFilter>("money_market");
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  // Core Calculator Inputs
  const [amount, setAmount] = useState(100_000);
  const [monthly, setMonthly] = useState(10_000);
  const [annualYield, setAnnualYield] = useState(14.0);
  const [months, setMonths] = useState(12);
  const [fee, setFee] = useState(2.0);
  const [compound, setCompound] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Load real funds list
  useEffect(() => {
    fetchFunds()
      .then((data) => {
        if (data && data.length > 0) {
          const sorted = [...data].sort((a, b) => (b.annual_yield || 0) - (a.annual_yield || 0));
          setFunds(sorted);
        }
      })
      .catch(() => {
        // Fallback already in state
      });
  }, []);

  const selectedFund = useMemo(() => {
    if (!selectedFundId || selectedFundId === "custom") return null;
    return funds.find((f) => f.id === selectedFundId) || null;
  }, [selectedFundId, funds]);

  // Top popular Kenyan MMFs for quick 1-tap selection on the card
  const popularFunds = useMemo(() => {
    const mmfs = funds.filter(
      (f) => f.fund_type === "money_market" && (f.annual_yield || 0) > 0 && (f.annual_yield || 0) < 50
    );
    const preferredNames = ["lofty", "etica", "sanlam", "cic", "britam", "ncba"];
    const preferred: FundFromDB[] = [];
    for (const name of preferredNames) {
      const found = mmfs.find(
        (f) => f.name.toLowerCase().includes(name) || f.slug?.toLowerCase().includes(name)
      );
      if (found && !preferred.some((p) => p.id === found.id)) {
        preferred.push(found);
      }
    }
    if (preferred.length >= 3) {
      return preferred.slice(0, 4);
    }
    return mmfs.slice(0, 4);
  }, [funds]);

  // When a user picks a fund, auto-populate yield and management fee
  const handleSelectFund = (fund: FundFromDB | null) => {
    if (!fund) {
      setSelectedFundId("custom");
    } else {
      setSelectedFundId(fund.id);
      if (typeof fund.annual_yield === "number" && fund.annual_yield > 0) {
        setAnnualYield(Number(fund.annual_yield.toFixed(2)));
      }
      if (typeof fund.management_fee === "number") {
        setFee(Number(fund.management_fee.toFixed(2)));
      }
    }
    setIsSelectorOpen(false);
  };

  // Comprehensive filtering across ALL funds without limiting slice
  const filteredFunds = useMemo(() => {
    const q = fundSearch.trim().toLowerCase();
    return funds.filter((f) => {
      if (f.fund_type === "money_market" && (f.annual_yield || 0) > 50) return false;
      if (categoryFilter === "money_market" && f.fund_type !== "money_market") return false;
      if (categoryFilter === "fixed_income" && f.fund_type !== "fixed_income") return false;
      if (
        categoryFilter === "other" &&
        (f.fund_type === "money_market" || f.fund_type === "fixed_income")
      ) {
        return false;
      }

      if (!q) return true;
      const typeLabel = (FUND_TYPE_LABELS[f.fund_type as FundType] || f.fund_type || "").toLowerCase();
      return (
        f.name.toLowerCase().includes(q) ||
        (f.manager && f.manager.toLowerCase().includes(q)) ||
        typeLabel.includes(q)
      );
    });
  }, [funds, fundSearch, categoryFilter]);

  // Counts for filter pills
  const counts = useMemo(() => {
    const total = funds.length;
    const mm = funds.filter((f) => f.fund_type === "money_market").length;
    const fi = funds.filter((f) => f.fund_type === "fixed_income").length;
    const other = total - mm - fi;
    return { all: total, money_market: mm, fixed_income: fi, other };
  }, [funds]);

  // Perform calculation & build trajectory series
  const { results, trajectory } = useMemo(() => {
    const rate = (annualYield || 0) / 100;
    const monthlyRate = rate / 12;
    const feeRate = (fee || 0) / 100;

    let totalGross = amount || 0;
    let totalNet = amount || 0;
    let totalPrincipal = amount || 0;
    let totalTaxDeducted = 0;

    const traj: TrajectoryPoint[] = [
      {
        periodLabel: "Start",
        principal: totalPrincipal,
        netTotal: totalPrincipal,
        netInterest: 0,
        taxDeducted: 0,
      },
    ];

    for (let m = 1; m <= months; m++) {
      const grossInterest = compound ? totalGross * monthlyRate : (amount || 0) * monthlyRate;
      const taxOnInterest = grossInterest * WITHHOLDING_TAX_RATE;
      const netInterestThisMonth = grossInterest - taxOnInterest;

      totalGross += grossInterest + (monthly || 0);
      totalNet += netInterestThisMonth + (monthly || 0);
      totalPrincipal += (monthly || 0);
      totalTaxDeducted += taxOnInterest;

      if (m <= 12 || m % 3 === 0 || m === months) {
        const estFeeSoFar = ((totalGross + (amount || 0)) / 2) * feeRate * (m / 12);
        const currentNetAfterFee = Math.max(totalPrincipal, totalNet - estFeeSoFar);
        traj.push({
          periodLabel: m < 12 ? `M${m}` : `${(m / 12).toFixed(m % 12 === 0 ? 0 : 1)}Y`,
          principal: Math.round(totalPrincipal),
          netTotal: Math.round(currentNetAfterFee),
          netInterest: Math.max(0, Math.round(currentNetAfterFee - totalPrincipal)),
          taxDeducted: Math.round(totalTaxDeducted),
        });
      }
    }

    const totalContributions = totalPrincipal;
    const grossEarnings = Math.max(0, Math.round(totalGross - totalContributions));
    const managementFeeCost = Math.round(
      ((totalGross + (amount || 0)) / 2) * feeRate * (months / 12)
    );
    const netEarnings = Math.max(0, Math.round(totalNet - totalContributions - managementFeeCost));
    const finalValue = Math.round(totalContributions + netEarnings);

    const monthlyPassiveCashflow = Math.round(
      finalValue * monthlyRate * (1 - WITHHOLDING_TAX_RATE)
    );

    return {
      results: {
        totalContributions,
        grossEarnings,
        totalTax: Math.round(totalTaxDeducted),
        managementFeeCost,
        netEarnings,
        finalValue,
        monthlyPassiveCashflow,
      },
      trajectory: traj,
    };
  }, [amount, monthly, annualYield, months, fee, compound]);

  const returnPct =
    results.totalContributions > 0
      ? ((results.netEarnings / results.totalContributions) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6">
      {/* ─── 1. FUND SELECTOR (POP-UP FROM BOTTOM ON CLICK) ─── */}
      <div className="rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsSelectorOpen(true)}
            aria-label="Open fund selector"
            className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border transition-opacity hover:opacity-90 ${
              selectedFund
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                : selectedFundId === "custom"
                ? "bg-muted text-muted-foreground border-border/80"
                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
            }`}
          >
            {selectedFund ? (
              <Building2 className="h-5 w-5" />
            ) : selectedFundId === "custom" ? (
              <Sparkles className="h-5 w-5" />
            ) : (
              <Landmark className="h-5 w-5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsSelectorOpen(true)}
            className="flex-1 h-10 px-3 sm:px-3.5 rounded-xl border border-border/80 bg-background hover:bg-muted/50 flex items-center justify-between gap-2 text-left transition-colors min-w-0 shadow-2xs"
          >
            <div className="min-w-0 pr-2">
              {selectedFund ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 shrink-0">
                    {FUND_TYPE_LABELS[selectedFund.fund_type as FundType] || "MMF"}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                    {selectedFund.name}
                  </span>
                </div>
              ) : selectedFundId === "custom" ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded bg-muted text-muted-foreground shrink-0">
                    Manual
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                    Custom Fund Projection
                  </span>
                </div>
              ) : (
                <span className="text-xs sm:text-sm font-semibold text-muted-foreground truncate">
                  Select a Fund
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
              {selectedFund && selectedFund.annual_yield ? (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedFund.annual_yield.toFixed(2)}% EAR
                </span>
              ) : (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Choose
                </span>
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        </div>

        {/* Selected Fund Summary Metrics */}
        {selectedFund && (
          <div className="flex items-center gap-2 pt-2.5 mt-2.5 border-t border-border/50 text-[11px] text-muted-foreground flex-wrap">
            <span>
              Annual Yield:{" "}
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                {selectedFund.annual_yield ? `${selectedFund.annual_yield.toFixed(2)}% EAR` : "—"}
              </strong>
            </span>
            <span>•</span>
            <span>
              Daily Yield:{" "}
              <strong className="text-foreground">
                {selectedFund.daily_yield ? `${selectedFund.daily_yield.toFixed(4)}%` : "—"}
              </strong>
            </span>
            <span>•</span>
            <span>
              Mgmt Fee:{" "}
              <strong className="text-foreground">
                {selectedFund.management_fee ? `${selectedFund.management_fee}%` : "—"}
              </strong>
            </span>
            <span>•</span>
            <span>
              Min Deposit:{" "}
              <strong className="text-foreground">
                KSh {fmt(selectedFund.minimum_investment || 1000)}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => handleSelectFund(null)}
              className="text-xs text-muted-foreground hover:text-foreground ml-auto font-medium transition-colors"
            >
              Reset to custom
            </button>
          </div>
        )}

        {/* Custom Mode Helper Row */}
        {selectedFundId === "custom" && (
          <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-border/50 text-[11px] text-muted-foreground flex-wrap gap-2">
            <span>Manual rate model. Edit expected yield, period, and fees below.</span>
            <button
              type="button"
              onClick={() => setIsSelectorOpen(true)}
              className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline shrink-0 ml-auto"
            >
              Browse 30+ MMFs →
            </button>
          </div>
        )}

        {/* Unselected Initial State: Quick Popular Fund Pills */}
        {!selectedFund && selectedFundId !== "custom" && (
          <div className="flex items-center gap-1.5 pt-2.5 mt-2.5 border-t border-border/50 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-semibold text-muted-foreground shrink-0 mr-1">
              Popular:
            </span>
            {popularFunds.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => handleSelectFund(f)}
                className="px-2.5 py-1 rounded-lg border border-border/80 bg-background/80 hover:bg-muted text-[11px] font-semibold text-foreground whitespace-nowrap transition-colors flex items-center gap-1 shrink-0"
              >
                <span>{f.name.replace(/Money Market Fund|MMF/i, "").trim()}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {f.annual_yield ? `${f.annual_yield.toFixed(1)}%` : ""}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleSelectFund(null)}
              className="px-2.5 py-1 rounded-lg border border-dashed border-border/90 bg-muted/30 hover:bg-muted text-[11px] font-semibold text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors shrink-0 ml-auto"
            >
              Custom Rate
            </button>
          </div>
        )}
      </div>

      {/* ─── BOTTOM POP-UP SHEET FOR FUND SELECTION ─── */}
      <Sheet open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
        <SheetContent
          side="bottom"
          hideCloseButton
          className="rounded-t-3xl border-t border-border max-h-[85vh] overflow-y-auto px-4 sm:px-6 pt-3 pb-8 max-w-2xl mx-auto bg-background"
        >
          {/* Grab Handle */}
          <div className="mx-auto h-1.5 w-12 rounded-full bg-muted-foreground/30 mb-3" />

          <SheetHeader className="text-left pb-2 space-y-1">
            <SheetTitle className="text-base sm:text-lg font-bold text-foreground">
              Select CMA-Regulated Fund
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              Choose from all licensed money market and fixed income funds in Kenya
            </p>
          </SheetHeader>

          {/* Search Bar */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search all funds or managers (e.g. Sanlam, CIC, Etica)..."
              value={fundSearch}
              onChange={(e) => setFundSearch(e.target.value)}
              className="h-10 pl-9 text-xs sm:text-sm rounded-xl"
              autoFocus
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 text-xs">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-full font-bold shrink-0 transition-colors ${
                categoryFilter === "all"
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All Funds ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("money_market")}
              className={`px-3 py-1.5 rounded-full font-bold shrink-0 transition-colors ${
                categoryFilter === "money_market"
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              MMFs ({counts.money_market})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("fixed_income")}
              className={`px-3 py-1.5 rounded-full font-bold shrink-0 transition-colors ${
                categoryFilter === "fixed_income"
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Fixed Income ({counts.fixed_income})
            </button>
            {counts.other > 0 && (
              <button
                type="button"
                onClick={() => setCategoryFilter("other")}
                className={`px-3 py-1.5 rounded-full font-bold shrink-0 transition-colors ${
                  categoryFilter === "other"
                    ? "bg-foreground text-background shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                Other ({counts.other})
              </button>
            )}
          </div>

          {/* Fund List */}
          <div className="space-y-1.5 mt-1 max-h-[50vh] overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => handleSelectFund(null)}
              className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between border ${
                selectedFundId === "custom"
                  ? "border-emerald-500 bg-emerald-500/10 text-foreground font-bold"
                  : "border-border/70 hover:bg-muted/50 text-foreground"
              }`}
            >
              <div>
                <span className="font-bold text-xs sm:text-sm">Custom Fund Projection</span>
                <p className="text-[11px] text-muted-foreground">Type in any expected yield and fee manually</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted">Manual</span>
            </button>

            {filteredFunds.map((f) => {
              const isMmf = f.fund_type === "money_market";
              const isFi = f.fund_type === "fixed_income";
              const badgeLabel = isMmf ? "MMF" : isFi ? "Fixed Income" : "Fund";
              const isSelected = selectedFundId === f.id;

              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleSelectFund(f)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between border ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/10 shadow-xs"
                      : "border-border/60 hover:bg-muted/50"
                  }`}
                >
                  <div className="truncate pr-3">
                    <div className="truncate font-bold text-xs sm:text-sm flex items-center gap-2">
                      <span className="truncate">{f.name}</span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold shrink-0 ${
                          isMmf
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : isFi
                            ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {badgeLabel}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {f.manager} • Min KSh {fmt(f.minimum_investment || 1000)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black text-sm sm:text-base text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {f.annual_yield ? `${f.annual_yield.toFixed(2)}%` : "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">annual EAR</div>
                  </div>
                </button>
              );
            })}

            {filteredFunds.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-xs">
                No funds found matching "{fundSearch}"
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── 2. CALCULATOR CONTROLS & INPUTS (FIRST) ─── */}
      <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Calculator Controls
        </h3>

        {/* Initial Amount */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="mmf-amount" className="text-xs font-semibold text-foreground">
              Initial Deposit (KSh)
            </Label>
            <span className="text-xs font-bold text-foreground tabular-nums">
              KSh {fmt(amount)}
            </span>
          </div>
          <Input
            id="mmf-amount"
            type="number"
            inputMode="numeric"
            value={amount || ""}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            className="h-11 rounded-xl bg-background border-border/80 text-sm font-semibold"
            placeholder="e.g. 100000"
          />
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {INITIAL_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setAmount(p.value)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 ${
                  amount === p.value
                    ? "bg-foreground text-background shadow-xs font-bold"
                    : "border border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Monthly Contribution */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="mmf-monthly" className="text-xs font-semibold text-foreground">
              Monthly Top-up (KSh)
            </Label>
            <span className="text-xs font-bold text-foreground tabular-nums">
              KSh {fmt(monthly)} / mo
            </span>
          </div>
          <Input
            id="mmf-monthly"
            type="number"
            inputMode="numeric"
            value={monthly || ""}
            onChange={(e) => setMonthly(Math.max(0, Number(e.target.value)))}
            className="h-11 rounded-xl bg-background border-border/80 text-sm font-semibold"
            placeholder="e.g. 10000"
          />
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {MONTHLY_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setMonthly(p.value)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 ${
                  monthly === p.value
                    ? "bg-foreground text-background shadow-xs font-bold"
                    : "border border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Expected Yield */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="mmf-yield" className="text-xs font-semibold text-foreground">
              Expected Annual Yield (% p.a.)
            </Label>
            <div className="flex items-center gap-2">
              {selectedFund && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold hidden sm:inline truncate max-w-[150px]">
                  {selectedFund.name}
                </span>
              )}
              {!selectedFund && selectedFundId !== "custom" && (
                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                  (Market Benchmark)
                </span>
              )}
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap shrink-0">
                {annualYield}% p.a.
              </span>
            </div>
          </div>
          <Input
            id="mmf-yield"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={annualYield || ""}
            onChange={(e) => {
              setAnnualYield(Math.max(0, Number(e.target.value)));
              if (selectedFundId !== "custom") setSelectedFundId("custom");
            }}
            className="h-11 rounded-xl bg-background border-border/80 text-sm font-semibold"
            placeholder="e.g. 14.5"
          />
        </div>

        {/* Investment Horizon */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-foreground">Investment Horizon</Label>
            <span className="text-xs font-bold text-foreground">
              {months} months ({months >= 12 ? `${(months / 12).toFixed(1)} years` : "under 1 year"})
            </span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {PERIOD_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setMonths(p.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                  months === p.value
                    ? "bg-foreground text-background shadow-xs font-bold"
                    : "border border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Compounding & Management Fee */}
        <div className="pt-2 border-t border-border/50 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-foreground">Compound Monthly Interest</p>
              <p className="text-[11px] text-muted-foreground">Reinvest monthly interest back into the principal</p>
            </div>
            <Switch checked={compound} onCheckedChange={setCompound} />
          </div>

          <div className="flex items-center justify-between pt-1">
            <Label htmlFor="mmf-fee" className="text-xs font-medium text-muted-foreground">
              Fund Management Fee (% p.a.)
            </Label>
            <div className="w-24">
              <Input
                id="mmf-fee"
                type="number"
                inputMode="decimal"
                step="0.1"
                value={fee}
                onChange={(e) => setFee(Math.max(0, Number(e.target.value)))}
                className="h-8 rounded-lg bg-background text-xs text-right font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. PROJECTIONS & WEALTH TRAJECTORY (SECOND) ─── */}
      <div className="rounded-3xl border border-border/80 bg-gradient-to-b from-card via-card/95 to-card/70 p-5 sm:p-7 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              <span>Projected Balance</span>
            </div>
            <div className="text-3xl sm:text-5xl font-black tracking-tight text-foreground tabular-nums mt-1.5">
              KSh {fmt(results.finalValue)}
            </div>
          </div>

          <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <TrendingUp className="h-3.5 w-3.5" />
              +KSh {fmt(results.netEarnings)} ({returnPct}%)
            </span>
            <span className="text-xs text-muted-foreground">
              Net profit in pocket after 15% tax
            </span>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/50">
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-3">
            <p className="text-[11px] font-medium text-muted-foreground">Total Invested</p>
            <p className="text-sm sm:text-base font-bold text-foreground tabular-nums mt-0.5">
              KSh {fmt(results.totalContributions)}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-emerald-500/10 p-3">
            <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">Net Returns</p>
            <p className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
              +KSh {fmt(results.netEarnings)}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-3">
            <p className="text-[11px] font-medium text-muted-foreground">Monthly Passive Cashflow</p>
            <p className="text-sm sm:text-base font-bold text-foreground tabular-nums mt-0.5">
              ~KSh {fmt(results.monthlyPassiveCashflow)}/mo
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-3">
            <p className="text-[11px] font-medium text-muted-foreground">KRA Tax (15% WHT)</p>
            <p className="text-sm sm:text-base font-bold text-destructive tabular-nums mt-0.5">
              -KSh {fmt(results.totalTax)}
            </p>
          </div>
        </div>

        {/* Visual Trajectory Chart */}
        <div className="pt-2">
          <CalculatorTrajectoryChart data={trajectory} height={230} />
        </div>

        {/* Collapsible Tax & Fee Breakdown */}
        <div className="pt-2 border-t border-border/50">
          <button
            type="button"
            onClick={() => setShowBreakdown((prev) => !prev)}
            className="w-full flex items-center justify-between py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Detailed statutory tax & fee deduction</span>
            {showBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showBreakdown && (
            <div className="mt-3 space-y-2 pt-2 border-t border-border/40 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Interest Earned</span>
                <span className="font-semibold text-foreground">KSh {fmt(results.grossEarnings)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">KRA Withholding Tax (15% statutory)</span>
                <span className="font-semibold text-destructive">-KSh {fmt(results.totalTax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fund Manager Fee ({fee}% p.a.)</span>
                <span className="font-semibold text-destructive">-KSh {fmt(results.managementFeeCost)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border/40 font-bold">
                <span>Net Profit Received</span>
                <span className="text-emerald-600 dark:text-emerald-400">KSh {fmt(results.netEarnings)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MmfCalculator;
