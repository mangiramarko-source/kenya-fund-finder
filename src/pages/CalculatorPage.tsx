import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import CurrencyConverter from "@/components/calculator/CurrencyConverter";
import PayeCalculator from "@/components/calculator/PayeCalculator";
import MmfCalculator from "@/components/calculator/MmfCalculator";
import TBillCalculator from "@/components/calculator/TBillCalculator";
import StockCalculator from "@/components/calculator/StockCalculator";
import CrossAssetBenchmark from "@/components/calculator/CrossAssetBenchmark";
import DisclaimerBlock from "@/components/DisclaimerBlock";
import {
  TrendingUp,
  ArrowRightLeft,
  Receipt,
  Calculator as CalcIcon,
  Landmark,
  BarChart3,
  Scale,
  Sparkles,
} from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export type CalculatorTab =
  | "mmfs"
  | "tbills"
  | "stocks"
  | "benchmark"
  | "currency"
  | "paye";

const TABS: Array<{ key: CalculatorTab; label: string; icon: React.ElementType; badge?: string }> = [
  { key: "mmfs", label: "Money Market Funds", icon: Landmark },
  { key: "tbills", label: "T-Bills & Bonds", icon: Landmark, badge: "CBK" },
  { key: "stocks", label: "NSE Stocks", icon: BarChart3, badge: "Dividends" },
  { key: "benchmark", label: "Compare Assets", icon: Scale, badge: "All-in-One" },
  { key: "currency", label: "FX Converter", icon: ArrowRightLeft },
  { key: "paye", label: "PAYE & SHIF", icon: Receipt },
];

const TAB_TITLES: Record<CalculatorTab, { title: string; desc: string }> = {
  mmfs: {
    title: "Kenya MMF Calculator: Estimate Net Investment Returns",
    desc: "Calculate returns for Kenyan CMA-regulated Money Market Funds with daily compounding, monthly top-ups, management fees, and 15% KRA withholding tax.",
  },
  tbills: {
    title: "Kenya Treasury Bills & Bonds Calculator | Central Bank of Kenya",
    desc: "Estimate CBK 91-day, 182-day, and 364-day Treasury Bill auction discount earnings, Tax-Free Infrastructure Bonds (IFB), and net payout after 15% WHT.",
  },
  stocks: {
    title: "NSE Stocks & Dividend Calculator | Nairobi Securities Exchange",
    desc: "Project returns from Kenyan NSE dividend-paying stocks, capital gains, dividend reinvestment (DRIP), and 5% resident dividend withholding tax.",
  },
  benchmark: {
    title: "Cross-Asset Investment Benchmark: MMF vs T-Bill vs Stocks vs SACCO",
    desc: "Compare what your savings will earn side-by-side across Money Market Funds, Treasury Bills, Bank Fixed Deposits, SACCOs, and NSE Equities.",
  },
  currency: {
    title: "CBK Forex Currency Converter | Kenya Fund Finder",
    desc: "Convert Kenyan Shilling (KES) against USD, GBP, EUR, and global currencies using real-time Central Bank of Kenya exchange rates.",
  },
  paye: {
    title: "Kenya PAYE & SHIF Salary Calculator (2026 Tax Brackets)",
    desc: "Calculate net take-home salary after PAYE tax bands, SHIF deduction, NSSF tiers, and statutory housing levy in Kenya.",
  },
};

const CalculatorPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");

  const initialTab: CalculatorTab = (() => {
    if (rawTab === "investment" || rawTab === "mmf" || rawTab === "mmfs") return "mmfs";
    if (rawTab === "tbill" || rawTab === "tbills" || rawTab === "treasury") return "tbills";
    if (rawTab === "stock" || rawTab === "stocks" || rawTab === "equity") return "stocks";
    if (rawTab === "compare" || rawTab === "benchmark" || rawTab === "savings") return "benchmark";
    if (rawTab === "fx" || rawTab === "currency") return "currency";
    if (rawTab === "paye" || rawTab === "tax" || rawTab === "salary") return "paye";
    return "mmfs";
  })();

  const [activeTab, setActiveTab] = useState<CalculatorTab>(initialTab);

  useEffect(() => {
    if (rawTab) {
      if (rawTab === "investment" || rawTab === "mmf") setActiveTab("mmfs");
      else if (rawTab === "tbill" || rawTab === "treasury") setActiveTab("tbills");
      else if (rawTab === "stock" || rawTab === "equity") setActiveTab("stocks");
      else if (rawTab === "compare" || rawTab === "savings") setActiveTab("benchmark");
      else if (rawTab === "fx") setActiveTab("currency");
      else if (rawTab === "tax" || rawTab === "salary") setActiveTab("paye");
      else if (TABS.some((t) => t.key === rawTab)) setActiveTab(rawTab as CalculatorTab);
    }
  }, [rawTab]);

  const handleTabChange = (tab: CalculatorTab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  const currentMeta = TAB_TITLES[activeTab] || TAB_TITLES.mmfs;

  useDocumentTitle(
    `${currentMeta.title} | Kenya Fund Finder`,
    currentMeta.desc,
    {
      title: currentMeta.title,
      description: currentMeta.desc,
    }
  );

  return (
    <div className="container max-w-4xl mx-auto px-4 md:px-6 py-3 sm:py-6 space-y-4 sm:space-y-6 animate-in fade-in-50 duration-500">
      {/* Semantic title for A11y & SEO */}
      <h1 className="sr-only">Kenya Investment Calculators</h1>

      {/* Mobile-only: Simple text UI matching MMFs & Stocks pages */}
      <div className="md:hidden mb-1">
        <p className="text-sm text-muted-foreground">
          Live market math for Kenyan MMFs, CBK T-Bills, NSE Stocks & Tax.
        </p>
      </div>

      {/* Desktop header with title, subtitle and pulse badges */}
      <div className="hidden md:flex items-end justify-between gap-6 mb-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-500">Kenyan Financial Tools</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-foreground">Kenya Investment Calculators</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Live market math for Kenyan MMFs, CBK T-Bills, NSE Stocks & Tax.
          </p>
        </div>

        {/* Quick Pulse Market Badges */}
        <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground shrink-0">
          <span className="px-2.5 py-1 rounded-full bg-muted/60 border border-border/60">
            MMFs: <strong className="text-emerald-600 dark:text-emerald-400">14–17% EAR</strong>
          </span>
          <span className="px-2.5 py-1 rounded-full bg-muted/60 border border-border/60">
            364D T-Bill: <strong className="text-foreground">~15.6%</strong>
          </span>
        </div>
      </div>

      {/* ─── Modern Pill Navigation Tabs ─── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap relative ${
                isActive
                  ? "bg-foreground text-background shadow-md shadow-foreground/10"
                  : "border border-border/70 bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full uppercase tracking-wider font-extrabold ${
                    isActive
                      ? "bg-emerald-500 text-white"
                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Active Calculator View ─── */}
      <div className="mt-2 min-h-[400px]">
        {activeTab === "mmfs" && <MmfCalculator />}
        {activeTab === "tbills" && <TBillCalculator />}
        {activeTab === "stocks" && <StockCalculator />}
        {activeTab === "benchmark" && <CrossAssetBenchmark />}
        {activeTab === "currency" && <CurrencyConverter />}
        {activeTab === "paye" && <PayeCalculator />}
      </div>

      {/* ─── Regulatory & Statutory Tax Disclaimer ─── */}
      <div className="pt-4 border-t border-border/50">
        <DisclaimerBlock extra="All calculator results, projections, and tax deductions are educational illustrations based on prevailing Kenyan statutes. Central Bank of Kenya (CBK) Treasury Bills and licensed CMA Money Market Funds automatically deduct 15% Withholding Tax (WHT) on interest. Listed NSE equity dividends are subject to 5% resident Withholding Tax. Infrastructure Bonds (IFB) are 100% tax-exempt. Actual returns fluctuate with market conditions and fund manager fees." />
      </div>
    </div>
  );
};

export default CalculatorPage;
