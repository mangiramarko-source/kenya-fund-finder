import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Calculator, ArrowRight, Coins, AlertCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";

interface PainpointOptionSliderProps {
  onFindFundsForAmount?: (amount: number) => void;
}

const PRESETS = [20000, 50000, 100000, 250000, 500000];

export default function PainpointOptionSlider({ onFindFundsForAmount }: PainpointOptionSliderProps) {
  const [amount, setAmount] = useState<number>(50000);

  // Calculations
  const bankRate = 0.035; // 3.5%
  const mmfGrossRate = 0.155; // 15.5%
  const whtTax = 0.15; // 15% withholding tax on interest

  const bankEarnings = Math.round(amount * bankRate);
  const mmfGross = Math.round(amount * mmfGrossRate);
  const mmfNet = Math.round(mmfGross * (1 - whtTax));
  const diffExtra = mmfNet - bankEarnings;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/70 p-4 sm:p-5 shadow-xl text-slate-100">
      {/* Background glow */}
      <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-emerald-500/15 blur-3xl" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2 relative z-10">
        <Badge
          variant="outline"
          className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs font-bold py-0.5 px-2.5 flex items-center gap-1.5"
        >
          <Calculator className="h-3.5 w-3.5 text-emerald-400" />
          Idle Cash Leakage Simulator
        </Badge>
        <span className="text-xs text-slate-400">Net after 15% WHT</span>
      </div>

      <div className="relative z-10 space-y-1 mb-3">
        <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
          How much money are you leaving on the table?
        </h3>
        <p className="text-xs text-slate-300">
          Slide your current bank/M-Pesa balance to see your 1-year opportunity cost:
        </p>
      </div>

      {/* Slider Box */}
      <div className="relative z-10 bg-slate-950/80 p-3 sm:p-4 rounded-xl border border-slate-800 space-y-3 mb-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">Your Idle Cash Balance:</span>
          <span className="text-lg font-black text-emerald-400">
            KES {amount.toLocaleString()}
          </span>
        </div>

        <Slider
          value={[amount]}
          min={10000}
          max={500000}
          step={5000}
          onValueChange={(val) => setAmount(val[0])}
          className="cursor-pointer"
        />

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <span className="text-[12px] text-slate-400 mr-1">Presets:</span>
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setAmount(p)}
              className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all border ${
                amount === p
                  ? "bg-emerald-500 text-slate-950 border-emerald-400 font-bold"
                  : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700"
              }`}
            >
              KES {(p / 1000).toFixed(0)}k
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards Comparison */}
      <div className="relative z-10 grid grid-cols-2 gap-2 mb-3">
        {/* Bank Yield */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="text-[12px] text-slate-400">Standard Bank (~3.5%)</div>
          <div className="text-sm sm:text-base font-bold text-slate-300">
            +KES {bankEarnings.toLocaleString()} <span className="text-xs text-slate-500 font-normal">/yr</span>
          </div>
          <div className="text-[12px] text-rose-400 flex items-center gap-1">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>Loses ~2.5% to inflation</span>
          </div>
        </div>

        {/* Top MMF Yield */}
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-1">
          <div className="text-[12px] text-emerald-300 font-medium">Top CMA MMF (~15.5%)</div>
          <div className="text-sm sm:text-base font-black text-emerald-400">
            +KES {mmfNet.toLocaleString()} <span className="text-xs text-emerald-300/80 font-normal">/yr</span>
          </div>
          <div className="text-[12px] text-emerald-400 font-semibold flex items-center gap-1">
            <Sparkles className="h-3 w-3 shrink-0" />
            <span>Beats inflation by +9%</span>
          </div>
        </div>
      </div>

      {/* The 'Aha!' Callout Bar */}
      <div className="relative z-10 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between mb-3.5">
        <div>
          <div className="text-xs text-emerald-200 font-medium">Net Extra Money Left On The Table:</div>
          <div className="text-[12px] text-slate-400">Pure gain from switching to a regulated MMF</div>
        </div>
        <div className="text-base sm:text-lg font-black text-emerald-400">
          +KES {diffExtra.toLocaleString()}
        </div>
      </div>

      {/* Action Button */}
      <div className="relative z-10">
        <Link
          to={`/funds?minDeposit=${amount}`}
          onClick={() => onFindFundsForAmount?.(amount)}
          className="w-full py-2.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md"
        >
          <span>Find Top Regulated Funds Accepting KES {amount.toLocaleString()}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
