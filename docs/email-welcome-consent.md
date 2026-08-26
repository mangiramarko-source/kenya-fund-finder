# Email welcome consent

## Scope

New accounts get an optional **Choose your updates** step on the home introduction after sign-in (password or Google) and after answering the cookie banner. Both email choices default to off. Cookie acceptance is not required: rejection also permits the welcome step.

- Independent price-alert email and Market Brief/Morning News choices.
- Save and “No thanks” persist both choices and completion together, under existing owner-only RLS.
- Closing without saving grants no consent. An incomplete welcome can reappear on a later visit; Alerts → Settings remains available.
- Existing accounts retain all preferences and are marked completed by the additive migration.
- In-app alert defaults are unchanged. Enabling price-alert email does not create an asset target.
- The settings UI shares the saved preference cache and reports failed saves rather than claiming success.

No email HTML, data mapping, unsubscribe handling, provider calls, outbox processing, alert evaluation, cron schedules, or allowlist settings are changed. **Email automation remains off.**

## Local review

Run the development server and open `/dev/welcome-preview`. This uses the real welcome component with an isolated simulated save: no account preferences are read or written by the preview, and no email endpoint is invoked. Use the site's theme switch and a phone viewport to inspect both themes. The route is development-only.

## Verification — 26 August 2026

- Full suite: 86 files / 1,010 tests passed; 28 focused welcome/persistence tests passed after the final narrow-screen adjustment.
- Production build passed.
- Application type check: 143 existing diagnostics, same as main; zero added diagnostics and zero in changed files. Existing union-type diagnostics include the new schema field in their displayed type, but represent the same errors.
- Browser review: 390px dark phone, 320px light phone, and 1280px light desktop. At 320px the dialog is 288px wide with 16px outside margins, and scroll width equals client width; both action buttons remain reachable vertically.
- Database migration rehearsed in a rolled-back transaction, including the real signup triggers. Existing preference rows compared unchanged, then the migration was applied and tests repeated.
- `supabase/tests/email_welcome_consent.sql` verifies off-by-default email consent, owner-only reads/writes, cross-user isolation, save and opt-out; all test fixtures roll back. No real signup email is generated.
- Existing preference fingerprint unchanged before/after deployment; no test accounts remain; pending outbox rows remain zero and cron jobs are unchanged.
- Supabase security advisor: no new findings. Existing findings remain outside this change, including [GraphQL visibility](https://supabase.com/docs/guides/database/database-linter?lint=0026_pg_graphql_anon_table_exposed), [executable privileged functions](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), and [disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). This is not a claim that the entire project is security-clean.

## Deployment order

Apply the additive preference migration before releasing the frontend that selects `email_welcome_completed`. The old frontend remains compatible with the new schema. Keep email automation disabled until separately implemented, tested, and approved.
