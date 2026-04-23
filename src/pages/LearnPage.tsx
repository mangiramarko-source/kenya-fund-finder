import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, Landmark, BarChart3, PieChart, TrendingUp, Banknote, LineChart, Search } from "lucide-react";
import { faqByFundType, faqItems } from "@/data/faq";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { FUND_TYPE_LABELS, type FundType } from "@/lib/api";
import { getDisclaimer } from "@/lib/disclaimers";
import { Input } from "@/components/ui/input";

const GLOSSARY: { term: string; definition: string }[] = [
  { term: "Annual Effective Yield", definition: "The total return on an investment over one year, accounting for compounding. Expressed as a percentage." },
  { term: "Asset Allocation", definition: "The strategy of spreading investments across different asset classes (equities, bonds, cash) to balance risk and return." },
  { term: "Basis Point (bp)", definition: "One hundredth of a percentage point (0.01%). Used to express small changes in yields or interest rates." },
  { term: "Blue Chip", definition: "A well-established, financially stable company with a history of reliable performance. On the NSE, examples include Safaricom and Equity Group." },
  { term: "Capital Gains Tax (CGT)", definition: "A 5% tax on the profit made from selling shares listed on the NSE. Calculated on net gains after deducting purchase costs." },
  { term: "CDS Account", definition: "Central Depository & Settlement Corporation account. Required to hold and trade shares electronically on the Nairobi Securities Exchange." },
  { term: "CMA", definition: "Capital Markets Authority — the regulatory body overseeing securities markets, fund managers, and collective investment schemes in Kenya." },
  { term: "Coupon Rate", definition: "The annual interest rate paid on a bond, expressed as a percentage of the face value." },
  { term: "Daily Yield", definition: "The return earned on an investment in a single day. For Money Market Funds, this is how interest accrues daily before compounding." },
  { term: "Diversification", definition: "Spreading investments across different assets, sectors, or geographies to reduce the impact of any single investment's poor performance." },
  { term: "Dividend", definition: "A portion of a company's profits distributed to shareholders, usually expressed as a per-share amount." },
  { term: "Dividend Yield", definition: "Annual dividend per share divided by the share price, expressed as a percentage. Indicates income return from a stock." },
  { term: "Ex-Dividend Date", definition: "The cut-off date for dividend eligibility. You must own shares before this date to receive the declared dividend." },
  { term: "Face Value / Par Value", definition: "The nominal value of a bond or share as stated by the issuer. For Kenyan government bonds, typically KES 50,000." },
  { term: "Fund Manager", definition: "A licensed professional or firm that makes investment decisions on behalf of a fund's investors, regulated by the CMA in Kenya." },
  { term: "Gross Yield", definition: "Investment return before deducting taxes and fees. Most Kenyan fund yields are quoted gross, before the 15% withholding tax." },
  { term: "KDIC", definition: "Kenya Deposit Insurance Corporation — insures bank deposits up to KES 500,000 per depositor per institution. Does not cover fund investments." },
  { term: "Liquidity", definition: "How quickly and easily an investment can be converted to cash without significant loss of value." },
  { term: "Management Fee", definition: "An annual fee charged by the fund manager for managing the fund, expressed as a percentage of assets under management." },
  { term: "Market Capitalisation", definition: "The total value of a company's outstanding shares (share price × number of shares). Used to classify companies by size." },
  { term: "Maturity", definition: "The date on which a bond or fixed-term investment reaches its end and the principal is repaid to the investor." },
  { term: "NAV (Net Asset Value)", definition: "The per-unit value of a fund's total assets minus liabilities. Used to price purchases and redemptions of fund units." },
  { term: "NSE", definition: "Nairobi Securities Exchange — Kenya's principal stock exchange where equities, bonds, and other securities are traded." },
  { term: "P/E Ratio", definition: "Price-to-Earnings ratio — the share price divided by earnings per share. A common valuation metric; higher P/E may indicate growth expectations." },
  { term: "Portfolio", definition: "The collection of investments held by an individual or a fund, including stocks, bonds, and other assets." },
  { term: "T-Bill (Treasury Bill)", definition: "A short-term government security (91, 182, or 364 days) sold at a discount and redeemed at face value. Low risk, used by MMFs." },
  { term: "Treasury Bond", definition: "A long-term government debt security (2–30 years) paying periodic interest (coupons). Considered low credit risk in Kenya." },
  { term: "Volatility", definition: "The degree of variation in an investment's price over time. Higher volatility means greater price swings and perceived risk." },
  { term: "Withholding Tax", definition: "A 15% tax deducted at source on interest and dividend income from investments in Kenya." },
  { term: "Yield Curve", definition: "A graph showing interest rates across different maturities. A normal (upward-sloping) curve means longer-term rates exceed short-term rates." },
];

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
  const isFundType = activeTab !== "general" && activeTab !== "stocks" && activeTab !== "glossary";
  const isGlossary = activeTab === "glossary";

  const filteredGlossary = glossarySearch
    ? GLOSSARY.filter(
        (g) =>
          g.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
          g.definition.toLowerCase().includes(glossarySearch.toLowerCase())
      )
    : GLOSSARY;

  // Group glossary by first letter
  const glossaryByLetter = filteredGlossary.reduce<Record<string, typeof GLOSSARY>>((acc, item) => {
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
