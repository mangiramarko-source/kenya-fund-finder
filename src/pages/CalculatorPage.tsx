import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { fetchFunds, type FundFromDB } from "@/lib/api";
import { AlertTriangle, GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";

const WITHHOLDING_TAX_RATE = 0.15;

function calculate(amount: number, yield_: number, months: number, monthly: number, compound: boolean, fund: FundFromDB | null) {
  const rate = yield_ / 100;
  const monthlyRate = rate / 12;
  const chartData: { month: number; gross: number; net: number }[] = [];

  let totalGross = amount;
  let totalNet = amount;

  for (let m = 1; m <= months; m++) {
    const grossInterest = compound ? totalGross * monthlyRate : amount * monthlyRate;
    totalGross += grossInterest + monthly;

    const tax = grossInterest * WITHHOLDING_TAX_RATE;
    totalNet += (grossInterest - tax) + monthly;

    chartData.push({ month: m, gross: Math.round(totalGross), net: Math.round(totalNet) });
  }

  const totalContributions = amount + monthly * months;
  const grossEarnings = Math.round(totalGross - totalContributions);
  const netEarnings = Math.round(totalNet - totalContributions);
  const totalTax = grossEarnings - netEarnings;
  const managementFeeCost = fund
    ? Math.round(((totalGross + amount) / 2) * (fund.management_fee / 100) * (months / 12))
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
}

const formatKES = (n: number) => `KES ${n.toLocaleString()}`;

const CalculatorPage = () => {
  const [searchParams] = useSearchParams();
  const [funds, setFunds] = useState<FundFromDB[]>([]);
  const [selectedFundSlug, setSelectedFundSlug] = useState<string>(searchParams.get("fund") || "custom");
  const [amount, setAmount] = useState(100000);
  const [yield_, setYield] = useState(10);
  const [months, setMonths] = useState(12);
  const [monthly, setMonthly] = useState(0);
  const [compound, setCompound] = useState(true);

  // Comparison mode
  const [compareMode, setCompareMode] = useState(false);
  const [compareFundSlug, setCompareFundSlug] = useState<string>("custom");
  const [compareYield, setCompareYield] = useState(8);

  useEffect(() => {
    fetchFunds().then(setFunds).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedFundSlug !== "custom") {
      const fund = funds.find((f) => f.slug === selectedFundSlug);
      if (fund) setYield(fund.annual_yield);
    }
  }, [selectedFundSlug, funds]);

  useEffect(() => {
    if (compareFundSlug !== "custom") {
      const fund = funds.find((f) => f.slug === compareFundSlug);
      if (fund) setCompareYield(fund.annual_yield);
    }
  }, [compareFundSlug, funds]);

  const selectedFund = funds.find((f) => f.slug === selectedFundSlug) ?? null;
  const compareFund = funds.find((f) => f.slug === compareFundSlug) ?? null;

  const results = useMemo(() => calculate(amount, yield_, months, monthly, compound, selectedFund), [amount, yield_, months, monthly, compound, selectedFund]);
  const compareResults = useMemo(() => compareMode ? calculate(amount, compareYield, months, monthly, compound, compareFund) : null, [compareMode, amount, compareYield, months, monthly, compound, compareFund]);

  const chartData = useMemo(() => {
    if (!compareMode) return results.chartData;
    return results.chartData.map((d, i) => ({
      month: d.month,
      netA: d.net,
      netB: compareResults!.chartData[i]?.net ?? 0,
    }));
  }, [results, compareResults, compareMode]);

  const fundALabel = selectedFund?.name || "Fund A";
  const fundBLabel = compareFund?.name || "Fund B";



  const FundSelector = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
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
  );

  const BreakdownCard = ({ label, value, accent, destructive }: { label: string; value: string; accent?: boolean; destructive?: boolean }) => (
    <div className={`rounded-lg p-3 ${accent ? "border-2 border-accent bg-accent/5" : "border border-border bg-card"}`}>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={`font-bold text-base ${accent ? "text-accent" : destructive ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );

  return (
    <div className="container py-10 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Investment Calculator</h1>
          <p className="text-muted-foreground text-sm">Estimate your potential returns from Money Market Fund investments.</p>
        </div>
        <Button
          variant={compareMode ? "default" : "outline"}
          size="sm"
          onClick={() => setCompareMode(!compareMode)}
          className="gap-2 shrink-0 self-start"
        >
          <GitCompareArrows className="h-4 w-4" />
          {compareMode ? "Exit Compare" : "Compare Funds"}
        </Button>
      </div>

      {/* Shared inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div>
          <Label htmlFor="amount">Investment (KES)</Label>
          <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} min={0} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="months">Period (months)</Label>
          <Input id="months" type="number" value={months} onChange={(e) => setMonths(Number(e.target.value))} min={1} max={120} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="monthly">Monthly Top-up (KES)</Label>
          <Input id="monthly" type="number" value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} min={0} className="mt-1" />
        </div>
        <div className="flex items-end pb-1">
          <div className="flex items-center gap-3">
            <Switch id="compound" checked={compound} onCheckedChange={setCompound} />
            <Label htmlFor="compound" className="text-sm">{compound ? "Compound" : "Simple"}</Label>
          </div>
        </div>
      </div>

      {/* Fund selectors + results */}
      <div className={`grid gap-6 ${compareMode ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2"}`}>
        {/* Fund A */}
        <div className="space-y-4">
          <div className={`rounded-xl border-2 p-4 space-y-4 ${compareMode ? "border-accent/40" : "border-border"}`}>
            {compareMode && <p className="text-xs font-semibold text-accent uppercase tracking-wider">Fund A</p>}
            <FundSelector value={selectedFundSlug} onChange={setSelectedFundSlug} label="Select a Fund" />
            <div>
              <Label htmlFor="yieldA">Annual Yield (%)</Label>
              <Input
                id="yieldA"
                type="number"
                value={yield_}
                onChange={(e) => { setYield(Number(e.target.value)); if (selectedFundSlug !== "custom") setSelectedFundSlug("custom"); }}
                min={0} max={100} step={0.1} className="mt-1"
              />
              {selectedFund && <p className="text-xs text-muted-foreground mt-1">Using {selectedFund.name}'s yield</p>}
            </div>
          </div>

          <div className="space-y-2">
            {compareMode && <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{fundALabel} Breakdown</h3>}
            {!compareMode && <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Full Breakdown</h3>}
            <BreakdownCard label="Total Contributions" value={formatKES(results.totalContributions)} />
            <BreakdownCard label="Gross Interest" value={formatKES(results.grossEarnings)} />
            <BreakdownCard label="Withholding Tax (15%)" value={`- ${formatKES(results.totalTax)}`} destructive />
            {selectedFund && results.managementFeeCost > 0 && (
              <BreakdownCard label={`Mgmt Fee (${selectedFund.management_fee}% p.a.)`} value={`- ${formatKES(results.managementFeeCost)}`} destructive />
            )}
            <BreakdownCard label="Net Earnings" value={formatKES(results.netEarnings)} accent />
            <BreakdownCard label="Estimated Final Value" value={formatKES(results.finalValue)} accent />
          </div>
        </div>

        {/* Fund B (compare mode) */}
        {compareMode && (
          <div className="space-y-4">
            <div className="rounded-xl border-2 border-primary/40 p-4 space-y-4">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Fund B</p>
              <FundSelector value={compareFundSlug} onChange={setCompareFundSlug} label="Select a Fund" />
              <div>
                <Label htmlFor="yieldB">Annual Yield (%)</Label>
                <Input
                  id="yieldB"
                  type="number"
                  value={compareYield}
                  onChange={(e) => { setCompareYield(Number(e.target.value)); if (compareFundSlug !== "custom") setCompareFundSlug("custom"); }}
                  min={0} max={100} step={0.1} className="mt-1"
                />
                {compareFund && <p className="text-xs text-muted-foreground mt-1">Using {compareFund.name}'s yield</p>}
              </div>
            </div>

            {compareResults && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{fundBLabel} Breakdown</h3>
                <BreakdownCard label="Total Contributions" value={formatKES(compareResults.totalContributions)} />
                <BreakdownCard label="Gross Interest" value={formatKES(compareResults.grossEarnings)} />
                <BreakdownCard label="Withholding Tax (15%)" value={`- ${formatKES(compareResults.totalTax)}`} destructive />
                {compareFund && compareResults.managementFeeCost > 0 && (
                  <BreakdownCard label={`Mgmt Fee (${compareFund.management_fee}% p.a.)`} value={`- ${formatKES(compareResults.managementFeeCost)}`} destructive />
                )}
                <BreakdownCard label="Net Earnings" value={formatKES(compareResults.netEarnings)} accent />
                <BreakdownCard label="Estimated Final Value" value={formatKES(compareResults.finalValue)} accent />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comparison summary */}
      {compareMode && compareResults && (
        <div className="mt-6 rounded-xl border-2 border-border bg-muted/30 p-5">
          <h3 className="text-sm font-semibold mb-3">Comparison Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Difference in Net Earnings</p>
              <p className={`font-bold text-lg ${results.netEarnings > compareResults.netEarnings ? "text-accent" : results.netEarnings < compareResults.netEarnings ? "text-destructive" : ""}`}>
                {formatKES(Math.abs(results.netEarnings - compareResults.netEarnings))}
              </p>
              <p className="text-xs text-muted-foreground">
                {results.netEarnings > compareResults.netEarnings ? `${fundALabel} earns more` : results.netEarnings < compareResults.netEarnings ? `${fundBLabel} earns more` : "Equal"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{fundALabel}</p>
              <p className="font-bold text-lg text-accent">{formatKES(results.finalValue)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{fundBLabel}</p>
              <p className="font-bold text-lg text-primary">{formatKES(compareResults.finalValue)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="mt-8 rounded-lg border border-border bg-card p-4 h-72">
        <h3 className="text-sm font-semibold mb-3">Projected Growth</h3>
        <ResponsiveContainer width="100%" height="85%">
          {compareMode ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" label={{ value: "Month", position: "insideBottom", offset: -5, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number, name: string) => [formatKES(v), name === "netA" ? fundALabel : fundBLabel]} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
              <Legend formatter={(v) => v === "netA" ? fundALabel : fundBLabel} />
              <Line type="monotone" dataKey="netA" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} name="netA" />
              <Line type="monotone" dataKey="netB" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="netB" />
            </LineChart>
          ) : (
            <LineChart data={results.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" label={{ value: "Month", position: "insideBottom", offset: -5, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number, name: string) => [formatKES(v), name === "gross" ? "Before Tax" : "After Tax"]} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
              <Line type="monotone" dataKey="gross" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="gross" />
              <Line type="monotone" dataKey="net" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} name="net" />
            </LineChart>
          )}
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
            <li>Yield data for <strong>{selectedFund.name}</strong> was last updated on {new Date(selectedFund.updated_at).toLocaleDateString("en-KE")}.</li>
          )}
          {compareFund && compareMode && (
            <li>Yield data for <strong>{compareFund.name}</strong> was last updated on {new Date(compareFund.updated_at).toLocaleDateString("en-KE")}.</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default CalculatorPage;
