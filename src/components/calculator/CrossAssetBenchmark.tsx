import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TrendingUp,
  Scale,
  ShieldCheck,
  Building2,
  Landmark,
  Coins,
  PiggyBank,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

interface AssetOption {
  id: string;
  name: string;
  category: "MMF" | "T-Bill" | "IFB Bond" | "Bank Fixed Deposit" | "SACCO" | "NSE Stock";
  grossRatePct: number;
  whtRatePct: number;
  managementFeePct?: number;
  capitalGrowthPct?: number;
  regulator: string;
  liquidity: string;
  riskLevel: "Zero" | "Very Low" | "Low" | "Moderate" | "Moderate-High";
  icon: React.ElementType;
  routeLink: string;
}

const BENCHMARK_ASSETS: AssetOption[] = [
  {
    id: "ifb",
    name: "CBK Tax-Free Infrastructure Bond (IFB)",
    category: "IFB Bond",
    grossRatePct: 16.5,
    whtRatePct: 0, // 0% TAX EXEMPT!
    regulator: "Central Bank of Kenya (CBK)",
    liquidity: "Semi-annual coupons; tradable on secondary market",
    riskLevel: "Zero",
    icon: Landmark,
    routeLink: "/treasury",
  },
  {
    id: "tbill364",
    name: "CBK 364-Day Treasury Bill",
    category: "T-Bill",
    grossRatePct: 15.6,
    whtRatePct: 15,
    regulator: "Central Bank of Kenya (CBK)",
    liquidity: "Locked until 364-day maturity; zero default risk",
    riskLevel: "Zero",
    icon: Landmark,
    routeLink: "/treasury",
  },
  {
    id: "top-mmf",
    name: "Top Money Market Fund (CMA Regulated)",
    category: "MMF",
    grossRatePct: 14.5,
    whtRatePct: 15,
    managementFeePct: 2.0,
    regulator: "Capital Markets Authority (CMA)",
    liquidity: "Daily liquidity (24 to 48 hour bank/M-Pesa withdrawal)",
    riskLevel: "Low",
    icon: Building2,
    routeLink: "/funds",
  },
  {
    id: "bank-fd",
    name: "Tier-1 Commercial Bank Fixed Deposit",
    category: "Bank Fixed Deposit",
    grossRatePct: 12.0,
    whtRatePct: 15,
    regulator: "CBK / KDIC Insured",
    liquidity: "Locked for selected tenor (break penalty applies)",
    riskLevel: "Very Low",
    icon: PiggyBank,
    routeLink: "/savings",
  },
  {
    id: "sacco",
    name: "Top Regulated DT-SACCO Member Deposit",
    category: "SACCO",
    grossRatePct: 11.5,
    whtRatePct: 15,
    regulator: "SASRA Regulated",
    liquidity: "Requires 60 days written notice to withdraw",
    riskLevel: "Moderate",
    icon: PiggyBank,
    routeLink: "/savings?tab=saccos",
  },
  {
    id: "stock-div",
    name: "NSE High-Dividend Stock (e.g. SCOM / BAT)",
    category: "NSE Stock",
    grossRatePct: 8.0, // Dividend yield
    whtRatePct: 5, // 5% resident dividend WHT
    capitalGrowthPct: 5.0, // Assumed annual capital growth
    regulator: "NSE / CMA Regulated",
    liquidity: "T+2 trading days via CDSC licensed broker",
    riskLevel: "Moderate-High",
    icon: Coins,
    routeLink: "/stocks",
  },
];

const AMOUNT_PRESETS = [
  { label: "50K", value: 50_000 },
  { label: "100K", value: 100_000 },
  { label: "250K", value: 250_000 },
  { label: "500K", value: 500_000 },
  { label: "1M", value: 1_000_000 },
];

const TENOR_OPTIONS = [
  { label: "6 Months", months: 6 },
  { label: "1 Year", months: 12 },
  { label: "2 Years", months: 24 },
  { label: "3 Years", months: 36 },
];

const fmt = (n: number) => Math.round(n).toLocaleString("en-KE");

export const CrossAssetBenchmark = () => {
  const [amount, setAmount] = useState<number>(100_000);
  const [durationMonths, setDurationMonths] = useState<number>(12);

  const years = durationMonths / 12;

  const comparisons = useMemo(() => {
    return BENCHMARK_ASSETS.map((asset) => {
      let grossReturn = 0;
      let taxDeducted = 0;
      let netReturn = 0;

      if (asset.category === "MMF") {
        // Daily compounding with monthly tax & annual management fee
        const rate = asset.grossRatePct / 100;
        const feeRate = (asset.managementFeePct || 2.0) / 100;
        const netYieldAfterFee = Math.max(0, rate - feeRate);
        const grossVal = amount * Math.pow(1 + rate / 12, durationMonths);
        grossReturn = grossVal - amount;
        taxDeducted = grossReturn * (asset.whtRatePct / 100);
        const feeCost = ((grossVal + amount) / 2) * feeRate * years;
        netReturn = Math.max(0, grossReturn - taxDeducted - feeCost);
      } else if (asset.category === "NSE Stock") {
        // Dividends (5% WHT) + Capital Gains (0% CGT in Kenya on listed shares!)
        const annualDiv = amount * (asset.grossRatePct / 100);
        const totalGrossDiv = annualDiv * years;
        const divTax = totalGrossDiv * (asset.whtRatePct / 100);
        const netDiv = totalGrossDiv - divTax;
        const capitalGain = amount * (Math.pow(1 + (asset.capitalGrowthPct || 5) / 100, years) - 1);
        grossReturn = totalGrossDiv + capitalGain;
        taxDeducted = divTax;
        netReturn = netDiv + capitalGain;
      } else {
        // Simple fixed interest instruments (T-Bills, IFBs, Bank Fixed Deposits, SACCOs)
        grossReturn = amount * (asset.grossRatePct / 100) * years;
        taxDeducted = grossReturn * (asset.whtRatePct / 100);
        netReturn = grossReturn - taxDeducted;
      }

      const finalValue = Math.round(amount + netReturn);
      const effectiveNetReturnPct = Number(((netReturn / amount) * 100).toFixed(1));

      return {
        ...asset,
        grossReturn: Math.round(grossReturn),
        taxDeducted: Math.round(taxDeducted),
        netReturn: Math.round(netReturn),
        finalValue,
        effectiveNetReturnPct,
      };
    }).sort((a, b) => b.netReturn - a.netReturn);
  }, [amount, durationMonths, years]);

  const maxNetReturn = Math.max(...comparisons.map((c) => c.netReturn), 1);

  return (
    <div className="space-y-6">
      {/* ─── Header Banner ─── */}
      <div className="rounded-3xl border border-border/80 bg-gradient-to-b from-card to-card/70 p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <Scale className="h-3.5 w-3.5" />
              Side-by-Side Asset Benchmark
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground mt-2">
              Compare What KSh {fmt(amount)} Earns
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Net profit in your pocket after Kenya's statutory Withholding Tax (WHT) and management fees.
            </p>
          </div>

          {/* Tenor Toggle */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-2xl border border-border/60 shrink-0 self-start sm:self-center">
            {TENOR_OPTIONS.map((opt) => (
              <button
                key={opt.months}
                type="button"
                onClick={() => setDurationMonths(opt.months)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  durationMonths === opt.months
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input and Presets */}
        <div className="pt-3 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 max-w-xs w-full">
            <span className="text-xs font-bold text-muted-foreground shrink-0">Capital:</span>
            <Input
              type="number"
              inputMode="numeric"
              value={amount || ""}
              onChange={(e) => setAmount(Math.max(1000, Number(e.target.value)))}
              className="h-9 rounded-xl bg-background border-border text-xs font-bold"
              placeholder="100000"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
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
        </div>
      </div>

      {/* ─── Ranked Benchmark Cards ─── */}
      <div className="space-y-3">
        {comparisons.map((item, idx) => {
          const Icon = item.icon;
          const barWidth = Math.max(8, Math.round((item.netReturn / maxNetReturn) * 100));
          const isTop = idx === 0;

          return (
            <div
              key={item.id}
              className={`rounded-2xl border p-4 sm:p-5 transition-all relative ${
                isTop
                  ? "border-emerald-500/80 bg-emerald-500/[0.04] shadow-xs dark:bg-emerald-500/[0.08]"
                  : "border-border/80 bg-card hover:bg-muted/30"
              }`}
            >
              {isTop && (
                <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                  Highest Net Yield
                </span>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left: Icon & Meta */}
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isTop
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">
                        #{idx + 1} • {item.category}
                      </span>
                      {item.whtRatePct === 0 && (
                        <span className="px-2 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold uppercase">
                          Tax Free
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm sm:text-base text-foreground mt-0.5 truncate">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {item.liquidity} • <span className="font-medium text-foreground">{item.regulator}</span>
                    </p>
                  </div>
                </div>

                {/* Right: Net Earnings and Take-Home */}
                <div className="flex items-baseline sm:flex-col sm:items-end justify-between sm:justify-center gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                  <div className="text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                    +KSh {fmt(item.netReturn)}
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    Total: <strong className="text-foreground">KSh {fmt(item.finalValue)}</strong> ({item.effectiveNetReturnPct}%)
                  </div>
                </div>
              </div>

              {/* Comparative Visual Bar */}
              <div className="mt-3.5 space-y-1.5 pt-2 border-t border-border/40">
                <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${barWidth}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      isTop ? "bg-emerald-500" : "bg-neutral-400 dark:bg-neutral-600"
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Gross: {item.grossRatePct}% p.a. • Tax: {item.whtRatePct}% WHT</span>
                  <Link
                    to={item.routeLink}
                    className="inline-flex items-center gap-1 font-bold text-foreground hover:text-emerald-500 transition-colors"
                  >
                    <span>Explore {item.category}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CrossAssetBenchmark;
