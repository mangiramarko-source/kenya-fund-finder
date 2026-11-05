import { useState, useMemo } from "react";
import { Calculator, ArrowRight, ShieldCheck, Clock, TrendingUp, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { calculateSavingsBenchmark } from "@/lib/savingsApi";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const PRESET_AMOUNTS = [50000, 100000, 250000, 500000, 1000000];
const TENOR_OPTIONS = [
  { label: "3 Months", value: 3 },
  { label: "6 Months", value: 6 },
  { label: "12 Months (1 Year)", value: 12 },
];

export interface SavingsBenchmarkCalculatorProps {
  embedded?: boolean;
}

export const SavingsBenchmarkCalculator = ({ embedded = false }: SavingsBenchmarkCalculatorProps) => {
  const [amount, setAmount] = useState<number>(100000);
  const [duration, setDuration] = useState<number>(12);

  const benchmark = useMemo(() => {
    return calculateSavingsBenchmark(amount, duration);
  }, [amount, duration]);

  const maxNetReturn = useMemo(() => {
    return Math.max(...benchmark.items.map((i) => i.projectedNetKes), 1);
  }, [benchmark]);

  return (
    <section
      className={
        embedded
          ? "space-y-4"
          : "rounded-3xl border border-border/80 bg-gradient-to-b from-card/90 to-card/50 backdrop-blur-xl p-5 sm:p-7 shadow-lg shadow-black/[0.03] dark:shadow-black/20"
      }
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          {!embedded && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-2">
              <Calculator className="h-3.5 w-3.5" />
              Cross-Asset Return & Tax Simulator
            </div>
          )}
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
            {embedded ? "Simulate Net Earnings" : "Compare What Your Savings Will Earn"}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Side-by-side projected net return after Kenya's 15% Withholding Tax (WHT).
          </p>
        </div>

        {/* Tenor Selector */}
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-2xl border border-border/50 self-start sm:self-center">
          {TENOR_OPTIONS.map((tenor) => (
            <button
              key={tenor.value}
              type="button"
              onClick={() => setDuration(tenor.value)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                duration === tenor.value
                  ? "bg-background text-foreground shadow-sm shadow-black/10 dark:bg-neutral-800"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tenor.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Row & Presets */}
      <div className="pt-5 pb-6">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
          Deposit Amount (KES)
        </label>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground">
              KES
            </span>
            <Input
              type="number"
              min={1000}
              step={5000}
              value={amount || ""}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              className="pl-14 h-11 text-base font-bold tabular-nums rounded-2xl bg-background border-border/80"
              placeholder="100,000"
            />
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {PRESET_AMOUNTS.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant={amount === preset ? "default" : "outline"}
                size="sm"
                onClick={() => setAmount(preset)}
                className={`h-9 px-3 rounded-xl text-xs font-bold shrink-0 ${
                  amount === preset
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "border-border/70 hover:bg-muted"
                }`}
              >
                {preset >= 1000000 ? `${preset / 1000000}M` : `${preset / 1000}k`}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {benchmark.items.map((item, idx) => {
          const isHighest = item.projectedNetKes === maxNetReturn;
          const pctOfMax = (item.projectedNetKes / maxNetReturn) * 100;

          return (
            <div
              key={idx}
              className={`relative rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between ${
                isHighest
                  ? "border-emerald-500/50 bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] shadow-sm"
                  : "border-border/70 bg-card/60 dark:bg-neutral-900/40"
              }`}
            >
              {isHighest && (
                <div className="absolute -top-2.5 right-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black text-white shadow-sm">
                  <TrendingUp className="h-3 w-3" />
                  Top Yield
                </div>
              )}

              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
                  {item.category}
                </div>
                <h3 className="font-extrabold text-foreground text-sm line-clamp-1">
                  {item.name}
                </h3>

                {/* Net Projected Earning */}
                <div className="mt-3.5 pb-3 border-b border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground block uppercase tracking-wider">
                    Net Take-Home Return
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl sm:text-2xl font-black tabular-nums text-foreground">
                      KES {item.projectedNetKes.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center justify-between">
                    <span>Gross: {item.grossRatePct.toFixed(2)}% p.a.</span>
                    <span className="text-destructive/80">-15% Tax</span>
                  </div>

                  {/* Relative bar */}
                  <div className="mt-2.5 h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isHighest ? "bg-emerald-500" : "bg-primary/70"
                      }`}
                      style={{ width: `${pctOfMax}%` }}
                    />
                  </div>
                </div>

                {/* Attributes */}
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex items-start gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5 text-foreground/70" />
                    <span className="leading-tight">{item.liquidityNote}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="leading-tight">{item.riskNote}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
          <span>Rates are effective annualized rates based on current CBK and SASRA market reports.</span>
        </div>
      </div>
    </section>
  );
};
