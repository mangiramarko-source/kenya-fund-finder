import { Link } from "react-router-dom";

const questions = [
  {
    question: "Is the fund regulated for sale in Kenya?",
    answer: "Confirm the manager and scheme in the CMA register, then match the regulated product name to the fund you intend to open.",
  },
  {
    question: "What return might I keep after fees and tax?",
    answer: "A published yield is not a guaranteed take-home return. Compare the management fee, withholding tax treatment, and the date the yield was reported.",
    link: "/calculator",
    linkLabel: "Estimate a net return",
  },
  {
    question: "How quickly can I withdraw my money?",
    answer: "Check the stated withdrawal period and cut-off time. Money needed for emergencies should not depend on a product whose settlement window is too slow for you.",
  },
  {
    question: "Can the yield change after I invest?",
    answer: "Yes. Money-market and unit-trust yields move with the underlying portfolio and market conditions, so compare recent history as well as today’s figure.",
  },
  {
    question: "Does the minimum investment fit my plan?",
    answer: "Check both the opening minimum and any minimum top-up. A sustainable contribution plan matters more than stretching for a one-time deposit.",
  },
  {
    question: "What should I verify before sending money?",
    answer: "Verify the official manager website, payment instructions, fees, beneficiary details, fact sheet date, and withdrawal process independently.",
    link: "/learn/how-to-invest-in-money-market-funds-kenya",
    linkLabel: "Read the fund-investing guide",
  },
];

export default function FundBuyerQuestions() {
  return (
    <section aria-labelledby="fund-buyer-questions" className="mt-12 rounded-2xl border border-border bg-card p-5 md:p-8">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">Before you invest</p>
        <h2 id="fund-buyer-questions" className="mt-2 text-2xl font-black tracking-tight">Questions to answer before choosing a fund</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Use these questions to compare suitability, liquidity, cost, and verification—not just the highest published yield.
        </p>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {questions.map((item) => (
          <article key={item.question} className="rounded-xl border border-border/80 bg-background/50 p-4 md:p-5">
            <h3 className="font-bold text-foreground">{item.question}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
            {item.link && (
              <Link to={item.link} className="mt-3 inline-block text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
                {item.linkLabel} →
              </Link>
            )}
          </article>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        New to money market funds? Read the <Link to="/learn/how-to-invest-in-money-market-funds-kenya" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">step-by-step Kenya guide</Link>.
      </p>
    </section>
  );
}
