# MVP communications staging runbook

This build is staging-only. Do not link or push the migration to the production project, deploy the functions, create cron jobs, or enable live email while following this runbook.

## Scope

- Migration: `supabase/migrations/20260824084746_mvp_communications_foundation.sql`
- Contract tests: `supabase/tests/mvp_communications_foundation_test.sql`
- Functions: `generate-market-overview`, `enqueue-market-brief`, `check-price-alerts`, `process-communication-outbox`, `communication-unsubscribe`, and `resend-webhook`
- No PGMQ, Lovable email gateway, portfolio content, Realtime notification publication changes, or schedules are part of this build.

## Isolated rehearsal

1. Start the local Supabase stack with Docker or OrbStack available.
2. Run `supabase db reset` against the local stack only.
3. Run `supabase test db supabase/tests/mvp_communications_foundation_test.sql`.
4. Generate and review a schema diff. It must contain only the seven communications tables, their indexes and policies, the `private` helper functions/triggers, and the two restricted public claim functions.
5. Exercise the functions with sanitized staging users and market data. Keep `COMMUNICATION_SEND_MODE=internal` and populate `COMMUNICATION_EMAIL_ALLOWLIST` only with approved internal recipients.

Stop the rehearsal if a target table/function already exists unexpectedly, the migration differs from the reviewed file, an authenticated client can insert notifications or access internal tables/RPCs, or a duplicate evaluator/worker creates more than one event.

## Required function configuration

Use staging values only. Secret values must never be committed.

- `SUPABASE_URL`
- a current Supabase secret key supported by `_shared/supabase-keys.ts`
- `SUPABASE_SECRET_KEYS` with the named `automations` caller secret
- `COMMUNICATION_UNSUBSCRIBE_SECRET`
- `COMMUNICATION_SEND_MODE=internal`
- `COMMUNICATION_EMAIL_ALLOWLIST`
- `COMMUNICATION_FROM_EMAIL`
- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SECRET`
- optional `GEMINI_API_KEY`; deterministic narrative remains the fallback

## Required staging evidence

- Database contract tests pass for anon, user A, user B, and service role.
- Concurrent alert claims produce one notification and one outbox row.
- Concurrent worker claims and retries retain one stable Resend idempotency key.
- Stale stocks or USD/KES produce a blocked overview and no Market Brief rows.
- Stock moves above 20% are excluded and recorded in validation warnings.
- Stale optional data is omitted without blocking the overview.
- Invalid AI text is rejected while deterministic copy remains ready.
- Preference, unsubscribe, bounce, complaint, and internal allowlist checks suppress delivery.
- Website and email render the same stored canonical facts.
- Empty watchlists and no recent alerts render successfully.

## Production gate

Before any later production change, capture the live schema/grants/RLS/functions/cron/extensions/migration ledger, verify a restorable backup or PITR position, confirm all target objects are absent or match the reviewed compatibility path, reconcile deployed function drift, run Supabase security/performance advisors, obtain legal/product approval for default-on email, and rehearse the exact migration against the captured baseline.

Deploy with every communications schedule disabled. Only after post-deployment smoke tests pass may separate overview, brief, alert, and worker schedules be proposed. The intended brief time is after 18:00 Africa/Nairobi and after the final stock refresh; this repository change creates no schedule.
