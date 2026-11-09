import { useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  FileQuestion,
  Layers,
  ArrowRight,
  ChevronRight,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PainpointOptionSheetProps {
  onComplete?: () => void;
  onDismiss?: () => void;
}

const STEPS = [
  {
    step: 1,
    badge: "1. The Silent Loss",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    icon: TrendingUp,
    iconClass: "text-rose-600 dark:text-rose-400 bg-rose-500/10",
    image: "/images/onboarding/step1-inflation.jpg",
    imageAlt: "Kenyan urban street and market bustling with daily commerce",
    imageTag: "Commerce & Cost of Living",
    question: "Is your money actually working, or just sitting idle?",
    desc: "Keeping cash in ordinary bank accounts or M-Pesa pays between 0% and 3.5%. With Kenya's inflation averaging ~6.0%, your idle savings quietly lose real purchasing power every single month.",
    metricLabel: "Idle Bank Real Return",
    metricValue: "-2.5% p.a. (Inflation Loss)",
    metricValueClass: "text-rose-600 dark:text-rose-400",
  },
  {
    step: 2,
    badge: "2. The Market Dilemma",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    icon: FileQuestion,
    iconClass: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    image: "/images/onboarding/step2-data.jpg",
    imageAlt: "African professional researching investments on smartphone and laptop",
    imageTag: "Scattered Rate Searches",
    question: "Why is Kenyan investment data so scattered & confusing?",
    desc: "Rates for 40+ Funds, 60+ NSE Stocks, SACCO dividends, and CBK Treasury Bills are buried in separate PDFs, newspapers, and broker sites. Finding real, verified returns shouldn't feel like a full-time job.",
    metricLabel: "The Market Reality",
    metricValue: "5+ Websites to Compare 1 Asset",
    metricValueClass: "text-amber-600 dark:text-amber-400",
  },
  {
    step: 3,
    badge: "3. The All-In-One Terminal",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    icon: Layers,
    iconClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    image: "/images/onboarding/step3-skyline.jpg",
    imageAlt: "Wide landscape aerial view of Nairobi city skyline and towers",
    imageTag: "Nairobi Financial Capital",
    question: "What if you could compare every Kenyan asset in 60 seconds?",
    desc: "Kenya Fund Finder is the independent retail investment terminal. Track daily published rates for MMFs, dividend yields for NSE Stocks, CBK Treasury Bills, and SACCO deposits all in one place.",
    metricLabel: "All Regulated Markets",
    metricValue: "100% Independent & Daily Verified",
    metricValueClass: "text-emerald-600 dark:text-emerald-400",
  },
];

export default function PainpointOptionSheet({ onComplete, onDismiss }: PainpointOptionSheetProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = STEPS[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      onComplete?.();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-border/80 md:border-border/60 bg-card text-foreground p-4 sm:p-5 md:p-6 shadow-2xl backdrop-blur-md">
      {/* Drawer drag handle visual (Mobile Only) */}
      <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-3 md:hidden" />

      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-2.5 relative z-10">
        <Badge
          variant="outline"
          className={`text-xs font-bold py-0.5 px-2.5 ${currentStep.badgeClass}`}
        >
          {currentStep.badge}
        </Badge>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            {currentStepIndex + 1} of {STEPS.length}
          </span>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/50 transition-colors"
              title="Close"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* WIDESCREEN 16:9 PHOTO CONTAINER (Edge-to-Edge Full Width Across All Devices) */}
      <div className="relative w-full min-w-full aspect-[16/9] rounded-2xl overflow-hidden border border-border/70 bg-zinc-950 flex items-center justify-center mb-3 shadow-inner">
        <img
          src={currentStep.image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover filter blur-xl opacity-20 scale-105 pointer-events-none"
        />
        <img
          src={currentStep.image}
          alt={currentStep.imageAlt}
          className="relative z-10 w-full h-full object-cover object-center rounded-xl shadow-md transition-all duration-300"
          loading="eager"
        />
        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card/90 via-card/25 to-transparent z-15 pointer-events-none" />
        <div className="absolute bottom-2.5 left-2.5 z-20">
          <span className="inline-flex items-center gap-1 rounded-md bg-black/75 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md border border-white/15 shadow-sm">
            {currentStep.imageTag}
          </span>
        </div>
      </div>

      {/* Question & Card Content Area — Expanded height for mobile 16px typography */}
      <div className="min-h-[210px] sm:min-h-[180px] md:min-h-[170px] flex flex-col justify-center py-1 relative z-10 space-y-2.5">
        <div className="flex items-start gap-2.5">
          <div className={`p-2 rounded-xl shrink-0 mt-0.5 border border-border/50 ${currentStep.iconClass}`}>
            <currentStep.icon className="h-4 w-4" />
          </div>
          <div className="space-y-1.5 flex-1">
            <h3 className="font-heading text-[17px] sm:text-lg md:text-xl font-black tracking-tight text-foreground leading-snug">
              {currentStep.question}
            </h3>
            <p className="text-base text-muted-foreground leading-relaxed">
              {currentStep.desc}
            </p>
          </div>
        </div>

        {/* Metric Callout */}
        <div className="p-2 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">{currentStep.metricLabel}:</span>
          <span className={`font-black text-xs ${currentStep.metricValueClass}`}>
            {currentStep.metricValue}
          </span>
        </div>

        {/* Step 3: Multi-Asset Grid Badges */}
        {currentStepIndex === 2 && (
          <div className="grid grid-cols-2 gap-1.5 pt-1 text-center text-xs">
            <div className="p-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400">
              40+ CMA MMFs
            </div>
            <div className="p-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400">
              60+ NSE Stocks
            </div>
            <div className="p-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400">
              CBK T-Bills & Bonds
            </div>
            <div className="p-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400">
              SACCOs & Deposits
            </div>
          </div>
        )}
      </div>

      {/* Step Indicators */}
      <div className="flex justify-center gap-1.5 my-3 relative z-10">
        {STEPS.map((s, idx) => (
          <button
            key={s.step}
            onClick={() => setCurrentStepIndex(idx)}
            className={`h-1.5 rounded-full transition-all ${
              currentStepIndex === idx
                ? "w-7 bg-emerald-500"
                : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
            aria-label={`Go to step ${s.step}`}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/60 relative z-10">
        {currentStepIndex < STEPS.length - 1 ? (
          <>
            <Button
              onClick={handleNext}
              size="sm"
              className="flex-1 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1"
            >
              <span>Next: {STEPS[currentStepIndex + 1].badge.split(". ")[1]}</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {onDismiss && (
              <Button
                onClick={onDismiss}
                size="sm"
                variant="ghost"
                className="h-10 px-3 rounded-xl text-xs text-muted-foreground hover:text-foreground"
              >
                Skip
              </Button>
            )}
          </>
        ) : (
          <Link
            to="/overview"
            onClick={onComplete}
            className="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
          >
            <span>Explore All Kenyan Markets Now</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
