import { ExternalLink, Sparkles } from "lucide-react";
import { type FeedItem } from "@/hooks/useSocialFeed";
import { type NewsAiAnalysis } from "@/lib/api";
import { AnalystNote } from "./AnalystNote";
import { DecisionDrivers } from "./DecisionDrivers";
import { EvidenceGuardrail } from "./EvidenceGuardrail";
import { MarketContextSnapshot, buildCommodityMarketContext } from "./MarketContextSnapshot";
import { RelatedMarketsStrip } from "./RelatedMarketsStrip";
import { WatchNextChecklist } from "./WatchNextChecklist";
import { ConfidenceBadge } from "./ConfidenceBadge";

interface CommodityDecisionContextProps {
  item?: FeedItem;
  article?: any;
  commodity?: any;
  onEnrichmentComplete?: (updatedArticle: any) => void;
  onReadMore?: () => void;
}

const FactorList = ({ title, tone, items }: { title: string, tone: 'positive' | 'negative', items: string[] }) => (
  <div className="space-y-3">
    <h4 className={`text-[11px] font-bold uppercase tracking-[0.14em] ${tone === 'positive' ? 'text-emerald-500' : 'text-rose-500'}`}>
      {title}
    </h4>
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-foreground/80">
          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tone === 'positive' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

const getArticleText = (item?: FeedItem, article?: any) => {
  const title = String(article?.title || item?.title || "This story").trim();
  const summary = String(article?.summary || article?.content || item?.content || title).trim();
  return { title, summary: summary || title };
};

function generateCommodityFallback(item?: FeedItem, article?: any, commodity?: any): NewsAiAnalysis | null {
  const relatedCommodity = commodity || item?.relatedCommodity;
  if (!relatedCommodity) return null;

  const { title, summary } = getArticleText(item, article);
  const name = relatedCommodity.name || "this commodity";
  const price = Number(relatedCommodity.price);
  const unit = relatedCommodity.unit ? ` ${relatedCommodity.unit}` : "";
  const priceText = Number.isFinite(price) ? `${price.toFixed(2)}${unit}` : "the current quoted price";
  const change = Number(relatedCommodity.changePercent);
  const changeText = Number.isFinite(change) ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}%` : "not available";

  return {
    event_label: "Commodity-linked story",
    impact_horizon: "Needs source follow-up",
    narrative_sections: [
      {
        heading: "The story",
        body: summary,
      },
      {
        heading: "The commodity link",
        body: `This story is linked to ${name}. Compare it with the latest commodity price, but do not assume the article caused the move.`,
      },
      {
        heading: "What to check",
        body: "For commodities, the useful follow-up is whether supply, demand, weather, logistics, trade flows, or policy changed.",
      },
    ],
    analyst_summary: summary,
    investment_context: `This article is linked to ${name}. Compare the story with the latest quoted price of ${priceText} and move of ${changeText}; the article alone does not prove the commodity-price move.`,
    key_uncertainty: "The available source text does not confirm whether supply, demand, weather, logistics, or policy changed because of this story.",
    what_happened: title,
    confirmed_facts: [
      `The story is linked to ${name}.`,
      `Kenya Fund Finder currently shows ${priceText} as the linked commodity price.`,
    ],
    inferred_implications: [
      "For commodity watchers, the useful check is whether the story affects supply, demand, trade flows, input costs, or local producer prices.",
    ],
    not_confirmed: [
      "No causal impact on the commodity price is confirmed from the available article text.",
    ],
    decision_drivers: [
      {
        driver: "Commodity price context",
        direction: "neutral",
        explanation: `The linked price is ${priceText}, but this story should not be treated as the cause of the move unless the source says so.`,
      },
      {
        driver: "Supply and demand",
        direction: "mixed",
        explanation: "If the story affects production, logistics, weather, exports, or input costs, it may be relevant to commodity pricing.",
      },
    ],
    related_markets: ["Commodities"],
    related_market_implications: [
      {
        market: "Commodities",
        implication: `Watch whether ${name} prices move further and whether source facts support a supply or demand change.`,
      },
    ],
    price_reaction_context: {
      latest_price: priceText,
      move: changeText,
      context: "This is current commodity data shown beside the story; it is not evidence that the article caused the move.",
    },
    watch_next: [
      "Official production or trade updates",
      "Follow-up price movement",
      "Supply, weather, logistics, or policy changes",
    ],
    source_quality: "Linked market data",
    confidence_label: "Grounded fallback",
  };
}

export function CommodityDecisionContext({ item, article, commodity, onEnrichmentComplete, onReadMore }: CommodityDecisionContextProps) {
  const analysis = item?.rawItem?.parsed_ai_analysis || article?.parsed_ai_analysis || generateCommodityFallback(item, article, commodity);
  
  if (!analysis) return null;

  return (
    <div className="mt-4 space-y-4 font-sans text-foreground">
      <div className="space-y-4">
        
        {(analysis.event_label || analysis.impact_horizon) && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/90">
              Market Impact & Key Facts
            </h3>
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {[analysis.event_label, analysis.impact_horizon].filter(Boolean).join(" · ")}
            </span>
          </div>
        )}

        <ConfidenceBadge analysis={analysis} />

        <AnalystNote analysis={analysis} />

        {(() => {
          const context = buildCommodityMarketContext(commodity || item?.relatedCommodity);
          return context ? <MarketContextSnapshot {...context} /> : null;
        })()}

        <DecisionDrivers drivers={analysis.decision_drivers} />

        <EvidenceGuardrail
          confirmed={analysis.confirmed_facts || (analysis.source_facts ? [analysis.source_facts] : undefined)}
          inferred={analysis.inferred_implications}
          notConfirmed={analysis.not_confirmed}
        />

        <RelatedMarketsStrip
          markets={analysis.related_markets}
          implications={analysis.related_market_implications}
        />

        <WatchNextChecklist
          items={analysis.watch_next}
          impactScore={analysis.impact_score}
          impactReason={analysis.impact_reason}
        />

        {/* Price Reaction Context */}
        {analysis.price_reaction_context && (
          <section className={`${(analysis.content || analysis.market_lens || analysis.why_it_matters || analysis.investor_takeaway) ? "border-b" : "border-y"} border-border py-4`}>
            <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/90 mb-3">
              Global Spot Price Context
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(analysis.price_reaction_context).map(([period, val]) => {
                if (period === 'context') return null;
                const isPositive = String(val).startsWith('+');
                const isNegative = String(val).startsWith('-');
                return (
                  <div key={period} className="flex flex-col rounded-md border border-border bg-muted/30 px-3 py-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{period}</span>
                    <span className={`text-sm font-bold tabular-nums ${isPositive ? 'text-emerald-500' : isNegative ? 'text-rose-500' : 'text-foreground'}`}>
                      {String(val)}
                    </span>
                  </div>
                );
              })}
            </div>
            {analysis.price_reaction_context.context && (
              <p className="text-[13px] leading-relaxed text-muted-foreground/90 italic border-l-2 border-muted-foreground/30 pl-3">
                {analysis.price_reaction_context.context}
              </p>
            )}
          </section>
        )}

        {/* Factors */}
        {(analysis.factors_positive?.length || analysis.factors_negative?.length) ? (
          <section className="grid gap-5 border-b border-border pb-4 md:grid-cols-2">
            {analysis.factors_positive && analysis.factors_positive.length > 0 && (
              <FactorList title="What could help" tone="positive" items={analysis.factors_positive} />
            )}
            {analysis.factors_negative && analysis.factors_negative.length > 0 && (
              <FactorList title="What to watch" tone="negative" items={analysis.factors_negative} />
            )}
          </section>
        ) : null}

        {/* Source facts */}
        {analysis.what_happened && (
          <section className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-foreground">Source facts</h3>
              {analysis.source_quality && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="h-3 w-3" />
                  {analysis.source_quality}
                </span>
              )}
            </div>
            <p className="mt-2 text-[15px] leading-relaxed text-foreground/90">
              {analysis.what_happened}
            </p>
            {analysis.verified_figures && analysis.verified_figures.length > 0 && (
              <ul className="mt-3 space-y-1">
                {analysis.verified_figures.map((figure: string, i: number) => (
                  <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-foreground/90">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/60" />
                    {figure}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Related Information / Disclosures */}
        <div className="border-t border-border pt-4">
          {analysis.related_disclosures && analysis.related_disclosures.length > 0 && (
            <div className="mb-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/90 mb-2">
                Related Disclosures
              </h3>
              {analysis.related_disclosures.map((disc: any, i: number) => (
                <a
                  key={i}
                  href={disc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-500 hover:underline transition-colors w-fit"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  {disc.title}
                </a>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm font-semibold">
            {onReadMore && (
              <button 
                type="button" 
                onClick={(e) => {
                  e.stopPropagation();
                  onReadMore();
                }}
                className="inline-flex items-center gap-1.5 text-emerald-500 hover:text-emerald-400 transition-colors"
              >
                Continue reading <span className="text-lg leading-none">&rarr;</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
