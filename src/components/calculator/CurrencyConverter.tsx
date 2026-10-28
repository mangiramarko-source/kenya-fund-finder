import { useState, useMemo, useEffect } from "react";
import { ArrowRightLeft, RefreshCw, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { getCurrencyFlagUrl, KENYA_FLAG_URL } from "@/lib/currencyBranding";

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
  { label: "1Y", days: 365 },
] as const;

const AMOUNT_PRESETS = [
  { label: "1K", value: 1_000 },
  { label: "5K", value: 5_000 },
  { label: "10K", value: 10_000 },
  { label: "50K", value: 50_000 },
  { label: "100K", value: 100_000 },
];

function CurrencyFlag({ code }: { code: string }) {
  const url = code === "KES" ? KENYA_FLAG_URL : getCurrencyFlagUrl(code);
  if (!url) {
    return <span className="h-4 w-5 rounded bg-muted flex items-center justify-center text-[9px] font-bold">{code.slice(0, 2)}</span>;
  }
  return <img src={url} alt={code} className="h-3.5 w-5 rounded-xs object-cover shrink-0" />;
}

const CurrencyConverter = () => {
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState(1000);
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("KES");
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

  const lastUpdated = rates[0]?.updated_at
    ? new Date(rates[0].updated_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
    : null;

  const formatNum = (n: number) =>
    n >= 1
      ? n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

  return (
    <div className="space-y-4">
      {/* ─── 1. Currency Converter Card ─── */}
      <div className="rounded-3xl border border-border/75 bg-card p-5 shadow-sm space-y-4 dark:bg-neutral-900/90 dark:border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Currency Exchange
          </span>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            1 {fromCurrency} = {formatNum(exchangeRate)} {toCurrency}
          </span>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">Amount to Convert</Label>
          <Input
            type="number"
            value={amount || ""}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            min={0}
            className="h-11 rounded-xl bg-background border-border/80 text-base font-semibold"
            placeholder="e.g. 1000"
          />
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
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

        {/* Currency Pair with Centered Floating Swap */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center pt-1">
          {/* From */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">From Currency</span>
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger className="h-11 rounded-xl bg-background border-border/80 font-semibold text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <div className="flex items-center gap-2">
                      <CurrencyFlag code={c.code} />
                      <span className="font-bold">{c.code}</span>
                      <span className="text-muted-foreground text-xs">— {c.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Swap button */}
          <div className="flex justify-center sm:pt-5">
            <button
              type="button"
              onClick={swap}
              aria-label="Swap currencies"
              className="h-10 w-10 rounded-full border border-border bg-card shadow-sm hover:bg-muted active:scale-95 transition-all flex items-center justify-center text-foreground"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </button>
          </div>

          {/* To */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">To Currency</span>
            <Select value={toCurrency} onValueChange={setToCurrency}>
              <SelectTrigger className="h-11 rounded-xl bg-background border-border/80 font-semibold text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <div className="flex items-center gap-2">
                      <CurrencyFlag code={c.code} />
                      <span className="font-bold">{c.code}</span>
                      <span className="text-muted-foreground text-xs">— {c.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Converted Result Banner */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Converted Total
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatNum(convertedAmount)}
            </span>
            <span className="text-sm font-bold text-foreground">{toCurrency}</span>
          </div>
          {lastUpdated && (
            <p className="text-[10px] text-muted-foreground pt-1">
              Indicative exchange rate · Updated {lastUpdated}
            </p>
          )}
        </div>
      </div>

      {/* ─── 2. Rate History Chart Card ─── */}
      <div className="rounded-3xl border border-border/75 bg-card p-5 shadow-sm space-y-4 dark:bg-neutral-900/90 dark:border-white/10">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rate History</h3>
            <Select value={chartCurrency} onValueChange={setChartCurrency}>
              <SelectTrigger className="h-8 w-[120px] rounded-lg text-xs font-bold bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rates.map((r) => (
                  <SelectItem key={r.currency_code} value={r.currency_code}>
                    {r.currency_code}/KES
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time range pills */}
          <div className="flex items-center gap-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                type="button"
                onClick={() => setPeriod(opt.days)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
                  period === opt.days
                    ? "bg-foreground text-background shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {historyLoading ? (
          <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Loading chart…
          </div>
        ) : chartData.length > 1 ? (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  tickLine={false}
                  axisLine={false}
                  className="text-muted-foreground"
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 10, fill: "currentColor" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v.toFixed(1)}
                  className="text-muted-foreground"
                  width={38}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "1rem",
                    fontSize: "12px",
                  }}
                  formatter={(val: number) => [`${formatNum(val)} KES`, chartCurrency]}
                  labelFormatter={(l) => formatDate(String(l))}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#10b981" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">
            No history available for this period.
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrencyConverter;
