import { useState, useMemo, useEffect } from "react";
import { ArrowRightLeft, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface Rate {
  id: string;
  currency_code: string;
  currency_name: string;
  rate: number;
  previous_rate: number | null;
  updated_at: string;
}

const CurrencyConverter = () => {
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState(1000);
  const [fromCurrency, setFromCurrency] = useState("KES");
  const [toCurrency, setToCurrency] = useState("USD");

  useEffect(() => {
    supabase
      .from("exchange_rates_public" as any)
      .select("id, currency_code, currency_name, rate, previous_rate, updated_at")
      .order("sort_order")
      .then(({ data }) => {
        setRates((data as unknown as Rate[]) || []);
        setLoading(false);
      });
  }, []);

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
    // rates are KES per 1 unit of foreign currency
    // e.g. USD rate = 129 means 1 USD = 129 KES
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
