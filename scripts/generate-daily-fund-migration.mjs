import { fetchLiveSerrariAllFunds } from "../src/lib/serrariFundSync.ts";
import fs from "fs";

async function buildMigration() {
  const result = await fetchLiveSerrariAllFunds();
  const effectiveDate = result.asOfDate; // '2026-11-04'

  const lines = [
    "-- =============================================================================",
    "-- Automated Daily Fund Sync (MMFs, Fixed Income, Balanced, Equity)",
    `-- Seeds all ${result.rows.length} funds as of ${effectiveDate} & schedules daily dual pg_cron syncs`,
    "-- =============================================================================",
    "",
    "-- 1. Ensure section_live_status table exists",
    "CREATE TABLE IF NOT EXISTS public.section_live_status (",
    "  section_key text PRIMARY KEY,",
    "  is_live boolean NOT NULL DEFAULT true,",
    "  last_verified_at timestamptz NOT NULL DEFAULT now(),",
    "  updated_at timestamptz NOT NULL DEFAULT now()",
    ");",
    "ALTER TABLE public.section_live_status ENABLE ROW LEVEL SECURITY;",
    "DO $$ BEGIN",
    "  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read of section_live_status') THEN",
    "    CREATE POLICY \"Allow public read of section_live_status\" ON public.section_live_status FOR SELECT USING (true);",
    "  END IF;",
    "END $$;",
    "",
    "-- 2. Ensure change_log table exists",
    "CREATE TABLE IF NOT EXISTS public.change_log (",
    "  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),",
    "  entity_type text NOT NULL,",
    "  action text NOT NULL,",
    "  new_values jsonb,",
    "  created_at timestamptz NOT NULL DEFAULT now()",
    ");",
    "",
    "-- 3. Upsert all funds and record snapshots",
    "DO $sync$",
    "DECLARE",
    "  r RECORD;",
    "  v_fund_id uuid;",
    "  v_exists boolean;",
    "  v_changed_count integer := 0;",
    `  v_effective_date date := DATE '${effectiveDate}';`,
    "BEGIN",
    "  FOR r IN",
    "    SELECT * FROM (",
    "      VALUES"
  ];

  const valueRows = result.rows.map((row) => {
    const slug = row.slug.replace(/'/g, "''");
    const name = row.name.replace(/'/g, "''");
    const manager = row.manager.replace(/'/g, "''");
    const fundType = row.fund_type;
    const yieldUnit = row.yield_unit;
    const dailyYield = Number(row.daily_yield ?? 0).toFixed(2);
    const annualYield = Number(row.annual_yield ?? 0).toFixed(2);
    const fee = Number(row.management_fee ?? 2.0).toFixed(2);
    const minInv = Math.round(row.minimum_investment ?? 1000);
    const withdrawal = (row.withdrawal_time || "1-2 days").replace(/'/g, "''");
    const website = (row.website || "https://www.cma.or.ke").replace(/'/g, "''");

    return `        ('${slug}', '${name}', '${manager}', '${fundType}', '${yieldUnit}', ${dailyYield}::numeric, ${annualYield}::numeric, ${fee}::numeric, ${minInv}::numeric, '${withdrawal}', '${website}')`;
  });

  lines.push(valueRows.join(",\n"));
  lines.push("    ) AS t(slug, name, manager, fund_type, yield_unit, daily_yield, annual_yield, management_fee, minimum_investment, withdrawal_time, website)");
  lines.push("  LOOP");
  lines.push("    SELECT EXISTS (SELECT 1 FROM public.funds WHERE lower(slug) = lower(r.slug)) INTO v_exists;");
  lines.push("");
  lines.push("    IF v_exists THEN");
  lines.push("      UPDATE public.funds");
  lines.push("      SET");
  lines.push("        annual_yield = r.annual_yield,");
  lines.push("        daily_yield = r.daily_yield,");
  lines.push("        yield_unit = r.yield_unit,");
  lines.push("        management_fee = r.management_fee,");
  lines.push("        minimum_investment = r.minimum_investment,");
  lines.push("        fact_sheet_date = v_effective_date,");
  lines.push("        updated_at = now()");
  lines.push("      WHERE lower(slug) = lower(r.slug)");
  lines.push("        AND (");
  lines.push("          annual_yield IS DISTINCT FROM r.annual_yield");
  lines.push("          OR daily_yield IS DISTINCT FROM r.daily_yield");
  lines.push("          OR yield_unit IS DISTINCT FROM r.yield_unit");
  lines.push("          OR management_fee IS DISTINCT FROM r.management_fee");
  lines.push("          OR minimum_investment IS DISTINCT FROM r.minimum_investment");
  lines.push("        )");
  lines.push("      RETURNING id INTO v_fund_id;");
  lines.push("");
  lines.push("      -- If nothing changed, still get fund_id for snapshot verification");
  lines.push("      IF v_fund_id IS NULL THEN");
  lines.push("        SELECT id INTO v_fund_id FROM public.funds WHERE lower(slug) = lower(r.slug);");
  lines.push("      ELSE");
  lines.push("        v_changed_count := v_changed_count + 1;");
  lines.push("      END IF;");
  lines.push("    ELSE");
  lines.push("      INSERT INTO public.funds (");
  lines.push("        slug, name, manager, fund_type, yield_unit,");
  lines.push("        annual_yield, daily_yield, seven_day_yield, thirty_day_yield,");
  lines.push("        minimum_investment, management_fee, withdrawal_time,");
  lines.push("        website, fact_sheet_date, cma_licensed, is_published, description");
  lines.push("      ) VALUES (");
  lines.push("        r.slug, r.name, r.manager, r.fund_type, r.yield_unit,");
  lines.push("        r.annual_yield, r.daily_yield, 0, 0,");
  lines.push("        r.minimum_investment, r.management_fee, r.withdrawal_time,");
  lines.push("        r.website, v_effective_date, true, true,");
  lines.push("        format('The %s is a CMA-regulated %s fund managed by %s.', r.name, r.fund_type, r.manager)");
  lines.push("      )");
  lines.push("      RETURNING id INTO v_fund_id;");
  lines.push("      v_changed_count := v_changed_count + 1;");
  lines.push("    END IF;");
  lines.push("");
  lines.push("    IF v_fund_id IS NOT NULL THEN");
  lines.push("      INSERT INTO public.fund_yield_snapshots (fund_id, annual_yield, daily_yield, snapshot_date)");
  lines.push("      VALUES (v_fund_id, r.annual_yield, r.daily_yield, v_effective_date)");
  lines.push("      ON CONFLICT (fund_id, snapshot_date) DO UPDATE");
  lines.push("      SET annual_yield = EXCLUDED.annual_yield,");
  lines.push("          daily_yield  = EXCLUDED.daily_yield;");
  lines.push("    END IF;");
  lines.push("");
  lines.push("    v_fund_id := NULL;");
  lines.push("  END LOOP;");
  lines.push("");
  lines.push("  -- Update section_live_status");
  lines.push("  INSERT INTO public.section_live_status (section_key, is_live, last_verified_at, updated_at)");
  lines.push("  VALUES ('funds', true, now(), now())");
  lines.push("  ON CONFLICT (section_key) DO UPDATE");
  lines.push("  SET is_live = true,");
  lines.push("      last_verified_at = now(),");
  lines.push("      updated_at = CASE WHEN v_changed_count > 0 THEN now() ELSE section_live_status.updated_at END;");
  lines.push("");
  lines.push("  -- Sync site_pages live-status meta");
  lines.push("  UPDATE public.site_pages");
  lines.push("  SET");
  lines.push("    meta = jsonb_set(");
  lines.push("      jsonb_set(");
  lines.push("        COALESCE(meta, '{}'::jsonb),");
  lines.push("        '{last_update_date}',");
  lines.push("        to_jsonb(v_effective_date::text),");
  lines.push("        true");
  lines.push("      ),");
  lines.push("      '{sections,funds}',");
  lines.push("      jsonb_build_object(");
  lines.push("        'is_live', true,");
  lines.push("        'last_update_date', v_effective_date::text");
  lines.push("      ),");
  lines.push("      true");
  lines.push("    ),");
  lines.push("    updated_at = now()");
  lines.push("  WHERE slug = 'live-status';");
  lines.push("END");
  lines.push("$sync$;");
  lines.push("");
  lines.push("-- 4. Schedule dual weekday cron jobs in pg_cron");
  lines.push("DO $cron$");
  lines.push("BEGIN");
  lines.push("  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN");
  lines.push("    BEGIN PERFORM cron.unschedule('fetch-market-data-funds'); EXCEPTION WHEN OTHERS THEN NULL; END;");
  lines.push("    BEGIN PERFORM cron.unschedule('fetch-market-data-funds-catchup'); EXCEPTION WHEN OTHERS THEN NULL; END;");
  lines.push("    BEGIN PERFORM cron.unschedule('fetch-market-data-mmf'); EXCEPTION WHEN OTHERS THEN NULL; END;");
  lines.push("    BEGIN PERFORM cron.unschedule('fetch-market-data-mmf-catchup'); EXCEPTION WHEN OTHERS THEN NULL; END;");
  lines.push("");
  lines.push("    -- 1. Primary morning run: 06:30 UTC (09:30 AM EAT), Mon-Fri");
  lines.push("    PERFORM cron.schedule(");
  lines.push("      'fetch-market-data-funds',");
  lines.push("      '30 6 * * 1-5',");
  lines.push("      $command$");
  lines.push("        select net.http_post(");
  lines.push("          url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'kff_project_url'), '/') || '/functions/v1/fetch-market-data',");
  lines.push("          headers := jsonb_build_object(");
  lines.push("            'Content-Type', 'application/json',");
  lines.push("            'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'kff_automations_secret_key')");
  lines.push("          ),");
  lines.push("          body := '{\"fetch_type\":\"funds\"}'::jsonb");
  lines.push("        );");
  lines.push("      $command$");
  lines.push("    );");
  lines.push("");
  lines.push("    -- 2. Afternoon catch-up run: 11:00 UTC (02:00 PM EAT), Mon-Fri");
  lines.push("    PERFORM cron.schedule(");
  lines.push("      'fetch-market-data-funds-catchup',");
  lines.push("      '0 11 * * 1-5',");
  lines.push("      $command$");
  lines.push("        select net.http_post(");
  lines.push("          url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'kff_project_url'), '/') || '/functions/v1/fetch-market-data',");
  lines.push("          headers := jsonb_build_object(");
  lines.push("            'Content-Type', 'application/json',");
  lines.push("            'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'kff_automations_secret_key')");
  lines.push("          ),");
  lines.push("          body := '{\"fetch_type\":\"funds\"}'::jsonb");
  lines.push("        );");
  lines.push("      $command$");
  lines.push("    );");
  lines.push("  END IF;");
  lines.push("END");
  lines.push("$cron$;");

  const filePath = "supabase/migrations/20261104110000_automate_daily_fund_sync.sql";
  fs.writeFileSync(filePath, lines.join("\n"));
  console.log("Successfully wrote", lines.length, "lines to", filePath);
}

buildMigration();
