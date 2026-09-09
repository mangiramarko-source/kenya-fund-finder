import { faqByFundType, type FaqItem } from "@/data/faq";

export interface InvestmentGlossaryEntry {
  term: string;
  definition: string;
  aliases?: string[];
}

export interface InvestmentEducationMatch {
  title: string;
  answer: string;
  source: "glossary" | "faq";
}

export const INVESTMENT_GLOSSARY: InvestmentGlossaryEntry[] = [
  { term: "Stock", aliases: ["stocks", "share", "shares", "equity", "equities"], definition: "A stock, also called a share or equity, represents part ownership of a company. Its market price can rise or fall, and returns may come from price changes or dividends, neither of which is guaranteed." },
  { term: "Annual Effective Yield", aliases: ["effective annual yield", "annual yield"], definition: "The total return on an investment over one year, accounting for compounding. Expressed as a percentage." },
  { term: "Asset Allocation", definition: "The strategy of spreading investments across different asset classes (equities, bonds, cash) to balance risk and return." },
  { term: "Balanced Fund", aliases: ["balanced funds", "hybrid fund", "hybrid funds"], definition: "A fund that invests in a mix of equities, fixed-income securities, and sometimes money-market instruments. It aims to combine capital growth and income while diversifying across asset classes." },
  { term: "Basis Point (bp)", aliases: ["basis point", "basis points", "bp", "bps"], definition: "One hundredth of a percentage point (0.01%). Used to express small changes in yields or interest rates." },
  { term: "Blue Chip", aliases: ["blue chip stock", "blue chip stocks"], definition: "A well-established, financially stable company with a history of reliable performance. On the NSE, examples include Safaricom and Equity Group." },
  { term: "Bond Fund", aliases: ["bond funds"], definition: "A fund that invests primarily in government and corporate bonds. It aims to provide regular income and may experience price movement as interest rates and credit conditions change." },
  { term: "Capital Gains Tax (CGT)", aliases: ["capital gains tax", "cgt"], definition: "A 5% tax on the profit made from selling shares listed on the NSE. Calculated on net gains after deducting purchase costs." },
  { term: "CDS Account", aliases: ["cdsc account", "central depository account"], definition: "Central Depository & Settlement Corporation account. Required to hold and trade shares electronically on the Nairobi Securities Exchange." },
  { term: "CMA", aliases: ["capital markets authority"], definition: "Capital Markets Authority — the regulatory body overseeing securities markets, fund managers, and collective investment schemes in Kenya." },
  { term: "Collective Investment Scheme (CIS)", aliases: ["collective investment scheme", "cis"], definition: "A structure that pools money from multiple investors into a managed portfolio. In Kenya, collective investment schemes are regulated by the CMA and include money market, equity, bond, fixed-income, and balanced funds." },
  { term: "Coupon Rate", aliases: ["bond coupon", "coupon"], definition: "The annual interest rate paid on a bond, expressed as a percentage of the face value." },
  { term: "Credit Risk", definition: "The possibility that a borrower or bond issuer fails to make interest payments or repay principal when due." },
  { term: "Daily Yield", definition: "The return earned on an investment in a single day. For Money Market Funds, this is how interest accrues daily before compounding." },
  { term: "Diversification", definition: "Spreading investments across different assets, sectors, or geographies to reduce the impact of any single investment's poor performance." },
  { term: "Dividend", aliases: ["dividends"], definition: "A portion of a company's profits distributed to shareholders, usually expressed as a per-share amount." },
  { term: "Dividend Yield", definition: "Annual dividend per share divided by the share price, expressed as a percentage. Indicates income return from a stock." },
  { term: "Ex-Dividend Date", aliases: ["ex dividend date"], definition: "The cut-off date for dividend eligibility. You must own shares before this date to receive the declared dividend." },
  { term: "Equity Fund", aliases: ["equity funds"], definition: "A fund that invests primarily in shares of listed companies. It aims for long-term capital growth and may provide dividend income, but its value can fluctuate with stock markets." },
  { term: "Face Value / Par Value", aliases: ["face value", "par value"], definition: "The nominal value of a bond or share as stated by the issuer. For Kenyan government bonds, typically KES 50,000." },
  { term: "Fixed Income Fund", aliases: ["fixed income funds"], definition: "A fund that invests primarily in debt securities such as government bonds, corporate bonds, Treasury bills, and fixed deposits. It aims to provide income, but its value and return can still change." },
  { term: "Fund Manager", definition: "A licensed professional or firm that makes investment decisions on behalf of a fund's investors, regulated by the CMA in Kenya." },
  { term: "Gross Yield", definition: "Investment return before deducting taxes and fees. Most Kenyan fund yields are quoted gross, before the 15% withholding tax." },
  { term: "Interest Rate Risk", definition: "The risk that an investment's value changes when market interest rates move. Bond prices generally fall when rates rise and rise when rates fall, with longer-duration bonds usually more sensitive." },
  { term: "KDIC", aliases: ["kenya deposit insurance corporation"], definition: "Kenya Deposit Insurance Corporation — insures bank deposits up to KES 500,000 per depositor per institution. Does not cover fund investments." },
  { term: "Liquidity", definition: "How quickly and easily an investment can be converted to cash without significant loss of value." },
  { term: "Management Fee", aliases: ["fund management fee"], definition: "An annual fee charged by the fund manager for managing the fund, expressed as a percentage of assets under management." },
  { term: "Market Capitalisation", aliases: ["market capitalization", "market cap"], definition: "The total value of a company's outstanding shares (share price × number of shares). Used to classify companies by size." },
  { term: "Maturity", aliases: ["maturity date"], definition: "The date on which a bond or fixed-term investment reaches its end and the principal is repaid to the investor." },
  { term: "Money Market Fund (MMF)", aliases: ["money market fund", "money market funds", "mmf", "mmfs"], definition: "A collective investment scheme that pools investor money into short-term instruments such as Treasury bills, commercial paper, and fixed deposits. MMFs aim for liquidity and relatively stable returns, but returns are not guaranteed." },
  { term: "NAV (Net Asset Value)", aliases: ["nav", "net asset value"], definition: "The per-unit value of a fund's total assets minus liabilities. Used to price purchases and redemptions of fund units." },
  { term: "NSE", aliases: ["nairobi securities exchange", "kenyan stock market", "kenya stock market"], definition: "Nairobi Securities Exchange — Kenya's principal stock exchange where equities, bonds, and other securities are traded." },
  { term: "P/E Ratio", aliases: ["pe ratio", "price earnings ratio", "price to earnings ratio"], definition: "Price-to-Earnings ratio — the share price divided by earnings per share. A common valuation metric; higher P/E may indicate growth expectations." },
  { term: "Portfolio", aliases: ["investment portfolio"], definition: "The collection of investments held by an individual or a fund, including stocks, bonds, and other assets." },
  { term: "Special Fund", aliases: ["special funds"], definition: "A specialised fund whose mandate sits outside standard money-market, fixed-income, balanced, equity, or bond categories. Its strategy, risks, fees, and liquidity depend on the specific product." },
  { term: "T-Bill (Treasury Bill)", aliases: ["t bill", "t bills", "treasury bill", "treasury bills"], definition: "A short-term government security (91, 182, or 364 days) sold at a discount and redeemed at face value. Low risk, used by MMFs." },
  { term: "Treasury Bond", aliases: ["treasury bonds", "government bond", "government bonds"], definition: "A long-term government debt security (2–30 years) paying periodic interest (coupons). Considered low credit risk in Kenya." },
  { term: "Volatility", definition: "The degree of variation in an investment's price over time. Higher volatility means greater price swings and perceived risk." },
  { term: "Withholding Tax", definition: "A 15% tax deducted at source on interest and dividend income from investments in Kenya." },
  { term: "Yield Curve", definition: "A graph showing interest rates across different maturities. A normal (upward-sloping) curve means longer-term rates exceed short-term rates." },
];

export const LEARN_ACADEMY_FAQS: FaqItem[] = Object.values(faqByFundType).flat();

const EDUCATIONAL_PREFIX_RE = /^(?:please\s+)?(?:what\s+(?:is|are)|what'?s|define|explain|meaning\s+of|tell\s+me\s+about)\s+/i;
const POLITE_SUFFIX_RE = /\s+(?:in\s+simple\s+terms|simply|for\s+a\s+beginner|please)$/i;

export function normalizeEducationQuery(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function stripEducationalFraming(prompt: string): string {
  return normalizeEducationQuery(
    prompt.replace(EDUCATIONAL_PREFIX_RE, "").replace(POLITE_SUFFIX_RE, ""),
  ).replace(/^(?:a|an|the)\s+/, "");
}

function glossaryAliases(entry: InvestmentGlossaryEntry): string[] {
  return [entry.term, ...(entry.aliases ?? [])].map(normalizeEducationQuery);
}

/** Match only explicit educational phrasing or a Learn Academy FAQ question. */
export function findInvestmentEducation(prompt: string): InvestmentEducationMatch | null {
  const normalizedPrompt = normalizeEducationQuery(prompt);
  const framedSubject = stripEducationalFraming(prompt);
  const hasDefinitionFraming = EDUCATIONAL_PREFIX_RE.test(prompt.trim());

  const faq = LEARN_ACADEMY_FAQS.find(
    (item) => normalizeEducationQuery(item.question) === normalizedPrompt,
  );
  if (faq) return { title: faq.question, answer: faq.answer, source: "faq" };

  const shortenedFaq = normalizedPrompt.length >= 12
    ? LEARN_ACADEMY_FAQS.find((item) =>
        normalizeEducationQuery(item.question).includes(normalizedPrompt),
      )
    : undefined;
  if (shortenedFaq) {
    return { title: shortenedFaq.question, answer: shortenedFaq.answer, source: "faq" };
  }

  if (hasDefinitionFraming) {
    const exact = INVESTMENT_GLOSSARY.find((entry) =>
      glossaryAliases(entry).includes(framedSubject),
    );
    if (exact) {
      return { title: `What is ${exact.term}?`, answer: exact.definition, source: "glossary" };
    }

    const contained = INVESTMENT_GLOSSARY
      .flatMap((entry) => glossaryAliases(entry).map((alias) => ({ entry, alias })))
      .filter(({ alias }) => alias.length >= 3 && new RegExp(`(?:^| )${alias}(?: |$)`).test(framedSubject))
      .sort((a, b) => b.alias.length - a.alias.length)[0]?.entry;
    if (contained) {
      return { title: `What is ${contained.term}?`, answer: contained.definition, source: "glossary" };
    }
  }

  return null;
}
