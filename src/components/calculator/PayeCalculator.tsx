import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Building2,
  FileSpreadsheet,
} from "lucide-react";

const TAX_BANDS = [
  { upper: 24000, rate: 0.1 },
  { upper: 32333, rate: 0.25 },
  { upper: 500000, rate: 0.3 },
  { upper: 800000, rate: 0.325 },
  { upper: Infinity, rate: 0.35 },
] as const;

const PERSONAL_RELIEF = 2400;

function calculatePaye(taxableIncome: number): number {
  let tax = 0;
  let prev = 0;
  for (const band of TAX_BANDS) {
    if (taxableIncome <= prev) break;
    const taxable = Math.min(taxableIncome, band.upper) - prev;
    tax += taxable * band.rate;
    prev = band.upper;
  }
  return tax;
}

const fmt = (n: number) =>
  n.toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtDec = (n: number) =>
  n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatKES = (n: number) => `KSh ${fmtDec(n)}`;

const GROSS_PRESETS = [
  { label: "30K", value: 30_000 },
  { label: "50K", value: 50_000 },
  { label: "100K", value: 100_000 },
  { label: "150K", value: 150_000 },
  { label: "250K", value: 250_000 },
  { label: "500K", value: 500_000 },
];

const PENSION_PRESETS = [
  { label: "None", value: 0 },
  { label: "5K", value: 5_000 },
  { label: "10K", value: 10_000 },
  { label: "20K", value: 20_000 },
  { label: "30K (Max)", value: 30_000 },
];

const BreakdownRow = ({
  label,
  sublabel,
  value,
  variant = "default",
  bold,
}: {
  label: string;
  sublabel?: string;
  value: string;
  variant?: "default" | "destructive" | "positive" | "accent";
  bold?: boolean;
}) => {
  const colorClass =
    variant === "destructive"
      ? "text-rose-600 dark:text-rose-400"
      : variant === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : variant === "accent"
      ? "text-primary"
      : "text-foreground";

  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
      <div>
        <span className={`text-xs ${bold ? "font-bold text-foreground" : "text-muted-foreground"}`}>
          {label}
        </span>
        {sublabel && <p className="text-[10px] text-muted-foreground/80">{sublabel}</p>}
      </div>
      <span className={`text-xs font-bold tabular-nums ${colorClass}`}>{value}</span>
    </div>
  );
};

const PayeCalculator = () => {
  const [grossSalary, setGrossSalary] = useState(100_000);
  const [pension, setPension] = useState(0);
  const [otherDeductions, setOtherDeductions] = useState(0);
  const [showBands, setShowBands] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const results = useMemo(() => {
    const gross = Math.max(grossSalary, 0);
    const nssf = Math.min(gross, 36000) * 0.06;
    const shif = gross * 0.0275;
    const housingLevy = gross * 0.015;
    const pensionAmt = Math.max(pension, 0);
    const otherAmt = Math.max(otherDeductions, 0);

    // In Kenya, pension relief is up to KES 30,000 per month
    const taxExemptPension = Math.min(pensionAmt, 30_000);
    const taxableIncome = Math.max(gross - nssf - taxExemptPension, 0);
    const payeBeforeRelief = calculatePaye(taxableIncome);
    const finalPaye = Math.max(payeBeforeRelief - PERSONAL_RELIEF, 0);

    const totalDeductions = nssf + shif + housingLevy + finalPaye + pensionAmt + otherAmt;
    const netSalary = Math.max(gross - totalDeductions, 0);

    const netRatio = gross > 0 ? Math.min(100, Math.max(0, (netSalary / gross) * 100)) : 100;
    const deductionRatio = Math.max(0, 100 - netRatio);
    const statutoryTotal = nssf + shif + housingLevy;

    return {
      gross,
      nssf,
      shif,
      housingLevy,
      statutoryTotal,
      taxableIncome,
      payeBeforeRelief,
      personalRelief: PERSONAL_RELIEF,
      finalPaye,
      pension: pensionAmt,
      otherDeductions: otherAmt,
      totalDeductions,
      netSalary,
      netRatio,
      deductionRatio,
    };
  }, [grossSalary, pension, otherDeductions]);

  const reset = () => {
    setGrossSalary(100_000);
    setPension(0);
    setOtherDeductions(0);
  };

  const takeHomePct =
    results.gross > 0 ? ((results.netSalary / results.gross) * 100).toFixed(1) : "0.0";
  const deductionPct =
    results.gross > 0 ? ((results.totalDeductions / results.gross) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-4">
      {/* ─── 1. Hero Net Salary Card ─── */}
      <div className="rounded-3xl border border-border/75 bg-card p-5 shadow-sm space-y-4 dark:bg-neutral-900/90 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
            <span>Estimated Net Take-Home</span>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            {deductionPct}% Deductions
          </span>
        </div>

        <div>
          <div className="text-3xl sm:text-4xl font-black tracking-tight text-foreground tabular-nums">
            {formatKES(results.netSalary)}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              {takeHomePct}% of Gross
            </span>
            <span className="text-xs text-muted-foreground">
              Total cuts: -{formatKES(results.totalDeductions)}
            </span>
          </div>
        </div>

        {/* Visual Allocation Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
            <div
              style={{ width: `${results.netRatio}%` }}
              className="bg-emerald-500 h-full transition-all duration-300"
              title={`Take-home: ${results.netRatio.toFixed(0)}%`}
            />
            <div
              style={{ width: `${results.deductionRatio}%` }}
              className="bg-rose-500/70 h-full transition-all duration-300"
              title={`Deductions: ${results.deductionRatio.toFixed(0)}%`}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Net Pay: {formatKES(results.netSalary)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500/70" />
              Deductions: -{formatKES(results.totalDeductions)}
            </span>
          </div>
        </div>

        {/* Quick Highlights Summary */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
          <div className="rounded-2xl bg-muted/40 p-3 border border-border/40">
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              KRA PAYE Tax
            </div>
            <div className="text-sm font-bold text-foreground tabular-nums mt-0.5">
              {formatKES(results.finalPaye)}
            </div>
          </div>
          <div className="rounded-2xl bg-muted/40 p-3 border border-border/40">
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              Statutory (NSSF/SHIF/Levy)
            </div>
            <div className="text-sm font-bold text-foreground tabular-nums mt-0.5">
              {formatKES(results.statutoryTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. Controls & Salary Inputs Card ─── */}
      <div className="rounded-3xl border border-border/75 bg-card p-5 shadow-sm space-y-5 dark:bg-neutral-900/90 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 text-foreground" />
            <span>Salary & Exemptions</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            className="gap-1.5 text-xs h-8 rounded-full text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </Button>
        </div>

        {/* Gross Salary Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="gross" className="text-xs font-semibold text-foreground">
              Gross Monthly Salary
            </Label>
            <span className="text-xs font-bold text-foreground tabular-nums">
              KSh {fmt(grossSalary)}
            </span>
          </div>
          <Input
            id="gross"
            type="number"
            inputMode="numeric"
            value={grossSalary || ""}
            onChange={(e) => setGrossSalary(Math.max(0, Number(e.target.value)))}
            className="h-11 rounded-xl bg-background border-border/80 text-sm font-semibold"
            placeholder="e.g. 100000"
          />
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {GROSS_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setGrossSalary(p.value)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 ${
                  grossSalary === p.value
                    ? "bg-foreground text-background shadow-xs font-bold"
                    : "border border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pension Contribution */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="pension" className="text-xs font-semibold text-foreground">
              Voluntary Pension Contribution
            </Label>
            <span className="text-[11px] text-muted-foreground font-medium">
              Tax-free up to KSh 30K/mo
            </span>
          </div>
          <Input
            id="pension"
            type="number"
            inputMode="numeric"
            value={pension || ""}
            onChange={(e) => setPension(Math.max(0, Number(e.target.value)))}
            className="h-11 rounded-xl bg-background border-border/80 text-sm font-semibold"
            placeholder="0"
          />
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            {PENSION_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setPension(p.value)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 ${
                  pension === p.value
                    ? "bg-foreground text-background shadow-xs font-bold"
                    : "border border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Other Deductions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="other" className="text-xs font-semibold text-foreground">
              Other Post-Tax Deductions (SACCO, Loans)
            </Label>
            {otherDeductions > 0 && (
              <span className="text-xs font-bold text-foreground tabular-nums">
                KSh {fmt(otherDeductions)}
              </span>
            )}
          </div>
          <Input
            id="other"
            type="number"
            inputMode="numeric"
            value={otherDeductions || ""}
            onChange={(e) => setOtherDeductions(Math.max(0, Number(e.target.value)))}
            className="h-11 rounded-xl bg-background border-border/80 text-sm font-semibold"
            placeholder="0"
          />
        </div>
      </div>

      {/* ─── 3. Itemized Deductions Card ─── */}
      <div className="rounded-3xl border border-border/75 bg-card p-5 shadow-sm space-y-3 dark:bg-neutral-900/90 dark:border-white/10">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground pb-1">
          <FileSpreadsheet className="h-3.5 w-3.5 text-foreground" />
          <span>Itemized Payroll Breakdown</span>
        </div>

        <BreakdownRow label="Gross Salary" value={formatKES(results.gross)} bold />

        <div className="pt-2">
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
            Statutory Deductions
          </p>
          <BreakdownRow
            label="NSSF (National Social Security Fund)"
            sublabel="6% capped at KES 36,000 max"
            value={`- ${formatKES(results.nssf)}`}
            variant="destructive"
          />
          <BreakdownRow
            label="SHIF (Social Health Insurance Fund)"
            sublabel="2.75% of gross salary"
            value={`- ${formatKES(results.shif)}`}
            variant="destructive"
          />
          <BreakdownRow
            label="Affordable Housing Levy"
            sublabel="1.5% of gross salary"
            value={`- ${formatKES(results.housingLevy)}`}
            variant="destructive"
          />
        </div>

        <div className="pt-2">
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
            KRA PAYE Calculation
          </p>
          <BreakdownRow
            label="Taxable Income"
            sublabel="Gross minus NSSF & pension"
            value={formatKES(results.taxableIncome)}
          />
          <BreakdownRow
            label="Gross PAYE Tax"
            value={formatKES(results.payeBeforeRelief)}
          />
          <BreakdownRow
            label="Monthly Personal Relief"
            value={`- ${formatKES(results.personalRelief)}`}
            variant="positive"
          />
          <BreakdownRow
            label="Final Net PAYE Tax"
            value={`- ${formatKES(results.finalPaye)}`}
            variant="destructive"
            bold
          />
        </div>

        {(results.pension > 0 || results.otherDeductions > 0) && (
          <div className="pt-2">
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
              Voluntary & Other Deductions
            </p>
            {results.pension > 0 && (
              <BreakdownRow
                label="Pension Contribution"
                value={`- ${formatKES(results.pension)}`}
                variant="destructive"
              />
            )}
            {results.otherDeductions > 0 && (
              <BreakdownRow
                label="Other Deductions"
                value={`- ${formatKES(results.otherDeductions)}`}
                variant="destructive"
              />
            )}
          </div>
        )}

        <div className="pt-3 border-t border-border/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-muted-foreground">Total Deductions</span>
            <span className="text-rose-600 dark:text-rose-400 tabular-nums">
              - {formatKES(results.totalDeductions)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm font-black pt-1">
            <span className="text-foreground">Net Take-Home Pay</span>
            <span className="text-emerald-600 dark:text-emerald-400 tabular-nums text-base">
              {formatKES(results.netSalary)}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 4. KRA Tax Bands Reference ─── */}
      <div className="rounded-3xl border border-border/75 bg-card p-5 shadow-sm space-y-3 dark:bg-neutral-900/90 dark:border-white/10">
        <button
          type="button"
          onClick={() => setShowBands((prev) => !prev)}
          className="w-full flex items-center justify-between text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className="flex items-center gap-1.5 uppercase tracking-wider">
            <ShieldCheck className="h-3.5 w-3.5 text-foreground" />
            <span>KRA PAYE Tax Bands (Monthly)</span>
          </div>
          {showBands ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showBands && (
          <div className="divide-y divide-border/50 pt-1 text-xs">
            {[
              { range: "0 – 24,000", rate: "10%" },
              { range: "24,001 – 32,333", rate: "25%" },
              { range: "32,334 – 500,000", rate: "30%" },
              { range: "500,001 – 800,000", rate: "32.5%" },
              { range: "Above 800,000", rate: "35%" },
            ].map((b) => (
              <div key={b.range} className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">KES {b.range}</span>
                <span className="font-bold tabular-nums text-foreground">{b.rate}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── 5. Statutory Explanations ─── */}
      <div className="rounded-3xl border border-border/75 bg-card p-5 shadow-sm space-y-3 dark:bg-neutral-900/90 dark:border-white/10">
        <button
          type="button"
          onClick={() => setShowNotes((prev) => !prev)}
          className="w-full flex items-center justify-between text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className="flex items-center gap-1.5 uppercase tracking-wider">
            <ShieldCheck className="h-3.5 w-3.5 text-foreground" />
            <span>How Kenya Payroll Deductions Work</span>
          </div>
          {showNotes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showNotes && (
          <div className="space-y-3 text-xs text-muted-foreground leading-relaxed pt-1">
            <p>
              <strong className="text-foreground">NSSF:</strong> Employee contributes 6% of gross salary capped at a pensionable limit of KES 36,000 (maximum monthly deduction of <strong>KES 2,160</strong>). Matched by the employer.
            </p>
            <p>
              <strong className="text-foreground">SHIF:</strong> Replaced NHIF effective October 2024. Calculated at <strong>2.75% of gross salary</strong> with no cap.
            </p>
            <p>
              <strong className="text-foreground">Housing Levy:</strong> Contributed at <strong>1.5% of gross salary</strong> deducted from employee salary, matched 1.5% by employer.
            </p>
            <p>
              <strong className="text-foreground">PAYE:</strong> Progressive income tax administered by the Kenya Revenue Authority (KRA). Applied on taxable income after deducting NSSF and allowable pension (up to KES 30,000/mo). A monthly <strong>personal relief of KES 2,400</strong> is deducted from computed tax.
            </p>
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground text-center px-4 leading-normal">
        Based on Kenya Revenue Authority (KRA) PAYE rates and statutory deductions effective 2024/2025. For informational purposes only; does not constitute tax or legal advice.
      </p>
    </div>
  );
};

export default PayeCalculator;
