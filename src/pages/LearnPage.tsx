import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, Landmark, BarChart3, PieChart, TrendingUp, Banknote, LineChart, Search } from "lucide-react";
import { faqByFundType } from "@/data/faq";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { FUND_TYPE_LABELS, type FundType } from "@/lib/api";
import { getDisclaimer } from "@/lib/disclaimers";
import { Input } from "@/components/ui/input";
import { INVESTMENT_GLOSSARY } from "@/data/investmentEducation";

const TABS: { key: FundType | "general" | "stocks" | "glossary"; label: string; icon: React.ElementType }[] = [
  { key: "general", label: "Overview", icon: BookOpen },
  { key: "stocks", label: "Stocks", icon: LineChart },
  { key: "money_market", label: "Money Market", icon: Banknote },
  { key: "fixed_income", label: "Fixed Income", icon: Landmark },
  { key: "balanced", label: "Balanced", icon: PieChart },
  { key: "equity", label: "Equity", icon: TrendingUp },
  { key: "bond", label: "Bond", icon: BarChart3 },
  { key: "glossary", label: "Glossary", icon: Search },
];

const LearnPage = () => {
  const [activeTab, setActiveTab] = useState<string>("general");
  const [glossarySearch, setGlossarySearch] = useState("");

  useDocumentTitle(
    "Learn About Investing in Kenya",
    "Everything you need to know about stocks, Money Market, Fixed Income, Equity, Bond and Balanced Funds in Kenya — risks, returns, and CMA regulation explained simply."
  );

  const currentFaqs = faqByFundType[activeTab as keyof typeof faqByFundType] || [];

  useJsonLd(currentFaqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: currentFaqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  } : null);
  const isFundType = activeTab !== "general" && activeTab !== "stocks" && activeTab !== "glossary";
  const isGlossary = activeTab === "glossary";

  const filteredGlossary = glossarySearch
    ? INVESTMENT_GLOSSARY.filter(
        (g) =>
          g.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
          g.definition.toLowerCase().includes(glossarySearch.toLowerCase())
      )
    : INVESTMENT_GLOSSARY;

  // Group glossary by first letter
  const glossaryByLetter = filteredGlossary.reduce<Record<string, typeof INVESTMENT_GLOSSARY>>((acc, item) => {
    const letter = item.term[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(item);
    return acc;
  }, {});

  return (
    <div className="px-4 md:px-6 py-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Learn</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Understand how different investment types work, their risks, returns &amp; regulation in Kenya.
        </p>
      </div>

      {/* Featured guide */}
      <a
        href="/learn/how-to-invest-in-money-market-funds-kenya"
        className="block mb-5 rounded-xl border border-border bg-card hover:border-accent/40 transition-colors p-4"
      >
        <div className="flex items-center gap-2 mb-1">
          <Banknote className="h-3.5 w-3.5 text-accent" />
          <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Featured guide</span>
        </div>
        <p className="text-sm font-semibold text-foreground">How to invest in Money Market Funds in Kenya</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Step-by-step: how MMFs work, opening an account, yields, fees, withholding tax, and how to compare CMA-licensed funds.
        </p>
      </a>

      {/* Category filter pills */}
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

      {isGlossary ? (
        <>
          {/* Glossary search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search terms..."
              value={glossarySearch}
              onChange={(e) => setGlossarySearch(e.target.value)}
              className="pl-9 h-9 text-[16px] md:text-sm border-border bg-card"
            />
          </div>

          {/* Glossary list */}
          <div className="border border-border rounded-xl overflow-hidden">
            {Object.keys(glossaryByLetter).length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p className="text-sm">No terms match your search.</p>
              </div>
            ) : (
              Object.entries(glossaryByLetter).map(([letter, terms]) => (
                <div key={letter}>
                  {/* Letter header */}
                  <div className="px-4 py-2 bg-muted/50 border-b border-border">
                    <span className="text-xs font-bold text-accent">{letter}</span>
                  </div>
                  {/* Terms */}
                  {terms.map((item, i) => (
                    <div
                      key={item.term}
                      className={`px-4 py-3 ${i < terms.length - 1 ? "border-b border-border" : ""}`}
                    >
                      <dt className="text-sm font-semibold text-foreground">{item.term}</dt>
                      <dd className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.definition}</dd>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        /* FAQ accordion */
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
      )}

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
        <span>
          {isGlossary ? `${filteredGlossary.length} term${filteredGlossary.length !== 1 ? "s" : ""}` : `${currentFaqs.length} question${currentFaqs.length !== 1 ? "s" : ""}`}
        </span>
        <span className="w-px h-3 bg-border" />
        <span>{TABS.find((t) => t.key === activeTab)?.label || activeTab}</span>
      </div>
    </div>
  );
};

export default LearnPage;
