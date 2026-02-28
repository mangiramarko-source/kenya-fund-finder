import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const CalculatorPage = () => {
  const [amount, setAmount] = useState(100000);
  const [yield_, setYield] = useState(10);
  const [months, setMonths] = useState(12);
  const [monthly, setMonthly] = useState(0);
  const [compound, setCompound] = useState(true);

  const results = useMemo(() => {
    const rate = yield_ / 100;
    const monthlyRate = rate / 12;
    const chartData: { month: number; value: number }[] = [];

    let total = amount;

    for (let m = 1; m <= months; m++) {
      if (compound) {
        total = total * (1 + monthlyRate) + monthly;
      } else {
        total = total + (amount * monthlyRate) + monthly;
      }
      chartData.push({ month: m, value: Math.round(total) });
    }

    const totalValue = Math.round(total);
    const totalEarnings = totalValue - amount - monthly * months;
    const monthlyReturn = Math.round(totalEarnings / months);

    return { totalValue, totalEarnings, monthlyReturn, chartData };
  }, [amount, yield_, months, monthly, compound]);

  const formatKES = (n: number) => `KES ${n.toLocaleString()}`;

  return (
    <div className="container py-10 max-w-3xl">
      <h1 className="text-2xl md:text-3xl font-bold mb-2">Investment Calculator</h1>
      <p className="text-muted-foreground mb-8">Estimate your potential returns from Money Market Fund investments.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="space-y-5">
          <div>
            <Label htmlFor="amount">Investment Amount (KES)</Label>
            <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} min={0} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="yield">Annual Yield (%)</Label>
            <Input id="yield" type="number" value={yield_} onChange={(e) => setYield(Number(e.target.value))} min={0} max={100} step={0.1} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="months">Investment Period (months)</Label>
            <Input id="months" type="number" value={months} onChange={(e) => setMonths(Number(e.target.value))} min={1} max={120} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="monthly">Monthly Contribution (KES) — Optional</Label>
            <Input id="monthly" type="number" value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} min={0} className="mt-1" />
          </div>
          <div className="flex items-center gap-3">
            <Switch id="compound" checked={compound} onCheckedChange={setCompound} />
            <Label htmlFor="compound">{compound ? "Compound Interest" : "Simple Interest"}</Label>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {[
            { label: "Total Projected Value", value: formatKES(results.totalValue), accent: true },
            { label: "Estimated Total Earnings", value: formatKES(results.totalEarnings) },
            { label: "Monthly Estimated Return", value: formatKES(results.monthlyReturn) },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
              <p className={`font-bold text-xl ${item.accent ? "text-accent" : ""}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="mt-8 rounded-lg border border-border bg-card p-4 h-64">
        <h3 className="text-sm font-semibold mb-3">Projected Growth</h3>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={results.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215 14% 46%)" label={{ value: "Month", position: "insideBottom", offset: -5, fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(215 14% 46%)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatKES(v)} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(214 20% 90%)" }} />
            <Line type="monotone" dataKey="value" stroke="hsl(152 55% 42%)" strokeWidth={2} dot={false} name="Value" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Disclaimer:</strong> This calculator provides estimates for illustrative purposes only and does not guarantee actual returns. Calculations assume constant yield rates and do not account for the 15% withholding tax, fund management fees, or market fluctuations. Actual returns may vary. This is not investment advice — consult a licensed financial advisor before making investment decisions.
        </p>
      </div>
    </div>
  );
};

export default CalculatorPage;
