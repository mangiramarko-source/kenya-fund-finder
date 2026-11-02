-- =============================================================================
-- Sync All 40 Money Market Funds (27 KES + 13 USD) from Serrari Group
-- & Schedule Daily Automated MMF Sync
-- =============================================================================

DO $sync$
DECLARE
  r RECORD;
  v_fund_id uuid;
  v_exists boolean;
  v_changed_count integer := 0;
  v_effective_date date := DATE '2026-11-02';
BEGIN
  FOR r IN
    SELECT * FROM (
      VALUES
        -- 27 KES Money Market Funds (as of 2 Nov 2026)
        ('cytonn-sh-mmf', 'Cytonn', 'Cytonn Asset Managers Limited', '%', 10.54::numeric, 11.11::numeric, 2.00::numeric, 1000::numeric, 'Instant (M-Pesa)', 'https://www.cytonn.com/investments/money-market-fund'),
        ('faulu-sh-mmf', 'Faulu', 'Old Mutual Investment Group', '%', 10.28, 10.82, 2.00, 1000, '1-2 days', 'https://www.faulukenya.com'),
        ('lofty-corban-sh-mmf', 'Lofty-Corban', 'Lofty-Corban Investments Limited', '%', 10.10, 10.62, 2.00, 1000, '1 day', 'https://loftycorban.com'),
        ('nabo-sh-mmf', 'Nabo', 'Nabo Capital Limited', '%', 10.02, 10.53, 2.25, 100000, '1-2 days', 'https://www.nabocapital.com'),
        ('madison-sh-mmf', 'Madison', 'Madison Investment Managers Limited', '%', 9.94, 10.45, 2.00, 5000, '1-2 days', 'https://www.madison.co.ke'),
        ('orient-kasha-sh-mmf', 'Orient Kasha', 'Orient Asset Managers Limited', '%', 9.93, 10.43, 2.00, 1000, '1-2 days', 'https://orientasset.co.ke'),
        ('old-mutual-sh-mmf', 'Old Mutual', 'Old Mutual Investment Group', '%', 9.82, 10.31, 2.00, 1000, '1-2 days', 'https://www.oldmutual.co.ke'),
        ('jubilee-sh-mmf', 'Jubilee', 'Jubilee Asset Management', '%', 9.78, 10.27, 2.00, 5000, '1-2 days', 'https://jubileeinsurance.com/ke/'),
        ('kuza-sh-mmf', 'Kuza', 'Kuza Asset Management Limited', '%', 9.76, 10.25, 2.00, 1000, '1 day', 'https://www.kuza.africa'),
        ('etica-sh-mmf', 'Etica', 'Etica Capital Ltd', '%', 9.66, 10.14, 2.00, 100, 'Instant (M-Pesa)', 'https://eticacapital.com'),
        ('arvocap-sh-mmf', 'Arvocap', 'Arvocap Asset Managers Limited', '%', 9.65, 10.13, 2.00, 3000, '1-2 days', 'https://www.arvocap.com'),
        ('genafrica-sh-mmf', 'GenAfrica', 'GenAfrica Asset Managers Limited', '%', 9.45, 9.91, 2.00, 500000, '1-3 days', 'https://genafrica.com'),
        ('britam-sh-mmf', 'Britam', 'Britam Asset Managers', '%', 9.24, 9.68, 2.00, 1000, '1-2 days', 'https://ke.britam.com'),
        ('sanlamallianz-sh-mmf', 'SanlamAllianz', 'Sanlam Allianz Investments Limited', '%', 9.13, 9.56, 2.00, 3000, '1-2 days', 'https://www.sanlam.co.ke'),
        ('kcb-sh-mmf', 'KCB', 'KCB Asset Management Ltd', '%', 8.90, 9.31, 2.00, 1000, '1-2 days', 'https://ke.kcbbankgroup.com'),
        ('dry-associates-sh-mmf', 'Dry Associates', 'Dry Associates Investment Bank', '%', 8.79, 9.19, 2.26, 1000000, '2-3 days', 'https://www.dryassociates.com'),
        ('genghis-sh-mmf', 'Genghis', 'Genghis Capital Limited', '%', 8.61, 8.99, 2.00, 500, '1-2 days', 'https://www.genghis-capital.com'),
        ('cpf-sh-mmf', 'CPF', 'CPF Financial Services', '%', 8.49, 8.86, 3.00, 1000, '1-2 days', 'https://www.cpf.or.ke'),
        ('cic-sh-mmf', 'CIC', 'CIC Asset Management Ltd', '%', 8.08, 8.41, 2.00, 5000, '1-2 days', 'https://cic.co.ke'),
        ('african-alliance-sh-mmf', 'African Alliance Enhanced', 'African Alliance Kenya Asset Management', '%', 8.01, 8.34, 2.00, 100000, '2-3 days', 'https://www.africanallianceassetmanagement.com'),
        ('ncba-sh-mmf', 'NCBA', 'NCBA Investment Bank', '%', 7.96, 8.28, 2.00, 5000, '1 day', 'https://investment-bank.ncbagroup.com'),
        ('apollo-sh-mmf', 'Apollo', 'Apollo Asset Management Company Ltd', '%', 7.85, 8.16, 2.00, 1000, '1-2 days', 'https://www.apainsurance.org'),
        ('coop-sh-mmf', 'Co-op', 'Co-op Trust Investment Services Limited', '%', 7.73, 8.04, 0.90, 500, '1-2 days', 'https://www.co-opbank.co.ke'),
        ('icea-sh-mmf', 'ICEA Lion', 'ICEA LION Asset Management Ltd', '%', 7.58, 7.87, 2.00, 500, '1-2 days', 'https://icealion.co.ke'),
        ('ziidi-money-market-fund', 'Ziidi', 'Standard Investment Bank, ALA Capital Limited & Sanlam Investments East Africa Limited', '%', 6.80, 7.03, 2.00, 100, 'Instant (M-Pesa)', 'https://www.safaricom.co.ke/personal/m-pesa/wealth/ziidi'),
        ('stanbic-sh-mmf', 'Stanbic', 'Stanbic Investment Management Services', '%', 5.43, 5.58, 2.00, 1000, '1-2 days', 'https://www.stanbicbank.co.ke'),
        ('equity-sh-mmf', 'Equity', 'Equity Investment Bank', '%', 4.37, 4.47, 2.00, 1000, '1 day', 'https://equitygroupholdings.com/ke/save-invest'),

        -- 13 USD Money Market Funds (as of 2 Nov 2026)
        ('nabo-usd-mmf', 'Nabo USD', 'Nabo Capital Limited', 'USD', 5.43, 5.58, 2.50, 130000, '2-3 days', 'https://www.nabocapital.com'),
        ('jubilee-usd-mmf', 'Jubilee USD', 'Jubilee Asset Management', 'USD', 5.42, 5.57, 1.00, 130000, '2-3 days', 'https://jubileeinsurance.com/ke/'),
        ('cytonn-usd-mmf', 'Cytonn USD', 'Cytonn Asset Managers Limited', 'USD', 5.29, 5.43, 1.00, 130000, '1-2 days', 'https://www.cytonn.com'),
        ('old-mutual-usd-mmf', 'Old Mutual USD', 'Old Mutual Investment Group', 'USD', 5.10, 5.23, 1.00, 13000, '2-3 days', 'https://www.oldmutual.co.ke'),
        ('kuza-usd-mmf', 'Kuza USD', 'Kuza Asset Management Limited', 'USD', 5.09, 5.22, 2.00, 13000, '1-2 days', 'https://www.kuza.africa'),
        ('kcb-usd-mmf', 'KCB USD', 'KCB Asset Management Ltd', 'USD', 4.99, 5.12, 0.50, 13000, '2-3 days', 'https://ke.kcbbankgroup.com'),
        ('lofty-corban-usd-mmf', 'Lofty-Corban USD', 'Lofty-Corban Investments Limited', 'USD', 4.97, 5.10, 0.20, 13000, '1-2 days', 'https://loftycorban.com'),
        ('dry-associates-usd-mmf', 'Dry Associates USD', 'Dry Associates Investment Bank', 'USD', 4.96, 5.08, 1.50, 1300000, '2-3 days', 'https://www.dryassociates.com'),
        ('sanlam-usd-mmf', 'SanlamAllianz USD', 'Sanlam Allianz Investments Limited', 'USD', 4.91, 5.03, 2.00, 325000, '2-3 days', 'https://www.sanlam.co.ke'),
        ('stanbic-usd-mmf', 'Stanbic USD', 'Stanbic Investment Management Services', 'USD', 4.85, 4.97, 1.00, 13000, '2-3 days', 'https://www.stanbicbank.co.ke'),
        ('cic-dollar-usd-mmf', 'CIC Dollar', 'CIC Asset Management Ltd', 'USD', 4.02, 4.10, 1.50, 130000, '2-3 days', 'https://cic.co.ke'),
        ('cpf-usd-mmf', 'CPF USD', 'CPF Financial Services', 'USD', 3.74, 3.81, 5.00, 13000, '2-3 days', 'https://www.cpf.or.ke'),
        ('ncba-usd-mmf', 'NCBA USD', 'NCBA Investment Bank', 'USD', 3.41, 3.47, 1.00, 13000, '1-2 days', 'https://investment-bank.ncbagroup.com')
    ) AS t(slug, name, manager, yield_unit, daily_yield, annual_yield, management_fee, minimum_investment, withdrawal_time, website)
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.funds WHERE lower(slug) = lower(r.slug)
    ) INTO v_exists;

    IF v_exists THEN
      -- Strictly update ONLY when the fund's yield, fee, or minimum investment actually changed
      UPDATE public.funds
      SET
        annual_yield = r.annual_yield,
        daily_yield = r.daily_yield,
        yield_unit = r.yield_unit,
        management_fee = r.management_fee,
        minimum_investment = r.minimum_investment,
        fact_sheet_date = v_effective_date,
        updated_at = now()
      WHERE lower(slug) = lower(r.slug)
        AND (
          annual_yield IS DISTINCT FROM r.annual_yield
          OR daily_yield IS DISTINCT FROM r.daily_yield
          OR yield_unit IS DISTINCT FROM r.yield_unit
          OR management_fee IS DISTINCT FROM r.management_fee
          OR minimum_investment IS DISTINCT FROM r.minimum_investment
        )
      RETURNING id INTO v_fund_id;
    ELSE
      INSERT INTO public.funds (
        slug, name, manager, fund_type, yield_unit,
        annual_yield, daily_yield, seven_day_yield, thirty_day_yield,
        minimum_investment, management_fee, withdrawal_time,
        website, fact_sheet_date, cma_licensed, is_published, description
      ) VALUES (
        r.slug, r.name, r.manager, 'money_market', r.yield_unit,
        r.annual_yield, r.daily_yield, 0, 0,
        r.minimum_investment, r.management_fee, r.withdrawal_time,
        r.website, v_effective_date, true, true,
        format('The %s Money Market Fund is a CMA-regulated low-risk collective investment scheme managed by %s, investing in short-term Kenyan money market instruments.', r.name, r.manager)
      )
      RETURNING id INTO v_fund_id;
    END IF;

    IF v_fund_id IS NOT NULL THEN
      v_changed_count := v_changed_count + 1;
      INSERT INTO public.fund_yield_snapshots (fund_id, annual_yield, daily_yield, snapshot_date)
      VALUES (v_fund_id, r.annual_yield, r.daily_yield, v_effective_date)
      ON CONFLICT (fund_id, snapshot_date) DO UPDATE
      SET annual_yield = EXCLUDED.annual_yield,
          daily_yield  = EXCLUDED.daily_yield;
    END IF;

    v_fund_id := NULL;
  END LOOP;

  -- Update live status indicator for funds
  INSERT INTO public.section_live_status (section_key, is_live, last_verified_at, updated_at)
  VALUES ('funds', true, now(), now())
  ON CONFLICT (section_key) DO UPDATE
  SET is_live = true,
      last_verified_at = now(),
      updated_at = CASE WHEN v_changed_count > 0 THEN now() ELSE section_live_status.updated_at END;

  -- Sync site_pages ('live-status') meta ONLY when at least one fund actually updated or was inserted
  IF v_changed_count > 0 THEN
    UPDATE public.site_pages
    SET
      meta = jsonb_set(
        jsonb_set(
          COALESCE(meta, '{}'::jsonb),
          '{last_update_date}',
          to_jsonb(v_effective_date::text),
          true
        ),
        '{sections,funds}',
        jsonb_build_object(
          'is_live', true,
          'last_update_date', v_effective_date::text
        ),
        true
      ),
      updated_at = now()
    WHERE slug = 'live-status';
  END IF;
END
$sync$;

-- Schedule weekday-only (Monday–Friday) automated Serrari MMF syncs:
--   1. Primary morning run: 06:30 UTC (09:30 AM EAT), Mon–Fri
--   2. Afternoon catch-up run: 11:00 UTC (02:00 PM EAT), Mon–Fri
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    BEGIN
      PERFORM cron.unschedule('fetch-market-data-mmf');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    BEGIN
      PERFORM cron.unschedule('fetch-market-data-mmf-catchup');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    PERFORM cron.schedule(
      'fetch-market-data-mmf',
      '30 6 * * 1-5',
      $command$
        select net.http_post(
          url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'kff_project_url'), '/') || '/functions/v1/fetch-market-data',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'kff_automations_secret_key')
          ),
          body := '{"fetch_type":"mmf"}'::jsonb
        );
      $command$
    );

    PERFORM cron.schedule(
      'fetch-market-data-mmf-catchup',
      '0 11 * * 1-5',
      $command$
        select net.http_post(
          url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'kff_project_url'), '/') || '/functions/v1/fetch-market-data',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'kff_automations_secret_key')
          ),
          body := '{"fetch_type":"mmf"}'::jsonb
        );
      $command$
    );
  END IF;
END
$cron$;
