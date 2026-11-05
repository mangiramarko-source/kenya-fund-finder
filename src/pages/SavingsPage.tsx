import { useState, useEffect } from "react";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { Landmark, Users, ShieldCheck, PiggyBank, ArrowRight, Info, Sparkles, Calculator } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SavingsBenchmarkCalculator } from "@/components/savings/SavingsBenchmarkCalculator";
import { FixedDepositTable } from "@/components/savings/FixedDepositTable";
import { SaccoTable } from "@/components/savings/SaccoTable";
import { fetchBankFixedDeposits, fetchSaccoRecords } from "@/lib/savingsApi";
import type { BankFixedDeposit, SaccoRecord } from "@/types/savings";
import SectionLiveStatus from "@/components/SectionLiveStatus";
import DisclaimerBlock from "@/components/DisclaimerBlock";
import { Link, useSearchParams } from "react-router-dom";

const SavingsPage = () => {
  useDocumentTitle(
    "Bank Fixed Deposits & SACCO Rates in Kenya (2026) – Compare Net Returns",
    "Compare fixed deposit rates across Kenyan commercial banks (Tier 1 & Tier 2) and dividend yields across top SASRA-regulated SACCOs with net returns after 15% Withholding Tax.",
    {
      title: "Bank Fixed Deposits & SACCO Rates in Kenya – Compare Net Returns",
      description: "Compare fixed deposit rates across Kenyan commercial banks and SASRA SACCO dividend yields after tax. Updated for 2026.",
    }
  );

  useJsonLd({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Bank Fixed Deposits & SACCO Rates in Kenya",
    description: "Compare commercial bank fixed deposit rates and SASRA-regulated SACCO dividend yields in Kenya.",
    url: "https://kenyafundfinder.com/savings",
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"fixed-deposits" | "saccos">(
    tabParam === "saccos" ? "saccos" : "fixed-deposits"
  );

  useEffect(() => {
    if (tabParam === "saccos" || tabParam === "fixed-deposits") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (val: string) => {
    const nextTab = val as "fixed-deposits" | "saccos";
    setActiveTab(nextTab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (nextTab === "saccos") {
          next.set("tab", "saccos");
        } else {
          next.delete("tab");
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
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            <PiggyBank className="h-3.5 w-3.5" />
            Kenya Fixed Savings & Co-operative Intelligence
          </div>
          <SectionLiveStatus
            sourceText="KDIC & SASRA Regulated"
            status="live"
            lastUpdate={new Date()}
          />
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">
              Bank Fixed Deposits & SACCOs
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 max-w-2xl">
              Compare guaranteed interest rates across licensed commercial banks and member dividend yields across Kenya's premier SASRA-regulated DT-SACCOs.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Link
              to="/funds"
              className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
            >
              Comparing Unit Trusts? View Money Market Funds
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Tabbed Comparison View — starts directly from the pills */}
      <div className="space-y-6">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
            <TabsList className="bg-muted/70 p-1 rounded-2xl h-11 border border-border/50 self-start sm:self-auto">
              <TabsTrigger
                value="fixed-deposits"
                className="rounded-xl font-bold text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Landmark className="h-4 w-4 mr-1.5" />
                Bank Fixed Deposits
                <Badge variant="secondary" className="ml-2 text-[10px] py-0 px-1.5 font-bold">
                  {deposits.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="saccos"
                className="rounded-xl font-bold text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                <Users className="h-4 w-4 mr-1.5" />
                Regulated SACCOs
                <Badge variant="secondary" className="ml-2 text-[10px] py-0 px-1.5 font-bold">
                  {saccos.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2.5">
              <div className="text-xs text-muted-foreground hidden lg:flex items-center gap-1.5 mr-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span className="font-medium">15% WHT Applied</span>
              </div>

              <Button
                type="button"
                onClick={() => setCalcOpen(true)}
                variant="outline"
                className="h-10 px-3.5 rounded-2xl border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 font-bold text-xs sm:text-sm gap-2 shadow-xs transition-all"
              >
                <Calculator className="h-4 w-4" />
                <span>Compare Calculator</span>
              </Button>
            </div>
          </div>

          <TabsContent value="fixed-deposits" className="mt-5 space-y-4">
            <FixedDepositTable deposits={deposits} />
          </TabsContent>

          <TabsContent value="saccos" className="mt-5 space-y-4">
            <SaccoTable saccos={saccos} />
          </TabsContent>
        </Tabs>
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

      {/* Mobile Sticky Floating Action Button (FAB) */}
      <button
        type="button"
        onClick={() => setCalcOpen(true)}
        aria-label="Open Savings Return Calculator"
        className="fixed bottom-20 right-4 z-40 md:hidden flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 shadow-xl shadow-emerald-950/40 active:scale-95 transition-all text-xs font-bold border border-emerald-400/30"
      >
        <Calculator className="h-4 w-4 stroke-[2.5]" />
        <span>Compare Calculator</span>
      </button>

      {/* Return & Benchmark Calculator Popup Dialog */}
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
    </div>
  );
};

export default SavingsPage;
