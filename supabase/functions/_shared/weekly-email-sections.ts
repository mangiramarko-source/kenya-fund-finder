/**
 * Pure HTML builders for the weekly market update email.
 *
 * Kept dependency-free so it can be imported by both the Deno Edge Function
 * and Vitest tests (via relative import). No Deno-specific APIs here.
 */

export interface SavedFundRow {
  name: string;
  latest_yield: number;
  yield_unit: string; // "%" | "KES" | etc.
  /** Optional change in yield vs previous snapshot. */
  yield_change: number | null;
  last_updated: string | null; // ISO date
}

export interface SavedStockRow {
  name: string;
  symbol: string;
  price: number;
  /** Optional price change (KES). */
  price_change: number | null;
  last_updated: string | null;
}

export interface PortfolioSummary {
  totalValue: number; // KES
  weightedYield: number | null; // %
  monthlyIncomeEstimate: number | null; // KES
  allocation: Array<{ label: string; value: number; pct: number }>;
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;"
  );

const fmtDate = (iso: string | null): string => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch { return "—"; }
};

const fmtChange = (val: number | null, suffix = ""): string => {
  if (val == null || Number.isNaN(val)) return "";
  const isUp = val >= 0;
  const color = isUp ? "#16a34a" : "#dc2626";
  const bg = isUp ? "#f0fdf4" : "#fef2f2";
  return `<span style="display:inline-block;font-size:11px;font-weight:600;color:${color};background:${bg};padding:2px 6px;border-radius:4px;margin-left:6px;">${isUp ? "▲" : "▼"} ${Math.abs(val).toFixed(2)}${suffix}</span>`;
};

const fmtKES = (n: number): string =>
  `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Saved funds section. Returns empty string if no rows. */
export function buildSavedFundsSection(rows: SavedFundRow[]): string {
  if (!rows || rows.length === 0) return "";
  const body = rows.map((r) => {
    const unit = r.yield_unit === "%" ? "%" : "";
    return `<tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;">
        <div style="font-size:14px;font-weight:600;color:#0f172a;line-height:1.3;">${escapeHtml(r.name)}</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Last updated ${escapeHtml(fmtDate(r.last_updated))}</div>
      </td>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:right;vertical-align:middle;">
        <div style="font-size:15px;font-weight:700;color:#0f172a;">${r.latest_yield.toFixed(2)}${unit}</div>
        ${fmtChange(r.yield_change, unit)}
      </td>
    </tr>`;
  }).join("");
  return `<div style="margin-bottom:12px;">
    <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;padding:0 0 6px;">⭐ Saved unit trusts</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">${body}</table>
  </div>`;
}

/** Saved stocks section. Returns empty string if no rows. */
export function buildSavedStocksSection(rows: SavedStockRow[]): string {
  if (!rows || rows.length === 0) return "";
  const body = rows.map((r) => `<tr>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;">
        <div style="font-size:14px;font-weight:600;color:#0f172a;line-height:1.3;">${escapeHtml(r.name)} <span style="color:#94a3b8;font-weight:400;">(${escapeHtml(r.symbol)})</span></div>
        <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Last updated ${escapeHtml(fmtDate(r.last_updated))}</div>
      </td>
      <td style="padding:10px 16px;border-bottom:1px solid #f1f5f9;text-align:right;vertical-align:middle;">
        <div style="font-size:15px;font-weight:700;color:#0f172a;">${fmtKES(r.price)}</div>
        ${fmtChange(r.price_change, "")}
      </td>
    </tr>`).join("");
  return `<div style="margin-bottom:12px;">
    <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;padding:0 0 6px;">⭐ Saved stocks</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">${body}</table>
  </div>`;
}

/** Portfolio summary section. Returns empty string if no holdings. */
export function buildPortfolioSummarySection(summary: PortfolioSummary | null): string {
  if (!summary || summary.totalValue <= 0) return "";
  const alloc = summary.allocation
    .filter((a) => a.pct > 0)
    .map((a) => `<tr>
      <td style="padding:6px 16px;font-size:12px;color:#475569;">${escapeHtml(a.label)}</td>
      <td style="padding:6px 16px;font-size:12px;color:#0f172a;font-weight:600;text-align:right;tabular-nums">${a.pct.toFixed(1)}%</td>
    </tr>`).join("");

  const weighted = summary.weightedYield != null
    ? `${summary.weightedYield.toFixed(2)}%`
    : "Not available yet";
  const monthly = summary.monthlyIncomeEstimate != null
    ? fmtKES(summary.monthlyIncomeEstimate)
    : "Not available yet";

  return `<div style="margin-bottom:12px;">
    <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;padding:0 0 6px;">💼 Portfolio summary</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:10px 16px;font-size:12px;color:#64748b;">Total portfolio value</td>
        <td style="padding:10px 16px;font-size:14px;color:#0f172a;font-weight:700;text-align:right;">${fmtKES(summary.totalValue)}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:12px;color:#64748b;border-top:1px solid #f1f5f9;">Weighted average yield</td>
        <td style="padding:10px 16px;font-size:14px;color:#0f172a;font-weight:600;text-align:right;border-top:1px solid #f1f5f9;">${weighted}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:12px;color:#64748b;border-top:1px solid #f1f5f9;">Estimated monthly income (after 15% withholding)</td>
        <td style="padding:10px 16px;font-size:14px;color:#0f172a;font-weight:600;text-align:right;border-top:1px solid #f1f5f9;">${monthly}</td>
      </tr>
      ${alloc ? `<tr><td colspan="2" style="padding:8px 0 0;border-top:1px solid #f1f5f9;"><table width="100%" cellpadding="0" cellspacing="0">${alloc}</table></td></tr>` : ""}
    </table>
  </div>`;
}

export const NEUTRAL_DISCLAIMER_HTML =
  `<p style="margin:8px 0 0;font-size:11px;color:#94a3b8;line-height:1.6;text-align:center;">
    This email summarizes available data for your saved assets and portfolio items. It is general information only and is not personal financial advice.
  </p>`;

/** Compose the optional retention block (saved funds + stocks + portfolio). */
export function buildRetentionBlock(args: {
  savedFunds: SavedFundRow[];
  savedStocks: SavedStockRow[];
  portfolio: PortfolioSummary | null;
}): string {
  const parts = [
    buildSavedFundsSection(args.savedFunds),
    buildSavedStocksSection(args.savedStocks),
    buildPortfolioSummarySection(args.portfolio),
  ].filter(Boolean);
  if (parts.length === 0) return "";
  return parts.join("");
}
