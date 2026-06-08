## Goal

Add a brand-new, separate **Simple Paste** tab inside Admin → Funds, used **only going forward** for unit trust yield updates. The existing `BulkFundPasteVerify` stays untouched (so historical workflow + past data are not affected). The new tool is intentionally dumb, strict, and predictable.

## Why the current one is painful (review)

Looking at `src/lib/bulkFundParser.ts` + `src/components/admin/BulkFundPasteVerify.tsx`:

1. **Token state machine guessing.** Parser sniffs currency tokens (`Sh|USD|GBP`) and infers manager name from "everything between boundaries". Any unexpected header typo (`Markett`), missing currency, or merged columns silently shifts boundaries → wrong manager names like `tBritam`.
2. **Yield unit is derived, not declared.** `deriveYieldUnit` guesses `%` vs `KES` from fund_type + magnitude (>100 → NAV). Edge cases (e.g. balanced fund quoted at 98.5) get mis-tagged.
3. **Matcher is fuzzy.** Composite-key → token-prefix → Levenshtein ≥ 0.85 → manual remap dialog. Drift %, auto-remap planning, "type-mismatch", "review", "potential match", "confirm new" — five states per row.
4. **Auto-create path.** A typo in manager name can become a brand-new fund row unless the admin clicks "confirm new". Most of the reported errors come from this path.
5. **Date detection** is heuristic and can override an admin-chosen date.
6. **UX heavy.** 3-step wizard, dialogs, perma-skip cache in localStorage, week-health pills, auto-remap plan toasts.

For a weekly "just update the yields" task on funds that already exist, this is overkill.

## What the new "Simple Paste" does

**Scope:** unit trusts only. Update-only. Never creates funds. Never renames managers. Never guesses units.

### Input format (strict, documented in UI)

One row per fund, **tab- or comma-separated**, exactly 3 columns:

```text
<fund_id_or_slug>	<daily_yield>	<annual_yield>
```

Example:
```text
britam-money-market	9.26	9.71
icea-money-market	7.75	8.06
cytonn-money-market-usd	5.57	5.72
```

- Header row optional (`fund\tdaily\tannual`) — auto-skipped.
- Blank lines and lines starting with `#` ignored.
- No currency token, no fund_type, no manager string — the fund_id/slug **is** the identity. Unit is whatever the fund already has in DB.

A one-click **"Copy fund IDs"** button in the UI dumps the current unit-trust IDs/slugs as a TSV template the admin pastes into their spreadsheet, fills in two numbers, and pastes back.

### Parsing rules (zero guessing)

- Split on `\n`, then on `\t` or `,`.
- Must have exactly 3 non-empty tokens. Otherwise → row flagged with `BAD_FORMAT`, ignored on sync.
- Tokens 2/3 must parse as finite numbers ≥ 0 and < 10000. Otherwise → `BAD_NUMBER`.
- Token 1 must resolve to exactly one existing **unit-trust** fund by `id` OR `slug` (case-insensitive, trimmed). Otherwise → `UNKNOWN_FUND` (the row is shown but cannot be synced — never auto-created).

### Validation surface (the review the user asked for)

For each row, show:

| Column | Source |
|---|---|
| Fund | resolved manager + type + unit (from DB) |
| Daily (new) | pasted, click-to-edit |
| Annual (new) | pasted, click-to-edit |
| Prev annual | DB |
| Drift % | computed |
| Status | OK / BAD_FORMAT / BAD_NUMBER / UNKNOWN_FUND / DUPLICATE_FUND_ID / HIGH_DRIFT |

Hard blocks before sync:
- Any `BAD_*` or `UNKNOWN_FUND` row must be removed/fixed (the row is excluded from the sync, not silently dropped — the admin sees the count).
- Any `DUPLICATE_FUND_ID` (same fund pasted twice) blocks sync until resolved.
- `HIGH_DRIFT` (> 25% change vs current annual) shows a yellow warning + requires a single top-level checkbox "I reviewed all high-drift rows" to enable Sync.

Date: single `<input type="date">`, defaults to today. No auto-detect.

### Sync action

- Only updates `funds.daily_yield`, `funds.annual_yield`, `funds.updated_at`, and writes one row per fund into `fund_yield_snapshots` (or whichever table the existing flow writes to — confirmed below).
- Wrapped in a single `Promise.all` batch with per-row toast on failure.
- Logs one summary row in `change_log` (e.g. `bulk_simple_paste: 12 funds updated, date=2026-06-08`).

### What it explicitly does NOT do

- No auto-create of new funds (use the existing tool for that).
- No fuzzy manager matching, no Levenshtein, no remap dialog.
- No `yield_unit` inference — uses whatever the fund row already has.
- No type-mismatch checks (irrelevant since unit class is fixed by the fund row).
- No localStorage perma-skip, no auto-remap plan, no week-health pills.
- Does not touch any past data — only updates the rows you list, only on the date you pick.

## Where it could still fail (honest review)

1. **Admin pastes the wrong fund_id against the right number.** Mitigation: the "Copy fund IDs" button gives a pre-filled template; drift % surfaces obvious swaps.
2. **Daily/annual columns swapped.** Mitigation: if `daily > annual` by > 20%, flag as `LIKELY_SWAPPED` warning (not a block).
3. **Spreadsheet exports with thousands separators / `%` sign.** Mitigation: strip `,` `%` `KES` `USD` from numeric tokens before parsing; document that this happens.
4. **Admin updates only half the funds and forgets the rest.** Mitigation: after sync, show "X of Y unit trusts updated today; Z not updated" with a one-click filter.
5. **Two funds with the same manager but different unit classes** (e.g. Cytonn KES vs USD). Mitigation: solved by using `id`/`slug` as the key, not manager name.
6. **Stale fund-id template.** Mitigation: the "Copy fund IDs" button always pulls fresh from DB.

## Files (new, additive — no edits to existing parser/matcher/verify component)

- `src/lib/simpleUnitTrustPaste.ts` — pure parser + validator (≈ 120 LOC, fully unit-testable).
- `src/lib/simpleUnitTrustPaste.test.ts` — vitest coverage for every failure mode above.
- `src/components/admin/SimpleUnitTrustPaste.tsx` — one-screen UI: textarea, date, "Copy fund IDs" button, preview table, Sync button.
- `src/pages/admin/AdminFunds.tsx` — add a sub-tab (or a button) "Simple Paste (new)" alongside the existing bulk tool. Existing tool stays as "Advanced Paste".

## Database

No schema changes. Uses existing `funds` and `fund_yield_snapshots` tables. RLS already enforced by admin role.

## Out of scope (will not touch)

- Existing `BulkFundPasteVerify`, `bulkFundParser`, `bulkFundMatcher`, `bulkFundAutoRemap`, their tests, snapshots, fixtures, and the GitHub workflow.
- Past `fund_yield_snapshots` / `fund_historical_yields` rows.
- Stocks, commodities, FX bulk flows.

## Approval

Confirm and I'll build it as a separate tab, leaving the current bulk tool fully intact as a fallback.
