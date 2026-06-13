import { useMemo, useState } from "react";
import {
  buildRetentionBlock,
  NEUTRAL_DISCLAIMER_HTML,
  type SavedFundRow,
  type SavedStockRow,
  type PortfolioSummary,
} from "../../supabase/functions/_shared/weekly-email-sections";

/**
 * Dev-only preview for the weekly email retention block.
 * Gated by import.meta.env.DEV — renders a 404-ish message in production.
 * Uses only synthetic mock data so no private user data is exposed.
 */
const MOCK_FUNDS: SavedFundRow[] = [
  { name: "CIC Money Market Fund", latest_yield: 15.42, yield_unit: "%", yield_change: 0.12, last_updated: "2026-06-10" },
  { name: 'Sanlam <Test> & "Co." MMF', latest_yield: 14.88, yield_unit: "%", yield_change: -0.05, last_updated: "2026-06-11" },
];

const MOCK_STOCKS: SavedStockRow[] = [
  { name: "Safaricom PLC", symbol: "SCOM", price: 18.45, price_change: 0.25, last_updated: "2026-06-12" },
  { name: "Equity Group", symbol: "EQTY", price: 46.10, price_change: -0.4, last_updated: "2026-06-12" },
];

const MOCK_PORTFOLIO: PortfolioSummary = {
  totalValue: 1250000,
  weightedYield: 14.92,
  monthlyIncomeEstimate: 13218.75,
  allocation: [
    { label: "Unit Trusts", value: 800000, pct: 64 },
    { label: "NSE Stocks", value: 300000, pct: 24 },
    { label: "FX / Cash", value: 150000, pct: 12 },
  ],
};

const FORBIDDEN = ["best", "top", "recommended", "winner", "safest", "guaranteed", "should invest"];

const DevEmailPreviewPage = () => {
  const [includeFunds, setIncludeFunds] = useState(true);
  const [includeStocks, setIncludeStocks] = useState(true);
  const [includePortfolio, setIncludePortfolio] = useState(true);

  const html = useMemo(() => {
    return buildRetentionBlock({
      savedFunds: includeFunds ? MOCK_FUNDS : [],
      savedStocks: includeStocks ? MOCK_STOCKS : [],
      portfolio: includePortfolio ? MOCK_PORTFOLIO : null,
    });
  }, [includeFunds, includeStocks, includePortfolio]);

  const checks = useMemo(() => {
    const lower = html.toLowerCase();
    const offenders = FORBIDDEN.filter((w) => lower.includes(w));
    const escapingOk = !html.includes("<Test>") && html.includes("&lt;Test&gt;");
    return {
      hasFunds: includeFunds ? html.includes("Saved unit trusts") : !html.includes("Saved unit trusts"),
      hasStocks: includeStocks ? html.includes("Saved stocks") : !html.includes("Saved stocks"),
      hasPortfolio: includePortfolio ? html.includes("Portfolio summary") : !html.includes("Portfolio summary"),
      escapingOk: includeFunds ? escapingOk : true,
      offenders,
    };
  }, [html, includeFunds, includeStocks, includePortfolio]);

  if (!import.meta.env.DEV) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Email preview is available only in development.
      </div>
    );
  }

  const Row = ({ label, ok }: { label: string; ok: boolean }) => (
    <li className={ok ? "text-emerald-600" : "text-destructive"}>
      {ok ? "✓" : "✗"} {label}
    </li>
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-foreground">Weekly email preview (dev)</h1>
        <p className="text-xs text-muted-foreground">
          Synthetic data only — no real user is queried. Use this to verify rendering before relying on live sends.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={includeFunds} onChange={(e) => setIncludeFunds(e.target.checked)} />
          Saved funds
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={includeStocks} onChange={(e) => setIncludeStocks(e.target.checked)} />
          Saved stocks
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={includePortfolio} onChange={(e) => setIncludePortfolio(e.target.checked)} />
          Portfolio summary
        </label>
      </div>

      <div className="rounded-lg border border-border bg-card p-3 text-xs">
        <p className="font-semibold mb-1.5">Checks</p>
        <ul className="space-y-0.5">
          <Row label={`Saved funds section ${includeFunds ? "present" : "hidden"}`} ok={checks.hasFunds} />
          <Row label={`Saved stocks section ${includeStocks ? "present" : "hidden"}`} ok={checks.hasStocks} />
          <Row label={`Portfolio summary ${includePortfolio ? "present" : "hidden"}`} ok={checks.hasPortfolio} />
          <Row label="HTML escaping (<, >, &, quotes) works" ok={checks.escapingOk} />
          <Row
            label={checks.offenders.length === 0 ? "No risky recommendation wording" : `Risky words: ${checks.offenders.join(", ")}`}
            ok={checks.offenders.length === 0}
          />
        </ul>
      </div>

      <div className="rounded-lg border border-border bg-white p-4">
        <div dangerouslySetInnerHTML={{ __html: html || '<p style="color:#94a3b8;font-size:12px;">All sections hidden — empty block renders nothing.</p>' }} />
        {html && <div dangerouslySetInnerHTML={{ __html: NEUTRAL_DISCLAIMER_HTML }} />}
      </div>
    </div>
  );
};

export default DevEmailPreviewPage;
