import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, TrendingDown, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { type NewsFromDB, type PublicStock, enrichArticleLive } from "@/lib/api";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { calculateDemoReturn } from "@/lib/stockDetailDemo";

interface StockDecisionContextProps {
  article: NewsFromDB;
  stock: PublicStock;
  onEnrichmentComplete?: (updatedArticle: NewsFromDB) => void;
}

export function StockDecisionContext({ article, stock, onEnrichmentComplete }: StockDecisionContextProps) {
  const [loading, setLoading] = useState(false);
  const { history } = usePriceHistory(stock.id, 365); // fetch 1 year of history for context

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const insightStr = await enrichArticleLive(article.id);
      if (insightStr && onEnrichmentComplete) {
        const parsed = JSON.parse(insightStr);
        onEnrichmentComplete({
          ...article,
          ai_insight: insightStr,
          parsed_ai_analysis: parsed,
        });
      }
    } catch (error) {
      console.error("Failed to generate insights", error);
    } finally {
      setLoading(false);
    }
  };

  const analysis = article.parsed_ai_analysis;

  if (!analysis) {
    return (
      <div className="my-6 rounded-xl border border-border bg-card p-6 text-center">
        <Sparkles className="mx-auto mb-3 h-8 w-8 text-emerald-500" />
        <h3 className="text-sm font-bold">AI Decision Support</h3>
        <p className="mt-2 text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
          Generate an AI-powered breakdown of this article to see how it might impact {stock.symbol}.
        </p>
        <button 
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</>
          ) : (
            "Generate Insights"
          )}
        </button>
      </div>
    );
  }

  // Calculate actual performance from history
  const performance = [
    { label: "1D", days: 1 },
    { label: "7D", days: 7 },
    { label: "1M", days: 30 },
    { label: "3M", days: 90 },
  ].map((period) => ({
    label: period.label,
    value: calculateDemoReturn(history, stock.price, period.days),
  }));

  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="bg-muted/30 px-5 py-3 border-b border-border flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-emerald-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">AI Analysis</h3>
      </div>
      
      <div className="p-5">
        {analysis.tags && analysis.tags.length > 0 && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-5">
            {analysis.tags.join(" · ")}
          </p>
        )}

        <section className="grid gap-6 border-b border-border pb-5 md:grid-cols-2">
          {analysis.factors_positive && analysis.factors_positive.length > 0 && (
            <FactorList title="What could help" tone="positive" items={analysis.factors_positive} />
          )}
          {analysis.factors_negative && analysis.factors_negative.length > 0 && (
            <FactorList title="What to watch" tone="negative" items={analysis.factors_negative} />
          )}
        </section>

        <section className="py-5 border-b border-border">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold">Price context</h3>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            {performance.map((period) => (
              <Performance key={period.label} label={period.label} value={period.value} />
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {analysis.source_facts || "The price changed during the same period, but the available data does not prove this story caused the movement."}
          </p>
        </section>

        <div className="pt-5">
          <Link to={`/stocks/${stock.symbol}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-500 hover:text-emerald-600">
            Open {stock.symbol} report <ExternalLink className="h-4 w-4" />
          </Link>
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
          <li key={i} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${positive ? "bg-emerald-500" : "bg-rose-500"}`} />
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
        <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
        <span className="text-xs font-bold tabular-nums text-muted-foreground">—</span>
      </div>
    );
  }
  
  const isPositive = value >= 0;
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
      <span className={`text-xs font-bold tabular-nums ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
        {isPositive ? '+' : ''}{value.toFixed(2)}%
      </span>
    </div>
  ); 
}
