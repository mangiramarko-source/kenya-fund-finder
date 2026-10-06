import type { FundFromDB } from "@/lib/api";
import { sourceDate, sourceLink } from "@/lib/seoMarketContent";
import ResearchLinks from "./ResearchLinks";

export default function FundResearchSources({ fund }: { fund: FundFromDB }) {
  return <section className="mt-6 text-sm text-muted-foreground">
    <h2 className="font-semibold text-foreground">Sources and dates</h2>
    <p className="mt-2">Fact sheet: {sourceDate(fund.fact_sheet_date)} · Record updated: {sourceDate(fund.updated_at)}</p>
    <p className="mt-2" dangerouslySetInnerHTML={{ __html: sourceLink(fund.website) }} />
    <p className="mt-2">A record update does not prove independent verification. Confirm currency, fees and gross/net yield basis with the manager.</p>
    <a href="https://licensees.cma.or.ke/licenses/15/" className="mt-2 inline-block text-emerald-600 dark:text-emerald-400 hover:underline">Check CMA approved schemes</a>
    <ResearchLinks pillar="mmf" />
  </section>;
}
