import { useState, useEffect } from "react";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { Landmark, Users, Calculator, X, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { SavingsBenchmarkCalculator } from "@/components/savings/SavingsBenchmarkCalculator";
import { FixedDepositTable } from "@/components/savings/FixedDepositTable";
import { SaccoTable } from "@/components/savings/SaccoTable";
import { TreasurySavingsTable } from "@/components/savings/TreasurySavingsTable";
import { fetchBankFixedDeposits, fetchSaccoRecords } from "@/lib/savingsApi";
import type { BankFixedDeposit, SaccoRecord } from "@/types/savings";
import SectionLiveStatus from "@/components/SectionLiveStatus";
import DisclaimerBlock from "@/components/DisclaimerBlock";
import { useSearchParams } from "react-router-dom";

type SavingsTab = "fixed-deposits" | "saccos" | "tbills";

const SavingsPage = () => {
  useDocumentTitle(
    "Bank Fixed Deposits, SACCOs & T-Bills in Kenya (2026) – Compare Net Returns",
    "Compare guaranteed fixed deposit rates from KDIC banks, annual member dividends from SASRA SACCOs, and CBK Treasury Bill benchmark yields after tax.",
    {
      title: "Bank Fixed Deposits, SACCOs & T-Bills in Kenya – Compare Net Returns",
      description: "Compare fixed deposit rates, SACCO dividend yields, and Central Bank Treasury Bill yields after tax. Updated for 2026.",
    }
  );

  useJsonLd({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Bank Fixed Deposits, Regulated SACCOs & T-Bills in Kenya",
    description: "Compare commercial bank fixed deposits, SASRA SACCO dividends, and CBK Treasury Bills in Kenya.",
    url: "https://kenyafundfinder.com/savings",
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<SavingsTab>(() => {
    if (tabParam === "saccos") return "saccos";
    if (tabParam === "tbills" || tabParam === "t-bills" || tabParam === "treasury") return "tbills";
    return "fixed-deposits";
  });

  useEffect(() => {
    if (tabParam === "saccos") {
      setActiveTab("saccos");
    } else if (tabParam === "tbills" || tabParam === "t-bills" || tabParam === "treasury") {
      setActiveTab("tbills");
    } else if (tabParam === "fixed-deposits") {
      setActiveTab("fixed-deposits");
    }
  }, [tabParam]);

  const handleTabChange = (val: string) => {
    const nextTab = val as SavingsTab;
    setActiveTab(nextTab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (nextTab === "fixed-deposits") {
          next.delete("tab");
        } else {
          next.set("tab", nextTab);
        }
        return next;
      },
      { replace: true }
    );
  };

  const [deposits, setDeposits] = useState<BankFixedDeposit[]>([]);
  const [saccos, setSaccos] = useState<SaccoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [calcOpen, setCalcOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchBankFixedDeposits(), fetchSaccoRecords()])
      .then(([depositsData, saccosData]) => {
        if (mounted) {
          setDeposits(depositsData);
          setSaccos(saccosData);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load savings data:", err);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-2 pb-6 md:py-6 space-y-3.5 md:space-y-4 animate-in fade-in duration-300">
      {/* Semantic title for A11y & SEO */}
      <h1 className="sr-only">Bank Fixed Deposits & Regulated SACCO Rates in Kenya</h1>

      {/* Description directly below top navigation (matches MMF typography) */}
      <p className="text-sm text-muted-foreground !mt-0">
        Compare guaranteed KDIC bank fixed deposit rates, SASRA SACCO dividends, and Central Bank Treasury Bills.
      </p>

      {/* Main Tabbed Comparison View — starts directly from the pills */}
      <div className="space-y-4">
        {/* Desktop toolbar: Pill navigation + Live status */}
        <div className="hidden md:flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleTabChange("fixed-deposits")}
              className={`inline-flex h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "fixed-deposits"
                  ? "border-foreground bg-foreground text-background shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <Landmark className="h-4 w-4" />
              <span>Bank Fixed Deposits</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-normal tabular-nums ${
                  activeTab === "fixed-deposits"
                    ? "bg-background/20 text-background"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {deposits.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("saccos")}
              className={`inline-flex h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "saccos"
                  ? "border-foreground bg-foreground text-background shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Regulated SACCOs</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-normal tabular-nums ${
                  activeTab === "saccos"
                    ? "bg-background/20 text-background"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {saccos.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("tbills")}
              className={`inline-flex h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "tbills"
                  ? "border-foreground bg-foreground text-background shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Treasury Bills & Bonds</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-normal tabular-nums ${
                  activeTab === "tbills"
                    ? "bg-background/20 text-background"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                CBK
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <SectionLiveStatus
              section="funds"
              fallbackDate={new Date()}
              isLoading={loading}
            />
          </div>
        </div>

        {/* Mobile: Filter Pills Row (Exact Match to MMF FundGrid) */}
        <div className="md:hidden mb-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => handleTabChange("fixed-deposits")}
            className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "fixed-deposits"
                ? "border-foreground bg-foreground text-background shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:bg-muted/30 hover:text-foreground"
            }`}
          >
            <Landmark className="h-3.5 w-3.5" />
            <span>Bank Fixed Deposits</span>
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-full font-normal tabular-nums ${
                activeTab === "fixed-deposits"
                  ? "bg-background/20 text-background"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {deposits.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("saccos")}
            className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "saccos"
                ? "border-foreground bg-foreground text-background shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:bg-muted/30 hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>SACCOs</span>
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-full font-normal tabular-nums ${
                activeTab === "saccos"
                  ? "bg-background/20 text-background"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {saccos.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("tbills")}
            className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "tbills"
                ? "border-foreground bg-foreground text-background shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:bg-muted/30 hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>T-Bills & Bonds</span>
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-full font-normal tabular-nums ${
                activeTab === "tbills"
                  ? "bg-background/20 text-background"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              CBK
            </span>
          </button>
        </div>

        {/* Mobile Live Status (Between filter pills and table, matching MMF FundGrid) */}
        <div className="md:hidden mb-3.5 flex items-center justify-between px-0.5">
          <SectionLiveStatus
            section="funds"
            fallbackDate={new Date()}
            isLoading={loading}
            hideLive
            className="w-full justify-between"
          />
        </div>

        {/* Selected View Table */}
        <div className="space-y-4">
          {activeTab === "fixed-deposits" ? (
            <FixedDepositTable deposits={deposits} />
          ) : activeTab === "saccos" ? (
            <SaccoTable saccos={saccos} />
          ) : (
            <TreasurySavingsTable />
          )}
        </div>
      </div>

      {/* Regulatory & Safety Guide Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="rounded-2xl border border-border/70 bg-card/60 p-5 space-y-2 dark:bg-neutral-900/40">
          <div className="flex items-center gap-2 text-foreground font-bold text-sm">
            <Landmark className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            How Bank Fixed Deposits Work in Kenya
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Commercial bank fixed deposits lock in capital for agreed terms (1, 3, 6, or 12 months) at a guaranteed rate. Deposits in Kenya are insured by the Kenya Deposit Insurance Corporation (KDIC) up to KES 500,000 per depositor per bank. Interest earned is subject to a 15% final Withholding Tax (WHT) deducted at source.
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/60 p-5 space-y-2 dark:bg-neutral-900/40">
          <div className="flex items-center gap-2 text-foreground font-bold text-sm">
            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            How SACCO Dividends & Interest Work
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Deposit-Taking SACCOs (DT-SACCOs) are regulated by SASRA. Members earn <strong>Interest on Deposits</strong> (rebates on withdrawable savings, typically 8% to 13% p.a.) and <strong>Dividends on Share Capital</strong> (non-withdrawable equity, often 12% to 20% p.a.). Payouts are declared annually following approval at the Annual General Meeting (AGM).
          </p>
        </div>
      </div>

      <DisclaimerBlock />

      {/* Floating Action Button (FAB) for Return Simulator — positioned above MobileBottomNav on small screens */}
      <button
        type="button"
        onClick={() => setCalcOpen(true)}
        aria-label="Open Savings Return Calculator"
        className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] md:bottom-8 right-4 md:right-8 z-40 flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 shadow-xl shadow-emerald-950/40 active:scale-95 transition-all text-xs md:text-sm font-bold border border-emerald-400/30 cursor-pointer"
      >
        <Calculator className="h-4 w-4 stroke-[2.5]" />
        <span>Compare Calculator</span>
      </button>

      {/* Return & Benchmark Calculator Popup (Bottom Sheet on Mobile, Dialog on Desktop) */}
      {isMobile ? (
        <Sheet open={calcOpen} onOpenChange={setCalcOpen}>
          <SheetContent
            side="bottom"
            className="inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[28px] border-x border-t border-border bg-background p-0 shadow-2xl [&>button]:hidden z-50"
            aria-label="Cross-Asset Return & Tax Simulator"
          >
            {/* Grab handle indicator */}
            <div aria-hidden="true" className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/80 px-5 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Calculator className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <SheetTitle className="text-base font-bold text-foreground">
                    Compare Calculator
                  </SheetTitle>
                  <SheetDescription className="text-[11px] text-muted-foreground mt-0.5">
                    Simulate net take-home returns after 15% Withholding Tax
                  </SheetDescription>
                </div>
              </div>
              <button
                onClick={() => setCalcOpen(false)}
                type="button"
                aria-label="Close calculator"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Scrollable Calculator Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <SavingsBenchmarkCalculator embedded />
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={calcOpen} onOpenChange={setCalcOpen}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-3xl max-h-[90vh] flex flex-col bg-background border-border/80">
            <DialogHeader className="p-5 pb-3 border-b border-border/60 bg-muted/30">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Calculator className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <DialogTitle className="text-lg font-black text-foreground">
                    Cross-Asset Return & Tax Simulator
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Simulate net take-home returns after Kenya's 15% Withholding Tax across MMF, T-Bills, Bank Fixed Deposits, and SACCOs
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain">
              <SavingsBenchmarkCalculator embedded />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SavingsPage;
