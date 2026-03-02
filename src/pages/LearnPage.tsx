import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Landmark, BarChart3, PieChart, TrendingUp, Banknote } from "lucide-react";
import { faqByFundType, faqItems } from "@/data/faq";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { FUND_TYPE_LABELS, type FundType } from "@/lib/api";
import { getDisclaimer } from "@/lib/disclaimers";

const TABS: { key: FundType | "general"; label: string; icon: React.ElementType }[] = [
  { key: "general", label: "Overview", icon: BookOpen },
  { key: "money_market", label: "Money Market", icon: Banknote },
  { key: "fixed_income", label: "Fixed Income", icon: Landmark },
  { key: "balanced", label: "Balanced", icon: PieChart },
  { key: "equity", label: "Equity", icon: TrendingUp },
  { key: "bond", label: "Bond", icon: BarChart3 },
];

const LearnPage = () => {
  const [activeTab, setActiveTab] = useState<string>("general");

  useDocumentTitle(
    "Learn About Investment Funds in Kenya",
    "Everything you need to know about Money Market, Fixed Income, Equity, Bond and Balanced Funds in Kenya — risks, returns, and CMA regulation explained simply."
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
  const isFundType = activeTab !== "general";

  return (
    <div className="container py-10 max-w-3xl">
      <div className="text-center mb-10">
        <BookOpen className="h-10 w-10 text-accent mx-auto mb-4" />
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Learn About Investment Funds</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Understand how different fund types work, their risks, returns, and how they're regulated in Kenya.
        </p>
      </div>

      {/* Fund type tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1 gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <TabsTrigger
              key={key}
              value={key}
              className="whitespace-nowrap gap-1.5 px-3 py-2 text-sm data-[state=active]:shadow-sm"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* FAQ accordion */}
      <Accordion type="single" collapsible className="space-y-2">
        {currentFaqs.map((item, i) => (
          <AccordionItem key={`${activeTab}-${i}`} value={`item-${i}`} className="rounded-lg border border-border bg-card px-4">
            <AccordionTrigger className="text-left font-semibold hover:no-underline">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Dynamic disclaimer */}
      <div className="mt-10 p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Disclaimer{isFundType ? ` — ${FUND_TYPE_LABELS[activeTab as FundType]}` : ""}:</strong>{" "}
          {isFundType
            ? getDisclaimer(activeTab as FundType)
            : "The information provided on this platform is for educational and informational purposes only and does not constitute investment advice, financial advice, or a recommendation to buy or sell any financial product. Past performance is not indicative of future results. All investments carry risk, including the potential loss of principal. Consult a licensed financial advisor before making any investment decisions. All funds listed are regulated by the Capital Markets Authority (CMA) of Kenya."}
        </p>
      </div>
    </div>
  );
};

export default LearnPage;
