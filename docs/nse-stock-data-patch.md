# NSE stock quote correction

Production rollout on 31 August 2026 is documented in
[the initial deployment report](nse-stock-data-deployment-2026-08-31.md).
The missing `market_summary_history` dependency was subsequently restored in an
approved, scoped follow-up. A new controlled run returned HTTP 200 with all 45
stock/history writes and the daily summary saved, with no write failures.
See [the successful follow-up verification](market-summary-history-deployment-2026-08-31.md).

Scope: stock ingestion only. No provider switch, symbol/UUID rename, historical
data deletion, or hourly cron changes.

## Behavior

- RapidAPI `change` is percentage movement: `previous_price = round2(price / (1 + change / 100))`,
  `day_change = round2(price - previous_price)`, `day_change_percent = round2(change)`.
  Rounded provider percentages mean reconstructed previous prices are approximate.
  For example, EABL at 279.25 with -0.27% derives 280.01 and -0.76; do not claim
  this reconstructs the exact historical close. Official-source parsing is unchanged.
- Provider `NSE` maps to the existing KFF `NSE20` record only with the company ISIN
  `KE3000009674`. This is the listed company, not the NSE 20 Share Index. Existing
  UUIDs, URLs, historical records and references stay unchanged.
- `stocks.provider_updated_at` stores RapidAPI `meta.lastUpdated`; `quote_source`
  records `rapidapi` or `nse`. Existing `updated_at` remains database write time
  and can also change for non-ingestion edits. Legacy provenance stays NULL.
  Cached quotes are not rewritten. Official fallback clears unavailable provider
  time instead of retaining unrelated RapidAPI provenance.
- The response `timestamp` and `meta.cached` are diagnostic metadata only; they
  do not substitute for missing `meta.lastUpdated`. None of these fields confirms
  an individual quote's last exchange trade time. A later frontend change can say
  “Provider data updated at 18:20 EAT”, formatting `provider_updated_at` in
  `Africa/Nairobi`, but must not call it “NSE quote time”. No freshness label is
  added to the UI by this patch.
- Stock refresh counters require a returned stock ID from a successful write.
  Failed stock writes skip history; failed history writes are reported separately.
  The function returns HTTP 500 / `success: false` for database write failures.
  Cache use and unavailable official fallback are explicit degraded states.

## Official fallback limitation

The investigated NSE response contains bare LF characters in its multiline
Content-Security-Policy header. Deno's strict HTTP parser rejects it before HTML
parsing. The patch classifies `INVALID_RESPONSE_HEADERS`, stops futile retries
for that error, bounds requests, and reports affected sectors. It does **not**
repair the upstream header or relax HTTP/TLS security. NSE must serve a valid
single-line header before this fallback can operate normally.

The optional diagnostic makes one read-only request to the existing official
NSE endpoint (one sector, no RapidAPI key and no database access):

```sh
deno run --allow-net=www.nse.co.ke scripts/diagnose-nse-fallback.ts
```

It exits nonzero when unavailable; a successful response is not evidence of
exchange trade freshness. Routine tests use fixtures and do not call providers.

## Deployment order — not applied by local implementation

1. Review and apply **only** `supabase/migrations/20260831161801_stock_quote_provenance.sql`.
   Do not bulk-push unrelated pending migrations. It adds nullable columns and
   appends them to `stocks_public`, retaining its grants and security-invoker mode.
2. Deploy the reviewed stock patch to `fetch-market-data`, including its three
   new helper modules. Deploy the two-column stock allowlist addition to
   `public-data` after the migration. Exclude unrelated workspace changes from
   both deployment artifacts.
3. Observe the next existing scheduled stock run; do not change cron or trigger
   extra ingestion just for rollout. Verify checked-write counts, the `NSE20`
   company update, stored percentage math and provider provenance. Existing
   incorrect values are corrected on successful refresh, not by a historical backfill.
4. Check returned `stocks.status`, `write_failures`, `official_fallback` and
   RapidAPI diagnostic timestamps before calling the rollout healthy.

## Focused checks

```sh
npm test -- src/lib/stockQuoteParsing.test.ts src/lib/stockQuoteWrites.test.ts src/lib/nseFallback.test.ts
deno check --no-lock supabase/functions/fetch-market-data/index.ts scripts/diagnose-nse-fallback.ts
```

`scripts/test-stock-provenance.sql` is a migration smoke test for an **empty,
disposable** database named `kff_nse_migration_test`. Never run it against a linked
Supabase project. It verifies legacy rows/history, view grants/RLS, timestamp
separation and source validation. Local validation used PostgreSQL 17.

## Rollback

Keep the additive migration and stored provenance; no column drop or history
deletion is needed. The public-data addition is backward compatible. If reverting
ingestion code, retain the new provenance/write envelope around the prior parser
so future writes do not leave misleading old source metadata. A full deployment
rollback would reintroduce the known percentage and NSE ticker defects; do not
describe it as restoring correct data. No automated price/history reversal is
included. Cron remains unchanged throughout.
