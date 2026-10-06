import { canonicalUrl, definitionList, escapeHtml, paragraph, type SeoPageDefinition } from "./seoPrerender";
import { MMF_FAQ, researchLinksHtml } from "../data/seoGrowthContent";

export interface ResearchFund {
  slug: string | null; name: string | null; manager: string | null; fund_type: string | null;
  annual_yield: number | null; yield_unit: string | null; management_fee: number | null;
  minimum_investment: number | null; withdrawal_time: string | null; updated_at: string | null;
  fact_sheet_date?: string | null; website?: string | null;
}

export const validMetric = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
export const metric = (value: number | null | undefined, suffix = "") => validMetric(value) ? `${value.toLocaleString("en-KE", { maximumFractionDigits: 2 })}${suffix}` : "Unavailable";
export function sourceDate(value: string | null | undefined): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "Unavailable";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(value).toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "medium" });
  return new Date(value).toLocaleString("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "medium", timeStyle: "short" });
}
export function sourceLink(url: string | null | undefined): string {
  if (!url) return "Source link unavailable";
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? `<a href="${escapeHtml(parsed.href)}" rel="noopener noreferrer">Manager's published website</a>` : "Source link unavailable";
  } catch { return "Source link unavailable"; }
}
export const isPercentageYield = (fund: ResearchFund) => fund.yield_unit === "%";
export const reportedYield = (fund: ResearchFund) => isPercentageYield(fund) ? metric(fund.annual_yield, "%") : `${metric(fund.annual_yield)} ${escapeHtml(fund.yield_unit || "(unit unavailable)")}`;

export function mmfHubSeo(funds: ResearchFund[]): SeoPageDefinition {
  const mmfs = funds.filter(f => f.fund_type === "money_market" && f.slug && /^[A-Za-z0-9_-]+$/.test(f.slug) && f.name && f.manager);
  const cards = mmfs.length ? '<div class="mmf-comparison-grid">' + mmfs.map(f => `<article><h3><a href="/compare/${encodeURIComponent(f.slug!)}">${escapeHtml(f.name)}</a></h3>${definitionList([
    ["Manager", f.manager], ["Published figure (confirm gross/net basis)", reportedYield(f)],
    ["Estimated yield after 15% withholding only", isPercentageYield(f) && validMetric(f.annual_yield) ? metric(f.annual_yield * 0.85, "%") : "Unavailable"],
    ["Management fee", metric(f.management_fee, "% p.a.")], ["Minimum investment (reported amount)", metric(f.minimum_investment)],
    ["Withdrawal time", f.withdrawal_time || "Unavailable"], ["Fact-sheet date", sourceDate(f.fact_sheet_date)], ["Record updated", sourceDate(f.updated_at)],
  ])}<p>${sourceLink(f.website)}</p></article>`).join("") + "</div>" : "";
  const description = "Compare Kenyan money market funds by published yield, fees, minimum investment, manager and withdrawal time. Review sources and estimated after-tax assumptions.";
  return {
    path: "/money-market-funds-kenya", title: "Money Market Funds in Kenya: Compare Latest Yields", heading: "Money Market Funds in Kenya: Compare Latest Yields", description,
    contentHtml: [
      paragraph("Compare the exact product, currency and yield basis. These are reported figures, not promised returns or a personalised ranking. Check each manager's latest documents and the CMA register before investing."),
      '<p><a href="/funds?type=money_market">Open the fund directory</a> · <a href="/mmf-calculator">Estimate MMF returns</a></p>',
      `<section><h2>Published MMF comparison</h2>${cards || "<p>Fund data is temporarily unavailable. Use the fund directory and confirm terms directly with the manager.</p>"}</section>`,
      '<section><h2>Comparison methodology</h2><p>Funds are limited to the money-market category. Only explicit percentage units receive an after-tax yield illustration. The illustration uses a 15% withholding assumption and excludes additional fees and compounding. Published yields may already include management fees: confirm the basis to avoid subtracting fees twice. The minimum-deposit data field does not specify currency; confirm the amount and currency with the manager. A record update is not independent fact-sheet verification.</p><p><a href="https://licensees.cma.or.ke/licenses/15/">CMA approved schemes</a> · <a href="/page/market-data-methodology">Full methodology</a> · <a href="/page/source-policy">Source policy</a></p></section>',
      researchLinksHtml("mmf"),
      `<section><h2>Frequently asked questions</h2>${MMF_FAQ.map(f => `<h3>${escapeHtml(f.question)}</h3><p>${escapeHtml(f.answer)}</p>`).join("")}</section>`,
      '<p>Educational information, not financial advice. <a href="/page/financial-disclaimer">Read the disclaimer</a>.</p>',
    ].join(""),
    jsonLd: [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: MMF_FAQ.map(f => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) }, { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: canonicalUrl("/") }, { "@type": "ListItem", position: 2, name: "Kenyan MMFs", item: canonicalUrl("/money-market-funds-kenya") }] }],
  };
}

export const MMF_CALCULATOR_SEO: SeoPageDefinition = {
  path: "/mmf-calculator", title: "Kenya MMF Calculator: Estimate Investment Returns", heading: "Kenya MMF Calculator",
  description: "Estimate Kenyan MMF returns with an initial deposit, monthly contributions, yield, period, fees and an illustrative withholding-tax deduction.",
  contentHtml: `<p>Adjust your initial deposit, monthly top-ups, annual percentage yield, investment period and additional fee to explore possible returns.</p><h2>Calculator assumptions</h2><p>The calculator assumes 15% withholding on gross interest and estimates management fees separately. Gross interest can compound monthly; contributions are added after each month's interest. The tax-adjusted balance uses that gross-interest schedule, so this is an approximation rather than exact net compounding. Rates are held constant. Use zero additional fee when the quoted yield already reflects it. Confirm tax treatment and the published rate with the manager.</p><h2>Example before compounding and additional fees</h2><p>KSh 100,000 at an assumed 10% annual gross rate for 12 months earns KSh 10,000 gross. A 15% withholding assumption leaves KSh 8,500 income after that deduction. This is an illustrative rate, not a live quote.</p><p><a href="/money-market-funds-kenya">Compare Kenyan MMFs and source dates</a> · <a href="/calculator">Other Kenyan calculators</a> · <a href="/page/market-data-methodology">Calculation methodology</a></p>${researchLinksHtml("mmf")}<p>Educational estimates only. Actual rates, charges and tax may differ. <a href="/page/financial-disclaimer">Financial disclaimer</a>.</p>`,
  jsonLd: { "@context": "https://schema.org", "@type": "WebPage", name: "Kenya MMF Calculator", url: canonicalUrl("/mmf-calculator") },
};
