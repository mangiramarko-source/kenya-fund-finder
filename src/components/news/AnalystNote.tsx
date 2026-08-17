import { type NewsAiAnalysis } from "@/lib/api";

interface AnalystNoteProps {
  analysis?: NewsAiAnalysis | null;
}

const normalizeText = (value?: string | null) =>
  value?.replace(/\s+/g, " ").trim() || "";

const isSameText = (first?: string | null, second?: string | null) => {
  const normalizedFirst = normalizeText(first).toLowerCase();
  const normalizedSecond = normalizeText(second).toLowerCase();
  return Boolean(normalizedFirst && normalizedSecond && normalizedFirst === normalizedSecond);
};

const NoteRow = ({ title, children }: { title: string; children?: string | null }) => {
  if (!children?.trim()) return null;

  return (
    <p className="text-[15px] leading-relaxed text-foreground/90">
      <span className="font-bold text-foreground">{title}: </span>
      {children.trim()}
    </p>
  );
};

export function AnalystNote({ analysis }: AnalystNoteProps) {
  if (!analysis) return null;

  const narrativeSections = (analysis.narrative_sections || [])
    .filter((section) => section?.heading?.trim() && section?.body?.trim())
    .slice(0, 4);

  const hasNarrative =
    analysis.content
    || analysis.analyst_summary
    || analysis.investment_context
    || analysis.key_uncertainty
    || analysis.market_lens
    || analysis.why_it_matters
    || analysis.investor_takeaway
    || narrativeSections.length > 0;

  if (!hasNarrative) return null;

  const shouldShowLegacyContent = narrativeSections.length === 0;
  const coveredBodies = narrativeSections.map((section) => section.body);
  const storySoFar = analysis.analyst_summary || analysis.what_happened;
  const marketConnection = analysis.investment_context || analysis.market_lens || analysis.why_it_matters;
  const investorLens = analysis.key_uncertainty || analysis.investor_takeaway;
  const shouldShowStorySoFar = !coveredBodies.some((body) => isSameText(body, storySoFar));
  const shouldShowMarketConnection = !coveredBodies.some((body) => isSameText(body, marketConnection));
  const shouldShowInvestorLens = !coveredBodies.some((body) => isSameText(body, investorLens));

  return (
    <section className="space-y-5 border-y border-border py-4">
      {shouldShowLegacyContent && analysis.content && (
        <div className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">
          {analysis.content}
        </div>
      )}

      {narrativeSections.length > 0 && (
        <div className="space-y-5">
          {narrativeSections.map((section, index) => (
            <article key={`${section.heading}-${index}`} className="space-y-2">
              <h4 className="text-[16px] font-bold leading-tight text-foreground">
                {section.heading.trim()}
              </h4>
              <p className="text-[15px] leading-relaxed text-foreground/90">
                {section.body.trim()}
              </p>
            </article>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {shouldShowStorySoFar && (
          <NoteRow title="Story so far">
            {storySoFar}
          </NoteRow>
        )}
        {shouldShowMarketConnection && (
          <NoteRow title="Market connection">
            {marketConnection}
          </NoteRow>
        )}
        {shouldShowInvestorLens && (
          <NoteRow title="Investor lens">
            {investorLens}
          </NoteRow>
        )}
      </div>
    </section>
  );
}
