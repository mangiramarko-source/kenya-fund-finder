/**
 * Unified Serrari Market Synchronizer (Edge Function)
 * Ingests and parses all ~85 Kenyan unit trusts & funds from Serrari Group:
 *   - 27 KES Money Market Funds (/ke/mmf)
 *   - 13 USD Money Market Funds (/ke/mmf-usd)
 *   - 45 Unit Trusts: Fixed Income, Balanced, and Equity funds (/ke/ut)
 */

export type SerrariFundType =
  | "money_market"
  | "fixed_income"
  | "balanced"
  | "equity"
  | "bond"
  | "special";

export interface SerrariParsedFundRow {
  rank: number;
  slug: string;
  name: string;
  manager: string;
  fund_type: SerrariFundType;
  currency: "KES" | "USD";
  yield_unit: "%" | "USD" | "KES";
  annual_yield: number;
  daily_yield: number;
  net_yield: number;
  management_fee: number;
  minimum_investment: number;
  withdrawal_time: string;
  website: string;
  cma_licensed: boolean;
  asOfDate: string;
  sourceUrl: string;
  categoryLabel?: string;
}

export interface SerrariCanonicalMeta {
  slug: string;
  name: string;
  manager: string;
  fund_type: SerrariFundType;
  currency: "KES" | "USD";
  yield_unit: "%" | "USD" | "KES";
  website: string;
  withdrawal_time: string;
}

/**
 * Converts Effective Annual Rate (EAR %) to Nominal Daily Compounded Rate (%):
 *   daily_yield = 365 * ((1 + EAR / 100)^(1 / 365) - 1) * 100
 */
export function deriveDailyYieldFromEar(earPercent: number): number {
  if (!Number.isFinite(earPercent) || earPercent <= 0) return 0;
  const earDecimal = earPercent / 100;
  const nominalAnnualDecimal = 365 * (Math.pow(1 + earDecimal, 1 / 365) - 1);
  return Math.round(nominalAnnualDecimal * 100 * 100) / 100;
}

export function parseSerrariMinimum(rawCell: string, currency: "KES" | "USD"): number {
  if (!rawCell || rawCell.trim() === "" || rawCell.includes("--")) {
    return currency === "USD" ? 13000 : 1000;
  }
  const m = /(\d+(?:\.\d+)?)\s*([KMB]\b)?/i.exec(rawCell);
  if (!m) return currency === "USD" ? 13000 : 1000;
  const val = parseFloat(m[1]);
  const suffix = (m[2] || "").toUpperCase();
  const mult = suffix === "K" ? 1_000 : suffix === "M" ? 1_000_000 : suffix === "B" ? 1_000_000_000 : 1;
  const rawAmount = Math.round(val * mult);
  return currency === "USD" ? rawAmount * 130 : rawAmount;
}

export function parseSerrariFee(rawCell: string): number {
  if (!rawCell || rawCell.trim() === "" || rawCell.includes("--")) return 2.0;
  const m = /(\d+(?:\.\d+)?)\s*%/.exec(rawCell);
  return m ? parseFloat(m[1]) : 2.0;
}

export function normalizeToWeekdayIsoDate(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((isoDate || "").trim());
  if (!m) return isoDate;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  if (isNaN(d.getTime())) return isoDate;
  const day = d.getUTCDay();
  if (day === 6) d.setUTCDate(d.getUTCDate() - 1);
  else if (day === 0) d.setUTCDate(d.getUTCDate() - 2);
  return d.toISOString().slice(0, 10);
}

export function parseSerrariAsOfDate(markdown: string, fallbackIsoDate?: string): string {
  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const m = /(?:Updated|Data as of|as of|Figures as at)\s+(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/i.exec(markdown);
  if (m) {
    const day = String(parseInt(m[1], 10)).padStart(2, "0");
    const mon = months[m[2].slice(0, 3).toLowerCase()];
    if (mon) return normalizeToWeekdayIsoDate(`${m[3]}-${mon}-${day}`);
  }
  return normalizeToWeekdayIsoDate(fallbackIsoDate || new Date().toISOString().slice(0, 10));
}

export const SERRARI_KES_MMF_MAP: Record<string, SerrariCanonicalMeta> = {
  cytonn: { slug: "cytonn-sh-mmf", name: "Cytonn", manager: "Cytonn Asset Managers Limited", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://www.cytonn.com/investments/money-market-fund", withdrawal_time: "Instant (M-Pesa)" },
  faulu: { slug: "faulu-sh-mmf", name: "Faulu", manager: "Old Mutual Investment Group", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://www.faulukenya.com", withdrawal_time: "1-2 days" },
  "lofty corban": { slug: "lofty-corban-sh-mmf", name: "Lofty-Corban", manager: "Lofty-Corban Investments Limited", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://loftycorban.com", withdrawal_time: "1 day" },
  nabo: { slug: "nabo-sh-mmf", name: "Nabo", manager: "Nabo Capital Limited", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://www.nabocapital.com", withdrawal_time: "1-2 days" },
  madison: { slug: "madison-sh-mmf", name: "Madison", manager: "Madison Investment Managers Limited", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://www.madison.co.ke", withdrawal_time: "1-2 days" },
  "orient kasha": { slug: "orient-kasha-sh-mmf", name: "Orient Kasha", manager: "Orient Asset Managers Limited", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://orientasset.co.ke", withdrawal_time: "1-2 days" },
  "old mutual": { slug: "old-mutual-sh-mmf", name: "Old Mutual", manager: "Old Mutual Investment Group", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://www.oldmutual.co.ke", withdrawal_time: "1-2 days" },
  jubilee: { slug: "jubilee-sh-mmf", name: "Jubilee", manager: "Jubilee Asset Management", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://jubileeinsurance.com/ke/", withdrawal_time: "1-2 days" },
  kuza: { slug: "kuza-sh-mmf", name: "Kuza", manager: "Kuza Asset Management Limited", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://www.kuza.africa", withdrawal_time: "1 day" },
  etica: { slug: "etica-sh-mmf", name: "Etica", manager: "Etica Capital Ltd", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://eticacapital.com", withdrawal_time: "Instant (M-Pesa)" },
  arvocap: { slug: "arvocap-sh-mmf", name: "Arvocap", manager: "Arvocap Asset Managers Limited", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://www.arvocap.com", withdrawal_time: "1-2 days" },
  genafrica: { slug: "genafrica-sh-mmf", name: "GenAfrica", manager: "GenAfrica Asset Managers Limited", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://genafrica.com", withdrawal_time: "1-3 days" },
  britam: { slug: "britam-sh-mmf", name: "Britam", manager: "Britam Asset Managers", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://ke.britam.com", withdrawal_time: "1-2 days" },
  sanlam: { slug: "sanlamallianz-sh-mmf", name: "SanlamAllianz", manager: "Sanlam Allianz Investments Limited", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://www.sanlam.co.ke", withdrawal_time: "1-2 days" },
  kcb: { slug: "kcb-sh-mmf", name: "KCB", manager: "KCB Asset Management Ltd", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://ke.kcbbankgroup.com", withdrawal_time: "1-2 days" },
  "dry associates": { slug: "dry-associates-sh-mmf", name: "Dry Associates", manager: "Dry Associates Investment Bank", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://www.dryassociates.com", withdrawal_time: "2-3 days" },
  genghis: { slug: "genghis-sh-mmf", name: "Genghis", manager: "Genghis Capital Limited", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://www.genghis-capital.com", withdrawal_time: "1-2 days" },
  cpf: { slug: "cpf-sh-mmf", name: "CPF", manager: "CPF Financial Services", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://www.cpf.or.ke", withdrawal_time: "1-2 days" },
  cic: { slug: "cic-sh-mmf", name: "CIC", manager: "CIC Asset Management Ltd", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://cic.co.ke", withdrawal_time: "1-2 days" },
  "african alliance": { slug: "african-alliance-sh-mmf", name: "African Alliance Enhanced", manager: "African Alliance Kenya Asset Management", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://www.africanallianceassetmanagement.com", withdrawal_time: "2-3 days" },
  ncba: { slug: "ncba-sh-mmf", name: "NCBA", manager: "NCBA Investment Bank", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://investment-bank.ncbagroup.com", withdrawal_time: "1 day" },
  apa: { slug: "apollo-sh-mmf", name: "Apollo", manager: "Apollo Asset Management Company Ltd", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://www.apainsurance.org", withdrawal_time: "1-2 days" },
  "co-op": { slug: "coop-sh-mmf", name: "Co-op", manager: "Co-op Trust Investment Services Limited", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://www.co-opbank.co.ke", withdrawal_time: "1-2 days" },
  "icea lion": { slug: "icea-sh-mmf", name: "ICEA Lion", manager: "ICEA LION Asset Management Ltd", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://icealion.co.ke", withdrawal_time: "1-2 days" },
  safaricom: { slug: "ziidi-money-market-fund", name: "Ziidi", manager: "Standard Investment Bank, ALA Capital Limited & Sanlam Investments East Africa Limited", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://www.safaricom.co.ke/personal/m-pesa/wealth/ziidi", withdrawal_time: "Instant (M-Pesa)" },
  stanbic: { slug: "stanbic-sh-mmf", name: "Stanbic", manager: "Stanbic Investment Management Services", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://www.stanbicbank.co.ke", withdrawal_time: "1-2 days" },
  equity: { slug: "equity-sh-mmf", name: "Equity", manager: "Equity Investment Bank", fund_type: "money_market", currency: "KES", yield_unit: "%", website: "https://equitygroupholdings.com/ke/save-invest", withdrawal_time: "1 day" },
};

export const SERRARI_USD_MMF_MAP: Record<string, SerrariCanonicalMeta> = {
  nabo: { slug: "nabo-usd-mmf", name: "Nabo USD", manager: "Nabo Capital Limited", fund_type: "money_market", currency: "USD", yield_unit: "USD", website: "https://www.nabocapital.com", withdrawal_time: "2-3 days" },
  jubilee: { slug: "jubilee-usd-mmf", name: "Jubilee USD", manager: "Jubilee Asset Management", fund_type: "money_market", currency: "USD", yield_unit: "USD", website: "https://jubileeinsurance.com/ke/", withdrawal_time: "2-3 days" },
  cytonn: { slug: "cytonn-usd-mmf", name: "Cytonn USD", manager: "Cytonn Asset Managers Limited", fund_type: "money_market", currency: "USD", yield_unit: "USD", website: "https://www.cytonn.com", withdrawal_time: "1-2 days" },
  "old mutual": { slug: "old-mutual-usd-mmf", name: "Old Mutual USD", manager: "Old Mutual Investment Group", fund_type: "money_market", currency: "USD", yield_unit: "USD", website: "https://www.oldmutual.co.ke", withdrawal_time: "2-3 days" },
  kuza: { slug: "kuza-usd-mmf", name: "Kuza USD", manager: "Kuza Asset Management Limited", fund_type: "money_market", currency: "USD", yield_unit: "USD", website: "https://www.kuza.africa", withdrawal_time: "1-2 days" },
  kcb: { slug: "kcb-usd-mmf", name: "KCB USD", manager: "KCB Asset Management Ltd", fund_type: "money_market", currency: "USD", yield_unit: "USD", website: "https://ke.kcbbankgroup.com", withdrawal_time: "2-3 days" },
  "lofty corban": { slug: "lofty-corban-usd-mmf", name: "Lofty-Corban USD", manager: "Lofty-Corban Investments Limited", fund_type: "money_market", currency: "USD", yield_unit: "USD", website: "https://loftycorban.com", withdrawal_time: "1-2 days" },
  "dry associates": { slug: "dry-associates-usd-mmf", name: "Dry Associates USD", manager: "Dry Associates Investment Bank", fund_type: "money_market", currency: "USD", yield_unit: "USD", website: "https://www.dryassociates.com", withdrawal_time: "2-3 days" },
  sanlam: { slug: "sanlam-usd-mmf", name: "SanlamAllianz USD", manager: "Sanlam Allianz Investments Limited", fund_type: "money_market", currency: "USD", yield_unit: "USD", website: "https://www.sanlam.co.ke", withdrawal_time: "2-3 days" },
  stanbic: { slug: "stanbic-usd-mmf", name: "Stanbic USD", manager: "Stanbic Investment Management Services", fund_type: "money_market", currency: "USD", yield_unit: "USD", website: "https://www.stanbicbank.co.ke", withdrawal_time: "2-3 days" },
  cic: { slug: "cic-dollar-usd-mmf", name: "CIC Dollar", manager: "CIC Asset Management Ltd", fund_type: "money_market", currency: "USD", yield_unit: "USD", website: "https://cic.co.ke", withdrawal_time: "2-3 days" },
  cpf: { slug: "cpf-usd-mmf", name: "CPF USD", manager: "CPF Financial Services", fund_type: "money_market", currency: "USD", yield_unit: "USD", website: "https://www.cpf.or.ke", withdrawal_time: "2-3 days" },
  ncba: { slug: "ncba-usd-mmf", name: "NCBA USD", manager: "NCBA Investment Bank", fund_type: "money_market", currency: "USD", yield_unit: "USD", website: "https://investment-bank.ncbagroup.com", withdrawal_time: "1-2 days" },
};

export const SERRARI_UT_MAP: Record<string, SerrariCanonicalMeta> = {
  // Balanced Funds (Category: balanced, yield_unit: KES)
  "sanlamallianz balanced fund": { slug: "sanlamallianz-balanced-sh", name: "SanlamAllianz", manager: "Sanlam Allianz Investments Limited", fund_type: "balanced", currency: "KES", yield_unit: "KES", website: "https://www.sanlam.co.ke", withdrawal_time: "1-3 days" },
  "zimele balanced fund": { slug: "zimele-balanced-sh", name: "Zimele", manager: "Zimele Asset Management", fund_type: "balanced", currency: "KES", yield_unit: "KES", website: "https://www.zimele.co.ke", withdrawal_time: "1-3 days" },
  "britam balanced fund": { slug: "britam-balanced-sh", name: "Britam", manager: "Britam Asset Managers", fund_type: "balanced", currency: "KES", yield_unit: "KES", website: "https://ke.britam.com", withdrawal_time: "3-5 days" },
  "african alliance balanced fund": { slug: "african-alliance-balanced-sh", name: "African Alliance", manager: "African Alliance Kenya Asset Management", fund_type: "balanced", currency: "KES", yield_unit: "KES", website: "https://www.africanallianceassetmanagement.com", withdrawal_time: "3-5 days" },
  "icea balanced fund": { slug: "icea-balanced-sh", name: "ICEA LION", manager: "ICEA LION Asset Management Ltd", fund_type: "balanced", currency: "KES", yield_unit: "KES", website: "https://icealion.co.ke", withdrawal_time: "3-5 days" },
  "cpf balanced fund": { slug: "CPF-balanced-fund", name: "CPF", manager: "CPF Financial Services", fund_type: "balanced", currency: "KES", yield_unit: "KES", website: "https://www.cpf.or.ke", withdrawal_time: "3-5 days" },
  "apollo balanced fund": { slug: "apollo-balanced-sh", name: "Apollo", manager: "Apollo Asset Management Company Ltd", fund_type: "balanced", currency: "KES", yield_unit: "KES", website: "https://www.apainsurance.org", withdrawal_time: "1-2 days" },
  "equity balanced fund": { slug: "equity-balanced-sh", name: "Equity", manager: "Equity Investment Bank", fund_type: "balanced", currency: "KES", yield_unit: "KES", website: "https://equitygroupholdings.com/ke/save-invest", withdrawal_time: "3-5 days" },
  "cic balanced fund": { slug: "cic-balanced-sh", name: "CIC", manager: "CIC Asset Management Ltd", fund_type: "balanced", currency: "KES", yield_unit: "KES", website: "https://cic.co.ke", withdrawal_time: "3-5 days" },

  // Fixed Income / Bond Funds (Category: fixed_income or bond, yield_unit: %)
  "mayfair fixed income fund": { slug: "mayfair-fixed-income-fund", name: "Mayfair", manager: "Mayfair Asset Managers", fund_type: "fixed_income", currency: "KES", yield_unit: "%", website: "https://www.mayfair.co.ke", withdrawal_time: "2-3 days" },
  "lofty corban bond fund": { slug: "lofty-corban-bond-fund", name: "Lofty Corban", manager: "Lofty-Corban Investments Limited", fund_type: "bond", currency: "KES", yield_unit: "%", website: "https://loftycorban.com", withdrawal_time: "1-2 days" },
  "globatec fixed income fund": { slug: "globatec-fixed-income-sh", name: "Globatec", manager: "Globatec Capital Limited", fund_type: "fixed_income", currency: "KES", yield_unit: "%", website: "https://globatec.co.ke", withdrawal_time: "1-3 days" },
  "co-op fixed income fund": { slug: "coop-fixed-sh", name: "Co-op", manager: "Co-op Trust Investment Services Limited", fund_type: "fixed_income", currency: "KES", yield_unit: "%", website: "https://www.co-opbank.co.ke", withdrawal_time: "1-2 days" },
  "zimele fixed income fund": { slug: "zimele-fixed-income-sh", name: "Zimele", manager: "Zimele Asset Management", fund_type: "fixed_income", currency: "KES", yield_unit: "%", website: "https://www.zimele.co.ke", withdrawal_time: "1-2 days" },
  "etica fixed income fund": { slug: "etica-sh", name: "Etica", manager: "Etica Capital Ltd", fund_type: "fixed_income", currency: "KES", yield_unit: "%", website: "https://eticacapital.com", withdrawal_time: "1-2 days" },
  "african alliance fixed income fund": { slug: "african-alliance-fixed-income-sh", name: "African Alliance", manager: "African Alliance Kenya Asset Management", fund_type: "fixed_income", currency: "KES", yield_unit: "%", website: "https://www.africanallianceassetmanagement.com", withdrawal_time: "2-3 days" },
  "co-op bond fund": { slug: "coop-bond-sh", name: "Co-op Bond", manager: "Co-op Trust Investment Services Limited", fund_type: "bond", currency: "KES", yield_unit: "%", website: "https://www.co-opbank.co.ke", withdrawal_time: "1-2 days" },
  "madison fixed income fund": { slug: "madison-fixed-sh", name: "Madison", manager: "Madison Investment Managers Limited", fund_type: "fixed_income", currency: "KES", yield_unit: "%", website: "https://www.madison.co.ke", withdrawal_time: "1-2 days" },
  "kuza fixed income fund": { slug: "kuza-fixed-sh", name: "Kuza", manager: "Kuza Asset Management Limited", fund_type: "fixed_income", currency: "KES", yield_unit: "%", website: "https://www.kuza.africa", withdrawal_time: "1-2 days" },
  "jubilee fixed income fund": { slug: "jubilee-sh", name: "Jubilee", manager: "Jubilee Asset Management", fund_type: "fixed_income", currency: "KES", yield_unit: "%", website: "https://jubileeinsurance.com/ke/", withdrawal_time: "1-2 days" },
  "kcb fixed income fund": { slug: "kcb-fixed-income-sh", name: "KCB", manager: "KCB Asset Management Ltd", fund_type: "fixed_income", currency: "KES", yield_unit: "%", website: "https://ke.kcbbankgroup.com", withdrawal_time: "1-2 days" },
  "nabo fixed income fund": { slug: "nabo-fixed-income-sh", name: "Nabo", manager: "Nabo Capital Limited", fund_type: "fixed_income", currency: "KES", yield_unit: "%", website: "https://www.nabocapital.com", withdrawal_time: "1-2 days" },
  "genafrica fixed income fund": { slug: "genafrica-fixed-income-sh", name: "GenAfrica", manager: "GenAfrica Asset Managers Limited", fund_type: "fixed_income", currency: "KES", yield_unit: "%", website: "https://genafrica.com", withdrawal_time: "1-3 days" },
  "britam bond fund": { slug: "britam-bond-sh", name: "Britam Bond", manager: "Britam Asset Managers", fund_type: "bond", currency: "KES", yield_unit: "%", website: "https://ke.britam.com", withdrawal_time: "1-2 days" },
  "cic fixed income fund": { slug: "cic-fixed-income-sh", name: "CIC", manager: "CIC Asset Management Ltd", fund_type: "fixed_income", currency: "KES", yield_unit: "%", website: "https://cic.co.ke", withdrawal_time: "1-2 days" },
  "icea fixed income fund": { slug: "icea-sh-fixed-income", name: "ICEA Ksh", manager: "ICEA LION Asset Management Ltd", fund_type: "fixed_income", currency: "KES", yield_unit: "%", website: "https://icealion.co.ke", withdrawal_time: "1-2 days" },
  "gulfcap fixed income fund": { slug: "gulfcap-fixed-sh", name: "GulfCap", manager: "GulfCap Asset Management", fund_type: "fixed_income", currency: "KES", yield_unit: "%", website: "https://gulfcap.co.ke", withdrawal_time: "1-2 days" },
  "orient hifadhi fixed income fund": { slug: "orient-hifadhi-sh", name: "Orient Hifadhi", manager: "Orient Asset Managers Limited", fund_type: "fixed_income", currency: "KES", yield_unit: "%", website: "https://orientasset.co.ke", withdrawal_time: "1-2 days" },
  "cpf bond fund": { slug: "cpf-bond-sh", name: "CPF Bond", manager: "CPF Financial Services", fund_type: "bond", currency: "KES", yield_unit: "%", website: "https://www.cpf.or.ke", withdrawal_time: "1-2 days" },
  "sanlam alllianz fixed income fund": { slug: "sanlamallianz-fixed-income-sh", name: "SanlamAllianz", manager: "Sanlam Allianz Investments Limited", fund_type: "fixed_income", currency: "KES", yield_unit: "%", website: "https://www.sanlam.co.ke", withdrawal_time: "1-2 days" },
  "ncba fixed income fund": { slug: "ncba-fixed-income-sh", name: "NCBA", manager: "NCBA Investment Bank", fund_type: "fixed_income", currency: "KES", yield_unit: "%", website: "https://investment-bank.ncbagroup.com", withdrawal_time: "1-2 days" },
  "etica shariah fund": { slug: "etica-shariah-special-sh", name: "Etica Shariah", manager: "Etica Capital Ltd", fund_type: "special", currency: "KES", yield_unit: "%", website: "https://eticacapital.com", withdrawal_time: "1-2 days" },
  "avrocap fixed income fund": { slug: "arvocap-fixed-income-sh", name: "Arvocap Almasi", manager: "Arvocap Asset Managers Limited", fund_type: "fixed_income", currency: "KES", yield_unit: "%", website: "https://www.arvocap.com", withdrawal_time: "1-2 days" },

  // Equity & Special Funds
  "lofty-corban private debt special fund": { slug: "lofty-corban-private-debt-sh", name: "Lofty-Corban Private Debt", manager: "Lofty-Corban Investments Limited", fund_type: "special", currency: "KES", yield_unit: "%", website: "https://loftycorban.com", withdrawal_time: "2-3 days" },
  "dry associates special high yield": { slug: "dry-associates-special-high-yield-sh", name: "Dry Associates Special High Yield", manager: "Dry Associates Investment Bank", fund_type: "equity", currency: "KES", yield_unit: "KES", website: "https://www.dryassociates.com", withdrawal_time: "2-3 days" },
  "madison wealth equity fund": { slug: "madison-wealth-sh", name: "Madison Wealth", manager: "Madison Investment Managers Limited", fund_type: "equity", currency: "KES", yield_unit: "%", website: "https://www.madison.co.ke", withdrawal_time: "2-3 days" },
  "spearhead africa infrastructure": { slug: "spearhead-africa-infrastructure-sh", name: "Spearhead Africa Infrastructure", manager: "Spearhead Africa Asset Management", fund_type: "equity", currency: "KES", yield_unit: "KES", website: "https://spearhead.africa", withdrawal_time: "3-5 days" },
  "ncba equity fund": { slug: "ncba-equity-sh", name: "NCBA", manager: "NCBA Investment Bank", fund_type: "equity", currency: "KES", yield_unit: "KES", website: "https://investment-bank.ncbagroup.com", withdrawal_time: "1 day" },
  "icea lion equity fund": { slug: "icea-equity-sh", name: "ICEA LION", manager: "ICEA LION Asset Management Ltd", fund_type: "equity", currency: "KES", yield_unit: "KES", website: "https://icealion.co.ke", withdrawal_time: "3-5 days" },
  "britam equity fund": { slug: "britam-equity-sh", name: "Britam", manager: "Britam Asset Managers", fund_type: "equity", currency: "KES", yield_unit: "KES", website: "https://ke.britam.com", withdrawal_time: "3-5 days" },
  "african alliance equity fund": { slug: "african-alliance-equity-sh", name: "African Alliance Special fund", manager: "African Alliance Kenya Asset Management", fund_type: "equity", currency: "KES", yield_unit: "KES", website: "https://www.africanallianceassetmanagement.com", withdrawal_time: "3-5 days" },
  "kuza momentum special fund": { slug: "kuza-momentum-special-kes", name: "Kuza Momentum", manager: "Kuza Asset Management Limited", fund_type: "special", currency: "KES", yield_unit: "KES", website: "https://www.kuza.africa", withdrawal_time: "3-5 days" },
  "nabo africa equity fund": { slug: "nabo-equity-usd", name: "Nabo", manager: "Nabo Capital Limited", fund_type: "equity", currency: "KES", yield_unit: "KES", website: "https://www.nabocapital.com", withdrawal_time: "3-5 days" },
  "arvocap equity fund": { slug: "arvocap-equity-sh", name: "Arvocap", manager: "Arvocap Asset Managers Limited", fund_type: "equity", currency: "KES", yield_unit: "KES", website: "https://www.arvocap.com", withdrawal_time: "3-5 days" },
  "cic equity fund": { slug: "cic-equity-sh", name: "CIC", manager: "CIC Asset Management Ltd", fund_type: "equity", currency: "KES", yield_unit: "KES", website: "https://cic.co.ke", withdrawal_time: "3-5 days" },
};

export function hasFundMetricsChanged(
  existing: {
    annual_yield: number;
    daily_yield?: number | null;
    management_fee?: number | null;
    minimum_investment?: number | null;
    yield_unit?: string | null;
  },
  incoming: {
    annual_yield: number;
    daily_yield?: number | null;
    management_fee?: number | null;
    minimum_investment?: number | null;
    yield_unit?: string | null;
  },
): boolean {
  const numDiff = (a: number | null | undefined, b: number | null | undefined) =>
    Math.abs(Number(a ?? 0) - Number(b ?? 0)) > 0.0001;

  return (
    numDiff(existing.annual_yield, incoming.annual_yield) ||
    numDiff(existing.daily_yield, incoming.daily_yield) ||
    (existing.management_fee != null && incoming.management_fee != null && numDiff(existing.management_fee, incoming.management_fee)) ||
    (existing.minimum_investment != null && incoming.minimum_investment != null && numDiff(existing.minimum_investment, incoming.minimum_investment)) ||
    (existing.yield_unit != null && incoming.yield_unit != null && existing.yield_unit !== incoming.yield_unit)
  );
}

export function hasFundDateChanged(
  existing: {
    fact_sheet_date?: string | null;
  },
  incoming: {
    asOfDate?: string | null;
  },
): boolean {
  const incomingDate = String(incoming.asOfDate ?? "").trim();
  if (!incomingDate) return false;
  const existingDate = String(existing.fact_sheet_date ?? "").trim();
  if (!existingDate) return true;
  return existingDate !== incomingDate;
}

export function hasFundChanged(
  existing: {
    annual_yield: number;
    daily_yield?: number | null;
    management_fee?: number | null;
    minimum_investment?: number | null;
    yield_unit?: string | null;
    fact_sheet_date?: string | null;
  },
  incoming: {
    annual_yield: number;
    daily_yield?: number | null;
    management_fee?: number | null;
    minimum_investment?: number | null;
    yield_unit?: string | null;
    asOfDate?: string | null;
  },
): boolean {
  return hasFundDateChanged(existing, incoming) || hasFundMetricsChanged(existing, incoming);
}

export function getSourceGroupKey(row: {
  sourceUrl?: string | null;
  fund_type?: string | null;
  currency?: string | null;
}): string {
  if (row.sourceUrl) return row.sourceUrl;
  if (row.fund_type === "money_market") {
    return row.currency === "USD" ? "https://serrarigroup.com/ke/mmf-usd" : "https://serrarigroup.com/ke/mmf";
  }
  return "https://serrarigroup.com/ke/ut";
}

/**
 * Evaluates the midnight date-rollover guard per Serrari source group
 * (`/ke/mmf`, `/ke/mmf-usd`, `/ke/ut`). A source group is considered to have
 * published its daily batch if at least one fund in that group is newly created
 * or has a real metric change (`hasFundMetricsChanged === true`).
 */
export function getVerifiedSourceGroups(
  rows: Array<{
    slug: string;
    annual_yield: number;
    daily_yield?: number | null;
    management_fee?: number | null;
    minimum_investment?: number | null;
    yield_unit?: string | null;
    sourceUrl?: string | null;
    fund_type?: string | null;
    currency?: string | null;
  }>,
  bySlug: Map<
    string,
    {
      annual_yield: number;
      daily_yield?: number | null;
      management_fee?: number | null;
      minimum_investment?: number | null;
      yield_unit?: string | null;
      fact_sheet_date?: string | null;
    }
  >,
): Set<string> {
  const verified = new Set<string>();
  for (const row of rows) {
    const existing = bySlug.get(row.slug.toLowerCase());
    if (!existing || hasFundMetricsChanged(existing, row)) {
      verified.add(getSourceGroupKey(row));
    }
  }
  return verified;
}

export function shouldAdvanceFlatFundDate(
  existing: {
    fact_sheet_date?: string | null;
  },
  incoming: {
    asOfDate?: string | null;
    sourceUrl?: string | null;
    fund_type?: string | null;
    currency?: string | null;
  },
  verifiedGroups: Set<string>,
): boolean {
  const incomingDate = String(incoming.asOfDate ?? "").trim();
  if (!incomingDate) return false;
  const existingDate = String(existing.fact_sheet_date ?? "").trim();
  if (!existingDate) return true;
  if (existingDate === incomingDate) return false;
  return verifiedGroups.has(getSourceGroupKey(incoming));
}

/**
 * Parses markdown table from /ke/mmf or /ke/mmf-usd
 */
export function parseSerrariMmfMarkdown(
  markdown: string,
  currency: "KES" | "USD",
  fallbackDate?: string,
): SerrariParsedFundRow[] {
  const asOfDate = parseSerrariAsOfDate(markdown, fallbackDate);
  const lookupMap = currency === "KES" ? SERRARI_KES_MMF_MAP : SERRARI_USD_MMF_MAP;
  const lines = markdown.replace(/\r/g, "").split("\n");
  const rows: SerrariParsedFundRow[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith("|")) continue;
    const cols = line.split("|").map((c) => c.trim()).slice(1, -1);
    if (cols.length < 8) continue;

    const rankNum = parseInt(cols[0], 10);
    if (!Number.isFinite(rankNum) || rankNum <= 0) continue;

    const companyCell = cols[1];
    const linkMatch = /\[([^\]]+)\]/.exec(companyCell);
    const providerKey = (linkMatch ? linkMatch[1] : companyCell).trim().toLowerCase().replace(/\s+/g, " ");

    const earMatch = /(\d+(?:\.\d+)?)\s*%/.exec(cols[2]);
    if (!earMatch) continue;
    const annual_yield = parseFloat(earMatch[1]);
    if (!Number.isFinite(annual_yield) || annual_yield <= 0 || annual_yield > 50) continue;

    const minimum_investment = parseSerrariMinimum(cols[4], currency);
    const management_fee = parseSerrariFee(cols[6]);

    const netMatch = /(\d+(?:\.\d+)?)\s*%/.exec(cols[7]);
    const net_yield = netMatch ? parseFloat(netMatch[1]) : Math.round(annual_yield * 0.85 * 100) / 100;

    let canonical = lookupMap[providerKey];
    if (!canonical) {
      const cleanSlug = `${providerKey.replace(/[^a-z0-9]+/g, "-")}-${currency.toLowerCase()}-mmf`;
      canonical = {
        slug: cleanSlug,
        name: companyCell.replace(/\[([^\]]+)\].*/, "$1").trim(),
        manager: `${companyCell} Asset Management`,
        fund_type: "money_market",
        currency,
        yield_unit: currency === "USD" ? "USD" : "%",
        website: "https://www.cma.or.ke",
        withdrawal_time: "1-2 days",
      };
    }

    rows.push({
      rank: rankNum,
      slug: canonical.slug,
      name: canonical.name,
      manager: canonical.manager,
      fund_type: "money_market",
      currency,
      yield_unit: canonical.yield_unit,
      annual_yield,
      daily_yield: deriveDailyYieldFromEar(annual_yield),
      net_yield,
      management_fee,
      minimum_investment,
      withdrawal_time: canonical.withdrawal_time,
      website: canonical.website,
      cma_licensed: true,
      asOfDate,
      sourceUrl: currency === "USD" ? "https://serrarigroup.com/ke/mmf-usd" : "https://serrarigroup.com/ke/mmf",
      categoryLabel: "Money Market",
    });
  }

  return rows;
}

/**
 * Parses markdown table from /ke/ut (Fixed Income, Balanced, Equity)
 */
export function parseSerrariUtMarkdown(
  markdown: string,
  fallbackDate?: string,
): SerrariParsedFundRow[] {
  const asOfDate = parseSerrariAsOfDate(markdown, fallbackDate);
  const lines = markdown.replace(/\r/g, "").split("\n");
  const rows: SerrariParsedFundRow[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith("|")) continue;
    const cols = line.split("|").map((c) => c.trim()).slice(1, -1);
    if (cols.length < 8) continue;

    const rankNum = parseInt(cols[0], 10);
    if (!Number.isFinite(rankNum) || rankNum <= 0) continue;

    const providerCell = cols[1];
    const linkMatch = /\[([^\]]+)\]/.exec(providerCell);
    const providerName = (linkMatch ? linkMatch[1] : providerCell).trim();

    const metricCell = cols[2];
    const isPercent = metricCell.includes("%");
    const numMatch = /(\d+(?:\.\d+)?)/.exec(metricCell.replace(/,/g, ""));
    if (!numMatch) continue;
    const metricValue = parseFloat(numMatch[1]);
    if (!Number.isFinite(metricValue) || metricValue <= 0) continue;

    const minInvestment = parseSerrariMinimum(cols[4], "KES");
    const rawFundName = cols[5] ? cols[5].replace(/\[([^\]]+)\].*/, "$1").trim() : providerName;
    const categoryCell = (cols[6] || "Fixed Income").trim();
    const mgmtFee = parseSerrariFee(cols[7]);

    const fundKey = rawFundName.toLowerCase().replace(/\s+/g, " ");
    let canonical = SERRARI_UT_MAP[fundKey];

    if (!canonical) {
      // Auto-fallback mapping
      const lowerCat = categoryCell.toLowerCase();
      const detectedType: SerrariFundType = lowerCat.includes("balance")
        ? "balanced"
        : lowerCat.includes("equity")
        ? "equity"
        : lowerCat.includes("bond")
        ? "bond"
        : "fixed_income";

      const slugBase = rawFundName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      const finalSlug = slugBase.endsWith("-sh") || slugBase.endsWith("-fund") ? slugBase : `${slugBase}-sh`;

      canonical = {
        slug: finalSlug,
        name: rawFundName,
        manager: `${providerName} Asset Management`,
        fund_type: detectedType,
        currency: "KES",
        yield_unit: isPercent ? "%" : "KES",
        website: "https://www.cma.or.ke",
        withdrawal_time: "1-3 days",
      };
    }

    const annual_yield = metricValue;
    const daily_yield = isPercent ? deriveDailyYieldFromEar(annual_yield) : 0;
    const net_yield = isPercent ? Math.round(annual_yield * 0.85 * 100) / 100 : annual_yield;

    rows.push({
      rank: rankNum,
      slug: canonical.slug,
      name: canonical.name,
      manager: canonical.manager,
      fund_type: canonical.fund_type,
      currency: "KES",
      yield_unit: canonical.yield_unit,
      annual_yield,
      daily_yield,
      net_yield,
      management_fee: mgmtFee,
      minimum_investment: minInvestment,
      withdrawal_time: canonical.withdrawal_time,
      website: canonical.website,
      cma_licensed: true,
      asOfDate,
      sourceUrl: "https://serrarigroup.com/ke/ut",
      categoryLabel: categoryCell,
    });
  }

  return rows;
}

async function fetchJinaWithRetry(url: string, retries = 3, delayMs = 1500): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "text/plain",
    "X-No-Cache": "true",
    "X-Cache-Tolerance": "0",
    "Cache-Control": "no-cache",
  };
  const jinaKey = typeof Deno !== "undefined" ? Deno.env.get("JINA_API_KEY") : undefined;
  if (jinaKey) {
    headers["Authorization"] = `Bearer ${jinaKey}`;
  }

  let lastRes: Response | null = null;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) return res;
      lastRes = res;
      if (res.status === 401 || res.status === 429 || res.status >= 500) {
        if (i < retries - 1) {
          await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
          continue;
        }
      }
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  return lastRes!;
}

export async function fetchSerrariAllFundsData(): Promise<{
  rows: SerrariParsedFundRow[];
  asOfDate: string;
  notes: string[];
}> {
  const notes: string[] = [];
  // Stagger requests with retry to prevent unauthenticated 401 rate-limits on Jina Reader
  const kesMmfRes = await fetchJinaWithRetry("https://r.jina.ai/https://serrarigroup.com/ke/mmf");
  if (!kesMmfRes.ok) {
    const errText = await kesMmfRes.text().catch(() => "");
    throw new Error(`Serrari KES MMF fetch returned HTTP ${kesMmfRes.status}: ${errText.slice(0, 300)}`);
  }

  const kesMd = await kesMmfRes.text();
  const kesRows = parseSerrariMmfMarkdown(kesMd, "KES");
  notes.push(`Serrari KES MMFs parsed: ${kesRows.length}`);

  let usdRows: SerrariParsedFundRow[] = [];
  try {
    const usdMmfRes = await fetchJinaWithRetry("https://r.jina.ai/https://serrarigroup.com/ke/mmf-usd");
    if (usdMmfRes.ok) {
      const usdMd = await usdMmfRes.text();
      usdRows = parseSerrariMmfMarkdown(usdMd, "USD", kesRows[0]?.asOfDate);
      notes.push(`Serrari USD MMFs parsed: ${usdRows.length}`);
    } else {
      notes.push(`Serrari USD MMF fetch returned HTTP ${usdMmfRes.status}`);
    }
  } catch (err) {
    notes.push(`Serrari USD MMF fetch error: ${err instanceof Error ? err.message : String(err)}`);
  }

  let utRows: SerrariParsedFundRow[] = [];
  try {
    const utRes = await fetchJinaWithRetry("https://r.jina.ai/https://serrarigroup.com/ke/ut");
    if (utRes.ok) {
      const utMd = await utRes.text();
      utRows = parseSerrariUtMarkdown(utMd, kesRows[0]?.asOfDate);
      notes.push(`Serrari Unit Trusts (Fixed Income, Balanced, Equity) parsed: ${utRows.length}`);
    } else {
      notes.push(`Serrari Unit Trusts fetch returned HTTP ${utRes.status}`);
    }
  } catch (err) {
    notes.push(`Serrari Unit Trusts fetch error: ${err instanceof Error ? err.message : String(err)}`);
  }

  const asOfDate = kesRows[0]?.asOfDate || new Date().toISOString().slice(0, 10);
  return {
    rows: [...kesRows, ...usdRows, ...utRows],
    asOfDate,
    notes,
  };
}
