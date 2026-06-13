import { useMemo } from "react";
import { Link } from "react-router-dom";
import { usePortfolio, getCurrentValue, ASSET_TYPE_LABELS } from "@/hooks/usePortfolio";
import { usePortfolioMetrics } from "@/hooks/usePortfolioMetrics";
import { useFundWatchlist } from "@/hooks/useFundWatchlist";
import { useAssetWatchlist } from "@/hooks/useAssetWatchlist";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";

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
  const { entries: savedFunds } = useFundWatchlist();
  const { entries: savedStocks } = useAssetWatchlist("stock");

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 print:py-4">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/portfolio"><ArrowLeft className="h-4 w-4" /> Back to portfolio</Link>
        </Button>
        <Button onClick={() => window.print()} size="sm" className="gap-1.5">
          <Printer className="h-4 w-4" /> Download as PDF
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 md:p-8 print:border-0 print:p-0">
        <header className="border-b border-border pb-4 mb-6">
          <h1 className="text-2xl font-bold text-foreground">Portfolio summary</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Generated {new Date().toLocaleString("en-KE")} · KenyaFundFinder
          </p>
        </header>

        {/* KPIs */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KV label="Total value" value={fmtKES(totalValue)} />
            <KV label="Overall P/L" value={`${totalPnL >= 0 ? "+" : ""}${totalPnLPercent.toFixed(2)}%`} sub={fmtKES(totalPnL)} />
            <KV
              label="Weighted avg yield"
              value={metrics.weightedAvgYield != null ? `${metrics.weightedAvgYield.toFixed(2)}%` : "—"}
            />
            <KV label="Estimated monthly income" value={fmtKES(metrics.monthlyIncome)} />
          </div>
        </section>

        {/* Allocation */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Asset allocation</h2>
          {allocationRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No holdings yet.</p>
          ) : (
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
          )}
        </section>

        {/* Holdings */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Holdings</h2>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No holdings yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2">Asset</th>
                  <th className="py-2">Class</th>
                  <th className="py-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-b border-border/40">
                    <td className="py-2">{i.asset_name}</td>
                    <td className="py-2 text-xs text-muted-foreground">{ASSET_TYPE_LABELS[i.asset_type]}</td>
                    <td className="py-2 text-right tabular-nums">{fmtKES(getCurrentValue(i))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Watchlist */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Watchlist</h2>
          {savedFunds.length === 0 && savedStocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved items.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Saved funds ({savedFunds.length})</p>
                <ul className="list-disc list-inside text-foreground space-y-0.5">
                  {savedFunds.map((f) => <li key={f.id}>{f.item_name}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Saved stocks ({savedStocks.length})</p>
                <ul className="list-disc list-inside text-foreground space-y-0.5">
                  {savedStocks.map((s) => <li key={s.id}>{s.item_name}</li>)}
                </ul>
              </div>
            </div>
          )}
        </section>

        <footer className="border-t border-border pt-4 mt-6 text-[11px] text-muted-foreground leading-relaxed">
          Data only. Not personal financial advice. Estimates assume 15% withholding tax on yield-bearing
          fund holdings; actual returns may differ. Yields, prices and fund terms change over time.
          Verify with your fund manager before acting on this data.
        </footer>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          nav, header[role="banner"], footer[role="contentinfo"], aside, .print\\:hidden { display: none !important; }
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

export default PortfolioSummaryPage;
