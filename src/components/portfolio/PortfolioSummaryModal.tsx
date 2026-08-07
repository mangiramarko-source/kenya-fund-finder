import { useMemo } from "react";
import { usePortfolio, ASSET_TYPE_LABELS } from "@/hooks/usePortfolio";
import { usePortfolioMetrics } from "@/hooks/usePortfolioMetrics";
import { usePortfolioChanges } from "@/hooks/usePortfolioChanges";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildWeeklyBuckets } from "@/lib/portfolioWeeklyBuckets";
import LiquidityBreakdown from "@/components/portfolio/LiquidityBreakdown";
import { TrendingUp, TrendingDown, FileText } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency?: "KES" | "USD";
}

const fmtCurrency = (val: number, curr: "KES" | "USD" = "KES") => {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: curr,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

const KV = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div className="bg-muted/40 p-3 rounded-xl border border-border/50">
    <div className="text-[11px] text-muted-foreground font-medium">{label}</div>
    <div className="text-base font-bold text-foreground mt-0.5">{value}</div>
    {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
  </div>
);

const ChangeLine = ({
  label,
  name,
  delta,
  unit,
}: {
  label: string;
  name: string;
  delta: number;
  unit: string;
}) => {
  const isPos = delta > 0;
  return (
    <li className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground flex items-center gap-1">
        {name}{" "}
        <span className={`inline-flex items-center text-[11px] font-semibold ${isPos ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
          {isPos ? <TrendingUp className="h-3 w-3 inline" /> : <TrendingDown className="h-3 w-3 inline" />}
          {isPos ? "+" : ""}{delta.toFixed(2)}{unit}
        </span>
      </span>
    </li>
  );
};

export default function PortfolioSummaryModal({ open, onOpenChange, currency = "KES" }: Props) {
  const { items, totalValue, totalPnL, totalPnLPercent, allocation } = usePortfolio();
  const metrics = usePortfolioMetrics(items);
  const { changes } = usePortfolioChanges(items);

  const allocationRows = useMemo(() => {
    const total = Object.values(allocation).reduce((a, b) => a + b, 0);
    return Object.entries(allocation)
      .filter(([, v]) => v > 0)
      .map(([type, value]) => ({
        type,
        label: ASSET_TYPE_LABELS[type as keyof typeof ASSET_TYPE_LABELS] || type,
        value,
        pct: total > 0 ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [allocation]);

  const buckets = useMemo(() => buildWeeklyBuckets(changes), [changes]);
  const isEmpty = items.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto rounded-2xl p-5 bg-card text-card-foreground border border-border dark:bg-neutral-900 dark:border-white/10">
        <DialogHeader className="pb-3 border-b border-border dark:border-white/10">
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Portfolio Summary Report
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Generated {new Date().toLocaleDateString("en-KE")} · KenyaFundFinder
          </p>
        </DialogHeader>

        {isEmpty ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No holdings added yet. Add investments to generate a report.
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* Overview Grid */}
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                Overview
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                <KV label="Total Portfolio Value" value={fmtCurrency(totalValue, currency)} />
                <KV
                  label="Overall P/L"
                  value={`${totalPnL >= 0 ? "+" : ""}${totalPnLPercent.toFixed(2)}%`}
                  sub={fmtCurrency(totalPnL, currency)}
                />
                <KV
                  label="Weighted Avg Yield"
                  value={metrics.weightedAvgYield != null ? `${metrics.weightedAvgYield.toFixed(2)}%` : "N/A"}
                />
                <KV
                  label="Est. Monthly Income"
                  value={metrics.hasFunds ? fmtCurrency(metrics.monthlyIncome, currency) : "N/A"}
                />
              </div>
            </section>

            {/* Allocation Table */}
            {allocationRows.length > 0 && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                  Asset Allocation
                </h3>
                <div className="bg-muted/30 rounded-xl border border-border/50 p-3 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/60 text-left text-[11px] text-muted-foreground">
                        <th className="pb-1.5 font-medium">Class</th>
                        <th className="pb-1.5 text-right font-medium">Value</th>
                        <th className="pb-1.5 text-right font-medium">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {allocationRows.map((r) => (
                        <tr key={r.type}>
                          <td className="py-2 font-medium text-foreground">{r.label}</td>
                          <td className="py-2 text-right tabular-nums">{fmtCurrency(r.value, currency)}</td>
                          <td className="py-2 text-right tabular-nums font-semibold">{r.pct.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Liquidity Breakdown */}
            {items.some((i) => i.asset_type === "mmf") && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                  Liquidity Breakdown
                </h3>
                <LiquidityBreakdown items={items} />
              </section>
            )}

            {/* Recent Changes */}
            {!buckets.isEmpty && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                  Recent Movements
                </h3>
                <ul className="bg-muted/30 p-3 rounded-xl border border-border/50 space-y-1">
                  {buckets.largestYieldIncrease && (
                    <ChangeLine
                      label="Largest yield gain"
                      name={buckets.largestYieldIncrease.assetName}
                      delta={buckets.largestYieldIncrease.delta!}
                      unit="%"
                    />
                  )}
                  {buckets.largestYieldDecrease && (
                    <ChangeLine
                      label="Largest yield dip"
                      name={buckets.largestYieldDecrease.assetName}
                      delta={buckets.largestYieldDecrease.delta!}
                      unit="%"
                    />
                  )}
                  {buckets.largestStockGain && (
                    <ChangeLine
                      label="Top stock performer"
                      name={buckets.largestStockGain.assetName}
                      delta={buckets.largestStockGain.delta!}
                      unit="%"
                    />
                  )}
                  {buckets.largestStockLoss && (
                    <ChangeLine
                      label="Weakest stock"
                      name={buckets.largestStockLoss.assetName}
                      delta={buckets.largestStockLoss.delta!}
                      unit="%"
                    />
                  )}
                </ul>
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
