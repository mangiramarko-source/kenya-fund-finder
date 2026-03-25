import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, Landmark, BarChart3, PieChart, TrendingUp, Banknote, LineChart } from "lucide-react";
import { faqByFundType, faqItems } from "@/data/faq";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { FUND_TYPE_LABELS, type FundType } from "@/lib/api";
import { getDisclaimer } from "@/lib/disclaimers";

const TABS: { key: FundType | "general" | "stocks"; label: string; icon: React.ElementType }[] = [
  { key: "general", label: "Overview", icon: BookOpen },
  { key: "stocks", label: "Stocks", icon: LineChart },
  { key: "money_market", label: "Money Market", icon: Banknote },
  { key: "fixed_income", label: "Fixed Income", icon: Landmark },
  { key: "balanced", label: "Balanced", icon: PieChart },
  { key: "equity", label: "Equity", icon: TrendingUp },
  { key: "bond", label: "Bond", icon: BarChart3 },
];

const LearnPage = () => {
  const [activeTab, setActiveTab] = useState<string>("general");

  useDocumentTitle(
    "Learn About Investing in Kenya",
    "Everything you need to know about stocks, Money Market, Fixed Income, Equity, Bond and Balanced Funds in Kenya — risks, returns, and CMA regulation explained simply."
  );

  useJsonLd({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  });

  const currentFaqs = faqByFundType[activeTab as keyof typeof faqByFundType] || [];
  const isFundType = activeTab !== "general" && activeTab !== "stocks";

  return (
    <div className="px-4 md:px-6 py-6">
      {/* Header — matches stocks/unit-trusts/news pages */}
      <div className="mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Learn</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Understand how different investment types work, their risks, returns &amp; regulation in Kenya.
        </p>
      </div>

      {/* Category filter pills — matches news/stocks pattern */}
      <div className="flex items-center gap-1.5 mb-5 overflow-x-auto scrollbar-hide pb-1">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`inline-flex items-center gap-1.5 rounded-lg text-xs font-medium whitespace-nowrap border h-8 px-3 transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-accent/30 hover:text-foreground"
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          );
        })}
      </div>

      {/* FAQ accordion */}
      <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
        <Accordion type="single" collapsible>
          {currentFaqs.map((item, i) => (
            <AccordionItem
              key={`${activeTab}-${i}`}
              value={`item-${i}`}
              className="border-0 [&:not(:last-child)]:border-b border-border"
            >
              <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline px-4 py-3.5 hover:bg-muted/40 transition-colors">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed px-4 pb-4">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Disclaimer */}
      <div className="mt-5 p-3 rounded-xl border border-border bg-muted/30">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong>Disclaimer{isFundType ? ` — ${FUND_TYPE_LABELS[activeTab as FundType]}` : ""}:</strong>{" "}
          {isFundType
            ? getDisclaimer(activeTab as FundType)
            : "The information provided is for educational and informational purposes only and does not constitute investment advice. Past performance is not indicative of future results. Consult a licensed financial advisor before making any investment decisions. All funds listed are regulated by the Capital Markets Authority (CMA) of Kenya."}
        </p>
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-center gap-3 mt-6 text-[10px] text-muted-foreground">
        <span>{currentFaqs.length} question{currentFaqs.length !== 1 ? "s" : ""}</span>
        <span className="w-px h-3 bg-border" />
        <span>{TABS.find(t => t.key === activeTab)?.label || activeTab}</span>
      </div>
    </div>
  );
};

export default LearnPage;
