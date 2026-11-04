import React from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  Flame,
  CheckCircle2,
  Sparkles,
  Award,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface IntroOptionProps {
  onSelectCategory?: (category: string) => void;
  onOpenCalculator?: () => void;
}

export default function IntroOption3({ onSelectCategory, onOpenCalculator }: IntroOptionProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/70 p-4 md:p-6 shadow-xl">
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute top-0 right-0 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl" />

      {/* Top Banner Row */}
      <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
        <Badge
          variant="secondary"
          className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold py-0.5 px-2.5 flex items-center gap-1.5"
        >
          <Award className="h-3.5 w-3.5 text-emerald-400" />
          Kenya's #1 Retail Fund Directory
        </Badge>
        <span className="text-[11px] font-medium text-slate-400">
          Updated Daily at 08:30 EAT
        </span>
      </div>

      {/* Main Grid: Headline & Visual */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center relative z-10">
        <div className="md:col-span-7 space-y-3">
          <h2 className="text-xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
            Put Your Idle Money to Work Where It{" "}
            <span className="bg-gradient-to-r from-amber-300 via-emerald-300 to-teal-300 bg-clip-text text-transparent">
              Beats Inflation
            </span>
          </h2>

          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            While standard bank accounts pay under 4%, CMA-approved Money Market Funds in Kenya are yielding up to <strong className="text-emerald-300 font-bold">16.45%</strong> with daily interest compounding and instant M-Pesa withdrawals.
          </p>

          {/* Bank vs MMF Eye-Opening Comparison Pill */}
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-2.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                Standard Bank Savings
              </span>
              <span className="font-semibold text-rose-400">~3.5% p.a. (Negative real return)</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-rose-500/80 h-full w-[22%]" />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-emerald-300 font-medium flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                Kenya Top MMFs
              </span>
              <span className="font-bold text-emerald-400">+15% to 16.5% p.a. (Net +8% over inflation)</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full w-[96%]" />
            </div>
          </div>
        </div>

        {/* Nairobi Skyline Visual */}
        <div className="md:col-span-5 flex justify-center">
          <div className="relative w-full max-w-[240px] md:max-w-none aspect-[16/10] md:aspect-square rounded-xl overflow-hidden border border-emerald-500/20 bg-slate-950/70 shadow-lg group">
            <img
              src="/images/intro-hero-nairobi.png"
              alt="Nairobi Modern Financial Skyline at Sunrise"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-2.5">
              <span className="text-[10px] font-semibold text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                Nairobi Securities & CMA Ecosystem
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 relative z-10">
        <Link
          to="/funds"
          className="text-xs font-semibold rounded-lg px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors flex items-center gap-1.5 shadow-md"
        >
          Compare 40 Funds Now
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          to="/mmf-calculator"
          className="text-xs font-medium rounded-lg px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1"
        >
          Calculate My Returns
        </Link>
        <Link
          to="/learn/how-to-invest-in-money-market-funds-kenya"
          className="text-xs font-medium text-emerald-400 hover:text-emerald-300 ml-auto flex items-center gap-1 py-1"
        >
          How MMFs Work in Kenya →
        </Link>
      </div>
    </div>
  );
}
