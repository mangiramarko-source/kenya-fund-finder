import { Link } from "react-router-dom";
import { ArrowRight, Banknote, ShieldCheck, TrendingUp, Wallet, CheckCircle2, Calculator, BookOpen } from "lucide-react";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";

const TOC = [
  { id: "what-is-mmf", label: "What is a Money Market Fund?" },
  { id: "how-it-works", label: "How does a Money Market Fund work in Kenya?" },
  { id: "how-to-invest", label: "How to invest in Money Market Funds in Kenya" },
  { id: "best-mmf", label: "Which is the best Money Market Fund in Kenya?" },
  { id: "fees-tax", label: "Fees, withholding tax & returns" },
  { id: "risks", label: "Risks to understand" },
  { id: "faq", label: "Frequently asked questions" },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "How does a money market fund work in Kenya?",
    a: "A Kenyan money market fund (MMF) pools investor money and lends it to low-risk, short-term instruments such as Treasury Bills, fixed deposits with regulated banks, and short-dated commercial paper. Interest earned by the fund is calculated daily, accrues to your account, and is typically credited to your balance at the end of each month, where it compounds.",
  },
  {
    q: "How do I start investing in a money market fund in Kenya?",
    a: "You pick a CMA-licensed fund manager, complete an online or in-person KYC application (ID, KRA PIN, selfie, and bank or M-Pesa details), fund your account from M-Pesa or a bank transfer, and the units are allocated at the fund's daily NAV. Most MMFs in Kenya let you start with as little as KES 100 to KES 5,000.",
  },
  {
    q: "Which money market fund pays the highest yield in Kenya?",
    a: "Yields move every week with Treasury Bill rates and the fund's portfolio mix, so there is no single 'best' MMF. KenyaFundFinder publishes the daily and annual effective yields of every CMA-licensed MMF on the Unit Trusts page so you can compare current rates rather than rely on outdated rankings.",
  },
  {
    q: "Are money market funds safe in Kenya?",
    a: "MMFs are regulated by the Capital Markets Authority (CMA) and invest in short-term, low-risk instruments, but they are not bank deposits and are not covered by the Kenya Deposit Insurance Corporation (KDIC). The main risks are interest-rate movements and issuer credit risk.",
  },
  {
    q: "How much tax do I pay on money market fund returns?",
    a: "Interest income from Kenyan money market funds is subject to a 15% withholding tax, which the fund manager deducts at source before crediting interest to your account. The yields quoted by most fund managers are gross — your net return is roughly 85% of the quoted figure.",
  },
  {
    q: "How quickly can I withdraw from a money market fund?",
    a: "MMFs are highly liquid. Most Kenyan fund managers process withdrawals within 2 to 4 working days to your bank account or M-Pesa, depending on cut-off times and the size of the withdrawal.",
  },
];

const MmfGuidePage = () => {
  useDocumentTitle(
    "How to Invest in Money Market Funds in Kenya (2026 Guide)",
    "Step-by-step guide to Kenyan MMFs — how they work, opening an account, yields, fees, withholding tax, and comparing CMA-licensed funds.",
    {
      title: "How to Invest in Money Market Funds in Kenya (2026 Guide)",
      description: "Practical guide to Kenyan money market funds — how MMFs work, fees, yields, tax, and how to compare CMA-licensed funds.",
      type: "article",
    }
  );

  useJsonLd({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: "How to Invest in Money Market Funds in Kenya",
        description:
          "A practical, neutral guide to investing in Kenyan money market funds — how they work, the steps to open an account, yields, fees, and risks.",
        author: { "@type": "Organization", name: "KenyaFundFinder" },
        publisher: { "@type": "Organization", name: "KenyaFundFinder" },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": "https://kenyafundfinder.com/learn/how-to-invest-in-money-market-funds-kenya",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Learn", item: "https://kenyafundfinder.com/learn" },
          {
            "@type": "ListItem",
            position: 2,
            name: "How to invest in money market funds in Kenya",
            item: "https://kenyafundfinder.com/learn/how-to-invest-in-money-market-funds-kenya",
          },
        ],
      },
    ],
  });

  return (
    <article className="px-4 md:px-6 py-6 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-xs text-muted-foreground mb-3" aria-label="Breadcrumb">
        <Link to="/learn" className="hover:text-foreground">Learn</Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">Money Market Funds Guide</span>
      </nav>

      {/* Header */}
      <header className="mb-6">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 mb-3">
          <Banknote className="h-3 w-3 text-accent" />
          <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">Guide · Money Market</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
          How to Invest in Money Market Funds in Kenya
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-2 leading-relaxed">
          A neutral, data-first guide to Kenya's money market funds (MMFs) — what they are, how they
          work, how to open an account, and how to compare CMA-licensed funds side by side.
        </p>
      </header>

      {/* TOC */}
      <aside className="border border-border bg-muted/30 rounded-xl p-4 mb-6">
        <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2">On this page</p>
        <ol className="space-y-1.5">
          {TOC.map((t, i) => (
            <li key={t.id} className="text-sm">
              <a href={`#${t.id}`} className="text-foreground hover:text-accent">
                {i + 1}. {t.label}
              </a>
            </li>
          ))}
        </ol>
      </aside>

      {/* Sections */}
      <section id="what-is-mmf" className="mb-7">
        <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">What is a Money Market Fund?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          A money market fund is a type of collective investment scheme that pools money from many
          investors and invests it in short-term, low-risk debt instruments — primarily Treasury Bills,
          fixed deposits with regulated banks, and short-dated commercial paper. In Kenya, every MMF is
          licensed and supervised by the <strong className="text-foreground">Capital Markets Authority (CMA)</strong>{" "}
          and run by a registered fund manager.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mt-3">
          MMFs are designed for capital preservation and liquidity rather than capital growth. They are
          often used as an alternative to a bank savings account, a parking spot for an emergency fund,
          or a place to hold cash that you plan to deploy elsewhere within a few months.
        </p>
      </section>

      <section id="how-it-works" className="mb-7">
        <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">How does a Money Market Fund work in Kenya?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          When you deposit money into a Kenyan MMF, the fund manager allocates you units at the fund's
          daily Net Asset Value (NAV). Your money is combined with other investors' cash and lent to
          short-term instruments. Each day the fund earns interest, which is calculated as a{" "}
          <em>daily yield</em>. At the end of the month, accrued interest is credited to your account
          and then compounds on the new balance.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          {[
            { icon: TrendingUp, title: "Daily yield", body: "Interest accrues every day based on the fund's portfolio performance." },
            { icon: Wallet, title: "Monthly compounding", body: "Accrued interest is credited monthly and starts earning interest itself." },
            { icon: ShieldCheck, title: "CMA-regulated", body: "Every MMF reports to the CMA and is run by a licensed fund manager." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-lg border border-border bg-card p-3">
              <Icon className="h-4 w-4 text-accent mb-2" />
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-to-invest" className="mb-7">
        <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">How to invest in Money Market Funds in Kenya</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          The process for opening a money market fund account in Kenya is now almost entirely digital.
          The typical steps are:
        </p>
        <ol className="space-y-3">
          {[
            { t: "Compare CMA-licensed funds", b: "Use a neutral source like the KenyaFundFinder Unit Trusts page to compare current daily and annual effective yields side by side." },
            { t: "Pick a fund manager", b: "Consider yield history, minimum investment, withdrawal turnaround, and the manager's assets under management (AUM)." },
            { t: "Complete KYC", b: "You will typically need your national ID or passport, KRA PIN, a selfie, and either an M-Pesa number or a bank account in your name." },
            { t: "Fund the account", b: "Most Kenyan MMFs let you top up via M-Pesa Paybill, bank transfer, or a recurring standing order. Minimums range from KES 100 to KES 5,000." },
            { t: "Track and review", b: "Monitor your balance, daily yield, and monthly interest credits. Add the fund to your KenyaFundFinder portfolio to track returns over time." },
          ].map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-accent/10 text-accent text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{s.t}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{s.b}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="best-mmf" className="mb-7">
        <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">Which is the best Money Market Fund in Kenya?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          There is no single "best" money market fund in Kenya. MMF yields move every week with
          Treasury Bill rates and the underlying portfolio mix, so a fund that leads the table this
          month may not lead it next month. Rather than picking based on a static ranking, look at:
        </p>
        <ul className="space-y-2 mt-3">
          {[
            "The fund's current annual effective yield versus its 6–12 month average.",
            "The fund manager's total Assets Under Management (AUM) and operating history.",
            "Management fees and withdrawal turnaround times.",
            "Whether the minimum investment and top-up amount suit your cash flow.",
          ].map((line) => (
            <li key={line} className="flex gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{line}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-foreground">Compare every CMA-licensed MMF</p>
            <p className="text-xs text-muted-foreground mt-0.5">Live daily &amp; annual effective yields, updated continuously.</p>
          </div>
          <Link
            to="/funds?type=money_market"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold px-3 h-9 hover:opacity-90"
          >
            View Money Market Funds <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <section id="fees-tax" className="mb-7">
        <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">Fees, withholding tax &amp; returns</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Fund managers charge an annual management fee — typically between 1.5% and 2.5% of assets
          under management — which is already deducted before the yield is published. Interest income
          from Kenyan MMFs is subject to a <strong className="text-foreground">15% withholding tax</strong>,
          which the fund manager withholds at source. The yields you see quoted are usually gross, so
          your net return is roughly 85% of the headline figure.
        </p>
        <div className="mt-4 rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Calculator className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm font-semibold text-foreground">Estimate your returns</p>
              <p className="text-xs text-muted-foreground mt-0.5">Project growth with daily compounding and withholding tax.</p>
            </div>
          </div>
          <Link
            to="/calculator"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background text-foreground text-xs font-semibold px-3 h-9 hover:border-accent/40"
          >
            Open calculator <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      <section id="risks" className="mb-7">
        <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">Risks to understand</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          MMFs are among the lowest-risk pooled investments in Kenya, but they are not risk-free and
          are not the same as a bank deposit:
        </p>
        <ul className="space-y-2 mt-3">
          {[
            "They are not covered by the Kenya Deposit Insurance Corporation (KDIC).",
            "Yields fluctuate with Treasury Bill rates and broader interest-rate movements.",
            "There is small credit risk from the banks and issuers the fund lends to.",
            "Returns are not guaranteed, even when a fund publishes a target yield.",
          ].map((line) => (
            <li key={line} className="flex gap-2 text-sm text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 flex-shrink-0 mt-2" />
              <span className="leading-relaxed">{line}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="faq" className="mb-7">
        <h2 className="text-lg md:text-xl font-bold text-foreground mb-3">Frequently asked questions</h2>
        <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
          {FAQ.map((f) => (
            <details key={f.q} className="group">
              <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-semibold text-foreground flex items-center justify-between hover:bg-muted/40">
                <span>{f.q}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{f.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* Related */}
      <section className="mb-7">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-accent" /> Keep exploring
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link to="/funds?type=money_market" className="rounded-lg border border-border bg-card p-3 hover:border-accent/40">
            <p className="text-sm font-semibold text-foreground">All Money Market Funds</p>
            <p className="text-xs text-muted-foreground mt-1">Compare live yields across every CMA-licensed MMF.</p>
          </Link>
          <Link to="/learn" className="rounded-lg border border-border bg-card p-3 hover:border-accent/40">
            <p className="text-sm font-semibold text-foreground">Learn hub</p>
            <p className="text-xs text-muted-foreground mt-1">FAQs and a glossary covering stocks, bonds and funds.</p>
          </Link>
          <Link to="/calculator" className="rounded-lg border border-border bg-card p-3 hover:border-accent/40">
            <p className="text-sm font-semibold text-foreground">Investment calculator</p>
            <p className="text-xs text-muted-foreground mt-1">Project compounded returns net of withholding tax.</p>
          </Link>
        </div>
      </section>

      {/* Disclaimer */}
      <div className="p-3 rounded-xl border border-border bg-muted/30">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong>Disclaimer:</strong> This guide is for educational and informational purposes only
          and does not constitute investment advice. Past performance is not indicative of future
          results. Interest income from money market funds is subject to a 15% withholding tax. All
          funds referenced are regulated by the Capital Markets Authority (CMA) of Kenya. Consult a
          licensed financial advisor before making any investment decisions.
        </p>
      </div>
    </article>
  );
};

export default MmfGuidePage;
