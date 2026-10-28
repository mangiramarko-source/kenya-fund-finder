import { useState } from "react";
import CurrencyConverter from "@/components/calculator/CurrencyConverter";
import PayeCalculator from "@/components/calculator/PayeCalculator";
import InvestmentCalculator from "@/components/calculator/InvestmentCalculator";
import { TrendingUp, ArrowRightLeft, Receipt, Calculator as CalcIcon } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

type CalculatorTab = "investment" | "currency" | "paye";

const TABS: Array<{ key: CalculatorTab; label: string; icon: React.ElementType }> = [
  { key: "investment", label: "Investment Returns", icon: TrendingUp },
  { key: "currency", label: "Currency Converter", icon: ArrowRightLeft },
  { key: "paye", label: "PAYE Tax & SHIF", icon: Receipt },
];

const CalculatorPage = () => {
  const [activeTab, setActiveTab] = useState<CalculatorTab>("investment");

  useDocumentTitle(
    "Kenya MMF Calculator: Estimate Investment Returns | Kenya Fund Finder",
    "Estimate Kenyan MMF returns with an initial deposit, monthly contributions, yield, period, fees and an illustrative withholding-tax deduction.",
    {
      title: "Kenya MMF Calculator: Estimate Investment Returns",
      description:
        "Estimate Kenyan MMF returns with an initial deposit, monthly contributions, yield, period, fees and an illustrative withholding-tax deduction.",
    }
  );

  return (
    <div className="container max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-8 space-y-4 animate-in fade-in-50 duration-500">
      <header className="mb-2 md:mb-6">
        <div className="hidden md:flex items-center gap-2.5 mb-1">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-accent/10 text-accent">
            <CalcIcon className="h-4.5 w-4.5" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Kenya MMF Calculator</h1>
        </div>
        <h1 className="sr-only md:hidden">Kenya MMF Calculator</h1>
        <p className="text-sm text-muted-foreground">
          Estimate Kenyan MMF returns with an initial deposit, monthly contributions, yield, period, fees and an illustrative withholding-tax deduction.
        </p>
      </header>

      {/* Pill-shaped Tabs matching Mobile UI */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? "bg-foreground text-background shadow-sm font-bold"
                  : "border border-border bg-card text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="mt-2">
        {activeTab === "investment" && <InvestmentCalculator />}
        {activeTab === "currency" && <CurrencyConverter />}
        {activeTab === "paye" && <PayeCalculator />}
      </div>
    </div>
  );
};

export default CalculatorPage;
