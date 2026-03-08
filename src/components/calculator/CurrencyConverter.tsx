import { useState, useMemo, useEffect } from "react";
import { ArrowRightLeft, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface Rate {
  id: string;
  currency_code: string;
  currency_name: string;
  rate: number;
  previous_rate: number | null;
  updated_at: string;
}

interface HistoryPoint {
  currency_code: string;
  rate: number;
  snapshot_date: string;
}

const PERIOD_OPTIONS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "All", days: 365 },
] as const;

const CurrencyConverter = () => {
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState(1000);
  const [fromCurrency, setFromCurrency] = useState("KES");
  const [toCurrency, setToCurrency] = useState("USD");
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [chartCurrency, setChartCurrency] = useState("USD");
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    supabase
      .from("exchange_rates_public" as any)
      .select("id, currency_code, currency_name, rate, previous_rate, updated_at")
      .order("sort_order")
      .then(({ data }) => {
        const parsed = (data as unknown as Rate[]) || [];
        setRates(parsed);
        if (parsed.length > 0 && !parsed.find((r) => r.currency_code === chartCurrency)) {
          setChartCurrency(parsed[0].currency_code);
        }
        setLoading(false);
      });
  }, []);

  // Fetch history when chartCurrency or period changes
  useEffect(() => {
    if (chartCurrency === "KES" || rates.length === 0) return;
    setHistoryLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - period);

    supabase
      .from("exchange_rate_history_public" as any)
      .select("currency_code, rate, snapshot_date")
      .eq("currency_code", chartCurrency)
      .gte("snapshot_date", since.toISOString().split("T")[0])
      .order("snapshot_date")
      .then(({ data }) => {
        setHistory((data as unknown as HistoryPoint[]) || []);
        setHistoryLoading(false);
      });
  }, [chartCurrency, period, rates]);

  // Build chart data — append current rate as today if not already in history
  const chartData = useMemo(() => {
    const currentRate = rates.find((r) => r.currency_code === chartCurrency);
    const points = history.map((h) => ({
      date: h.snapshot_date,
      rate: Number(h.rate),
    }));

    const today = new Date().toISOString().split("T")[0];
    if (currentRate && (points.length === 0 || points[points.length - 1].date !== today)) {
      points.push({ date: today, rate: Number(currentRate.rate) });
    }

    return points;
  }, [history, rates, chartCurrency]);

  const currencyOptions = useMemo(() => {
    const options = [{ code: "KES", name: "Kenyan Shilling", rate: 1 }];
    rates.forEach((r) => options.push({ code: r.currency_code, name: r.currency_name, rate: r.rate }));
    return options;
  }, [rates]);

  const getKesRate = (code: string): number => {
    if (code === "KES") return 1;
    const r = rates.find((r) => r.currency_code === code);
    return r?.rate ?? 1;
  };

  const convertedAmount = useMemo(() => {
    const fromRate = getKesRate(fromCurrency);
    const toRate = getKesRate(toCurrency);
    const amountInKes = fromCurrency === "KES" ? amount : amount * fromRate;
    const result = toCurrency === "KES" ? amountInKes : amountInKes / toRate;
    return result;
  }, [amount, fromCurrency, toCurrency, rates]);

  const exchangeRate = useMemo(() => {
    const fromRate = getKesRate(fromCurrency);
    const toRate = getKesRate(toCurrency);
    if (fromCurrency === "KES") return toCurrency === "KES" ? 1 : 1 / toRate;
    if (toCurrency === "KES") return fromRate;
    return fromRate / toRate;
  }, [fromCurrency, toCurrency, rates]);

  const swap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const lastUpdated = rates[0]?.updated_at ? new Date(rates[0].updated_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : null;

  const formatNum = (n: number) =>
    n >= 1 ? n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
           : n.toLocaleString("en-KE", { minimumFractionDigits: 4, maximumFractionDigits: 6 });

  const formatDate = (d: string) => {
    const date = new Date(d + "T00:00:00");
    return date.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rates.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground text-sm">
        No exchange rates available yet.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Converter card */}
      <div className="rounded-xl border-2 border-border bg-card p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-4 items-end">
          {/* From */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">From</Label>
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={0}
              className="text-lg font-semibold h-12"
              placeholder="Amount"
            />
          </div>

          {/* Swap button */}
          <div className="flex justify-center pb-2">
            <Button variant="outline" size="icon" onClick={swap} className="rounded-full h-10 w-10">
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* To */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">To</Label>
            <Select value={toCurrency} onValueChange={setToCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center h-12 px-3 rounded-md border border-border bg-muted/50">
              <span className="text-lg font-bold text-accent">{formatNum(convertedAmount)}</span>
              <span className="ml-2 text-sm text-muted-foreground">{toCurrency}</span>
            </div>
          </div>
        </div>

        {/* Exchange rate display */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            1 {fromCurrency} = {formatNum(exchangeRate)} {toCurrency}
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">Updated: {lastUpdated}</p>
          )}
        </div>
      </div>

      {/* Rate History Chart */}
      <div className="rounded-xl border border-border bg-card p-4 md:p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold">Rate History</h3>
            <Select value={chartCurrency} onValueChange={setChartCurrency}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rates.map((r) => (
                  <SelectItem key={r.currency_code} value={r.currency_code}>
                    {r.currency_code}/{" "}KES
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setPeriod(opt.days)}
                className={`text-xs font-medium px-2.5 py-1 rounded-md transition-all ${
                  period === opt.days
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length < 2 ? (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
            Not enough data yet — rates will be tracked as they change.
          </div>
        ) : (
          <div className="h-56 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={formatDate}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(v) => v.toFixed(2)}
                />
                <Tooltip
                  formatter={(v: number) => [`KES ${v.toFixed(2)}`, `1 ${chartCurrency}`]}
                  labelFormatter={formatDate}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  dot={chartData.length <= 30}
                  activeDot={{ r: 4, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Quick reference table */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">KES Exchange Rates</h3>
        <div className="divide-y divide-border">
          {rates.map((r) => {
            const change = r.previous_rate ? ((r.rate - r.previous_rate) / r.previous_rate) * 100 : 0;
            return (
              <div key={r.id} className="flex items-center justify-between py-2.5">
                <div>
                  <span className="text-sm font-medium">{r.currency_code}</span>
                  <span className="text-xs text-muted-foreground ml-2">{r.currency_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums">{Number(r.rate).toFixed(2)}</span>
                  {change !== 0 && (
                    <span className={`text-xs tabular-nums ${change > 0 ? "text-green-600" : "text-red-500"}`}>
                      {change > 0 ? "+" : ""}{change.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Exchange rates are indicative and sourced from market data. Actual rates may vary by provider.
      </p>
    </div>
  );
};

export default CurrencyConverter;
