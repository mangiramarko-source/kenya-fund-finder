import { useState, useEffect } from "react";
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

const STORAGE_KEY = "kff_intro_sheet_dismissed";

interface StepData {
  step: number;
  badge: string;
  badgeClass: string;
  icon: typeof TrendingUp;
  iconClass: string;
  image: string;
  imageAlt: string;
  imageTag: string;
  question: string;
  desc: string;
  metricLabel: string;
  metricValue: string;
  metricValueClass: string;
}

const STEPS: StepData[] = [
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

interface QuestionLedIntroSheetProps {
  onExplore?: () => void;
  forceOpen?: boolean;
}

export default function QuestionLedIntroSheet({
  onExplore,
  forceOpen = false,
}: QuestionLedIntroSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY) === "true";
      if (!dismissed) {
        // Subtle entrance after page paints
        const timer = setTimeout(() => setIsOpen(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // In private browsing or storage-disabled environments
      setIsOpen(false);
    }
  }, [forceOpen]);

  const handleDismiss = () => {
    setIsOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Ignore
    }
  };

  const handleReopen = () => {
    setCurrentStepIndex(0);
    setIsOpen(true);
  };

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleDismiss();
      onExplore?.();
    }
  };

  const currentStep = STEPS[currentStepIndex];

  // If dismissed, show a slim, elegant re-open trigger
  if (!isOpen) {
    return (
      <div className="fixed bottom-3 right-4 z-40 hidden sm:block animate-in fade-in slide-in-from-bottom-2 duration-300">
        <button
          onClick={handleReopen}
          className="group flex items-center gap-2 rounded-full border border-border/80 bg-card/95 px-3.5 py-2 text-xs font-semibold text-foreground shadow-lg backdrop-blur-md hover:border-emerald-500/50 hover:text-emerald-500 transition-all"
          title="Why Kenya Fund Finder?"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Why Kenya Fund Finder?</span>
          <span className="text-muted-foreground group-hover:text-foreground transition-colors">↑</span>
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Subtle Backdrop (Mobile & Desktop) */}
      <div
        onClick={handleDismiss}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        aria-hidden="true"
      />

      {/* Responsive Dialog: Bottom Sheet on Mobile, Centered Modal on Desktop */}
      <div
        className="fixed bottom-0 inset-x-0 sm:bottom-3 sm:inset-x-3 md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:inset-x-auto md:w-full md:max-w-xl z-50 animate-rise md:animate-in md:fade-in md:zoom-in-95 duration-200 max-h-[95dvh] overflow-y-auto"
        role="dialog"
        aria-label="Welcome to Kenya Fund Finder"
      >
        <div className="relative overflow-hidden rounded-t-[28px] sm:rounded-3xl md:rounded-3xl border border-border/80 md:border-border/60 bg-card text-foreground p-4 sm:p-5 md:p-6 shadow-2xl backdrop-blur-md">
          {/* Sheet drag indicator (Mobile Only) */}
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-3 md:hidden" />

          {/* Header Row */}
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
              <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/50 transition-colors"
                title="Dismiss"
                aria-label="Dismiss intro"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* WIDESCREEN 16:9 PHOTO CONTAINER (Edge-to-Edge Full Width Across All Devices) */}
          <div className="relative w-full min-w-full aspect-[16/9] rounded-2xl overflow-hidden border border-border/70 bg-zinc-950 flex items-center justify-center mb-3 shadow-inner">
            {/* Ambient Background Fill */}
            <img
              src={currentStep.image}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover filter blur-xl opacity-20 scale-105 pointer-events-none"
            />

            {/* Natural Landscape Image - 100% Uncropped Full Spectrum */}
            <img
              src={currentStep.image}
              alt={currentStep.imageAlt}
              className="relative z-10 w-full h-full object-cover object-center rounded-xl shadow-md transition-all duration-300"
              loading="eager"
            />

            {/* Subtle Gradient Fade at the Bottom */}
            <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-card/90 via-card/25 to-transparent z-15 pointer-events-none" />

            {/* Floating Photo Tag */}
            <div className="absolute bottom-2.5 left-2.5 z-20">
              <span className="inline-flex items-center gap-1 rounded-md bg-black/75 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md border border-white/15 shadow-sm">
                {currentStep.imageTag}
              </span>
            </div>
          </div>

          {/* Question & Narrative Body — Expanded height for mobile 16px typography */}
          <div className="min-h-[210px] sm:min-h-[180px] md:min-h-[170px] flex flex-col justify-center py-1 relative z-10 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div
                className={`p-2 rounded-xl shrink-0 mt-0.5 border border-border/50 ${currentStep.iconClass}`}
              >
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

            {/* Metric Callout Card */}
            <div className="p-2 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">{currentStep.metricLabel}:</span>
              <span className={`font-black text-xs ${currentStep.metricValueClass}`}>
                {currentStep.metricValue}
              </span>
            </div>

            {/* Step 3: Multi-Asset Grid Badges */}
            {currentStepIndex === 2 && (
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-center text-xs">
                <div className="p-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400">
                  40+ CMA MMFs
                </div>
                <div className="p-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400">
                  60+ NSE Stocks
                </div>
                <div className="p-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400">
                  CBK T-Bills & Bonds
                </div>
                <div className="p-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 font-bold text-emerald-600 dark:text-emerald-400">
                  SACCOs & Deposits
                </div>
              </div>
            )}
          </div>

          {/* Stepper Dots */}
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

          {/* Action Footer */}
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
                <Button
                  onClick={handleDismiss}
                  size="sm"
                  variant="ghost"
                  className="h-10 px-3 rounded-xl text-xs text-muted-foreground hover:text-foreground"
                >
                  Skip
                </Button>
              </>
            ) : (
              <Link
                to="/overview"
                onClick={() => {
                  handleDismiss();
                  onExplore?.();
                }}
                className="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <span>Explore All Kenyan Markets Now</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
