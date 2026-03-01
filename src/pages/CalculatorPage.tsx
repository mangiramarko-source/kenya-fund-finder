import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fetchFunds, type FundFromDB } from "@/lib/api";
import { AlertTriangle, Info } from "lucide-react";

const WITHHOLDING_TAX_RATE = 0.15;

const CalculatorPage = () => {
  const [funds, setFunds] = useState<FundFromDB[]>([]);
  const [selectedFundSlug, setSelectedFundSlug] = useState<string>("custom");
  const [amount, setAmount] = useState(100000);
  const [yield_, setYield] = useState(10);
  const [months, setMonths] = useState(12);
  const [monthly, setMonthly] = useState(0);
  const [compound, setCompound] = useState(true);

  useEffect(() => {
    fetchFunds().then(setFunds).catch(() => {});
  }, []);

  // When a fund is selected, update yield
  useEffect(() => {
    if (selectedFundSlug !== "custom") {
      const fund = funds.find((f) => f.slug === selectedFundSlug);
      if (fund) {
        setYield(fund.annual_yield);
      }
    }
  }, [selectedFundSlug, funds]);

  const selectedFund = funds.find((f) => f.slug === selectedFundSlug) ?? null;

  const results = useMemo(() => {
    const rate = yield_ / 100;
    const monthlyRate = rate / 12;
    const chartData: { month: number; gross: number; net: number }[] = [];

    let totalGross = amount;
    let totalNet = amount;

    for (let m = 1; m <= months; m++) {
      let grossInterest: number;
      if (compound) {
        grossInterest = totalGross * monthlyRate;
        totalGross = totalGross + grossInterest + monthly;
      } else {
        grossInterest = amount * monthlyRate;
        totalGross = totalGross + grossInterest + monthly;
      }

      const tax = grossInterest * WITHHOLDING_TAX_RATE;
      const netInterest = grossInterest - tax;

      if (compound) {
        totalNet = totalNet + netInterest + monthly;
      } else {
        totalNet = totalNet + netInterest + monthly;
      }

      chartData.push({
        month: m,
        gross: Math.round(totalGross),
        net: Math.round(totalNet),
      });
    }

    const totalContributions = amount + monthly * months;
    const grossEarnings = Math.round(totalGross - totalContributions);
    const netEarnings = Math.round(totalNet - totalContributions);
    const totalTax = grossEarnings - netEarnings;
    const managementFeeCost = selectedFund
      ? Math.round(((totalGross + amount) / 2) * (selectedFund.management_fee / 100) * (months / 12))
      : 0;
    const finalValue = Math.round(totalNet - managementFeeCost);
    const monthlyReturn = Math.round(netEarnings / months);

    return {
      totalContributions,
      grossEarnings,
      totalTax,
      managementFeeCost,
      netEarnings: netEarnings - managementFeeCost,
      finalValue,
      monthlyReturn,
      chartData,
    };
  }, [amount, yield_, months, monthly, compound, selectedFund]);

  const formatKES = (n: number) => `KES ${n.toLocaleString()}`;

  return (
    <div className="container py-10 max-w-3xl">
      <h1 className="text-2xl md:text-3xl font-bold mb-2">Investment Calculator</h1>
      <p className="text-muted-foreground mb-8">
        Estimate your potential returns from Money Market Fund investments.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="space-y-5">
          {/* Fund selector */}
          <div>
            <Label>Select a Fund (or use custom values)</Label>
            <Select value={selectedFundSlug} onValueChange={setSelectedFundSlug}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose a fund..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom Input</SelectItem>
                {funds.map((f) => (
                  <SelectItem key={f.slug} value={f.slug}>
                    {f.name} — {f.annual_yield}% p.a.
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Investment Amount (KES)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={0}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="yield">Annual Yield (%)</Label>
            <Input
              id="yield"
              type="number"
              value={yield_}
              onChange={(e) => {
                setYield(Number(e.target.value));
                if (selectedFundSlug !== "custom") setSelectedFundSlug("custom");
              }}
              min={0}
              max={100}
              step={0.1}
              className="mt-1"
            />
            {selectedFund && (
              <p className="text-xs text-muted-foreground mt-1">
                Using {selectedFund.name}'s current annual yield
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="months">Investment Period (months)</Label>
            <Input
              id="months"
              type="number"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              min={1}
              max={120}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="monthly">Monthly Contribution (KES) — Optional</Label>
            <Input
              id="monthly"
              type="number"
              value={monthly}
              onChange={(e) => setMonthly(Number(e.target.value))}
              min={0}
              className="mt-1"
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch id="compound" checked={compound} onCheckedChange={setCompound} />
            <Label htmlFor="compound">{compound ? "Compound Interest" : "Simple Interest"}</Label>
          </div>
        </div>

        {/* Results breakdown */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Full Breakdown</h3>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Contributions</p>
            <p className="font-bold text-lg">{formatKES(results.totalContributions)}</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Gross Interest Earned</p>
            <p className="font-bold text-lg">{formatKES(results.grossEarnings)}</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-xs text-muted-foreground">Withholding Tax (15%)</p>
            </div>
            <p className="font-bold text-lg text-destructive">- {formatKES(results.totalTax)}</p>
          </div>

          {selectedFund && results.managementFeeCost > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">
                Management Fee ({selectedFund.management_fee}% p.a.)
              </p>
              <p className="font-bold text-lg text-destructive">- {formatKES(results.managementFeeCost)}</p>
            </div>
          )}

          <div className="rounded-lg border-2 border-accent bg-accent/5 p-4">
            <p className="text-xs text-muted-foreground mb-1">Net Earnings (After Tax & Fees)</p>
            <p className="font-bold text-xl text-accent">{formatKES(results.netEarnings)}</p>
          </div>

          <div className="rounded-lg border-2 border-accent bg-accent/5 p-4">
            <p className="text-xs text-muted-foreground mb-1">Estimated Final Value</p>
            <p className="font-bold text-2xl text-accent">{formatKES(results.finalValue)}</p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Monthly Estimated Net Return</p>
            <p className="font-bold text-lg">{formatKES(results.monthlyReturn)}</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-8 rounded-lg border border-border bg-card p-4 h-72">
        <h3 className="text-sm font-semibold mb-3">Projected Growth</h3>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={results.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12 }}
              stroke="hsl(var(--muted-foreground))"
              label={{ value: "Month", position: "insideBottom", offset: -5, fontSize: 11 }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(v: number, name: string) => [formatKES(v), name === "gross" ? "Before Tax" : "After Tax"]}
              contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
            />
            <Line type="monotone" dataKey="gross" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="gross" />
            <Line type="monotone" dataKey="net" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} name="net" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Disclaimer */}
      <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border space-y-2">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Disclaimer:</strong> This calculator provides <strong>estimates for illustrative purposes only</strong> and does not guarantee actual returns.
          </p>
        </div>
        <ul className="text-xs text-muted-foreground leading-relaxed list-disc pl-8 space-y-1">
          <li>Calculations include the <strong>15% withholding tax</strong> on interest income as mandated by KRA.</li>
          <li>Management fees are estimated based on the fund's stated annual rate, applied as an approximation.</li>
          <li>Actual yields fluctuate daily and are not guaranteed to remain constant over the investment period.</li>
          <li>This is <strong>not investment advice</strong> — consult a licensed financial advisor before making investment decisions.</li>
          {selectedFund && (
            <li>
              Yield data for <strong>{selectedFund.name}</strong> was last updated on{" "}
              {new Date(selectedFund.updated_at).toLocaleDateString("en-KE")}.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default CalculatorPage;
