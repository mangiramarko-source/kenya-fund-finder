import ResearchContent from "@/components/ResearchContent";
import InvestmentCalculator from "@/components/calculator/InvestmentCalculator";
import { MMF_CALCULATOR_SEO } from "@/lib/seoMarketContent";

export default function MmfCalculatorPage() {
  return <ResearchContent page={MMF_CALCULATOR_SEO}><div className="mb-8"><InvestmentCalculator /></div></ResearchContent>;
}
