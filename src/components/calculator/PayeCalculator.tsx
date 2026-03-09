import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw, Banknote } from "lucide-react";

const TAX_BANDS = [
  { upper: 24000, rate: 0.10 },
  { upper: 32333, rate: 0.25 },
  { upper: 500000, rate: 0.30 },
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

const formatKES = (n: number) =>
  `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Row = ({
  label,
  value,
  destructive,
  accent,
  bold,
}: {
  label: string;
  value: string;
  destructive?: boolean;
  accent?: boolean;
  bold?: boolean;
}) => (
  <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
    <span className={`text-xs ${bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{label}</span>
    <span
      className={`text-sm font-semibold tabular-nums ${
        destructive ? "text-destructive" : accent ? "text-accent" : "text-foreground"
      }`}
    >
      {value}
    </span>
  </div>
);

const PayeCalculator = () => {
  const [grossSalary, setGrossSalary] = useState(100000);
  const [pension, setPension] = useState(0);
  const [otherDeductions, setOtherDeductions] = useState(0);

  const results = useMemo(() => {
    const gross = Math.max(grossSalary, 0);
    const nssf = Math.min(gross, 36000) * 0.06;
    const shif = gross * 0.0275;
    const housingLevy = gross * 0.015;
    const pensionAmt = Math.max(pension, 0);
    const otherAmt = Math.max(otherDeductions, 0);

    const taxableIncome = Math.max(gross - nssf - pensionAmt, 0);
    const payeBeforeRelief = calculatePaye(taxableIncome);
    const finalPaye = Math.max(payeBeforeRelief - PERSONAL_RELIEF, 0);

    const totalDeductions = nssf + shif + housingLevy + finalPaye + pensionAmt + otherAmt;
    const netSalary = Math.max(gross - totalDeductions, 0);

    return {
      gross,
      nssf,
      shif,
      housingLevy,
      taxableIncome,
      payeBeforeRelief,
      personalRelief: PERSONAL_RELIEF,
      finalPaye,
      pension: pensionAmt,
      otherDeductions: otherAmt,
      totalDeductions,
      netSalary,
    };
  }, [grossSalary, pension, otherDeductions]);

  const reset = () => {
    setGrossSalary(100000);
    setPension(0);
    setOtherDeductions(0);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Inputs */}
      <div className="rounded-xl border-2 border-border bg-card p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Salary Details</h2>
          <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5 text-xs h-8">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="gross" className="text-xs font-medium">
              Gross Monthly Salary (KES)
            </Label>
            <Input
              id="gross"
              type="number"
              value={grossSalary}
              onChange={(e) => setGrossSalary(Number(e.target.value))}
              min={0}
              className="h-12 text-lg font-semibold"
              placeholder="e.g. 100,000"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pension" className="text-xs font-medium">
                Pension Contribution (optional)
              </Label>
              <Input
                id="pension"
                type="number"
                value={pension}
                onChange={(e) => setPension(Number(e.target.value))}
                min={0}
                className="h-10 text-sm"
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="other" className="text-xs font-medium">
                Other Deductions (optional)
              </Label>
              <Input
                id="other"
                type="number"
                value={otherDeductions}
                onChange={(e) => setOtherDeductions(Number(e.target.value))}
                min={0}
                className="h-10 text-sm"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Net Salary Highlight */}
      <div className="rounded-xl border-2 border-accent/40 bg-accent/5 p-5 flex items-center gap-4">
        <div className="rounded-lg p-3 bg-accent/10">
          <Banknote className="h-6 w-6 text-accent" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Net Take-Home Pay</p>
          <p className="text-2xl md:text-3xl font-bold text-accent">{formatKES(results.netSalary)}</p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">Full Breakdown</h3>

        <Row label="Gross Salary" value={formatKES(results.gross)} bold />

        <div className="mt-3 mb-1">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Statutory Deductions</p>
        </div>
        <Row label="NSSF (6% up to KES 36,000)" value={`- ${formatKES(results.nssf)}`} destructive />
        <Row label="SHIF (2.75%)" value={`- ${formatKES(results.shif)}`} destructive />
        <Row label="Housing Levy (1.5%)" value={`- ${formatKES(results.housingLevy)}`} destructive />

        <div className="mt-3 mb-1">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">PAYE Calculation</p>
        </div>
        <Row label="Taxable Income" value={formatKES(results.taxableIncome)} />
        <Row label="PAYE Before Relief" value={formatKES(results.payeBeforeRelief)} />
        <Row label="Personal Relief" value={`- ${formatKES(results.personalRelief)}`} accent />
        <Row label="Final PAYE" value={`- ${formatKES(results.finalPaye)}`} destructive />

        {(results.pension > 0 || results.otherDeductions > 0) && (
          <>
            <div className="mt-3 mb-1">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Other</p>
            </div>
            {results.pension > 0 && (
              <Row label="Pension Contribution" value={`- ${formatKES(results.pension)}`} destructive />
            )}
            {results.otherDeductions > 0 && (
              <Row label="Other Deductions" value={`- ${formatKES(results.otherDeductions)}`} destructive />
            )}
          </>
        )}

        <div className="flex items-center justify-between pt-3 mt-3 border-t-2 border-border">
          <span className="text-xs font-semibold text-foreground">Total Deductions</span>
          <span className="text-sm font-bold text-destructive">{formatKES(results.totalDeductions)}</span>
        </div>
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs font-semibold text-accent">Net Salary</span>
          <span className="text-base font-bold text-accent">{formatKES(results.netSalary)}</span>
        </div>
      </div>

      {/* Tax bands reference */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Kenya PAYE Tax Bands (Monthly)</h3>
        <div className="divide-y divide-border">
          {[
            { range: "0 – 24,000", rate: "10%" },
            { range: "24,001 – 32,333", rate: "25%" },
            { range: "32,334 – 500,000", rate: "30%" },
            { range: "500,001 – 800,000", rate: "32.5%" },
            { range: "Above 800,000", rate: "35%" },
          ].map((b) => (
            <div key={b.range} className="flex items-center justify-between py-2">
              <span className="text-xs text-muted-foreground">KES {b.range}</span>
              <span className="text-xs font-semibold tabular-nums">{b.rate}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Based on Kenya Revenue Authority (KRA) PAYE rates effective 2024. This is for informational purposes only and does not constitute tax advice.
      </p>
    </div>
  );
};

export default PayeCalculator;
