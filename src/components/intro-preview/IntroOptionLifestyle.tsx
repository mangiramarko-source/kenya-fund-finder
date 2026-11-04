import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  ShieldCheck,
  Calculator,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Zap,
  Sparkles,
  ArrowRight,
  Maximize2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface IntroOptionLifestyleProps {
  onSelectCategory?: (category: string) => void;
  onOpenCalculator?: () => void;
  activeCategory?: string;
}

export default function IntroOptionLifestyle({
  onSelectCategory,
  onOpenCalculator,
  activeCategory = "All",
}: IntroOptionLifestyleProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("kf_intro_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("kf_intro_collapsed", String(next));
      } catch {
        // Ignore storage access errors in private browsing
      }
      return next;
    });
  };

  // If collapsed by repeat user, show a slim, elegant quick-access strip
  if (collapsed) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-slate-900/90 p-3 shadow-md backdrop-blur-md flex items-center justify-between gap-3 animate-in fade-in-50 duration-300">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-white truncate">
            Top MMF Yield: <strong className="text-emerald-400 font-extrabold">16.45%</strong> (40 CMA Funds)
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/mmf-calculator"
            className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <Calculator className="h-3 w-3" />
            Calculator
          </Link>
          <button
            onClick={toggleCollapse}
            className="rounded-md border border-slate-700 bg-slate-800 p-1 text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
            title="Expand Intro"
            aria-label="Expand Intro Banner"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-slate-950 via-slate-900/95 to-emerald-950/70 p-4 md:p-6 shadow-2xl transition-all duration-300">
      {/* Background ambient lighting glows */}
      <div className="pointer-events-none absolute -top-10 -right-10 h-52 w-52 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-44 w-44 rounded-full bg-teal-500/10 blur-3xl" />

      {/* Top Header Row with Trust Badge & Collapse Toggle */}
      <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[11px] font-semibold tracking-wide py-0.5 px-2.5 flex items-center gap-1.5 shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            CMA-Regulated & Mon–Fri Verified
          </Badge>

          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Independent Kenyan Tracker
          </span>
        </div>

        {/* Subtle collapse button for repeat visitors */}
        <button
          onClick={toggleCollapse}
          className="rounded-md border border-slate-700/60 bg-slate-800/80 p-1 text-slate-400 hover:text-white hover:border-slate-600 transition-colors shrink-0"
          title="Minimize Intro"
          aria-label="Minimize Intro Banner"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Main 2-Col Responsive Grid (Mobile stacks, Desktop splits 7 / 5) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center relative z-10">
        {/* Left Column: Headline, Value Stats, and Quick Filters */}
        <div className="md:col-span-7 space-y-3">
          <h2 className="text-xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
            Compare Every Money Market Fund in Kenya in{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-green-300 bg-clip-text text-transparent">
              Real-Time
            </span>
          </h2>

          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            Track daily interest compounding across <strong className="text-white">40 verified funds</strong> (KES & USD),
            compare custody banks, and calculate your exact monthly earnings before investing.
          </p>

          {/* Quick Metrics Strip */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-950/70 border border-emerald-800/60 rounded-lg px-2.5 py-1 text-emerald-300">
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              <span>Yields up to <strong>16.45% p.a.</strong></span>
            </div>
            <div className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-800/80 border border-slate-700/60 rounded-lg px-2 py-1 text-slate-200">
              <DollarSign className="h-3 w-3 text-teal-400" />
              <span>13 USD Funds</span>
            </div>
            <div className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-800/80 border border-slate-700/60 rounded-lg px-2 py-1 text-slate-200">
              <Zap className="h-3 w-3 text-amber-400" />
              <span>From KES 100</span>
            </div>
          </div>
        </div>

        {/* Right Column: Hand-Held Lifestyle Phone Mockup Photo */}
        <div className="md:col-span-5 flex justify-center md:justify-end">
          <div className="relative w-full max-w-[280px] md:max-w-[320px] rounded-xl overflow-hidden border border-emerald-500/25 bg-slate-950/80 shadow-2xl shadow-emerald-950/50 group">
            <img
              src="/images/intro-lifestyle-hero.png"
              alt="KenyaFundFinder mobile app running on smartphone in hand"
              className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            {/* Subtle bottom glass gradient badge */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-2.5 flex items-center justify-between text-[10px] text-slate-300">
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-emerald-400" />
                Live Daily Yields
              </span>
              <span className="text-slate-400">Tap to explore</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Quick-Action Filter Chips & Calculator */}
      <div className="mt-4 pt-3 border-t border-emerald-500/15 flex flex-wrap items-center gap-2 relative z-10">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
          Quick View:
        </span>
        <button
          onClick={() => onSelectCategory?.("Top KES")}
          className={`text-xs font-semibold rounded-lg px-2.5 py-1 transition-all flex items-center gap-1 border ${
            activeCategory === "Top KES"
              ? "bg-emerald-500 text-slate-950 border-emerald-400 font-bold"
              : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/30"
          }`}
        >
          🔥 Top KES Yields
        </button>
        <button
          onClick={() => onSelectCategory?.("USD Funds")}
          className={`text-xs font-medium rounded-lg px-2.5 py-1 transition-all flex items-center gap-1 border ${
            activeCategory === "USD Funds"
              ? "bg-emerald-500 text-slate-950 border-emerald-400 font-bold"
              : "bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700"
          }`}
        >
          💵 USD Dollar Funds
        </button>
        <button
          onClick={() => onSelectCategory?.("Low Deposit")}
          className={`text-xs font-medium rounded-lg px-2.5 py-1 transition-all flex items-center gap-1 border ${
            activeCategory === "Low Deposit"
              ? "bg-emerald-500 text-slate-950 border-emerald-400 font-bold"
              : "bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700"
          }`}
        >
          📱 M-Pesa / Low Min
        </button>
        <Link
          to="/mmf-calculator"
          className="text-xs font-semibold rounded-lg px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white transition-colors ml-auto flex items-center gap-1.5 shadow-sm"
        >
          <Calculator className="h-3.5 w-3.5" />
          Yield Calculator
        </Link>
      </div>
    </div>
  );
}
