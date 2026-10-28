import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  Banknote,
  LineChart,
  ShieldCheck,
  BookMarked,
  Search,
  X,
  ArrowRight,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { faqByFundType, type FaqItem } from "@/data/faq";
import { RESEARCH_ARTICLES, articlePath, type ResearchArticle } from "@/data/seoGrowthContent";
import { INVESTMENT_GLOSSARY, type InvestmentGlossaryEntry } from "@/data/investmentEducation";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";

// ─── 4 Primary Topics ───
type TopicKey = "mmf" | "stocks" | "tax_safety" | "glossary";

interface TopicConfig {
  key: TopicKey;
  label: string;
  shortDesc: string;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
}

const TOPICS: TopicConfig[] = [
  {
    key: "mmf",
    label: "MMFs & Cash",
    shortDesc: "Money market, fixed income & yields",
    icon: Banknote,
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    key: "stocks",
    label: "NSE Stocks",
    shortDesc: "Shares, dividends, CDSC & brokers",
    icon: LineChart,
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10 border-blue-500/20",
  },
  {
    key: "tax_safety",
    label: "Taxes & Safety",
    shortDesc: "15% withholding, CMA rules & safety",
    icon: ShieldCheck,
    colorClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-500/10 border-purple-500/20",
  },
  {
    key: "glossary",
    label: "Glossary",
    shortDesc: "A–Z financial dictionary & terms",
    icon: BookMarked,
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/10 border-amber-500/20",
  },
];

// Curated Tax & Safety FAQs
const TAX_SAFETY_FAQS: FaqItem[] = [
  {
    question: "How are investment returns taxed in Kenya?",
    answer:
      "Returns from Kenyan Money Market Funds and fixed-income investments are subject to a 15% withholding tax (WHT) on interest income, deducted directly at source by the fund manager. On listed shares, cash dividends incur a 5% withholding tax for qualifying residents. Capital gains on shares listed on the Nairobi Securities Exchange (NSE) are exempt from capital gains tax.",
  },
  {
    question: "How do I know if my fund manager or broker is CMA licensed?",
    answer:
      "The Capital Markets Authority (CMA) publishes an official register of licensed Collective Investment Schemes (CIS), fund managers, and stockbrokers. Never invest through unregulated social media channels, mobile apps, or personal bank accounts. Always verify the entity's license on the CMA website or with licensed depository agents.",
  },
  {
    question: "What protects my money if a fund manager collapses?",
    answer:
      "Under Kenyan CMA regulations, your money is not held by the fund manager itself. It is held in custody by an independent licensed Custodian Bank (such as KCB, Stanbic, or NCBA) and overseen by an independent Trustee. Even if the fund manager experiences financial trouble, fund assets are ring-fenced and cannot be used to pay the manager's corporate debts.",
  },
  {
    question: "What is a CDS account and why do I need one for stocks?",
    answer:
      "A Central Depository System (CDS) account is an electronic account maintained by the Central Depository and Settlement Corporation (CDSC). It acts like a digital vault where your shares are immobilized. To buy or sell shares on the Nairobi Securities Exchange, you must open a CDS account through a licensed stockbroker or Central Depository Agent.",
  },
  {
    question: "Are advertised MMF yields gross or net of taxes?",
    answer:
      "Almost all fund managers in Kenya advertise their Annual Effective Yield as a gross yield before withholding tax, but net of fund management fees. To estimate your true take-home annual return, multiply the gross yield by 0.85 (subtracting the 15% withholding tax). You can test this on our free MMF Calculator.",
  },
];

// Guide Reading Time Estimator
const getReadTime = (slug: string) => {
  if (slug.includes("buy-kenyan-shares") || slug.includes("how-to-invest")) return "4 min read";
  if (slug.includes("dividend") || slug.includes("explained")) return "3 min read";
  return "2 min read";
};

export const LearnPage = () => {
  const [activeTopic, setActiveTopic] = useState<TopicKey>("mmf");
  const [searchQuery, setSearchQuery] = useState("");
  const [glossaryLetter, setGlossaryLetter] = useState<string>("ALL");

  useDocumentTitle(
    "Learn About Investing in Kenya – MMFs, Stocks, Taxes & FAQs",
    "Essential guides to Kenyan Money Market Funds, NSE shares, withholding taxes, and CMA regulations explained simply."
  );

  // ─── Grouped Content per Topic ───
  const topicGuides = useMemo(() => {
    return {
      mmf: [
        {
          slug: "how-to-invest-in-money-market-funds-kenya",
          title: "How to invest in Money Market Funds in Kenya",
          description: "Step-by-step: how MMFs work, opening an account, yields, fees, and withholding tax.",
          customUrl: "/learn/how-to-invest-in-money-market-funds-kenya",
        },
        ...RESEARCH_ARTICLES.filter((a) => a.pillar === "mmf").map((a) => ({
          slug: a.slug,
          title: a.title,
          description: a.description,
          customUrl: articlePath(a),
        })),
      ],
      stocks: RESEARCH_ARTICLES.filter((a) => a.pillar === "stocks").map((a) => ({
        slug: a.slug,
        title: a.title,
        description: a.description,
        customUrl: articlePath(a),
      })),
      tax_safety: [
        ...RESEARCH_ARTICLES.filter((a) => a.slug === "mmf-tax-kenya" || a.slug === "kenyan-shares-tax-and-brokerage-fees").map(
          (a) => ({
            slug: a.slug,
            title: a.title,
            description: a.description,
            customUrl: articlePath(a),
          })
        ),
      ],
      glossary: [],
    };
  }, []);

  const topicFaqs = useMemo(() => {
    return {
      mmf: [
        ...(faqByFundType.money_market || []),
        ...(faqByFundType.general || []),
        ...(faqByFundType.fixed_income || []),
        ...(faqByFundType.bond || []),
      ],
      stocks: [
        ...(faqByFundType.stocks || []),
        ...(faqByFundType.equity || []),
      ],
      tax_safety: TAX_SAFETY_FAQS,
      glossary: [],
    };
  }, []);

  // ─── Search Across All Content ───
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const matchedGuides = [
      ...topicGuides.mmf,
      ...topicGuides.stocks,
      ...topicGuides.tax_safety,
    ].filter(
      (g, idx, arr) =>
        arr.findIndex((x) => x.slug === g.slug) === idx &&
        (g.title.toLowerCase().includes(q) || g.description.toLowerCase().includes(q))
    );

    const allFaqs = [
      ...topicFaqs.mmf,
      ...topicFaqs.stocks,
      ...topicFaqs.tax_safety,
    ];
    const matchedFaqs = allFaqs.filter(
      (f, idx, arr) =>
        arr.findIndex((x) => x.question === f.question) === idx &&
        (f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q))
    );

    const matchedGlossary = INVESTMENT_GLOSSARY.filter(
      (g) =>
        g.term.toLowerCase().includes(q) ||
        g.definition.toLowerCase().includes(q) ||
        g.aliases?.some((a) => a.toLowerCase().includes(q))
    );

    return {
      guides: matchedGuides,
      faqs: matchedFaqs,
      glossary: matchedGlossary,
      totalCount: matchedGuides.length + matchedFaqs.length + matchedGlossary.length,
    };
  }, [searchQuery, topicGuides, topicFaqs]);

  // ─── Glossary Letter Filtering ───
  const glossaryLetters = useMemo(() => {
    const letters = new Set(INVESTMENT_GLOSSARY.map((i) => i.term[0].toUpperCase()));
    return ["ALL", ...Array.from(letters).sort()];
  }, []);

  const filteredGlossary = useMemo(() => {
    if (glossaryLetter === "ALL") return INVESTMENT_GLOSSARY;
    return INVESTMENT_GLOSSARY.filter((i) => i.term[0].toUpperCase() === glossaryLetter);
  }, [glossaryLetter]);

  // ─── SEO Schema ───
  const currentFaqs = topicFaqs[activeTopic] || [];
  useJsonLd(
    currentFaqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: currentFaqs.slice(0, 15).map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }
      : null
  );

  return (
    <div className="container max-w-4xl mx-auto px-4 md:px-6 py-6 pb-28 space-y-6 animate-in fade-in-50 duration-500">
      {/* ─── Hero Header ─── */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
          <GraduationCap className="h-3.5 w-3.5" />
          <span>Investor Academy</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          Learn About Investing in Kenya
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Clear, jargon-free guides on Money Market Funds, NSE shares, 15% withholding tax, and CMA investor protections.
        </p>
      </div>

      {/* ─── Live Instant Search Bar ─── */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Search questions, guides, or terms (e.g. tax, CDSC, yield)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-11 rounded-full border-border bg-card pl-11 pr-10 text-sm shadow-xs placeholder:text-muted-foreground/60 focus-visible:ring-1"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* ─── Search Results View (Active When Typing) ─── */}
      {searchResults ? (
        <div className="space-y-6 pt-2">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <p className="text-sm font-semibold text-foreground">
              Search results for <strong className="text-emerald-600 dark:text-emerald-400 font-bold">"{searchQuery}"</strong>
            </p>
            <span className="text-xs text-muted-foreground font-medium">
              {searchResults.totalCount} {searchResults.totalCount === 1 ? "match" : "matches"}
            </span>
          </div>

          {searchResults.totalCount === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-border bg-muted/20 p-6">
              <p className="text-sm font-semibold text-foreground">No matches found for "{searchQuery}"</p>
              <p className="text-xs text-muted-foreground mt-1">Try searching for terms like "tax", "MMF", "yield", or "CDSC".</p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-muted text-xs font-bold text-foreground hover:bg-muted/80"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Matched Guides */}
              {searchResults.guides.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                    In-Depth Guides ({searchResults.guides.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {searchResults.guides.map((guide) => (
                      <Link
                        key={guide.slug}
                        to={guide.customUrl}
                        className="rounded-2xl border border-border/80 bg-card p-4 hover:border-emerald-500/40 transition-all flex flex-col justify-between group shadow-xs"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <Clock className="h-2.5 w-2.5" /> {getReadTime(guide.slug)}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                          </div>
                          <h4 className="font-bold text-sm text-foreground group-hover:text-emerald-600 transition-colors line-clamp-2">
                            {guide.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {guide.description}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched FAQs */}
              {searchResults.faqs.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                    Questions & Answers ({searchResults.faqs.length})
                  </h3>
                  <div className="rounded-2xl border border-border/80 bg-card overflow-hidden divide-y divide-border/60 shadow-xs">
                    <Accordion type="single" collapsible>
                      {searchResults.faqs.map((faq, i) => (
                        <AccordionItem key={i} value={`search-faq-${i}`} className="border-0">
                          <AccordionTrigger className="text-left text-sm font-bold text-foreground px-4 py-3.5 hover:no-underline hover:bg-muted/40 transition-colors">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-xs text-muted-foreground leading-relaxed px-4 pb-4">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </div>
              )}

              {/* Matched Glossary */}
              {searchResults.glossary.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                    Glossary Terms ({searchResults.glossary.length})
                  </h3>
                  <div className="rounded-2xl border border-border/80 bg-card overflow-hidden divide-y divide-border/60 shadow-xs">
                    {searchResults.glossary.map((item) => (
                      <div key={item.term} className="p-3.5">
                        <span className="font-extrabold text-sm text-foreground block">
                          {item.term}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {item.definition}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ─── Standard Modular Topic Hub View ─── */
        <div className="space-y-6">
          {/* Start Here: Featured MMF Guide Banner */}
          <Link
            to="/learn/how-to-invest-in-money-market-funds-kenya"
            className="block rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] p-4.5 hover:border-emerald-500/50 hover:bg-emerald-500/[0.07] transition-all group shadow-xs"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Banknote className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Start Here · Beginner Guide
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                <Clock className="h-3 w-3" /> 4 min read
              </span>
            </div>

            <h3 className="font-extrabold text-base text-foreground mt-2 group-hover:text-emerald-600 transition-colors">
              How to Invest in Money Market Funds in Kenya (2026 Step-by-Step)
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Understand minimum deposits, compound daily interest, CMA license verification, and how to withdraw your money safely.
            </p>

            <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span>Read complete guide</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* ─── 4 Segmented Topic Cards (2x2 Grid on Mobile) ─── */}
          <div>
            <div className="flex items-center justify-between px-1 mb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Select a Topic
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {TOPICS.map((topic) => {
                const Icon = topic.icon;
                const isActive = activeTopic === topic.key;
                const guideCount = topicGuides[topic.key]?.length || 0;
                const faqCount = topicFaqs[topic.key]?.length || 0;
                const countBadge =
                  topic.key === "glossary"
                    ? `${INVESTMENT_GLOSSARY.length} terms`
                    : `${guideCount + faqCount} lessons`;

                return (
                  <button
                    key={topic.key}
                    type="button"
                    onClick={() => setActiveTopic(topic.key)}
                    className={`rounded-2xl border p-3.5 text-left transition-all flex flex-col justify-between space-y-2 ${
                      isActive
                        ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/[0.04] shadow-xs dark:border-emerald-400"
                        : "border-border/80 bg-card hover:border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${topic.bgClass} ${topic.colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      {isActive && (
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </div>

                    <div>
                      <span className="block font-extrabold text-sm text-foreground leading-snug">
                        {topic.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium block mt-0.5">
                        {countBadge}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── Selected Topic Detail Section ─── */}
          <div className="space-y-6 pt-2">
            {activeTopic === "glossary" ? (
              /* Glossary Dictionary Module */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-lg text-foreground">
                      Investor Glossary
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Definitions of Kenyan market terminology and financial terms.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    {filteredGlossary.length} terms
                  </span>
                </div>

                {/* Alphabet Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {glossaryLetters.map((letter) => (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => setGlossaryLetter(letter)}
                      className={`h-7 px-2.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                        glossaryLetter === letter
                          ? "bg-foreground text-background shadow-xs"
                          : "border border-border/80 bg-card text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {letter}
                    </button>
                  ))}
                </div>

                {/* Glossary Items */}
                <div className="rounded-2xl border border-border/80 bg-card divide-y divide-border/60 overflow-hidden shadow-xs">
                  {filteredGlossary.map((item) => (
                    <div key={item.term} className="p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <dt className="text-sm font-extrabold text-foreground">{item.term}</dt>
                        {item.aliases && item.aliases.length > 0 && (
                          <span className="text-[10px] text-muted-foreground/70 hidden sm:inline">
                            aka {item.aliases[0]}
                          </span>
                        )}
                      </div>
                      <dd className="text-xs text-muted-foreground leading-relaxed">
                        {item.definition}
                      </dd>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Guides & FAQs Module */
              <div className="space-y-6">
                {/* 1. In-Depth Guide Mini-Cards */}
                {topicGuides[activeTopic].length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Recommended Reading ({topicGuides[activeTopic].length})
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {topicGuides[activeTopic].map((guide) => (
                        <Link
                          key={guide.slug}
                          to={guide.customUrl}
                          className="rounded-2xl border border-border/80 bg-card p-4 hover:border-emerald-500/40 transition-all flex flex-col justify-between group shadow-xs"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Clock className="h-2.5 w-2.5" /> {getReadTime(guide.slug)}
                              </span>
                              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                            </div>
                            <h4 className="font-bold text-sm text-foreground group-hover:text-emerald-600 transition-colors line-clamp-2">
                              {guide.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                              {guide.description}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Frequently Asked Questions */}
                {topicFaqs[activeTopic].length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Common Questions ({topicFaqs[activeTopic].length})
                      </h3>
                    </div>

                    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden divide-y divide-border/60 shadow-xs">
                      <Accordion type="single" collapsible defaultValue="faq-0">
                        {topicFaqs[activeTopic].map((faq, i) => (
                          <AccordionItem key={i} value={`faq-${i}`} className="border-0">
                            <AccordionTrigger className="text-left text-sm font-bold text-foreground px-4 py-3.5 hover:no-underline hover:bg-muted/40 transition-colors">
                              {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-xs text-muted-foreground leading-relaxed px-4 pb-4">
                              {faq.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── Regulatory Disclaimer & Trust Footnote ─── */}
          <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
            <div className="flex items-center gap-1.5 font-bold text-foreground text-[11px] uppercase tracking-wide">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Independent Educational Resource</span>
            </div>
            <p className="text-[11px]">
              Content on Kenya Fund Finder is for educational purposes only and does not constitute financial, investment, or tax advice. Past returns are not guaranteed. Always verify fund schemes on the Capital Markets Authority (CMA) registry.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearnPage;
