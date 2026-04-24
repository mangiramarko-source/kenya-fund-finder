import { useMemo, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ExchangeRate } from "@/components/home/MarketTicker";

/**
 * MiniCurrencyConverter — compact, mobile-friendly FX converter.
 * Used inline on the Market Dashboard alongside the FX Rates table.
 */
const MiniCurrencyConverter = ({ rates }: { rates: ExchangeRate[] }) => {
  const [amount, setAmount] = useState<number>(1);
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("KES");

  const options = useMemo(() => {
    const opts = [{ code: "KES", name: "Kenyan Shilling", rate: 1 }];
    rates.forEach((r) => opts.push({ code: r.currency_code, name: r.currency_name, rate: Number(r.rate) }));
    return opts;
  }, [rates]);

  const getKes = (code: string): number => {
    if (code === "KES") return 1;
    return Number(rates.find((r) => r.currency_code === code)?.rate) || 1;
  };

  const converted = useMemo(() => {
    const fromR = getKes(from);
    const toR = getKes(to);
    const inKes = from === "KES" ? amount : amount * fromR;
    return to === "KES" ? inKes : inKes / toR;
  }, [amount, from, to, rates]);

  const exRate = useMemo(() => {
    const fromR = getKes(from);
    const toR = getKes(to);
    if (from === "KES") return to === "KES" ? 1 : 1 / toR;
    if (to === "KES") return fromR;
    return fromR / toR;
  }, [from, to, rates]);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const fmt = (n: number) =>
    n >= 1
      ? n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : n.toLocaleString("en-KE", { minimumFractionDigits: 4, maximumFractionDigits: 6 });

  if (rates.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 mb-3">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">FX Calculator</h3>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          1 {from} = {fmt(exRate)} {to}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
        {/* From */}
        <div className="space-y-1.5 min-w-0">
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger className="h-8 text-xs px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((c) => (
                <SelectItem key={c.code} value={c.code} className="text-xs">
                  {c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
            min={0}
            inputMode="decimal"
            className="h-9 text-sm font-semibold tabular-nums px-2 text-[16px]"
          />
        </div>

        {/* Swap */}
        <button
          type="button"
          onClick={swap}
          aria-label="Swap currencies"
          className="h-8 w-8 mt-[26px] inline-flex items-center justify-center rounded-full border border-border bg-muted/40 text-foreground hover:bg-muted transition-colors"
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
        </button>

        {/* To */}
        <div className="space-y-1.5 min-w-0">
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger className="h-8 text-xs px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((c) => (
                <SelectItem key={c.code} value={c.code} className="text-xs">
                  {c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="h-9 flex items-center px-2 rounded-md border border-border bg-muted/40">
            <span className="text-sm font-bold text-accent tabular-nums truncate">{fmt(converted)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiniCurrencyConverter;
