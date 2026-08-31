// Read-only, one sector, one request. No Supabase or RapidAPI access.
// Run: deno run --allow-net=www.nse.co.ke scripts/diagnose-nse-fallback.ts
import { fetchNseSector, parseNseQuoteRows, parseNseSnapshotDate } from "../supabase/functions/fetch-market-data/nse-fallback.ts";

const result = await fetchNseSector("investse", fetch, 1);
const hasQuoteRows = parseNseQuoteRows(result.html).some((row) => /Nairobi Securities Exchange/i.test(row.company));
console.log(JSON.stringify({
  endpoint: "official_nse",
  sector: result.sector,
  status: result.errorCode || !hasQuoteRows ? "fallback_unavailable" : "response_received",
  error_code: result.errorCode || (hasQuoteRows ? null : "EXPECTED_COMPANY_MISSING"),
  has_company_quote: hasQuoteRows,
  snapshot_date: parseNseSnapshotDate(result.html),
  // A successful diagnostic is not proof of exchange quote freshness.
}, null, 2));
if (result.errorCode || !hasQuoteRows) Deno.exit(1);
