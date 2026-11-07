import { useState, useMemo } from "react";
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
  Landmark,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { useTreasuryData } from "@/hooks/useTreasuryData";
import CalculatorTrajectoryChart, { type TrajectoryPoint } from "./CalculatorTrajectoryChart";

interface SecurityOption {
  id: string;
  name: string;
  category: "tbill" | "bond";
  days: number;
  tenorLabel: string;
  defaultRate: number;
  isTaxFree: boolean;
  minInvestment: number;
  description: string;
}

const DEFAULT_SECURITIES: SecurityOption[] = [
  {
    id: "tbill-91",
    name: "91-Day Treasury Bill",
    category: "tbill",
    days: 91,
    tenorLabel: "91 Days (~3 Months)",
    defaultRate: 14.8,
    isTaxFree: false,
    minInvestment: 50_000,
    description: "Shortest government money market paper. High liquidity, settled via CBK DhowCSD.",
  },
  {
    id: "tbill-182",
    name: "182-Day Treasury Bill",
    category: "tbill",
    days: 182,
    tenorLabel: "182 Days (~6 Months)",
    defaultRate: 15.2,
    isTaxFree: false,
    minInvestment: 50_000,
    description: "Medium-tenor government paper. Balanced duration and attractive discount rate.",
  },
  {
    id: "tbill-364",
    name: "364-Day Treasury Bill",
    category: "tbill",
    days: 364,
    tenorLabel: "364 Days (~1 Year)",
    defaultRate: 15.6,
    isTaxFree: false,
    minInvestment: 50_000,
    description: "Benchmark 1-year government debt instrument. Highest risk-free rate among T-bills.",
  },
  {
    id: "bond-ifb",
    name: "Infrastructure Bond (IFB)",
    category: "bond",
    days: 365,
    tenorLabel: "Multi-Year (Semi-annual Coupon)",
    defaultRate: 16.5,
    isTaxFree: true,
    minInvestment: 100_000,
    description: "100% Tax-Free under Kenyan law! 0% Withholding Tax on coupon interest.",
  },
  {
    id: "bond-fxd",
    name: "Fixed-Rate Treasury Bond (FXD)",
    category: "bond",
    days: 365,
    tenorLabel: "Multi-Year (Semi-annual Coupon)",
    defaultRate: 16.0,
    isTaxFree: false,
    minInvestment: 50_000,
    description: "Semi-annual coupon payments backed by the National Treasury of Kenya.",
  },
];

const AMOUNT_PRESETS = [
  { label: "50K (Min)", value: 50_000 },
  { label: "100K", value: 100_000 },
  { label: "250K", value: 250_000 },
  { label: "500K", value: 500_000 },
  { label: "1M", value: 1_000_000 },
  { label: "2.5M", value: 2_500_000 },
];

const fmt = (n: number) => Math.round(n).toLocaleString("en-KE");

export const TBillCalculator = () => {
  const { data: treasuryData, isLoading } = useTreasuryData();

  const [selectedSecId, setSelectedSecId] = useState<string>("tbill-364");
  const [filterCategory, setFilterCategory] = useState<"all" | "tbill" | "bond">("all");
  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false);
  const [amount, setAmount] = useState<number>(100_000);
  const [customRate, setCustomRate] = useState<number | null>(null);
  const [reinvestRollover, setReinvestRollover] = useState<boolean>(true);
  const [rolloverYears, setRolloverYears] = useState<number>(1);
  const [showBreakdown, setShowBreakdown] = useState<boolean>(false);

  // Sync with live treasury data from CBK
  const securities = useMemo(() => {
    return DEFAULT_SECURITIES.map((sec) => {
      let liveRate = sec.defaultRate;
      if (treasuryData?.tbills) {
        if (sec.id === "tbill-91") {
          const t91 = treasuryData.tbills.find((t) => t.days === 91);
          if (t91?.averageYield) liveRate = t91.averageYield;
        } else if (sec.id === "tbill-182") {
          const t182 = treasuryData.tbills.find((t) => t.days === 182);
          if (t182?.averageYield) liveRate = t182.averageYield;
        } else if (sec.id === "tbill-364") {
          const t364 = treasuryData.tbills.find((t) => t.days === 364);
          if (t364?.averageYield) liveRate = t364.averageYield;
        }
      }
      if (treasuryData?.bonds && sec.id === "bond-ifb") {
        const ifb = treasuryData.bonds.find((b) => b.status === "Tax-Free");
        if (ifb?.couponRate) liveRate = ifb.couponRate;
      }
      return {
        ...sec,
        liveRate: Number(liveRate.toFixed(2)),
      };
    });
  }, [treasuryData]);

  const displayedSecurities = useMemo(() => {
    if (filterCategory === "all") return securities;
    return securities.filter((s) => s.category === filterCategory);
  }, [securities, filterCategory]);

  const activeSecurity = useMemo(() => {
    return securities.find((s) => s.id === selectedSecId) || securities[2];
  }, [securities, selectedSecId]);

  const rate = customRate !== null ? customRate : activeSecurity.liveRate;
  const isTaxFree = activeSecurity.isTaxFree;
  const taxRate = isTaxFree ? 0 : 0.15; // 15% standard WHT or 0% for IFB

  // Calculation logic
  const { results, trajectory } = useMemo(() => {
    const principal = amount || 0;
    const annualRatePct = rate / 100;
    const days = activeSecurity.days;
    const cyclesPerYear = 365 / days;

    const singleGrossReturn = principal * annualRatePct * (days / 365);
    const singleTax = singleGrossReturn * taxRate;
    const singleNetReturn = singleGrossReturn - singleTax;
    const singleMaturityValue = principal + singleNetReturn;

    const totalPeriods = Math.max(1, Math.round(rolloverYears * cyclesPerYear));
    let curBal = principal;
    let totalTaxDeducted = 0;

    const traj: TrajectoryPoint[] = [
      {
        periodLabel: "Start",
        principal,
        netTotal: principal,
        netInterest: 0,
        taxDeducted: 0,
      },
    ];

    for (let p = 1; p <= totalPeriods; p++) {
      const grossPeriodInterest = reinvestRollover
        ? curBal * annualRatePct * (days / 365)
        : principal * annualRatePct * (days / 365);
      const taxThisPeriod = grossPeriodInterest * taxRate;
      const netPeriodInterest = grossPeriodInterest - taxThisPeriod;

      totalTaxDeducted += taxThisPeriod;
      curBal = reinvestRollover ? curBal + netPeriodInterest : principal + (netPeriodInterest * p);

      const daysElapsed = Math.round(p * days);
      const label =
        daysElapsed < 365
          ? `${daysElapsed}d`
          : `${(daysElapsed / 365).toFixed(daysElapsed % 365 === 0 ? 0 : 1)}Y`;

      traj.push({
        periodLabel: label,
        principal,
        netTotal: Math.round(curBal),
        netInterest: Math.max(0, Math.round(curBal - principal)),
        taxDeducted: Math.round(totalTaxDeducted),
      });
    }

    const finalValue = Math.round(curBal);
    const netEarnings = Math.max(0, Math.round(finalValue - principal));
    const grossEarnings = Math.round(netEarnings + totalTaxDeducted);
    const effectiveNetAPY = Number(
      (annualRatePct * (1 - taxRate) * 100).toFixed(2)
    );

    return {
      results: {
        principal,
        singleGrossReturn: Math.round(singleGrossReturn),
        singleTax: Math.round(singleTax),
        singleNetReturn: Math.round(singleNetReturn),
        singleMaturityValue: Math.round(singleMaturityValue),
        finalValue,
        netEarnings,
        grossEarnings,
        totalTaxDeducted: Math.round(totalTaxDeducted),
        effectiveNetAPY,
      },
      trajectory: traj,
    };
  }, [amount, rate, activeSecurity, taxRate, reinvestRollover, rolloverYears]);

  const returnPct =
    results.principal > 0
      ? ((results.netEarnings / results.principal) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6">
      {/* ─── 1. SOVEREIGN SECURITY SELECTOR (POP-UP FROM BOTTOM ON MOBILE) ─── */}
      <div className="rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsSelectorOpen(true)}
            className="flex-1 flex items-center justify-between gap-3 text-left hover:opacity-90 transition-opacity min-w-0"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <Landmark className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {activeSecurity.category === "tbill" ? "CBK T-Bill" : "Treasury Bond"}
                  </span>
                  <span>•</span>
                  <span className="truncate">
                    {activeSecurity.isTaxFree ? "100% Tax-Exempt (IFB)" : "15% KRA WHT"}
                  </span>
                </div>
                <p className="text-sm sm:text-base font-bold text-foreground truncate">
                  {activeSecurity.name} ({rate}% p.a.)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 pl-1">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hidden sm:inline">
                Change Paper
              </span>
              <div className="h-8 px-2.5 rounded-lg border border-border/80 bg-background flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
                <span className="text-[11px]">Choose</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
          </button>
        </div>

        {/* Desktop Quick Paper Tabs */}
        <div className="hidden sm:grid sm:grid-cols-5 gap-2 pt-3 mt-3 border-t border-border/50">
          {securities.map((sec) => {
            const isSelected = selectedSecId === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => {
                  setSelectedSecId(sec.id);
                  setCustomRate(null);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-500/10 shadow-2xs font-bold text-foreground"
                    : "border-border/70 hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <div className="text-[11px] font-bold truncate">{sec.name}</div>
                <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {sec.liveRate}%
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {sec.isTaxFree ? "Tax-Free" : "15% WHT"}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 pt-2.5 mt-2.5 border-t border-border/50 text-[11px] text-muted-foreground flex-wrap sm:hidden">
          <span>Tenor: <strong className="text-foreground">{activeSecurity.tenorLabel}</strong></span>
          <span>•</span>
          <span>Tax: <strong className={activeSecurity.isTaxFree ? "text-emerald-500 font-bold" : "text-foreground"}>{activeSecurity.isTaxFree ? "Tax-Exempt (0%)" : "15% WHT"}</strong></span>
          <span>•</span>
          <span>Min: <strong className="text-foreground">KSh {fmt(activeSecurity.minInvestment)}</strong></span>
        </div>
      </div>

      {/* ─── BOTTOM POP-UP SHEET FOR SOVEREIGN SECURITIES ─── */}
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
              Select CBK Sovereign Security
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              Direct sovereign debt instruments issued and guaranteed by Central Bank of Kenya
            </p>
          </SheetHeader>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 py-2 text-xs">
            <button
              type="button"
              onClick={() => setFilterCategory("all")}
              className={`px-3 py-1.5 rounded-full font-bold shrink-0 transition-colors ${
                filterCategory === "all"
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              All Securities ({securities.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory("tbill")}
              className={`px-3 py-1.5 rounded-full font-bold shrink-0 transition-colors ${
                filterCategory === "tbill"
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              T-Bills (3)
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory("bond")}
              className={`px-3 py-1.5 rounded-full font-bold shrink-0 transition-colors ${
                filterCategory === "bond"
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Bonds (2)
            </button>
          </div>

          {/* Securities List */}
          <div className="space-y-2 mt-1">
            {displayedSecurities.map((sec) => {
              const isSelected = selectedSecId === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    setSelectedSecId(sec.id);
                    setCustomRate(null);
                    setIsSelectorOpen(false);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30"
                      : "border-border/70 hover:bg-muted/40 bg-card"
                  }`}
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{sec.name}</span>
                      {sec.isTaxFree && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold uppercase">
                          Tax-Free (0% WHT)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{sec.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      <span>Tenor: <strong className="text-foreground">{sec.tenorLabel}</strong></span>
                      <span>•</span>
                      <span>Min: <strong className="text-foreground">KSh {fmt(sec.minInvestment)}</strong></span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {sec.liveRate}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">CBK Auction</div>
                  </div>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── 2. CALCULATOR CONTROLS & INPUTS (FIRST) ─── */}
      <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Auction Parameters
        </h3>

        {/* Amount Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="tbill-amount" className="text-xs font-semibold text-foreground">
              Face Value / Investment Amount (KSh)
            </Label>
            <span className="text-xs font-bold text-foreground tabular-nums">
              KSh {fmt(amount)}
            </span>
          </div>
          <Input
            id="tbill-amount"
            type="number"
            inputMode="numeric"
            value={amount || ""}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            className="h-11 rounded-xl bg-background border-border/80 text-sm font-semibold"
            placeholder="e.g. 100000"
          />
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {AMOUNT_PRESETS.map((p) => (
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
          {amount < activeSecurity.minInvestment && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              Note: CBK statutory minimum investment for {activeSecurity.name} is KSh {fmt(activeSecurity.minInvestment)}.
            </p>
          )}
        </div>

        {/* Auction Yield Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="tbill-rate" className="text-xs font-semibold text-foreground">
              Auction Rate / Coupon Rate (% p.a.)
            </Label>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {rate}% p.a.
            </span>
          </div>
          <Input
            id="tbill-rate"
            type="number"
            inputMode="decimal"
            step="0.05"
            value={rate || ""}
            onChange={(e) => setCustomRate(Math.max(0, Number(e.target.value)))}
            className="h-11 rounded-xl bg-background border-border/80 text-sm font-semibold"
            placeholder="e.g. 15.5"
          />
        </div>

        {/* Rollover / Holding Horizon */}
        <div className="pt-2 border-t border-border/50 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-foreground">Reinvest / Roll Over on Maturity</p>
              <p className="text-[11px] text-muted-foreground">
                Compound returns by rolling over principal + interest automatically upon auction maturity
              </p>
            </div>
            <Switch checked={reinvestRollover} onCheckedChange={setReinvestRollover} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">Total Holding Horizon</Label>
              <span className="text-xs font-bold text-foreground">
                {rolloverYears} {rolloverYears === 1 ? "Year" : "Years"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[1, 2, 3, 5].map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setRolloverYears(y)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                    rolloverYears === y
                      ? "bg-foreground text-background shadow-xs font-bold"
                      : "border border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {y} {y === 1 ? "Year" : "Years"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. PROJECTIONS & RESULTS (SECOND) ─── */}
      <div className="rounded-3xl border border-border/80 bg-gradient-to-b from-card via-card/95 to-card/70 p-5 sm:p-7 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              <span>
                {reinvestRollover && rolloverYears > 1
                  ? `${rolloverYears}-Year Rollover Value`
                  : `${activeSecurity.name} Maturity Payout`}
              </span>
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
              {isTaxFree ? "100% Tax-Exempt by CBK" : "Net payout after 15% KRA WHT"}
            </span>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/50">
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-3">
            <p className="text-[11px] font-medium text-muted-foreground">Principal Invested</p>
            <p className="text-sm sm:text-base font-bold text-foreground tabular-nums mt-0.5">
              KSh {fmt(results.principal)}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-emerald-500/10 p-3">
            <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">Net Profit</p>
            <p className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
              +KSh {fmt(results.netEarnings)}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-3">
            <p className="text-[11px] font-medium text-muted-foreground">Effective Net APY</p>
            <p className="text-sm sm:text-base font-bold text-foreground tabular-nums mt-0.5">
              {results.effectiveNetAPY}% p.a.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-3">
            <p className="text-[11px] font-medium text-muted-foreground">Tax Status</p>
            <p
              className={`text-sm sm:text-base font-bold tabular-nums mt-0.5 ${
                isTaxFree
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-destructive"
              }`}
            >
              {isTaxFree ? "0% (Tax Free!)" : `-KSh ${fmt(results.totalTaxDeducted)}`}
            </p>
          </div>
        </div>

        {/* Visual Trajectory Chart */}
        <div className="pt-2">
          <CalculatorTrajectoryChart data={trajectory} height={230} />
        </div>

        {/* Collapsible Statutory Tax Breakdown */}
        <div className="pt-2 border-t border-border/50">
          <button
            type="button"
            onClick={() => setShowBreakdown((prev) => !prev)}
            className="w-full flex items-center justify-between py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Central Bank auction discount & tax details</span>
            {showBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showBreakdown && (
            <div className="mt-3 space-y-2 pt-2 border-t border-border/40 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Discount / Interest</span>
                <span className="font-semibold text-foreground">KSh {fmt(results.grossEarnings)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {isTaxFree ? "Tax Exemption (IFB)" : "KRA Withholding Tax (15%)"}
                </span>
                <span
                  className={`font-semibold ${
                    isTaxFree ? "text-emerald-500 font-bold" : "text-destructive"
                  }`}
                >
                  {isTaxFree ? "KSh 0 (100% Tax-Exempt)" : `-KSh ${fmt(results.totalTaxDeducted)}`}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border/40 font-bold">
                <span>Net Maturity Value Paid into CBK Account</span>
                <span className="text-emerald-600 dark:text-emerald-400">KSh {fmt(results.finalValue)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TBillCalculator;
