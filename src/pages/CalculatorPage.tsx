import { useState, useMemo, useEffect, forwardRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { fetchFunds, type FundFromDB, FUND_TYPE_LABELS, type FundType } from "@/lib/api";
import { getDisclaimer } from "@/lib/disclaimers";
import { AlertTriangle, GitCompareArrows, TrendingUp, Wallet, PiggyBank, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import AuthGate from "@/components/AuthGate";

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
  useDocumentTitle("Investment Returns Calculator – Kenya Unit Trust Funds", "Calculate your potential returns from Money Market, Fixed Income, Bond, Balanced, and Equity funds. Compare gross vs net yields.");
  const { user } = useAuth();
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
  const [showCompareGate, setShowCompareGate] = useState(false);
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

  const fundsByType = useMemo(() => {
    const grouped: Partial<Record<FundType, FundFromDB[]>> = {};
    funds.forEach((f) => {
      const type = f.fund_type || "money_market";
      if (!grouped[type]) grouped[type] = [];
      grouped[type]!.push(f);
    });
    return grouped;
  }, [funds]);

  const FundSelector = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
    <div>
      <Label className="text-xs font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1">
          <SelectValue placeholder="Choose a fund..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="custom">Custom Input</SelectItem>
          {(Object.entries(FUND_TYPE_LABELS) as [FundType, string][]).map(([type, typeLabel]) => {
            const typeFunds = fundsByType[type];
            if (!typeFunds || typeFunds.length === 0) return null;
            return (
              <div key={type}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{typeLabel}</div>
                {typeFunds.map((f) => (
                  <SelectItem key={f.slug} value={f.slug}>
                    {f.name} — {f.annual_yield}% p.a.
                  </SelectItem>
                ))}
              </div>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );

  /* StatCard moved outside component to avoid forwardRef warnings */

  const BreakdownRow = ({ label, value, destructive }: { label: string; value: string; destructive?: boolean }) => (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${destructive ? "text-destructive" : "text-foreground"}`}>{value}</span>
    </div>
  );

  const InputWithSlider = ({ id, label, value, onChange, min, max, step, prefix, suffix }: {
    id: string; label: string; value: number; onChange: (v: number) => void;
    min: number; max: number; step?: number; prefix?: string; suffix?: string;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-xs font-medium">{label}</Label>
        <span className="text-xs text-muted-foreground">{prefix}{value.toLocaleString()}{suffix}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step || 1}
        className="mt-1"
      />
      <Input
        id={id}
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="h-8 text-xs"
      />
    </div>
  );

  return (
    <div className="container py-8 md:py-10 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-1">Investment Calculator</h1>
        <p className="text-muted-foreground text-sm">Estimate your potential returns across all unit trust fund categories.</p>
      </div>

      {showCompareGate && !user && (
        <div className="mb-8">
          <AuthGate
            source="calculator_compare"
            title="Sign up to compare funds"
            description="Create a free account to compare funds side by side and see which one earns you more."
          />
        </div>
      )}

      {/* Main layout: sidebar inputs + results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Inputs panel */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-5">
          {/* Fund A selector */}
          <div className={`rounded-xl border-2 p-4 space-y-4 ${compareMode ? "border-accent/40" : "border-border"}`}>
            {compareMode && <p className="text-xs font-semibold text-accent uppercase tracking-wider">Fund A</p>}
            <FundSelector value={selectedFundSlug} onChange={setSelectedFundSlug} label="Select a Fund" />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="yieldA" className="text-xs font-medium">Annual Yield</Label>
                <span className="text-xs text-muted-foreground">{yield_}%</span>
              </div>
              <Slider value={[yield_]} onValueChange={([v]) => { setYield(v); if (selectedFundSlug !== "custom") setSelectedFundSlug("custom"); }} min={0} max={30} step={0.1} />
              <Input
                id="yieldA" type="number" value={yield_}
                onChange={(e) => { setYield(Number(e.target.value)); if (selectedFundSlug !== "custom") setSelectedFundSlug("custom"); }}
                min={0} max={100} step={0.1} className="h-8 text-xs"
              />
              {selectedFund && <p className="text-[11px] text-muted-foreground">Using {selectedFund.name}'s yield</p>}
            </div>
          </div>

          {/* Fund B selector (compare mode) */}
          {compareMode && (
            <div className="rounded-xl border-2 border-primary/40 p-4 space-y-4">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Fund B</p>
              <FundSelector value={compareFundSlug} onChange={setCompareFundSlug} label="Select a Fund" />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="yieldB" className="text-xs font-medium">Annual Yield</Label>
                  <span className="text-xs text-muted-foreground">{compareYield}%</span>
                </div>
                <Slider value={[compareYield]} onValueChange={([v]) => { setCompareYield(v); if (compareFundSlug !== "custom") setCompareFundSlug("custom"); }} min={0} max={30} step={0.1} />
                <Input
                  id="yieldB" type="number" value={compareYield}
                  onChange={(e) => { setCompareYield(Number(e.target.value)); if (compareFundSlug !== "custom") setCompareFundSlug("custom"); }}
                  min={0} max={100} step={0.1} className="h-8 text-xs"
                />
                {compareFund && <p className="text-[11px] text-muted-foreground">Using {compareFund.name}'s yield</p>}
              </div>
            </div>
          )}

          {/* Compare button */}
          <Button
            variant={compareMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (!user && !compareMode) {
                setShowCompareGate(true);
                return;
              }
              setCompareMode(!compareMode);
              setShowCompareGate(false);
            }}
            className="gap-2 w-full"
          >
            <GitCompareArrows className="h-4 w-4" />
            {compareMode ? "Exit Compare" : "Compare Funds"}
          </Button>

          {/* Parameters */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-5">
            <h2 className="text-sm font-semibold text-foreground">Parameters</h2>

            <InputWithSlider id="amount" label="Initial Investment" value={amount} onChange={setAmount} min={1000} max={10000000} step={1000} prefix="KES " />
            <InputWithSlider id="months" label="Period" value={months} onChange={setMonths} min={1} max={120} suffix=" months" />
            <InputWithSlider id="monthly" label="Monthly Top-up" value={monthly} onChange={setMonthly} min={0} max={1000000} step={500} prefix="KES " />

            <div className="flex items-center justify-between pt-1">
              <Label htmlFor="compound" className="text-xs font-medium">Interest Mode</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{compound ? "Compound" : "Simple"}</span>
                <Switch id="compound" checked={compound} onCheckedChange={setCompound} />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Wallet} label="Total Contributions" value={formatKES(results.totalContributions)} />
            <StatCard icon={TrendingUp} label="Net Earnings" value={formatKES(results.netEarnings)} accent />
            <StatCard icon={PiggyBank} label="Final Value" value={formatKES(results.finalValue)} accent />
            <StatCard icon={CalendarDays} label="Monthly Return" value={formatKES(results.monthlyReturn)} />
          </div>

          {/* Breakdown tables (moved above chart) */}
          <div className={`grid gap-4 ${compareMode ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2"}`}>
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {compareMode ? `${fundALabel} Breakdown` : "Full Breakdown"}
              </h3>
              <BreakdownRow label="Total Contributions" value={formatKES(results.totalContributions)} />
              <BreakdownRow label="Gross Interest" value={formatKES(results.grossEarnings)} />
              <BreakdownRow label="Withholding Tax (15%)" value={`- ${formatKES(results.totalTax)}`} destructive />
              {selectedFund && results.managementFeeCost > 0 && (
                <BreakdownRow label={`Mgmt Fee (${selectedFund.management_fee}% p.a.)`} value={`- ${formatKES(results.managementFeeCost)}`} destructive />
              )}
              <div className="flex items-center justify-between pt-3 mt-1 border-t border-border">
                <span className="text-xs font-semibold text-accent">Net Earnings</span>
                <span className="text-sm font-bold text-accent">{formatKES(results.netEarnings)}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-accent">Final Value</span>
                <span className="text-sm font-bold text-accent">{formatKES(results.finalValue)}</span>
              </div>
            </div>

            {compareMode && compareResults && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{fundBLabel} Breakdown</h3>
                <BreakdownRow label="Total Contributions" value={formatKES(compareResults.totalContributions)} />
                <BreakdownRow label="Gross Interest" value={formatKES(compareResults.grossEarnings)} />
                <BreakdownRow label="Withholding Tax (15%)" value={`- ${formatKES(compareResults.totalTax)}`} destructive />
                {compareFund && compareResults.managementFeeCost > 0 && (
                  <BreakdownRow label={`Mgmt Fee (${compareFund.management_fee}% p.a.)`} value={`- ${formatKES(compareResults.managementFeeCost)}`} destructive />
                )}
                <div className="flex items-center justify-between pt-3 mt-1 border-t border-border">
                  <span className="text-xs font-semibold text-primary">Net Earnings</span>
                  <span className="text-sm font-bold text-primary">{formatKES(compareResults.netEarnings)}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-semibold text-primary">Final Value</span>
                  <span className="text-sm font-bold text-primary">{formatKES(compareResults.finalValue)}</span>
                </div>
              </div>
            )}

            {!compareMode && (
              <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-center">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">At a Glance</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Effective Yield (after tax & fees)</p>
                    <p className="text-lg font-bold text-foreground">
                      {((results.netEarnings / results.totalContributions) * (12 / months) * 100).toFixed(2)}% p.a.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Tax Paid</p>
                    <p className="text-lg font-bold text-destructive">{formatKES(results.totalTax)}</p>
                  </div>
                  {selectedFund && (
                    <div>
                      <p className="text-xs text-muted-foreground">Management Fee Cost</p>
                      <p className="text-lg font-bold text-destructive">{formatKES(results.managementFeeCost)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Chart (moved below breakdown) */}
          <div className="rounded-xl border border-border bg-card p-4 md:p-5">
            <h3 className="text-sm font-semibold mb-4">Projected Growth</h3>
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                {compareMode ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" label={{ value: "Month", position: "insideBottom", offset: -5, fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} domain={['dataMin', 'dataMax']} />
                    <Tooltip formatter={(v: number, name: string) => [formatKES(v), name === "netA" ? fundALabel : fundBLabel]} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                    <Legend formatter={(v) => v === "netA" ? fundALabel : fundBLabel} />
                    <Line type="monotone" dataKey="netA" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} name="netA" />
                    <Line type="monotone" dataKey="netB" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="netB" />
                  </LineChart>
                ) : (
                  <LineChart data={results.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" label={{ value: "Month", position: "insideBottom", offset: -5, fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} domain={['dataMin', 'dataMax']} />
                    <Tooltip formatter={(v: number, name: string) => [formatKES(v), name === "gross" ? "Before Tax" : "After Tax"]} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                    <Line type="monotone" dataKey="gross" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="gross" />
                    <Line type="monotone" dataKey="net" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} name="net" />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparison summary */}
          {compareMode && compareResults && (
            <div className="rounded-xl border-2 border-border bg-muted/30 p-5">
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

          {/* Disclaimer */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-2">
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
            {selectedFund && (
              <p className="text-xs text-muted-foreground leading-relaxed mt-2 pt-2 border-t border-border">
                <strong>{FUND_TYPE_LABELS[selectedFund.fund_type]}:</strong> {getDisclaimer(selectedFund.fund_type)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalculatorPage;
