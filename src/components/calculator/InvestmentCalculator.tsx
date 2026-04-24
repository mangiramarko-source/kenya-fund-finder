import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TrendingUp, Wallet, PiggyBank, Receipt } from "lucide-react";

const WITHHOLDING_TAX_RATE = 0.15;

function calculateReturns(amount: number, yield_: number, months: number, monthly: number, compound: boolean, fee: number) {
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
  return {
    totalContributions,
    grossEarnings,
    totalTax: grossEarnings - netEarnings,
    managementFeeCost,
    netEarnings: netEarnings - managementFeeCost,
    finalValue: Math.round(totalNet - managementFeeCost),
  };
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);

const InvestmentCalculator = () => {
  const [amount, setAmount] = useState(100000);
  const [monthly, setMonthly] = useState(5000);
  const [annualYield, setAnnualYield] = useState(13);
  const [months, setMonths] = useState(12);
  const [fee, setFee] = useState(2);
  const [compound, setCompound] = useState(true);

  const result = useMemo(
    () => calculateReturns(amount || 0, annualYield || 0, months || 0, monthly || 0, compound, fee || 0),
    [amount, monthly, annualYield, months, fee, compound]
  );

  return (
    <div className="space-y-4">
      {/* Inputs */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="amount" className="text-xs">Initial amount (KES)</Label>
            <Input
              id="amount"
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(Math.min(Number(e.target.value), 1_000_000))}
              className="text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="monthly" className="text-xs">Monthly top-up (KES)</Label>
            <Input
              id="monthly"
              type="number"
              inputMode="numeric"
              value={monthly}
              onChange={(e) => setMonthly(Math.min(Number(e.target.value), 1_000_000))}
              className="text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="yield" className="text-xs">Annual yield (%)</Label>
            <Input
              id="yield"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={annualYield}
              onChange={(e) => setAnnualYield(Math.min(Number(e.target.value), 100))}
              className="text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="months" className="text-xs">Period (months)</Label>
            <Input
              id="months"
              type="number"
              inputMode="numeric"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fee" className="text-xs">Mgmt fee (% p.a.)</Label>
            <Input
              id="fee"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={fee}
              onChange={(e) => setFee(Math.min(Number(e.target.value), 100))}
              className="text-base"
            />
          </div>
          <div className="flex items-end justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
            <div>
              <p className="text-xs font-medium">Compounding</p>
              <p className="text-[10px] text-muted-foreground">Reinvest interest</p>
            </div>
            <Switch checked={compound} onCheckedChange={setCompound} />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold">Projection</h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Stat icon={<Wallet className="h-3.5 w-3.5" />} label="Contributions" value={fmt(result.totalContributions)} />
          <Stat icon={<PiggyBank className="h-3.5 w-3.5" />} label="Gross earnings" value={fmt(result.grossEarnings)} />
          <Stat icon={<Receipt className="h-3.5 w-3.5" />} label="Withholding (15%)" value={fmt(result.totalTax)} muted />
          <Stat icon={<Receipt className="h-3.5 w-3.5" />} label="Mgmt fee" value={fmt(result.managementFeeCost)} muted />
        </div>

        <div className="rounded-lg bg-accent/10 border border-accent/20 p-3 mt-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Estimated final value</p>
          <p className="text-2xl font-bold text-accent mt-0.5">{fmt(result.finalValue)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Net earnings: <span className="font-semibold text-foreground">{fmt(result.netEarnings)}</span>
          </p>
        </div>

        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Estimates are indicative. Yields are gross annual effective rates before 15% withholding tax.
          Actual returns may vary based on fund performance and fees.
        </p>
      </div>
    </div>
  );
};

const Stat = ({ icon, label, value, muted }: { icon: React.ReactNode; label: string; value: string; muted?: boolean }) => (
  <div className="rounded-lg border border-border bg-muted/20 p-2.5">
    <div className="flex items-center gap-1.5 text-muted-foreground">
      {icon}
      <span className="text-[10px] uppercase tracking-wide">{label}</span>
    </div>
    <p className={`mt-1 text-sm font-semibold ${muted ? "text-foreground/70" : "text-foreground"}`}>{value}</p>
  </div>
);

export default InvestmentCalculator;
