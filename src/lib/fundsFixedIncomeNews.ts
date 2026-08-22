export const FUNDS_AND_FIXED_INCOME_TAB = "Funds & Fixed Income";

export interface ArticleLikeForClassification {
  title?: string | null;
  summary?: string | null;
  content?: string | null;
  category?: string | null;
}

// 1. Money Market & Collective Investment Scheme phrases
const MMF_CIS_PHRASES = /\b(money\s+market\s+funds?|money\s+market|\bmmfs?\b|unit\s+trusts?|collective\s+investment\s+schemes?|fixed\s+income\s+funds?|bond\s+funds?|special\s+funds?|sub-funds?|exchange\s+traded\s+funds?|\betfs?\b|fund\s+managers?|fund\s+management|asset\s+management|corporate\s+trustees?|wealth\s+management|fund\s+managers?\s+(?:yields?|rates?|annual\s+yield|daily\s+yield|aum|distributions?)|yields?\s+on\s+(?:funds?|mmfs?|unit\s+trusts?))\b/i;

// 2. Government Securities (Treasury Bills & Treasury Bonds) phrases
const GOV_SECURITIES_PHRASES = /\b(treasury\s+bills?|\bt-?bills?\b|91-day\s+(?:treasury\s+)?bills?|182-day\s+(?:treasury\s+)?bills?|364-day\s+(?:treasury\s+)?bills?|treasury\s+bonds?|\bt-?bonds?\b|infrastructure\s+bonds?|government\s+securities|sovereign\s+bonds?|eurobonds?|dhowcsd|treasury\s+auctions?|treasury\s+yields?|bond\s+auctions?|reopened\s+bonds?|tap\s+sales?)\b/i;

// 3. Corporate Bonds & Fixed Income Market phrases
const BOND_FIXED_INCOME_PHRASES = /\b(corporate\s+bonds?|green\s+bonds?|sustainability\s+bonds?|bond\s+issuance|bond\s+yields?|coupon\s+rates?|secondary\s+bond\s+market|nse\s+bonds?|bond\s+market|bond\s+redemptions?|commercial\s+paper|fixed\s+income\s+(?:market|investments?|notes?|securities|assets?))\b/i;

// 4. Strict false-positive exclusion patterns
const EXCLUSION_PATTERNS = /\b(sovereign\s+wealth\s+funds?|vehicle\s+auction|car\s+auction|property\s+auction|land\s+auction|bailiff|maize\s+yield|crop\s+yield|tea\s+yield|coffee\s+yield|agricultural\s+yield|farming\s+yield|bail\s+bond|chemical\s+bond|family\s+bond|emotional\s+bond|visa\s+bond|finance\s+bill|tobacco\s+bill|pending\s+bills?|billing\s+disputes?|utility\s+bills?|electricity\s+bill|water\s+bill|tax\s+refund|fee\s+refund|duty\s+refund|scholarships?|education\s+fund|u\.?s\.?\s+treasury|us\s+treasury\s+bonds?|wall\s+street\s+treasury)\b/i;

/**
 * Deterministic classifier for the "Funds & Fixed Income" news category.
 * Evaluates title and summary against strong, unambiguous investment phrases.
 */
export function isFundsAndFixedIncomeArticle(article: ArticleLikeForClassification): boolean {
  if (!article) return false;

  const title = (article.title || "").trim();
  const summary = (article.summary || "").trim();
  const text = `${title} ${summary}`;

  if (text.length < 5) return false;

  // Reject explicit false-positive keywords in headline
  if (EXCLUSION_PATTERNS.test(title)) {
    return false;
  }

  // Strong positive compound phrase check on title and summary
  const hasMmfCis = MMF_CIS_PHRASES.test(title) || (summary.length > 0 && MMF_CIS_PHRASES.test(summary));
  const hasGovSec = GOV_SECURITIES_PHRASES.test(title) || (summary.length > 0 && GOV_SECURITIES_PHRASES.test(summary));
  const hasBondMarket = BOND_FIXED_INCOME_PHRASES.test(title) || (summary.length > 0 && BOND_FIXED_INCOME_PHRASES.test(summary));

  return hasMmfCis || hasGovSec || hasBondMarket;
}
