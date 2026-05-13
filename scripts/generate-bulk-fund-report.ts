/**
 * Generate an HTML test report listing every parsed row from the canonical
 * sample with its match kind, prevAnnual, and computed drift %.
 *
 * Run:  bun run scripts/generate-bulk-fund-report.ts
 * Output: /mnt/documents/bulk-fund-report.html
 */

import { writeFileSync } from "node:fs";
import { parseBulkFundText } from "../src/lib/bulkFundParser";
import { matchRow } from "../src/lib/bulkFundMatcher";
import { FULL_SAMPLE_PASTE, EXISTING_FUNDS, EXPECTATIONS } from "../src/lib/__fixtures__/bulkFundSample";

const report = parseBulkFundText(FULL_SAMPLE_PASTE);

const rows = report.rows.map((r) => {
  const m = matchRow(
    {
      index: r.index,
      status: r.status,
      manager: r.manager,
      fund_type: r.fund_type,
      yield_unit: r.yield_unit,
      annual_yield: r.annual_yield,
    },
    EXISTING_FUNDS,
  );
  const exp = EXPECTATIONS.find(
    (e) => e.manager === r.manager && e.fund_type === r.fund_type && e.yield_unit === r.yield_unit,
  );
  const passed = exp ? exp.expected === m.kind : null;
  return {
    idx: r.index + 1,
    manager: r.manager,
    fund_type: r.fund_type ?? "—",
    unit: r.yield_unit ?? "—",
    daily: r.daily_yield ?? "—",
    annual: r.annual_yield ?? "—",
    kind: m.kind,
    fund_id: m.fund?.id ?? "",
    prevAnnual: m.prevAnnual ?? "",
    drift: m.drift !== undefined ? m.drift.toFixed(2) + "%" : "",
    expected: exp?.expected ?? "—",
    passed,
    warnings: r.warnings.join("; "),
  };
});

const counts = rows.reduce(
  (acc, r) => {
    acc[r.kind] = (acc[r.kind] ?? 0) + 1;
    return acc;
  },
  {} as Record<string, number>,
);

const passCount = rows.filter((r) => r.passed === true).length;
const failCount = rows.filter((r) => r.passed === false).length;

const kindBadge = (k: string) => {
  const colors: Record<string, string> = {
    matched: "#16a34a",
    review: "#eab308",
    new: "#3b82f6",
    "type-mismatch": "#dc2626",
  };
  return `<span style="background:${colors[k] ?? "#888"};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">${k.toUpperCase()}</span>`;
};

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Bulk Fund Parser & Matcher Report</title>
<style>
  body { font-family: ui-monospace, "SF Mono", Menlo, monospace; background:#0f172a; color:#e2e8f0; margin:0; padding:24px; font-size:12px; }
  h1 { font-size:18px; margin:0 0 4px; }
  .sub { color:#94a3b8; margin-bottom:16px; }
  .summary { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:16px; }
  .stat { background:#1e293b; padding:8px 14px; border-radius:6px; }
  .stat b { font-size:18px; display:block; }
  table { width:100%; border-collapse:collapse; background:#1e293b; border-radius:6px; overflow:hidden; }
  th, td { padding:6px 10px; text-align:left; border-bottom:1px solid #334155; vertical-align:top; }
  th { background:#0f172a; font-size:11px; text-transform:uppercase; color:#94a3b8; position:sticky; top:0; }
  tr:hover td { background:#273449; }
  .num { text-align:right; font-variant-numeric:tabular-nums; }
  .pass { color:#16a34a; }
  .fail { color:#dc2626; font-weight:600; }
  .warn { color:#eab308; font-size:11px; }
  footer { margin-top:16px; color:#64748b; font-size:11px; }
</style>
</head>
<body>
<h1>Bulk Fund Parser &amp; Matcher Report</h1>
<div class="sub">Generated ${new Date().toISOString()} · sample: ${report.rows.length} rows · DB snapshot: ${EXISTING_FUNDS.length} funds</div>

<div class="summary">
  <div class="stat"><b>${rows.length}</b>parsed rows</div>
  <div class="stat"><b style="color:#16a34a">${counts.matched ?? 0}</b>matched</div>
  <div class="stat"><b style="color:#eab308">${counts.review ?? 0}</b>review</div>
  <div class="stat"><b style="color:#3b82f6">${counts.new ?? 0}</b>new</div>
  <div class="stat"><b style="color:#dc2626">${counts["type-mismatch"] ?? 0}</b>type-mismatch</div>
  <div class="stat"><b class="pass">${passCount}</b>expectations pass</div>
  <div class="stat"><b class="${failCount ? "fail" : ""}">${failCount}</b>expectations fail</div>
</div>

<table>
<thead>
<tr>
  <th>#</th>
  <th>Manager</th>
  <th>Type</th>
  <th>Unit</th>
  <th class="num">Daily</th>
  <th class="num">Annual</th>
  <th>Kind</th>
  <th>Matched fund</th>
  <th class="num">prevAnnual</th>
  <th class="num">Drift</th>
  <th>Expected</th>
  <th>Pass?</th>
  <th>Warnings</th>
</tr>
</thead>
<tbody>
${rows.map((r) => `
<tr>
  <td>${r.idx}</td>
  <td><b>${r.manager}</b></td>
  <td>${r.fund_type}</td>
  <td>${r.unit}</td>
  <td class="num">${r.daily}</td>
  <td class="num">${r.annual}</td>
  <td>${kindBadge(r.kind)}</td>
  <td>${r.fund_id}</td>
  <td class="num">${r.prevAnnual}</td>
  <td class="num">${r.drift}</td>
  <td>${r.expected}</td>
  <td class="${r.passed === true ? "pass" : r.passed === false ? "fail" : ""}">${r.passed === true ? "✓" : r.passed === false ? "✗" : "—"}</td>
  <td class="warn">${r.warnings}</td>
</tr>`).join("")}
</tbody>
</table>

<footer>
Source: src/lib/__fixtures__/bulkFundSample.ts · Regenerate with: <code>bun run scripts/generate-bulk-fund-report.ts</code>
</footer>
</body>
</html>`;

const out = process.argv[2] ?? "/mnt/documents/bulk-fund-report.html";
writeFileSync(out, html);
console.log(`Report written to ${out} (${rows.length} rows, ${passCount}/${passCount + failCount} pass)`);
