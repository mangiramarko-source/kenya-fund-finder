import { useState, useEffect } from "react";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { Landmark, Users, ShieldCheck, PiggyBank, ArrowRight, Info, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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

      {/* Cross-Asset Benchmark Calculator */}
      <SavingsBenchmarkCalculator />

      {/* Main Tabbed Comparison View */}
      <div className="space-y-6">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
            <TabsList className="bg-muted/70 p-1 rounded-2xl h-11 border border-border/50">
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

            <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-2">
              <span className="flex items-center gap-1 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                15% Withholding Tax Applied
              </span>
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
    </div>
  );
};

export default SavingsPage;
