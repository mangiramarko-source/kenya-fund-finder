import React from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Landmark,
  ArrowUpRight,
  ShieldAlert,
  ShieldCheck,
  Percent,
  Coins,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface IntroOptionProps {
  onSelectCategory?: (category: string) => void;
  onOpenCalculator?: () => void;
}

export default function IntroOption2({ onSelectCategory }: IntroOptionProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card/95 p-4 md:p-6 shadow-lg backdrop-blur-sm space-y-4">
      {/* Top Header Row with Live Market Ticker Chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Top KES Yield</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg md:text-xl font-black text-foreground">16.45%</span>
            <span className="text-[10px] text-muted-foreground">p.a.</span>
          </div>
          <span className="text-[10px] text-emerald-400/90 truncate">Etica / Lofty-Corban</span>
        </div>

        <div className="rounded-xl border border-border bg-background/60 p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">CBK 91D T-Bill</span>
            <Landmark className="h-3 w-3 text-muted-foreground" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg md:text-xl font-black text-foreground">14.82%</span>
            <span className="text-[10px] text-muted-foreground">benchmark</span>
          </div>
          <span className="text-[10px] text-muted-foreground">Central Bank of Kenya</span>
        </div>

        <div className="rounded-xl border border-border bg-background/60 p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">USD Funds</span>
            <Coins className="h-3 w-3 text-teal-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg md:text-xl font-black text-foreground">6.50%</span>
            <span className="text-[10px] text-muted-foreground">USD p.a.</span>
          </div>
          <span className="text-[10px] text-muted-foreground">13 Dollar MMFs</span>
        </div>

        <div className="rounded-xl border border-border bg-background/60 p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">CMA Coverage</span>
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg md:text-xl font-black text-foreground">40 / 40</span>
            <span className="text-[10px] text-muted-foreground">funds</span>
          </div>
          <span className="text-[10px] text-emerald-400">100% Regulated</span>
        </div>
      </div>

      {/* Main Bento Middle Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center rounded-xl bg-muted/40 p-3.5 border border-border/50">
        <div className="md:col-span-8 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
            <ShieldCheck className="h-4 w-4" />
            <span>Independent Kenyan Investment Terminal</span>
          </div>
          <h3 className="text-base md:text-xl font-bold tracking-tight text-foreground">
            Don't leave cash idle. Compare and switch to the highest daily yield.
          </h3>
          <p className="text-xs text-muted-foreground">
            Track published rate changes every business morning, check custody banks, and verify withdrawal times before investing.
          </p>
        </div>

        <div className="md:col-span-4 flex justify-center md:justify-end">
          <div className="relative w-full max-w-[190px] aspect-[4/3] rounded-lg overflow-hidden border border-border bg-background flex items-center justify-center">
            <img
              src="/images/intro-hero-vector.png"
              alt="Vector Investment Growth Kenya"
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = "none";
                const fallback = target.parentElement?.querySelector(".fallback-graphic-2");
                if (fallback) (fallback as HTMLElement).style.display = "flex";
              }}
            />
            <div className="fallback-graphic-2 hidden flex-col items-center justify-center p-3 text-center">
              <TrendingUp className="h-8 w-8 text-emerald-500 mb-1" />
              <span className="text-[11px] font-bold text-foreground">Yield Tracker</span>
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-medium scrollbar-none">
        <span className="text-[11px] text-muted-foreground mr-1 shrink-0 flex items-center gap-1">
          <SlidersHorizontal className="h-3 w-3" /> View:
        </span>
        <button
          onClick={() => onSelectCategory?.("All")}
          className="rounded-full bg-emerald-500 text-white px-3 py-1 text-xs shrink-0 font-medium shadow-sm"
        >
          All 40 Funds
        </button>
        <button
          onClick={() => onSelectCategory?.("KES")}
          className="rounded-full bg-muted hover:bg-muted/80 text-foreground px-3 py-1 text-xs shrink-0 transition-colors"
        >
          KES Shilling (27)
        </button>
        <button
          onClick={() => onSelectCategory?.("USD")}
          className="rounded-full bg-muted hover:bg-muted/80 text-foreground px-3 py-1 text-xs shrink-0 transition-colors"
        >
          USD Dollar (13)
        </button>
        <button
          onClick={() => onSelectCategory?.("LowMin")}
          className="rounded-full bg-muted hover:bg-muted/80 text-foreground px-3 py-1 text-xs shrink-0 transition-colors"
        >
          Under KES 1,000 Min
        </button>
        <Link
          to="/compare"
          className="rounded-full border border-border bg-background hover:bg-muted text-foreground px-3 py-1 text-xs shrink-0 ml-auto flex items-center gap-1 transition-colors"
        >
          Side-by-Side Compare <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
