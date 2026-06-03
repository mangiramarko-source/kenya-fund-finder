# Import Lovable data into Supabase

Target project: **caawgzuofnujrznwbuxk**

## Recommended: migration script

1. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env` (Dashboard → Settings → API → service_role)
2. If quick migration fails on missing `stock_price_history`, run **`repair-price-history-tables.sql`** in the [SQL Editor](https://supabase.com/dashboard/project/caawgzuofnujrznwbuxk/sql/new), or set `SUPABASE_DB_URL` and run `npm run db:apply-repair-schema`
3. Run quick migration (all market data, no news):

   ```bash
   npm run db:migrate-lovable:quick
   ```

3. Verify counts:

   ```bash
   npm run db:check-counts
   ```

4. Optional full news import:

   ```bash
   npm run db:migrate-lovable
   ```

## Alternative: SQL files (manual)

Run in [SQL Editor](https://supabase.com/dashboard/project/caawgzuofnujrznwbuxk/sql/new):

1. **`1-import-funds-only.sql`** — funds only (~88 rows)
2. **`2-import-snapshots-only.sql`** — yield history (run after step 1)

Copy the **file contents**, not the file path. Do not use `import-funds-from-lovable.sql` (combined file; use split files instead).
