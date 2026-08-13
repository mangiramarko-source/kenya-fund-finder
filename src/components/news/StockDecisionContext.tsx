import { Link } from "react-router-dom";
import { ExternalLink, TrendingDown, TrendingUp, Sparkles } from "lucide-react";
import { type NewsFromDB, type PublicStock } from "@/lib/api";

interface StockDecisionContextProps {
  article: NewsFromDB;
  stock: PublicStock;
  inlineTransparent?: boolean;
  onReadMore?: () => void;
}

export function StockDecisionContext({ article, stock, inlineTransparent, onReadMore }: StockDecisionContextProps) {
  // Use real analysis if provided, otherwise fallback to the demo analysis for the screenshot
  const analysis = article.parsed_ai_analysis || {
    event_label: "Product pricing",
    impact_horizon: "Short-term relevance",
    factors_positive: [
      "The pricing change may improve revenue earned per data customer.",
      "Time-based availability may help manage peak network demand."
    ],
    factors_negative: [
      "Price-sensitive customers could reduce usage or switch bundles.",
      "Customer dissatisfaction may create short-term brand pressure."
    ],
    what_happened: "Safaricom PLC changed a KSh 20 data bundle. This is classified as a pricing change based on the linked publisher article.",
    verified_figures: []
  };

  const performance = [
    { label: "1D", value: 1.19 },
    { label: "7D", value: 4.20 },
    { label: "1M", value: 8.60 },
    { label: "3M", value: 14.30 },
  ];

  return (
    <div className="mt-4 space-y-4 font-sans text-foreground">
      <div className="space-y-4">
        
        {/* Header Title & Tags */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/90">
            Market Impact & Key Facts
          </h3>
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {[analysis.event_label, analysis.impact_horizon].filter(Boolean).join(" · ")}
          </span>
        </div>

        {/* Factors (Bullish/Bearish) */}
        {(analysis.factors_positive?.length || analysis.factors_negative?.length) ? (
          <section className="grid gap-5 border-y border-border py-4 md:grid-cols-2">
            {analysis.factors_positive && analysis.factors_positive.length > 0 && (
              <FactorList title="What could help" tone="positive" items={analysis.factors_positive} />
            )}
            {analysis.factors_negative && analysis.factors_negative.length > 0 && (
              <FactorList title="What to watch" tone="negative" items={analysis.factors_negative} />
            )}
          </section>
        ) : null}

        {/* Price Context */}
        <section>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-foreground">Price context</h3>
            <span className="text-[10px] uppercase tracking-[0.14em] text-foreground/60">Demo data</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            {/* The screenshot only has the 1D, 7D, 1M, 3M metrics, not the current price line */}
            {performance.map((period) => (
              <Performance key={period.label} label={period.label} value={period.value} />
            ))}
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-foreground/90 line-clamp-1">
            The price increased during the same period, but the available data does not prove this story caused the movement.
          </p>
        </section>

        {/* Source facts / What happened */}
        {analysis.what_happened && (
          <section className="border-t border-border pt-4">
            <h3 className="text-sm font-bold text-foreground">Source facts</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-foreground/90 line-clamp-1">
              {/* If it's the demo data, we inject the strong tags to match screenshot exactly */}
              {article.parsed_ai_analysis ? analysis.what_happened : (
                <>
                  <strong className="font-bold text-foreground">Safaricom PLC</strong> changed a <strong className="font-bold text-foreground">KSh 20</strong> data bundle. This is classified as a <strong className="font-bold text-foreground">pricing change</strong> based on the linked publisher article.
                </>
              )}
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

            {article.url && /^https?:\/\//i.test(article.url) ? (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-emerald-500 hover:text-emerald-400 hover:underline transition-colors"
              >
                <span>From {article.source || "Source"}</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : article.source ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-500">
                <span>From {article.source}</span>
              </span>
            ) : null}

            <Link 
              to={`/stocks/${stock.symbol}`} 
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 font-normal text-foreground/80 hover:text-foreground transition-colors"
            >
              Open {stock.symbol} report <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

function FactorList({ title, items, tone }: { title: string; items: string[]; tone: "positive" | "negative" }) { 
  const positive = tone === "positive"; 
  return (
    <div>
      <h3 className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] ${positive ? "text-emerald-500" : "text-rose-500"}`}>
        {positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        {title}
      </h3>
      <ul className="mt-2 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-foreground/90">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${positive ? "bg-emerald-500" : "bg-rose-500"}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  ); 
}

function Performance({ label, value }: { label: string; value: number | null }) { 
  if (value === null) {
    return (
      <div className="flex items-baseline gap-1.5">
        <span className="text-xs font-semibold text-foreground/70">{label}</span>
        <span className="text-sm font-bold tabular-nums text-foreground/70">—</span>
      </div>
    );
  }
  
  const isPositive = value >= 0;
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-xs font-semibold text-foreground/70">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
        {isPositive ? '+' : ''}{value.toFixed(2)}%
      </span>
    </div>
  ); 
}
