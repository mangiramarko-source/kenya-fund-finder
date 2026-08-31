# Market-summary dependency restored — 31 August 2026

**Status: PASS.** This resolves the `PGRST205` / HTTP 500 found in the
[initial NSE patch rollout](nse-stock-data-deployment-2026-08-31.md).

## Scope and cause

`fetch-market-data` already upserted daily aggregates by `date`, and `StocksPage`
already queried the table. Production had no `market_summary_history` relation
or recorded migration creating it. The new stock-write checks exposed that
missing dependency; stock parsing was not the cause.

Only migration `20260831172126_restore_market_summary_history.sql` was applied
to project `caawgzuofnujrznwbuxk`. The locally generated filename originally had
version `20260831171840`; it was aligned with Supabase's recorded version without
changing the SQL.

The table matches the existing TypeScript/write contract: UUID primary key,
unique non-null date, numeric market cap and average P/E, integer breadth counts,
and a creation timestamp. No historical values were fabricated or backfilled.

RLS is enabled. `anon` and `authenticated` have SELECT only, with an explicit
public-read policy for these non-personal market aggregates. The backend
`service_role` has SELECT/INSERT/UPDATE; client writes, deletes and truncation
are not granted. No other table grants or authentication settings were changed.

## Verification

- Isolated PostgreSQL 17 tests passed for empty creation, repeated daily upsert,
  stable ID/creation time, public reads, and blocked anonymous/authenticated writes.
- Immediately after migration, complete stock and stock-history fingerprints
  were unchanged. The new table contained zero rows.
- The anonymous Data API query used by the stock page returned HTTP 200, first
  empty and then with the newly ingested summary, using the current configured
  publishable key. A preliminary probe with the old hardcoded legacy fallback
  key was rejected as disabled; no keys or auth configuration were changed.
- One controlled stock-only invocation used existing Vault authorization:
  request **2840**, started **2026-08-31 17:23:23.396481 UTC** (20:23:23 EAT).
- Result: **HTTP 200**, `success=true`, `stocks.status=complete`.
- Stock writes **45/45**, stock-history writes **45/45**, no cache substitutions,
  no missing quotes, and `write_failures=[]`.
- Summary for **2026-08-31**: market cap **2,492,512,610,000**, average P/E **8.48**,
  advances **20**, declines **16**, unchanged **9**. All values matched an
  independent aggregate query over active stored stocks. These are KFF tracked
  stock aggregates, not an official NSE index.
- SCOM remained 37.85 / previous 37.05 / +0.80 / +2.16%; NSE20 remained 27.55,
  linked to the original company ID. Provider cache update time was
  **17:18:05.421 UTC**, distinct from writes around **17:23:27 UTC**. It is not a
  confirmed exchange trade timestamp.
- Stock identity hash remained `0566654db5e1277c2b5a4746cd17f5f9`; existing history
  count remained **185,077** after the verification run.
- Stock cron remains active at `0 6-14 * * 1-5`, with unchanged command hash
  `44319c7f5be74c1163dc90409ddad753`.

No frontend/Vercel deployment, Edge Function redeployment, parsing modification,
provider switch, polling change, or secret change was needed. Production
`fetch-market-data` remains v38; the existing function successfully used the new
dependency. The disposable local test container was removed after validation.

## Remaining limitation and rollback

The official NSE fallback's upstream malformed-header problem remains unresolved.
It was not invoked because RapidAPI supplied every tracked stock; this run does
not re-test that upstream error. No insecure workaround was introduced.

No rollback is needed. Keep the additive table and its real daily records;
dropping it would recreate the failed dependency. Summary history begins with
today's verified ingestion. Polling frequency remains unchanged.
