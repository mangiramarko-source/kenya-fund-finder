import { useMemo } from "react";
import { Link } from "react-router-dom";
import { usePortfolio, getCurrentValue, ASSET_TYPE_LABELS } from "@/hooks/usePortfolio";
import { usePortfolioMetrics } from "@/hooks/usePortfolioMetrics";
import { usePortfolioChanges } from "@/hooks/usePortfolioChanges";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { useFundWatchlist } from "@/hooks/useFundWatchlist";
import { useAssetWatchlist } from "@/hooks/useAssetWatchlist";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { buildWeeklyBuckets } from "@/lib/portfolioWeeklyBuckets";
import { getHoldingAlertState } from "@/lib/portfolioAlertBadge";
import LiquidityBreakdown from "@/components/portfolio/LiquidityBreakdown";
import { usePortfolioEvents } from "@/hooks/usePortfolioEvents";
import { format } from "date-fns";

const fmtKES = (val: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

const PortfolioSummaryPage = () => {
  useDocumentTitle("Portfolio Summary | KenyaFundFinder");
  const { items, totalValue, totalPnL, totalPnLPercent, allocation } = usePortfolio();
  const metrics = usePortfolioMetrics(items);
  const { changes } = usePortfolioChanges(items);
  const { alerts } = usePriceAlerts();
  const { entries: savedFunds } = useFundWatchlist();
  const { entries: savedStocks } = useAssetWatchlist("stock");
  const { events: activityEvents } = usePortfolioEvents(30);

  const recentActivity = useMemo(() => {
    const added = activityEvents.filter((e) => e.event_type === "add").slice(0, 5);
    const updated = activityEvents.filter((e) => e.event_type === "update").slice(0, 5);
    const removed = activityEvents.filter((e) => e.event_type === "remove").slice(0, 5);
    return { added, updated, removed, total: activityEvents.length };
  }, [activityEvents]);


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
  const hasWatchlist = savedFunds.length > 0 || savedStocks.length > 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 print:py-2 print:max-w-none">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/portfolio"><ArrowLeft className="h-4 w-4" /> Back to portfolio</Link>
        </Button>
        <Button onClick={() => window.print()} size="sm" className="gap-1.5">
          <Printer className="h-4 w-4" /> Print or save as PDF
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 md:p-8 print:border-0 print:p-0 print:bg-white">
        <header className="border-b border-border pb-4 mb-6">
          <h1 className="text-2xl font-bold text-foreground">Portfolio summary</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Generated {new Date().toLocaleString("en-KE")} · KenyaFundFinder
          </p>
        </header>

        {isEmpty ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Add holdings to view portfolio summary.
          </p>
        ) : (
          <>
            {/* Overview */}
            <section className="mb-6 print:break-inside-avoid">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <KV label="Total value" value={fmtKES(totalValue)} />
                <KV
                  label="Overall P/L"
                  value={`${totalPnL >= 0 ? "+" : ""}${totalPnLPercent.toFixed(2)}%`}
                  sub={fmtKES(totalPnL)}
                />
                <KV
                  label="Weighted avg yield"
                  value={metrics.weightedAvgYield != null ? `${metrics.weightedAvgYield.toFixed(2)}%` : "Not available yet"}
                />
                <KV
                  label="Estimated monthly income"
                  value={metrics.hasFunds ? fmtKES(metrics.monthlyIncome) : "Not available yet"}
                />
              </div>
            </section>

            {/* Allocation */}
            {allocationRows.length > 0 && (
              <section className="mb-6 print:break-inside-avoid">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Asset allocation</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2">Class</th>
                      <th className="py-2 text-right">Value</th>
                      <th className="py-2 text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocationRows.map((r) => (
                      <tr key={r.type} className="border-b border-border/40">
                        <td className="py-2">{r.label}</td>
                        <td className="py-2 text-right tabular-nums">{fmtKES(r.value)}</td>
                        <td className="py-2 text-right tabular-nums">{r.pct.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/* Liquidity */}
            {items.some((i) => i.asset_type === "mmf") && (
              <section className="mb-6 print:break-inside-avoid">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Liquidity breakdown</h2>
                <LiquidityBreakdown items={items} />
              </section>
            )}

            {/* What changed */}
            {!buckets.isEmpty && (
              <section className="mb-6 print:break-inside-avoid">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">What changed recently</h2>
                <ul className="text-sm space-y-1.5">
                  {buckets.largestYieldIncrease && (
                    <ChangeLine label="Largest yield increase" name={buckets.largestYieldIncrease.assetName} delta={buckets.largestYieldIncrease.delta!} unit="%" />
                  )}
                  {buckets.largestYieldDecrease && (
                    <ChangeLine label="Largest yield decrease" name={buckets.largestYieldDecrease.assetName} delta={buckets.largestYieldDecrease.delta!} unit="%" />
                  )}
                  {buckets.largestPriceIncrease && (
                    <ChangeLine label="Largest price increase" name={buckets.largestPriceIncrease.assetName} delta={buckets.largestPriceIncrease.delta!} unit="KES" />
                  )}
                  {buckets.largestPriceDecrease && (
                    <ChangeLine label="Largest price decrease" name={buckets.largestPriceDecrease.assetName} delta={buckets.largestPriceDecrease.delta!} unit="KES" />
                  )}
                </ul>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {buckets.withData.length} holding{buckets.withData.length === 1 ? "" : "s"} with new snapshot data
                  {buckets.missingData.length > 0 && ` · ${buckets.missingData.length} with no recent data`}
                </p>
              </section>
            )}

            {/* Holdings */}
            <section className="mb-6 print:break-before-auto">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Holdings</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2">Asset</th>
                    <th className="py-2">Class</th>
                    <th className="py-2 text-right">Value</th>
                    <th className="py-2 text-right">Alert</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => {
                    const state = getHoldingAlertState(
                      { asset_type: i.asset_type, asset_id: i.asset_id, asset_name: i.asset_name, ticker: i.ticker },
                      alerts,
                    );
                    const stateLabel = state === "triggered" ? "Triggered" : state === "active" ? "Active" : "—";
                    return (
                      <tr key={i.id} className="border-b border-border/40">
                        <td className="py-2">{i.asset_name}</td>
                        <td className="py-2 text-xs text-muted-foreground">{ASSET_TYPE_LABELS[i.asset_type]}</td>
                        <td className="py-2 text-right tabular-nums">{fmtKES(getCurrentValue(i))}</td>
                        <td className="py-2 text-right text-xs">{stateLabel}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            {/* Activity summary */}
            {recentActivity.total > 0 && (
              <section className="mb-6 print:break-inside-avoid">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Activity summary</h2>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <ActivityBlock title={`Recent added (${recentActivity.added.length})`} events={recentActivity.added} />
                  <ActivityBlock title={`Recent updated (${recentActivity.updated.length})`} events={recentActivity.updated} />
                  <ActivityBlock title={`Recent removed (${recentActivity.removed.length})`} events={recentActivity.removed} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Portfolio activity is based on changes you make to your holdings.
                </p>
              </section>
            )}

            {hasWatchlist && (
              <section className="mb-6 print:break-inside-avoid">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Watchlist</h2>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  {savedFunds.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Saved funds ({savedFunds.length})</p>
                      <ul className="list-disc list-inside text-foreground space-y-0.5">
                        {savedFunds.map((f) => <li key={f.id}>{f.item_name}</li>)}
                      </ul>
                    </div>
                  )}
                  {savedStocks.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Saved stocks ({savedStocks.length})</p>
                      <ul className="list-disc list-inside text-foreground space-y-0.5">
                        {savedStocks.map((s) => <li key={s.id}>{s.item_name}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}

        <footer className="border-t border-border pt-4 mt-6 text-[11px] text-muted-foreground leading-relaxed">
          This portfolio summary is based on user-entered holdings and available market/fund data.
          It is general information only and is not personal financial advice. Estimates assume 15% withholding
          tax on yield-bearing fund holdings; actual returns may differ. Yields, prices and fund terms change
          over time — verify with your fund manager before acting on this data.
        </footer>
      </div>

      <style>{`
        @media print {
          @page { margin: 16mm 14mm; }
          body { background: white !important; color: #0f172a !important; }
          nav, header[role="banner"], footer[role="contentinfo"], aside, .print\\:hidden { display: none !important; }
          a { color: inherit !important; text-decoration: none !important; }
          section { page-break-inside: avoid; }
          h2 { page-break-after: avoid; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
      `}</style>
    </div>
  );
};

const KV = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div>
    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
    <p className="text-lg font-bold tabular-nums text-foreground">{value}</p>
    {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
  </div>
);

const ChangeLine = ({
  label, name, delta, unit,
}: { label: string; name: string; delta: number; unit: "%" | "KES" }) => {
  const sign = delta > 0 ? "+" : "";
  const display = unit === "%"
    ? `${sign}${delta.toFixed(2)}%`
    : `${sign}${fmtKES(delta)}`;
  return (
    <li className="flex items-center justify-between gap-3">
      <span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-2">{label}</span>
        <span className="font-medium">{name}</span>
      </span>
      <span className={`tabular-nums font-semibold ${delta >= 0 ? "text-accent" : "text-destructive"}`}>
        {display}
      </span>
    </li>
  );
};

export default PortfolioSummaryPage;
