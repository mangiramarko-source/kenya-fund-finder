import { Activity, TrendingDown, TrendingUp } from "lucide-react";
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
      <div className="rounded-xl border border-border bg-card/60 p-3 text-xs text-muted-foreground">
        Loading live market context…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
        Live market context unavailable. Scenarios will still run on explicit numbers.
      </div>
    );
  }

  const up = (data.sampleStockChangePct ?? 0) >= 0;
  const StockIcon = up ? TrendingUp : TrendingDown;
  const stockColor = up ? "text-emerald-500" : "text-rose-500";

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 mb-2 text-muted-foreground">
        <Activity className="h-3 w-3" />
        <span className="text-[10px] uppercase tracking-widest font-semibold">
          Live market context
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div>
          <div className="text-muted-foreground">Avg MMF yield</div>
          <div className="font-semibold text-sm tabular-nums">
            {fmtPct(data.avgAnnualYieldPct)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Top MMF yield</div>
          <div className="font-semibold text-sm tabular-nums">
            {fmtPct(data.topAnnualYieldPct)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Lowest MMF</div>
          <div className="font-semibold text-sm tabular-nums">
            {fmtPct(data.lowAnnualYieldPct)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Top NSE mover</div>
          <div className={`font-semibold text-sm tabular-nums flex items-center gap-1 ${stockColor}`}>
            <StockIcon className="h-3 w-3" />
            {data.sampleStockSymbol ?? "—"}{" "}
            {data.sampleStockChangePct != null && (
              <span className="text-[11px]">
                ({data.sampleStockChangePct >= 0 ? "+" : ""}
                {data.sampleStockChangePct.toFixed(2)}%)
              </span>
            )}
          </div>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        Data only. Yields/prices change frequently. Not personal financial advice.
      </p>
    </div>
  );
};

export default MarketContextCard;
