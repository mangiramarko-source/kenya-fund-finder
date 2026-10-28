import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TrendingUp, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

const WITHHOLDING_TAX_RATE = 0.15;

function calculateReturns(
  amount: number,
  yield_: number,
  months: number,
  monthly: number,
  compound: boolean,
  fee: number
) {
  const rate = yield_ / 100;
  const monthlyRate = rate / 12;
  let totalGross = amount;
  let totalNet = amount;
  for (let m = 1; m <= months; m++) {
    const grossInterest = compound ? totalGross * monthlyRate : amount * monthlyRate;
    totalGross += grossInterest + monthly;
    totalNet += (grossInterest - grossInterest * WITHHOLDING_TAX_RATE) + monthly;
  }
  const totalContributions = amount + monthly * months;
  const grossEarnings = Math.round(totalGross - totalContributions);
  const netEarnings = Math.round(totalNet - totalContributions);
  const managementFeeCost = Math.round(((totalGross + amount) / 2) * (fee / 100) * (months / 12));
  const finalValue = Math.max(0, Math.round(totalNet - managementFeeCost));
  return {
    totalContributions,
    grossEarnings,
    totalTax: grossEarnings - netEarnings,
    managementFeeCost,
    netEarnings: Math.max(0, netEarnings - managementFeeCost),
    finalValue,
  };
}

const fmt = (n: number) => n.toLocaleString("en-KE");

const INITIAL_PRESETS = [
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
];

const YIELD_PRESETS = [
  { label: "10%", value: 10 },
  { label: "12%", value: 12 },
  { label: "13.5% (MMF)", value: 13.5 },
  { label: "15%", value: 15 },
  { label: "18%", value: 18 },
];

const PERIOD_PRESETS = [
  { label: "6 Mo", value: 6 },
  { label: "1 Yr", value: 12 },
  { label: "2 Yrs", value: 24 },
  { label: "3 Yrs", value: 36 },
  { label: "5 Yrs", value: 60 },
];

const InvestmentCalculator = () => {
  const [amount, setAmount] = useState(100_000);
  const [monthly, setMonthly] = useState(5_000);
  const [annualYield, setAnnualYield] = useState(13.5);
  const [months, setMonths] = useState(12);
  const [fee, setFee] = useState(2);
  const [compound, setCompound] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const result = useMemo(
    () =>
      calculateReturns(
        amount || 0,
        annualYield || 0,
        months || 0,
        monthly || 0,
        compound,
        fee || 0
      ),
    [amount, monthly, annualYield, months, fee, compound]
  );

  const returnPct = result.totalContributions > 0
    ? ((result.netEarnings / result.totalContributions) * 100).toFixed(1)
    : "0.0";

  const principalRatio = result.finalValue > 0
    ? Math.min(100, Math.max(0, (result.totalContributions / result.finalValue) * 100))
    : 100;
  const returnRatio = Math.max(0, 100 - principalRatio);

  return (
    <div className="space-y-4">
      {/* ─── 1. Hero Projection Card ─── */}
      <div className="rounded-3xl border border-border/75 bg-card p-5 shadow-sm space-y-4 dark:bg-neutral-900/90 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            <span>Estimated Final Value</span>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-muted border border-border/60 text-muted-foreground">
            {months >= 12 ? `${(months / 12).toFixed(months % 12 === 0 ? 0 : 1)} yrs` : `${months} mo`}
          </span>
        </div>

        <div>
          <div className="text-3xl sm:text-4xl font-black tracking-tight text-foreground tabular-nums">
            KSh {fmt(result.finalValue)}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <TrendingUp className="h-3 w-3" />
              +KSh {fmt(result.netEarnings)} ({returnPct}%)
            </span>
            <span className="text-xs text-muted-foreground">Net profit after 15% tax</span>
          </div>
        </div>

        {/* Visual Allocation Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
            <div
              style={{ width: `${principalRatio}%` }}
              className="bg-neutral-400 dark:bg-neutral-600 h-full transition-all duration-300"
              title={`Principal: ${principalRatio.toFixed(0)}%`}
            />
            <div
              style={{ width: `${returnRatio}%` }}
              className="bg-emerald-500 h-full transition-all duration-300"
              title={`Net Interest: ${returnRatio.toFixed(0)}%`}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-neutral-400 dark:bg-neutral-600" />
              Principal: KSh {fmt(result.totalContributions)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Net returns: KSh {fmt(result.netEarnings)}
            </span>
          </div>
        </div>

        {/* Collapsible detailed breakdown */}
        <div className="pt-2 border-t border-border/50">
          <button
            type="button"
            onClick={() => setShowBreakdown((prev) => !prev)}
            className="w-full flex items-center justify-between py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Tax & fee breakdown</span>
            {showBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showBreakdown && (
            <div className="mt-3 space-y-2 pt-2 border-t border-border/40 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Interest Earned</span>
                <span className="font-semibold text-foreground">KSh {fmt(result.grossEarnings)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">KRA Withholding Tax (15%)</span>
                <span className="font-semibold text-destructive">-KSh {fmt(result.totalTax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fund Management Fee ({fee}% p.a.)</span>
                <span className="font-semibold text-destructive">-KSh {fmt(result.managementFeeCost)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border/40 font-bold">
                <span>Net Interest Kept</span>
                <span className="text-emerald-600 dark:text-emerald-400">KSh {fmt(result.netEarnings)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── 2. Controls & Inputs Card ─── */}
      <div className="rounded-3xl border border-border/75 bg-card p-5 shadow-sm space-y-5 dark:bg-neutral-900/90 dark:border-white/10">
        {/* Initial Amount */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="amount" className="text-xs font-semibold text-foreground">
              Initial Investment
            </Label>
            <span className="text-xs font-bold text-foreground tabular-nums">
              KSh {fmt(amount)}
            </span>
          </div>
          <Input
            id="amount"
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
            <Label htmlFor="monthly" className="text-xs font-semibold text-foreground">
              Monthly Top-up
            </Label>
            <span className="text-xs font-bold text-foreground tabular-nums">
              KSh {fmt(monthly)} / month
            </span>
          </div>
          <Input
            id="monthly"
            type="number"
            inputMode="numeric"
            value={monthly || ""}
            onChange={(e) => setMonthly(Math.max(0, Number(e.target.value)))}
            className="h-11 rounded-xl bg-background border-border/80 text-sm font-semibold"
            placeholder="e.g. 5000"
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

        {/* Annual Yield */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="yield" className="text-xs font-semibold text-foreground">
              Expected Annual Yield (%)
            </Label>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {annualYield}% p.a.
            </span>
          </div>
          <Input
            id="yield"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={annualYield || ""}
            onChange={(e) => setAnnualYield(Math.max(0, Number(e.target.value)))}
            className="h-11 rounded-xl bg-background border-border/80 text-sm font-semibold"
            placeholder="e.g. 13.5"
          />
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {YIELD_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setAnnualYield(p.value)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 ${
                  annualYield === p.value
                    ? "bg-foreground text-background shadow-xs font-bold"
                    : "border border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Investment Period */}
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

        {/* Management Fee & Compounding */}
        <div className="pt-2 border-t border-border/50 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-foreground">Compound Monthly Interest</p>
              <p className="text-[11px] text-muted-foreground">Reinvest earnings back into the fund</p>
            </div>
            <Switch checked={compound} onCheckedChange={setCompound} />
          </div>

          <div className="flex items-center justify-between pt-1">
            <Label htmlFor="fee" className="text-xs font-medium text-muted-foreground">
              Fund Management Fee (% p.a.)
            </Label>
            <div className="w-24">
              <Input
                id="fee"
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

      <p className="text-[11px] text-muted-foreground px-1 leading-relaxed">
        Projections are indicative illustrations. Licensed Kenyan Money Market Funds deduct 15% withholding tax automatically on behalf of KRA.
      </p>
    </div>
  );
};

export default InvestmentCalculator;
