import { canonicalUrl, escapeHtml, type SeoPageDefinition } from "../lib/seoPrerender";

export const OFFICIAL_SOURCES = [
  { name: "CMA approved collective investment schemes", url: "https://licensees.cma.or.ke/licenses/15/" },
  { name: "CDSC account-opening guidance", url: "https://cdsckenya.com/faq/" },
  { name: "KRA withholding-tax guidance", url: "https://www.kra.go.ke/component/kra_faq/faqcategory/64" },
];

export interface ResearchArticle {
  slug: string;
  title: string;
  description: string;
  pillar: "stocks" | "mmf" | "trust";
  sections: Array<{ heading: string; text: string }>;
}

export const RESEARCH_ARTICLES: ResearchArticle[] = [
  {
    slug: "how-to-buy-kenyan-shares", title: "How to buy Kenyan shares",
    description: "Learn how to choose a licensed broker, open a CDS account, place an NSE order and check trading costs.", pillar: "stocks",
    sections: [
      { heading: "Choose a regulated route", text: "Start with a CMA-licensed stockbroker or investment bank. Confirm its licence on the regulator's register and ask for its current tariff, account requirements and customer-support contacts. A familiar brand or a mobile app alone does not prove that an intermediary is licensed." },
      { heading: "Open and understand your account", text: "CDSC explains how to open a CDS account through a Central Depository Agent. Ask whether your shares will be held in your own CDS account or through a nominee arrangement. Complete the identification and tax-document checks requested by the intermediary and keep your account records." },
      { heading: "Research before placing an order", text: "Use the NSE company directory to review the business, share price, sector, volume and dividend information. Read the company's financial reports and announcements. Decide how much you can afford to risk and avoid putting emergency savings into shares." },
      { heading: "Check execution and costs", text: "Confirm the order type, price limit, quantity and all charges before submission. Orders may be partially filled or remain unfilled. A displayed last-traded price is not a promise that your order will execute at that price. Keep the contract note and check settlement with your broker." },
    ],
  },
  {
    slug: "nse-share-prices-explained", title: "NSE share prices explained",
    description: "Understand Kenyan share prices, daily movement, trading volume, market capitalisation and P/E ratios.", pillar: "stocks",
    sections: [
      { heading: "Price and daily movement", text: "A share price is the quoted value of one share. Daily percentage movement compares the latest price with the reference price: (latest minus reference) divided by reference, multiplied by 100. A stale quote or a day with no trades can make the displayed movement less useful." },
      { heading: "Trading volume and liquidity", text: "Volume counts shares traded during the reported period. It is different from the money value traded. Low volume can mean it takes longer to buy or sell at your preferred price. Compare the quote timestamp and volume rather than treating every last price as equally executable." },
      { heading: "Market cap and valuation", text: "Market capitalisation is share price multiplied by shares outstanding. P/E compares the share price with earnings per share. Neither tells you on its own whether a stock is attractive. Compare businesses in the same sector and check whether earnings include unusual one-off items." },
      { heading: "Use the data date", text: "Kenya Fund Finder displays the data timestamp supplied by its market-data feed. This is not a guarantee of real-time exchange execution. Missing values are unavailable, not zero. Verify an order price and company disclosures with your broker and the issuer." },
    ],
  },
  {
    slug: "compare-kenyan-dividend-stocks", title: "Best Kenyan dividend stocks: how to compare them",
    description: "Compare dividend yield, payout sustainability, payment history and risk without relying on a highest-yield list.", pillar: "stocks",
    sections: [
      { heading: "Start with sustainability", text: "The best dividend stock for one investor may be unsuitable for another. Compare profitability, cash generation, debt and the company's stated payout policy. A company can reduce or cancel a dividend even after several strong years." },
      { heading: "Calculate yield consistently", text: "Dividend yield is annual dividend per share divided by the share price, multiplied by 100. Check whether the dividend is trailing or expected, and whether a special dividend is included. A falling share price can raise the displayed yield while signalling higher risk." },
      { heading: "Check dates and total return", text: "Review the issuer's dividend announcement, eligibility dates and payment date. Total return includes the price change plus dividends, less charges and applicable tax. A dividend alone does not compensate for every capital loss." },
      { heading: "Compare within a sector", text: "Compare several companies rather than selecting only the highest yield. Use financial reports and official announcements to confirm the figures. Diversification reduces reliance on one company's payout, but does not eliminate market risk." },
    ],
  },
  {
    slug: "kenyan-shares-tax-and-brokerage-fees", title: "Kenyan shares: capital gains, dividends and brokerage fees",
    description: "Understand the costs to check before trading Kenyan shares and where to verify current dividend and capital-gains tax rules.", pillar: "stocks",
    sections: [
      { heading: "Read the full trading tariff", text: "Ask your broker for a breakdown of brokerage, exchange, settlement and other applicable charges. Minimum charges can matter for small orders. Calculate the total purchase cost and the expected net sale proceeds rather than comparing the share price alone." },
      { heading: "Dividend withholding tax", text: "Dividend tax treatment depends on the recipient, residence and qualifying status. KRA publishes the relevant rates and exemptions. Check your dividend advice and the current KRA guidance instead of applying an interest-tax rate to a dividend." },
      { heading: "Capital-gains treatment", text: "Capital-gains rules include exemptions and depend on the transaction. Confirm the current treatment for securities traded through a licensed exchange with KRA or a qualified tax adviser. This guide does not assume that every asset disposal has the same treatment." },
      { heading: "Keep evidence", text: "Keep contract notes, CDS statements, dividend advices and tax certificates. For a personal return estimate, subtract actual transaction costs and applicable tax from the price gain and dividends. Tax rules can change; verify them before acting." },
    ],
  },
  {
    slug: "what-is-a-money-market-fund-kenya", title: "What is a money market fund in Kenya?",
    description: "A plain-language explanation of Kenyan MMFs, pooled investments, variable yields, costs and risks.", pillar: "mmf",
    sections: [
      { heading: "A pooled short-term investment", text: "A money market fund pools investors' money into a portfolio of short-term interest-bearing instruments under its investment mandate. You own units in the fund. A professional manager selects investments, while the scheme's documents explain custody, valuation and dealing arrangements." },
      { heading: "How returns arise", text: "Income from the underlying investments contributes to the fund's return. The quoted yield can change as rates and portfolio holdings change. Ask whether the published figure is annualised, gross or net of management fees, and how income is credited or reinvested." },
      { heading: "Understand the risks", text: "MMFs can face credit, liquidity and interest-rate risk. Regulation is not a guarantee of returns or capital. Check the approved scheme and manager with CMA, read the fund documents and confirm withdrawal terms before depositing." },
      { heading: "Compare the exact product", text: "A manager may offer KES and foreign-currency funds alongside bond, equity and special funds. Compare the same fund type and currency. A unit price is not a percentage yield, and a high historical figure is not a promised future return." },
    ],
  },
  {
    slug: "mmf-vs-fixed-deposit-kenya", title: "MMF vs fixed deposit in Kenya",
    description: "Compare variable MMF yields and withdrawal terms with fixed-deposit rates, maturity dates and early-exit conditions.", pillar: "mmf",
    sections: [
      { heading: "Rate certainty", text: "A fixed deposit normally quotes a rate for an agreed term, subject to the bank's conditions. An MMF yield can vary as the portfolio changes. Compare the return over your actual holding period, after applicable tax and costs." },
      { heading: "Access to your money", text: "MMF withdrawals follow the scheme's dealing rules and processing times. Fixed deposits may impose penalties or change the interest earned when closed early. Neither label tells you how quickly a specific product will pay you." },
      { heading: "Protection and risk", text: "A bank deposit and a fund unit are legally different products. Check the relevant regulatory and deposit-protection rules directly, including any eligibility limits. Do not assume an MMF has the same protection as a bank deposit." },
      { heading: "A comparison checklist", text: "Request the same investment amount, holding period and currency for both quotes. Record the published rate, all fees, withholding assumptions, minimum investment and early-exit rules. Choose based on liquidity needs and risk as well as the headline rate." },
    ],
  },
  {
    slug: "mmf-tax-kenya", title: "How MMF tax affects returns in Kenya",
    description: "Understand gross versus estimated after-tax MMF income and avoid subtracting management fees twice.", pillar: "mmf",
    sections: [
      { heading: "Gross and net are different", text: "A quoted yield must be read alongside its definition. It may already reflect management fees while still being before withholding tax. Confirm the manager's basis before subtracting charges or comparing two products." },
      { heading: "An illustrative calculation", text: "For an assumed 10% annual gross yield on KSh 100,000 over one year, simple gross income is KSh 10,000. Under an illustrative 15% withholding assumption, tax on that income is KSh 1,500 and income after that deduction is KSh 8,500, before any additional charges. This example is not a fund quote." },
      { heading: "Verify your tax treatment", text: "KRA lists qualifying-interest rates and the conditions for final withholding tax. Your residence, entity type, exemptions and product can change the outcome. Ask the manager for the tax basis and check KRA's current guidance." },
      { heading: "Use the calculator carefully", text: "The calculator uses a 15% withholding assumption and a separate estimated fee input. Enter zero for an additional fee when the quoted yield already includes that fee. Compounding and monthly contributions change the estimate; the result is a scenario, not a guaranteed payout." },
    ],
  },
  {
    slug: "how-to-choose-an-mmf-kenya", title: "How to choose an MMF in Kenya",
    description: "Compare regulation, currency, yield basis, fees, minimum investment and liquidity before choosing a Kenyan MMF.", pillar: "mmf",
    sections: [
      { heading: "Check the scheme and manager", text: "Verify the exact scheme and manager against CMA's approved lists. Read the latest fact sheet and scheme documents. A directory label is a starting point for checking, not a substitute for verification." },
      { heading: "Match your needs", text: "Choose the currency you need and a withdrawal schedule compatible with your expenses. Check minimum deposits, top-up rules, redemption limits and account charges. Consider the fund's portfolio and risk disclosures, not only the manager's brand." },
      { heading: "Compare like with like", text: "Compare percentage yields for the same currency and fund type, using the same date and gross/net basis where possible. Review fees and whether they are already reflected in the figure. Do not compare a unit price with a yield." },
      { heading: "Keep checking after investing", text: "Save statements, confirm your deposits and review updated terms. Yields and dealing arrangements can change. A higher published rate alone is not a reason to move money without reviewing withdrawal costs and risks." },
    ],
  },
  {
    slug: "mmf-withdrawal-times-kenya", title: "MMF withdrawal times in Kenya explained",
    description: "Understand business-day processing, cut-off times, redemption requirements and when MMF cash becomes available.", pillar: "mmf",
    sections: [
      { heading: "Processing is not instant access", text: "A quoted withdrawal time usually describes processing under normal conditions. Confirm whether it uses business days, when the clock starts and whether bank or mobile-money settlement adds time. Weekends and holidays can affect access." },
      { heading: "Check the cut-off and requirements", text: "Ask the manager about redemption cut-off times, minimum withdrawal amounts, identification checks, destination-account rules and any withdrawal charges. Incomplete instructions can delay a request." },
      { heading: "Allow for exceptional conditions", text: "Scheme documents may set out circumstances in which redemptions are restricted or delayed. Review those terms and keep accessible cash for urgent needs rather than assuming every fund withdrawal is immediate." },
      { heading: "Verify the current terms", text: "Use the directory's withdrawal field as a reference and confirm it with the manager's latest documents. Where a term is missing, Kenya Fund Finder marks it unavailable instead of inventing a standard time." },
    ],
  },
  {
    slug: "editorial-standards", title: "Editorial standards", description: "How Kenya Fund Finder prepares educational content and separates published facts from illustrative estimates.", pillar: "trust",
    sections: [
      { heading: "Evidence and attribution", text: "Our educational pages distinguish product terms, reported market figures and illustrative calculations. Official regulator, issuer and fund-manager documents take precedence over unattributed claims. Links to sources let readers check the underlying information." },
      { heading: "Responsibility and review", text: "Content is published under Kenya Fund Finder's organisational authorship. This does not imply that a named financial adviser has reviewed it. We correct errors when identified and update dated guidance when source material changes." },
      { heading: "Independence", text: "Comparison figures do not constitute an endorsement. A higher yield is not a guarantee of better outcomes. Readers should evaluate liquidity, costs, risk and suitability alongside the numbers." },
    ],
  },
  {
    slug: "market-data-methodology", title: "Market-data methodology", description: "Understand quote timestamps, MMF yield comparisons, missing values and estimated net returns on Kenya Fund Finder.", pillar: "trust",
    sections: [
      { heading: "Stocks", text: "We display public market-data feed values and their supplied quote or record timestamps. Prices may be delayed. Volume, market cap and valuation metrics can use different reporting periods. A data import time is not proof of a fresh exchange trade." },
      { heading: "Funds", text: "We separate fund types and label yield units. Percentage yields are not unit prices. The fact-sheet date is shown separately from the record-update date; neither is labelled as independently verified unless a verification record exists. No future rate is promised." },
      { heading: "Illustrative net income", text: "For percentage MMF yields, a simple after-tax illustration multiplies gross annual yield by 0.85 under a 15% withholding assumption. It excludes additional charges and compounding. Fees may already be reflected in published yields; do not deduct them twice." },
      { heading: "Missing information", text: "Missing or invalid values are shown as unavailable. Sorting a comparison by a reported figure does not certify its freshness or suitability. Verify the latest terms with the manager or broker." },
    ],
  },
  {
    slug: "source-policy", title: "Source policy", description: "The sources used for Kenyan fund comparisons, market quotes and investing education.", pillar: "trust",
    sections: [
      { heading: "Primary sources", text: "Use CMA registers for scheme and intermediary status, fund-manager documents for fees and dealing terms, issuer announcements for company disclosures, CDSC for account guidance and KRA for tax rules. Fund pages link to the manager's published website where available." },
      { heading: "Dates and evidence", text: "We retain the source dates supplied with the public data. A database update is not a fact-sheet verification. When a document date or source link is unavailable, we say so. Readers should check the latest document before acting." },
    ],
  },
  {
    slug: "corrections", title: "Report a correction", description: "How to report an inaccurate market figure, fund term or educational statement to Kenya Fund Finder.", pillar: "trust",
    sections: [
      { heading: "Send an actionable report", text: "Use our contact page. Include the affected page URL, the figure or statement in question, the date you saw it and a link to the official source supporting the correction. Do not include account passwords or private financial documents." },
      { heading: "What happens next", text: "The team checks the reported issue against the cited source. Confirmed errors should be corrected in the relevant content or data feed. A correction request is not proof that a published value is wrong, and no response time is promised." },
    ],
  },
  {
    slug: "financial-disclaimer", title: "Financial information disclaimer", description: "The limits of Kenya Fund Finder's market data, educational content and return estimates.", pillar: "trust",
    sections: [
      { heading: "Educational information", text: "Kenya Fund Finder provides market information and educational scenarios. It does not assess your personal circumstances or provide personalised investment, legal or tax advice. Verify current details with the relevant regulated professional or product provider." },
      { heading: "Risk and estimates", text: "Investments can lose value. Past returns and published yields do not guarantee future outcomes. Calculator results depend on assumptions and exclude costs or circumstances not entered. Market information can be delayed, incomplete or revised." },
    ],
  },
];

export const articlePath = (article: ResearchArticle) => `${article.pillar === "trust" ? "/page" : "/learn"}/${article.slug}`;
export const researchLinksHtml = (pillar: "stocks" | "mmf" | "trust") => `<section><h2>${pillar === "trust" ? "Standards and sources" : "Research guides"}</h2><ul>${RESEARCH_ARTICLES.filter(a => a.pillar === pillar).map(a => `<li><a href="${articlePath(a)}">${escapeHtml(a.title)}</a></li>`).join("")}</ul></section>`;

export function articleSeo(article: ResearchArticle): SeoPageDefinition {
  const path = articlePath(article);
  const contentHtml = article.sections.map(s => `<section><h2>${escapeHtml(s.heading)}</h2><p>${escapeHtml(s.text)}</p></section>`).join("") +
    `<section><h2>Check official sources</h2><ul>${OFFICIAL_SOURCES.map(s => `<li><a href="${s.url}">${escapeHtml(s.name)}</a></li>`).join("")}</ul></section>` +
    `<p><a href="/stocks">Kenyan stocks</a> · <a href="/money-market-funds-kenya">Compare Kenyan MMFs</a> · <a href="/mmf-calculator">MMF calculator</a> · <a href="/page/contact">Contact the team</a></p>` + researchLinksHtml(article.pillar);
  return {
    path, title: `${article.title} | Kenya Fund Finder`, heading: article.title, description: article.description, contentHtml,
    type: article.pillar === "trust" ? "website" : "article",
    jsonLd: [
      { "@context": "https://schema.org", "@type": article.pillar === "trust" ? "WebPage" : "Article", name: article.title, headline: article.title, description: article.description, url: canonicalUrl(path), mainEntityOfPage: canonicalUrl(path), author: { "@type": "Organization", name: "Kenya Fund Finder" }, publisher: { "@type": "Organization", name: "Kenya Fund Finder" } },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: canonicalUrl("/") }, { "@type": "ListItem", position: 2, name: article.title, item: canonicalUrl(path) }] },
    ],
  };
}

export const MMF_FAQ = [
  { question: "Are published MMF yields guaranteed?", answer: "No. Published annualised yields can change. Check the manager's yield basis, source date, fees, tax and withdrawal conditions." },
  { question: "How is the estimated after-tax yield calculated?", answer: "The simple illustration multiplies a percentage yield by 0.85 under a 15% withholding assumption. It excludes additional fees and compounding. Verify your own tax treatment and whether fees are already reflected in the quoted rate." },
  { question: "Does a record update mean a fact sheet was verified?", answer: "No. We show the fact-sheet date and record-update date separately. A database update does not prove independent verification or a new published yield." },
];
