# NSE stock deployment verification — 31 August 2026

**Follow-up: resolved.** The separately approved summary-table migration and
successful HTTP 200 verification are recorded in
[the follow-up report](market-summary-history-deployment-2026-08-31.md).
The original partial-rollout evidence below is retained for the audit trail.

**Deployment status: PARTIAL.** The migration and both function deployments succeeded.
The single controlled stock refresh updated all 45 stocks and 45 history entries,
but returned HTTP 500 because the existing market-summary write targets the absent
`public.market_summary_history` table (`PGRST205`). No further production writes,
retries, schedule edits, frontend deployments or unrelated fixes were performed.

## Deployment

- Project: `caawgzuofnujrznwbuxk` (KenyaFundFinder).
- Migration: `20260831161801_stock_quote_provenance.sql`. Supabase assigned version
  `20260831161801`; the local file was renamed from `20260831153640` to match,
  with identical SQL. Only this migration was applied.
- `fetch-market-data`: v37 → **v38 ACTIVE**, unchanged `verify_jwt=false` and
  byte-identical existing privileged-auth/key helpers.
- `public-data`: v40 → **v41 ACTIVE**, unchanged `verify_jwt=false` and existing
  production authentication. Only the two new stock fields were added to its
  allowlist; the unrelated local secret-key helper edit was excluded.
- Downloaded deployed files matched the isolated, reviewed artifacts byte-for-byte.
- Existing source snapshots and baseline hashes: `/private/tmp/kff-nse-deploy.zS7KtF/before.json`.
- The 64 focused tests and staged Deno checks passed again. No Vercel deployment
  was needed or performed.

## Controlled request

Exactly one stock-only invocation was queued using the existing Vault-backed
cron authorization, with a request-specific 120-second timeout. Cron itself was
not modified.

- Request ID: **2835**
- Requested at: **2026-08-31 16:21:06.226549 UTC** (19:21:06 EAT)
- Response: **HTTP 500**, `success=false`, `stocks.status=partial_failure`
- RapidAPI returned 70 instruments; 45 tracked stocks matched; 3 invalid untracked
  records were rejected; no alias identity checks failed.
- Confirmed stock writes: **45/45**; history writes: **45/45**
- Cache substitutions: **0**; missing tracked quotes: **0**
- Write failure: `market_summary / summary_upsert / PGRST205`
- Official NSE fallback: `not_requested`, because all tracked stocks matched RapidAPI.

## Live representative values

Prices/absolute changes are KSh; percent changes are percentage points.
Provider time is RapidAPI cache/update time, **not confirmed NSE last-trade time**.
All samples now distinguish that timestamp from the later database write time.

| Stock | Price | Previous price | Absolute change | Change % | Provider updated (UTC) | Written (UTC) | Source |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| ABSA | 34.25 | 34.20 | 0.05 | 0.15 | 2026-08-31T16:14:54.327+00:00 | 2026-08-31T16:21:12.262042+00:00 | rapidapi |
| COOP | 37.25 | 37.10 | 0.15 | 0.40 | 2026-08-31T16:14:54.327+00:00 | 2026-08-31T16:21:12.19648+00:00 | rapidapi |
| EABL | 279.25 | 280.01 | -0.76 | -0.27 | 2026-08-31T16:14:54.327+00:00 | 2026-08-31T16:21:10.720373+00:00 | rapidapi |
| EQTY | 93.25 | 93.25 | 0.00 | 0.00 | 2026-08-31T16:14:54.327+00:00 | 2026-08-31T16:21:10.419858+00:00 | rapidapi |
| KCB | 93.50 | 93.50 | 0.00 | 0.00 | 2026-08-31T16:14:54.327+00:00 | 2026-08-31T16:21:12.066865+00:00 | rapidapi |
| NCBA | 90.50 | 90.75 | -0.25 | -0.28 | 2026-08-31T16:14:54.327+00:00 | 2026-08-31T16:21:10.882721+00:00 | rapidapi |
| NSE20 | 27.55 | 26.05 | 1.50 | 5.76 | 2026-08-31T16:14:54.327+00:00 | 2026-08-31T16:21:11.598692+00:00 | rapidapi |
| SCOM | 37.85 | 37.05 | 0.80 | 2.16 | 2026-08-31T16:14:54.327+00:00 | 2026-08-31T16:21:11.726488+00:00 | rapidapi |

The production public-data gateway also returned SCOM's corrected values and
both timestamp fields successfully.

The EABL reconstructed previous price (280.01) and absolute change (-0.76)
reflect the provider's rounded -0.27%; they are approximate, not a reconstruction
of an independently verified historical close.

## Data and security preservation

- Stocks remained **45** before migration, after migration and after refresh.
- Stock ID/symbol hash stayed `0566654db5e1277c2b5a4746cd17f5f9`.
- The existing `NSE20` company UUID remains
  `850dc3e0-d996-42e5-b0d8-7c7732b4c6c2`; its price changed 19.65 → 27.55.
  It mapped to provider `NSE` only with listed-company ISIN `KE3000009674`.
- No duplicate `NSE` row was created.
- All **185,076 existing history rows** retained their complete content hash:
  `d80639341f49ede282bd41a53fd0f8b1`.
- Total history is now **185,077**, after adding today's one NSE company snapshot.
  Its own history grew 2,862 → 2,863; its six news links remain intact.
- Every inspected NSE link count was identical immediately after migration.
- Legacy provider/source fields were NULL until successful ingestion.
- Existing view ACLs, active-row filter and security-invoker semantics remained.
  PostgreSQL rendered the existing boolean option as `true` instead of `on`;
  a direct boolean check confirmed unchanged semantics. Table RLS stayed enabled.
- Cron job 7 remains active with `0 6-14 * * 1-5`; command hash before and after:
  `44319c7f5be74c1163dc90409ddad753`. No secrets were changed or exposed.

## Remaining issues and stop condition

The database catalog confirms `to_regclass('public.market_summary_history') IS NULL`
and zero columns for that table. The original v37 function already attempted
this write without checking the result. The new observability surfaced this
existing dependency failure; this migration did not create, delete or alter
that table. Production mutations stopped when this discrepancy was discovered.

The official NSE fallback's known malformed response header remains unresolved.
It was not invoked in this refresh, so this run does not re-verify the upstream
failure. Its classification and safe failure reporting passed fixture tests.
No insecure HTTP/TLS workaround was introduced.

**Rollback needed: NO, based on verified stock data and unchanged security/history.**
A full ingestion rollback would restore incorrect percentage parsing and the
unmapped NSE quote; it would hide, not repair, the absent summary table.
The current refresh endpoint reports failure honestly until that separate issue
is resolved.

**Next recommended step:** obtain approval for a narrowly scoped investigation/fix
of the missing summary-table dependency. Do not change polling frequency yet.
Only after the whole stock run is healthy should polling cadence be evaluated
against provider update cadence and cost; provider cache time still cannot
establish exchange quote/trade freshness.
