import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import { AI_LAB_LABEL, AI_LAB_METRIC, AI_LAB_RAIL_CARD } from "@/components/ai-lab/aiLabTheme";
import type { MarketContext } from "@/lib/aiLab/marketContext";

interface Props {
  data: MarketContext | null;
  loading: boolean;
  error: string | null;
}

const fmtPct = (n: number | null) => (n == null ? "—" : `${n.toFixed(2)}%`);

const MarketContextCard = ({ data, loading, error }: Props) => {
  if (loading) {
    return (
      <div className={`${AI_LAB_RAIL_CARD} text-xs text-stone-600`}>
        Loading live market context…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className={`${AI_LAB_RAIL_CARD} text-xs text-stone-600 border-amber-400/40`}>
        Live market context unavailable. Scenarios will still run on explicit numbers.
      </div>
    );
  }

  const up = (data.sampleStockChangePct ?? 0) >= 0;
  const StockIcon = up ? TrendingUp : TrendingDown;
  const stockColor = up ? "text-emerald-600" : "text-rose-600";

  return (
    <div className={AI_LAB_RAIL_CARD}>
      <div className="flex items-center gap-1.5 mb-3 text-stone-500">
        <Activity className="h-3 w-3" />
        <span className={AI_LAB_LABEL}>Live market context</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-stone-500">Avg MMF yield</div>
          <div className={`font-semibold text-sm ${AI_LAB_METRIC}`}>
            {fmtPct(data.avgAnnualYieldPct)}
          </div>
        </div>
        <div>
          <div className="text-stone-500">Highest shown yield</div>
          <div className={`font-semibold text-sm ${AI_LAB_METRIC}`}>
            {fmtPct(data.topAnnualYieldPct)}
          </div>
        </div>
        <div>
          <div className="text-stone-500">Yield range low</div>
          <div className={`font-semibold text-sm ${AI_LAB_METRIC}`}>
            {fmtPct(data.lowAnnualYieldPct)}
          </div>
        </div>
        <div>
          <div className="text-stone-500">Sample stock move</div>
          <div className={`font-semibold text-sm ${AI_LAB_METRIC} flex items-center gap-1 ${stockColor}`}>
            <StockIcon className="h-3 w-3" />
            {data.sampleStockSymbol ?? "—"}
            {data.sampleStockChangePct != null && (
              <span className="text-[11px]">
                ({data.sampleStockChangePct >= 0 ? "+" : ""}
                {data.sampleStockChangePct.toFixed(2)}%)
              </span>
            )}
          </div>
        </div>
      </div>
      <p className="text-[10px] text-stone-500 mt-3">
        Data only. Yields/prices change frequently. Not personal financial advice.
      </p>
    </div>
  );
};

export default MarketContextCard;
