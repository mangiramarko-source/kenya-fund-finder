import React from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Calculator,
  ArrowRight,
  DollarSign,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface IntroOptionProps {
  onSelectCategory?: (category: string) => void;
  onOpenCalculator?: () => void;
}

export default function IntroOption1({ onSelectCategory, onOpenCalculator }: IntroOptionProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/80 via-slate-900/90 to-background p-4 md:p-6 shadow-2xl shadow-emerald-950/40">
      {/* Background ambient lighting glows */}
      <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-teal-500/15 blur-3xl" />

      {/* Trust pill & verified timestamp */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 relative z-10">
        <Badge
          variant="outline"
          className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[11px] font-semibold tracking-wide py-0.5 px-2.5 flex items-center gap-1.5"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          CMA-Regulated & Mon–Fri Verified
        </Badge>
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          Independent Tracker
        </span>
      </div>

      {/* Main Content Layout (Mobile Stack, Desktop 2-Col) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center relative z-10">
        <div className="md:col-span-7 space-y-2.5">
          <h2 className="text-xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
            Compare Every Money Market Fund in Kenya in{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-green-300 bg-clip-text text-transparent">
              Real-Time
            </span>
          </h2>
          <p className="text-xs md:text-sm text-slate-300/90 leading-relaxed">
            See daily compounding yields across <strong className="text-white">40 verified funds</strong> (KES & USD),
            compare minimum deposits, and calculate exact monthly earnings.
          </p>

          {/* Quick Stats Badges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <div className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-950/60 border border-emerald-800/50 rounded-md px-2 py-1 text-emerald-300">
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              <span>Yields up to <strong>16.5% p.a.</strong></span>
            </div>
            <div className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-800/70 border border-slate-700/60 rounded-md px-2 py-1 text-slate-200">
              <DollarSign className="h-3 w-3 text-teal-400" />
              <span>13 USD Funds</span>
            </div>
            <div className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-800/70 border border-slate-700/60 rounded-md px-2 py-1 text-slate-200">
              <Zap className="h-3 w-3 text-amber-400" />
              <span>From KES 100</span>
            </div>
          </div>
        </div>

        {/* Hero Illustration / 3D Visual Box */}
        <div className="md:col-span-5 flex justify-center">
          <div className="relative w-full max-w-[240px] md:max-w-none aspect-[16/10] md:aspect-square rounded-xl overflow-hidden border border-emerald-500/20 bg-slate-950/60 flex items-center justify-center group shadow-inner">
            <img
              src="/images/intro-hero-3d.png"
              alt="Kenya 3D Investment Yields Illustration"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                // High-fidelity fallback if image generation is pending
                const target = e.currentTarget;
                target.style.display = "none";
                const fallback = target.parentElement?.querySelector(".fallback-graphic");
                if (fallback) (fallback as HTMLElement).style.display = "flex";
              }}
            />
            {/* Fallback stylized CSS 3D card */}
            <div className="fallback-graphic hidden flex-col items-center justify-center p-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-2">
                <Sparkles className="h-6 w-6 text-slate-950" />
              </div>
              <span className="text-xs font-bold text-white">40 CMA-Approved MMFs</span>
              <span className="text-[10px] text-emerald-400">Daily Rates & Compounding</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Filter Chips */}
      <div className="mt-4 pt-3 border-t border-emerald-500/15 flex flex-wrap items-center gap-2 relative z-10">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
          Quick Filter:
        </span>
        <button
          onClick={() => onSelectCategory?.("Top KES")}
          className="text-xs font-medium rounded-lg px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1"
        >
          🔥 Top KES Yields
        </button>
        <button
          onClick={() => onSelectCategory?.("USD Funds")}
          className="text-xs font-medium rounded-lg px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1"
        >
          💵 USD Dollar Funds
        </button>
        <button
          onClick={() => onSelectCategory?.("Low Deposit")}
          className="text-xs font-medium rounded-lg px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1"
        >
          📱 M-Pesa / Low Min
        </button>
        <Link
          to="/mmf-calculator"
          className="text-xs font-medium rounded-lg px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white transition-colors ml-auto flex items-center gap-1 shadow-sm"
        >
          <Calculator className="h-3.5 w-3.5" />
          Calculator
        </Link>
      </div>
    </div>
  );
}
