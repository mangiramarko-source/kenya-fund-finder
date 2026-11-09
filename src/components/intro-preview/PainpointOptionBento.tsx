import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  ShieldCheck,
  Building2,
  Zap,
  ArrowRight,
  X,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PainpointOptionBentoProps {
  onDismiss?: () => void;
  onExploreFunds?: () => void;
  onOpenCalculator?: () => void;
}

export default function PainpointOptionBento({
  onDismiss,
  onExploreFunds,
  onOpenCalculator,
}: PainpointOptionBentoProps) {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleRestore = () => {
    setDismissed(false);
  };

  if (dismissed) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/60 p-3 flex items-center justify-between text-xs transition-all">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <span>Intro banner dismissed.</span>
          <span className="text-emerald-500 font-semibold">(Saved to device preference)</span>
        </span>
        <button
          onClick={handleRestore}
          className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Show "Why MMFs?"</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/80 p-4 sm:p-5 shadow-xl text-slate-100 transition-all">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-teal-500/10 blur-3xl" />

      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs font-bold py-0.5 px-2.5 flex items-center gap-1.5 shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            The Kenyan Saver's Dilemma
          </Badge>
          <span className="text-xs text-slate-400">Published daily at 08:30 EAT</span>
        </div>

        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          title="Dismiss banner"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Core Pain Point Headline */}
      <div className="relative z-10 space-y-1.5 mb-3.5">
        <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
          Is your idle cash quietly losing money in the bank?
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
          Kenyan inflation averages <strong className="text-white">~6.0%</strong>. Traditional bank savings accounts pay only <strong className="text-rose-400">~3.5%</strong>. Leaving savings idle quietly reduces your family's purchasing power every single year.
        </p>
      </div>

      {/* Visual Inflation vs Return Comparison Bars */}
      <div className="relative z-10 space-y-2 mb-4 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
        {/* Bank Savings Bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400 font-medium">Standard Bank Savings</span>
            <span className="text-rose-400 font-bold">~3.5% p.a. (Loses -2.5% to inflation)</span>
          </div>
          <div className="w-full bg-slate-800/90 h-2.5 rounded-full overflow-hidden">
            <div className="bg-rose-500/80 h-full rounded-full transition-all duration-500" style={{ width: "25%" }} />
          </div>
        </div>

        {/* Top CMA MMFs Bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-emerald-300 font-bold flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span>Top CMA Money Market Funds</span>
            </span>
            <span className="text-emerald-400 font-extrabold">~15.5% p.a. (+9.5% real gain)</span>
          </div>
          <div className="w-full bg-slate-800/90 h-2.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-500" style={{ width: "94%" }} />
          </div>
        </div>
      </div>

      {/* 3 Trust Signals */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mb-4">
        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <div>
            <div className="font-bold text-white">100% CMA Regulated</div>
            <div className="text-slate-400 text-[12px]">Zero crypto or forex risk</div>
          </div>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <div>
            <div className="font-bold text-white">Tier-1 Custodians</div>
            <div className="text-slate-400 text-[12px]">KCB, Stanbic, Co-op Bank</div>
          </div>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
          <Zap className="h-4 w-4 text-emerald-400 shrink-0" />
          <div>
            <div className="font-bold text-white">T+1 Daily Liquidity</div>
            <div className="text-slate-400 text-[12px]">Withdraw anytime to M-Pesa</div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="relative z-10 flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/70">
        <Link
          to="/funds"
          onClick={onExploreFunds}
          className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md"
        >
          <span>Compare 40 Funds Below</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>

        <Link
          to="/mmf-calculator"
          onClick={onOpenCalculator}
          className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-colors"
        >
          Calculate Your Net Yield
        </Link>

        <Link
          to="/learn/how-to-invest-in-money-market-funds-kenya"
          className="text-xs text-emerald-400 hover:text-emerald-300 font-medium sm:ml-auto py-1"
        >
          How MMFs Work in Kenya →
        </Link>
      </div>
    </div>
  );
}
