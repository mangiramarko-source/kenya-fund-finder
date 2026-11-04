-- =============================================================================
-- Automated Daily Fund Sync (MMFs, Fixed Income, Balanced, Equity)
-- Seeds all 85 funds as of 2026-11-04 & schedules daily dual pg_cron syncs
-- =============================================================================

-- 1. Ensure section_live_status table exists
CREATE TABLE IF NOT EXISTS public.section_live_status (
  section_key text PRIMARY KEY,
  is_live boolean NOT NULL DEFAULT true,
  last_verified_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.section_live_status ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read of section_live_status') THEN
    CREATE POLICY "Allow public read of section_live_status" ON public.section_live_status FOR SELECT USING (true);
  END IF;
END $$;

-- 2. Ensure change_log table exists
CREATE TABLE IF NOT EXISTS public.change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  action text NOT NULL,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Upsert all funds and record snapshots
DO $sync$
DECLARE
  r RECORD;
  v_fund_id uuid;
  v_exists boolean;
  v_changed_count integer := 0;
  v_effective_date date := DATE '2026-11-04';
BEGIN
  FOR r IN
    SELECT * FROM (
      VALUES
        ('faulu-sh-mmf', 'Faulu', 'Old Mutual Investment Group', 'money_market', '%', 10.28::numeric, 10.82::numeric, 2.00::numeric, 1000::numeric, '1-2 days', 'https://www.faulukenya.com'),
        ('lofty-corban-sh-mmf', 'Lofty-Corban', 'Lofty-Corban Investments Limited', 'money_market', '%', 10.08::numeric, 10.60::numeric, 2.00::numeric, 1000::numeric, '1 day', 'https://loftycorban.com'),
        ('nabo-sh-mmf', 'Nabo', 'Nabo Capital Limited', 'money_market', '%', 9.93::numeric, 10.44::numeric, 2.25::numeric, 100000::numeric, '1-2 days', 'https://www.nabocapital.com'),
        ('orient-kasha-sh-mmf', 'Orient Kasha', 'Orient Asset Managers Limited', 'money_market', '%', 9.89::numeric, 10.39::numeric, 2.00::numeric, 1000::numeric, '1-2 days', 'https://orientasset.co.ke'),
        ('old-mutual-sh-mmf', 'Old Mutual', 'Old Mutual Investment Group', 'money_market', '%', 9.81::numeric, 10.31::numeric, 2.00::numeric, 1000::numeric, '1-2 days', 'https://www.oldmutual.co.ke'),
        ('etica-sh-mmf', 'Etica', 'Etica Capital Ltd', 'money_market', '%', 9.78::numeric, 10.27::numeric, 2.00::numeric, 100::numeric, 'Instant (M-Pesa)', 'https://eticacapital.com'),
        ('kuza-sh-mmf', 'Kuza', 'Kuza Asset Management Limited', 'money_market', '%', 9.71::numeric, 10.20::numeric, 2.00::numeric, 1000::numeric, '1 day', 'https://www.kuza.africa'),
        ('arvocap-sh-mmf', 'Arvocap', 'Arvocap Asset Managers Limited', 'money_market', '%', 9.70::numeric, 10.19::numeric, 2.00::numeric, 3000::numeric, '1-2 days', 'https://www.arvocap.com'),
        ('jubilee-sh-mmf', 'Jubilee', 'Jubilee Asset Management', 'money_market', '%', 9.70::numeric, 10.19::numeric, 2.00::numeric, 5000::numeric, '1-2 days', 'https://jubileeinsurance.com/ke/'),
        ('madison-sh-mmf', 'Madison', 'Madison Investment Managers Limited', 'money_market', '%', 9.47::numeric, 9.93::numeric, 2.00::numeric, 5000::numeric, '1-2 days', 'https://www.madison.co.ke'),
        ('genafrica-sh-mmf', 'GenAfrica', 'GenAfrica Asset Managers Limited', 'money_market', '%', 9.24::numeric, 9.68::numeric, 2.00::numeric, 500000::numeric, '1-3 days', 'https://genafrica.com'),
        ('britam-sh-mmf', 'Britam', 'Britam Asset Managers', 'money_market', '%', 9.20::numeric, 9.63::numeric, 2.00::numeric, 1000::numeric, '1-2 days', 'https://ke.britam.com'),
        ('sanlamallianz-sh-mmf', 'SanlamAllianz', 'Sanlam Allianz Investments Limited', 'money_market', '%', 9.16::numeric, 9.59::numeric, 2.00::numeric, 3000::numeric, '1-2 days', 'https://www.sanlam.co.ke'),
        ('kcb-sh-mmf', 'KCB', 'KCB Asset Management Ltd', 'money_market', '%', 8.90::numeric, 9.31::numeric, 2.00::numeric, 1000::numeric, '1-2 days', 'https://ke.kcbbankgroup.com'),
        ('dry-associates-sh-mmf', 'Dry Associates', 'Dry Associates Investment Bank', 'money_market', '%', 8.81::numeric, 9.21::numeric, 2.26::numeric, 1000000::numeric, '2-3 days', 'https://www.dryassociates.com'),
        ('genghis-sh-mmf', 'Genghis', 'Genghis Capital Limited', 'money_market', '%', 8.49::numeric, 8.86::numeric, 2.00::numeric, 500::numeric, '1-2 days', 'https://www.genghis-capital.com'),
        ('cpf-sh-mmf', 'CPF', 'CPF Financial Services', 'money_market', '%', 8.48::numeric, 8.85::numeric, 3.00::numeric, 1000::numeric, '1-2 days', 'https://www.cpf.or.ke'),
        ('ncba-sh-mmf', 'NCBA', 'NCBA Investment Bank', 'money_market', '%', 7.99::numeric, 8.32::numeric, 2.00::numeric, 5000::numeric, '1 day', 'https://investment-bank.ncbagroup.com'),
        ('african-alliance-sh-mmf', 'African Alliance Enhanced', 'African Alliance Kenya Asset Management', 'money_market', '%', 7.95::numeric, 8.27::numeric, 2.00::numeric, 100000::numeric, '2-3 days', 'https://www.africanallianceassetmanagement.com'),
        ('apollo-sh-mmf', 'Apollo', 'Apollo Asset Management Company Ltd', 'money_market', '%', 7.84::numeric, 8.16::numeric, 2.00::numeric, 1000::numeric, '1-2 days', 'https://www.apainsurance.org'),
        ('coop-sh-mmf', 'Co-op', 'Co-op Trust Investment Services Limited', 'money_market', '%', 7.73::numeric, 8.04::numeric, 0.90::numeric, 500::numeric, '1-2 days', 'https://www.co-opbank.co.ke'),
        ('icea-sh-mmf', 'ICEA Lion', 'ICEA LION Asset Management Ltd', 'money_market', '%', 7.58::numeric, 7.87::numeric, 2.00::numeric, 500::numeric, '1-2 days', 'https://icealion.co.ke'),
        ('ziidi-money-market-fund', 'Ziidi', 'Standard Investment Bank, ALA Capital Limited & Sanlam Investments East Africa Limited', 'money_market', '%', 6.72::numeric, 6.95::numeric, 2.00::numeric, 100::numeric, 'Instant (M-Pesa)', 'https://www.safaricom.co.ke/personal/m-pesa/wealth/ziidi'),
        ('stanbic-sh-mmf', 'Stanbic', 'Stanbic Investment Management Services', 'money_market', '%', 5.45::numeric, 5.60::numeric, 2.00::numeric, 1000::numeric, '1-2 days', 'https://www.stanbicbank.co.ke'),
        ('cytonn-sh-mmf', 'Cytonn', 'Cytonn Asset Managers Limited', 'money_market', '%', 10.54::numeric, 11.11::numeric, 2.00::numeric, 1000::numeric, 'Instant (M-Pesa)', 'https://www.cytonn.com/investments/money-market-fund'),
        ('cic-sh-mmf', 'CIC', 'CIC Asset Management Ltd', 'money_market', '%', 8.08::numeric, 8.41::numeric, 2.00::numeric, 5000::numeric, '1-2 days', 'https://cic.co.ke'),
        ('equity-sh-mmf', 'Equity', 'Equity Investment Bank', 'money_market', '%', 5.28::numeric, 5.42::numeric, 2.00::numeric, 1000::numeric, '1 day', 'https://equitygroupholdings.com/ke/save-invest'),
        ('nabo-usd-mmf', 'Nabo USD', 'Nabo Capital Limited', 'money_market', 'USD', 5.98::numeric, 6.16::numeric, 2.50::numeric, 130000::numeric, '2-3 days', 'https://www.nabocapital.com'),
        ('jubilee-usd-mmf', 'Jubilee USD', 'Jubilee Asset Management', 'money_market', 'USD', 5.42::numeric, 5.57::numeric, 1.00::numeric, 130000::numeric, '2-3 days', 'https://jubileeinsurance.com/ke/'),
        ('old-mutual-usd-mmf', 'Old Mutual USD', 'Old Mutual Investment Group', 'money_market', 'USD', 5.10::numeric, 5.23::numeric, 1.00::numeric, 13000::numeric, '2-3 days', 'https://www.oldmutual.co.ke'),
        ('kuza-usd-mmf', 'Kuza USD', 'Kuza Asset Management Limited', 'money_market', 'USD', 5.07::numeric, 5.20::numeric, 2.00::numeric, 13000::numeric, '1-2 days', 'https://www.kuza.africa'),
        ('kcb-usd-mmf', 'KCB USD', 'KCB Asset Management Ltd', 'money_market', 'USD', 4.99::numeric, 5.12::numeric, 0.50::numeric, 13000::numeric, '2-3 days', 'https://ke.kcbbankgroup.com'),
        ('lofty-corban-usd-mmf', 'Lofty-Corban USD', 'Lofty-Corban Investments Limited', 'money_market', 'USD', 4.97::numeric, 5.10::numeric, 0.20::numeric, 13000::numeric, '1-2 days', 'https://loftycorban.com'),
        ('dry-associates-usd-mmf', 'Dry Associates USD', 'Dry Associates Investment Bank', 'money_market', 'USD', 4.94::numeric, 5.06::numeric, 1.50::numeric, 1300000::numeric, '2-3 days', 'https://www.dryassociates.com'),
        ('sanlam-usd-mmf', 'SanlamAllianz USD', 'Sanlam Allianz Investments Limited', 'money_market', 'USD', 4.91::numeric, 5.03::numeric, 2.00::numeric, 325000::numeric, '2-3 days', 'https://www.sanlam.co.ke'),
        ('stanbic-usd-mmf', 'Stanbic USD', 'Stanbic Investment Management Services', 'money_market', 'USD', 4.85::numeric, 4.97::numeric, 1.00::numeric, 13000::numeric, '2-3 days', 'https://www.stanbicbank.co.ke'),
        ('cpf-usd-mmf', 'CPF USD', 'CPF Financial Services', 'money_market', 'USD', 3.75::numeric, 3.82::numeric, 5.00::numeric, 13000::numeric, '2-3 days', 'https://www.cpf.or.ke'),
        ('ncba-usd-mmf', 'NCBA USD', 'NCBA Investment Bank', 'money_market', 'USD', 3.51::numeric, 3.57::numeric, 1.00::numeric, 13000::numeric, '1-2 days', 'https://investment-bank.ncbagroup.com'),
        ('cytonn-usd-mmf', 'Cytonn USD', 'Cytonn Asset Managers Limited', 'money_market', 'USD', 5.29::numeric, 5.43::numeric, 1.00::numeric, 130000::numeric, '1-2 days', 'https://www.cytonn.com'),
        ('cic-dollar-usd-mmf', 'CIC Dollar', 'CIC Asset Management Ltd', 'money_market', 'USD', 4.02::numeric, 4.10::numeric, 1.50::numeric, 130000::numeric, '2-3 days', 'https://cic.co.ke'),
        ('sanlamallianz-balanced-sh', 'SanlamAllianz', 'Sanlam Allianz Investments Limited', 'balanced', 'KES', 0.00::numeric, 32.65::numeric, 2.00::numeric, 2500::numeric, '1-3 days', 'https://www.sanlam.co.ke'),
        ('zimele-balanced-sh', 'Zimele', 'Zimele Asset Management', 'balanced', 'KES', 0.00::numeric, 21.50::numeric, 2.50::numeric, 100::numeric, '1-3 days', 'https://www.zimele.co.ke'),
        ('britam-balanced-sh', 'Britam', 'Britam Asset Managers', 'balanced', 'KES', 0.00::numeric, 171.18::numeric, 2.00::numeric, 1000::numeric, '3-5 days', 'https://ke.britam.com'),
        ('african-alliance-balanced-sh', 'African Alliance', 'African Alliance Kenya Asset Management', 'balanced', 'KES', 0.00::numeric, 22.72::numeric, 2.00::numeric, 100000::numeric, '3-5 days', 'https://www.africanallianceassetmanagement.com'),
        ('icea-balanced-sh', 'ICEA LION', 'ICEA LION Asset Management Ltd', 'balanced', 'KES', 0.00::numeric, 142.20::numeric, 2.00::numeric, 500::numeric, '3-5 days', 'https://icealion.co.ke'),
        ('CPF-balanced-fund', 'CPF', 'CPF Financial Services', 'balanced', 'KES', 0.00::numeric, 107.60::numeric, 3.00::numeric, 5000::numeric, '3-5 days', 'https://www.cpf.or.ke'),
        ('apollo-balanced-sh', 'Apollo', 'Apollo Asset Management Company Ltd', 'balanced', 'KES', 0.00::numeric, 164.38::numeric, 2.00::numeric, 1000::numeric, '1-2 days', 'https://www.apainsurance.org'),
        ('lofty-corban-private-debt-sh', 'Lofty-Corban Private Debt', 'Lofty-Corban Investments Limited', 'special', '%', 14.07::numeric, 15.11::numeric, 2.00::numeric, 1000000::numeric, '2-3 days', 'https://loftycorban.com'),
        ('mayfair-fixed-income-fund', 'Mayfair', 'Mayfair Asset Managers', 'fixed_income', '%', 15.76::numeric, 17.07::numeric, 2.00::numeric, 5000::numeric, '2-3 days', 'https://www.mayfair.co.ke'),
        ('dry-associates-special-high-yield-sh', 'Dry Associates Special High Yield', 'Dry Associates Investment Bank', 'equity', 'KES', 11.90::numeric, 12.64::numeric, 3.00::numeric, 1000000::numeric, '2-3 days', 'https://www.dryassociates.com'),
        ('lofty-corban-bond-fund', 'Lofty Corban', 'Lofty-Corban Investments Limited', 'bond', '%', 12.53::numeric, 13.35::numeric, 2.00::numeric, 1000::numeric, '1-2 days', 'https://loftycorban.com'),
        ('madison-wealth-sh', 'Madison Wealth', 'Madison Investment Managers Limited', 'equity', '%', 11.26::numeric, 11.92::numeric, 2.00::numeric, 5000::numeric, '2-3 days', 'https://www.madison.co.ke'),
        ('globatec-fixed-income-sh', 'Globatec', 'Globatec Capital Limited', 'fixed_income', '%', 12.46::numeric, 13.27::numeric, 2.00::numeric, 1000::numeric, '1-3 days', 'https://globatec.co.ke'),
        ('coop-fixed-sh', 'Co-op', 'Co-op Trust Investment Services Limited', 'fixed_income', '%', 12.46::numeric, 13.27::numeric, 2.00::numeric, 1000::numeric, '1-2 days', 'https://www.co-opbank.co.ke'),
        ('spearhead-africa-infrastructure-sh', 'Spearhead Africa Infrastructure', 'Spearhead Africa Asset Management', 'equity', 'KES', 0.00::numeric, 100.00::numeric, 2.00::numeric, 1000::numeric, '3-5 days', 'https://spearhead.africa'),
        ('ncba-equity-sh', 'NCBA', 'NCBA Investment Bank', 'equity', 'KES', 0.00::numeric, 276.57::numeric, 2.00::numeric, 1000::numeric, '1 day', 'https://investment-bank.ncbagroup.com'),
        ('icea-equity-sh', 'ICEA LION', 'ICEA LION Asset Management Ltd', 'equity', 'KES', 0.00::numeric, 171.27::numeric, 2.00::numeric, 500::numeric, '3-5 days', 'https://icealion.co.ke'),
        ('britam-equity-sh', 'Britam', 'Britam Asset Managers', 'equity', 'KES', 0.00::numeric, 163.59::numeric, 2.00::numeric, 1000::numeric, '3-5 days', 'https://ke.britam.com'),
        ('african-alliance-equity-sh', 'African Alliance Special fund', 'African Alliance Kenya Asset Management', 'equity', 'KES', 0.00::numeric, 243.64::numeric, 2.00::numeric, 100000::numeric, '3-5 days', 'https://www.africanallianceassetmanagement.com'),
        ('kuza-momentum-special-kes', 'Kuza Momentum', 'Kuza Asset Management Limited', 'special', 'KES', 0.00::numeric, 155.11::numeric, 2.00::numeric, 100000::numeric, '3-5 days', 'https://www.kuza.africa'),
        ('nabo-equity-usd', 'Nabo', 'Nabo Capital Limited', 'equity', 'KES', 0.00::numeric, 95.14::numeric, 2.25::numeric, 100000::numeric, '3-5 days', 'https://www.nabocapital.com'),
        ('arvocap-equity-sh', 'Arvocap', 'Arvocap Asset Managers Limited', 'equity', 'KES', 0.00::numeric, 2.35::numeric, 2.00::numeric, 100000::numeric, '3-5 days', 'https://www.arvocap.com'),
        ('zimele-fixed-income-sh', 'Zimele', 'Zimele Asset Management', 'fixed_income', '%', 11.68::numeric, 12.39::numeric, 2.00::numeric, 100::numeric, '1-2 days', 'https://www.zimele.co.ke'),
        ('etica-sh', 'Etica', 'Etica Capital Ltd', 'fixed_income', '%', 11.60::numeric, 12.30::numeric, 2.00::numeric, 100::numeric, '1-2 days', 'https://eticacapital.com'),
        ('african-alliance-fixed-income-sh', 'African Alliance', 'African Alliance Kenya Asset Management', 'fixed_income', '%', 10.99::numeric, 11.61::numeric, 2.00::numeric, 100000::numeric, '2-3 days', 'https://www.africanallianceassetmanagement.com'),
        ('equity-balanced-sh', 'Equity', 'Equity Investment Bank', 'balanced', 'KES', 0.00::numeric, 171.38::numeric, 2.00::numeric, 1000::numeric, '3-5 days', 'https://equitygroupholdings.com/ke/save-invest'),
        ('cic-balanced-sh', 'CIC', 'CIC Asset Management Ltd', 'balanced', 'KES', 0.00::numeric, 7.67::numeric, 2.00::numeric, 5000::numeric, '3-5 days', 'https://cic.co.ke'),
        ('coop-bond-sh', 'Co-op Bond', 'Co-op Trust Investment Services Limited', 'bond', '%', 10.76::numeric, 11.36::numeric, 2.00::numeric, 1000::numeric, '1-2 days', 'https://www.co-opbank.co.ke'),
        ('madison-fixed-sh', 'Madison', 'Madison Investment Managers Limited', 'fixed_income', '%', 10.71::numeric, 11.30::numeric, 2.00::numeric, 5000::numeric, '1-2 days', 'https://www.madison.co.ke'),
        ('kuza-fixed-sh', 'Kuza', 'Kuza Asset Management Limited', 'fixed_income', '%', 10.64::numeric, 11.22::numeric, 2.00::numeric, 1000::numeric, '1-2 days', 'https://www.kuza.africa'),
        ('jubilee-sh', 'Jubilee', 'Jubilee Asset Management', 'fixed_income', '%', 10.62::numeric, 11.20::numeric, 2.00::numeric, 100::numeric, '1-2 days', 'https://jubileeinsurance.com/ke/'),
        ('cic-equity-sh', 'CIC', 'CIC Asset Management Ltd', 'equity', 'KES', 0.00::numeric, 10.28::numeric, 2.00::numeric, 5000::numeric, '3-5 days', 'https://cic.co.ke'),
        ('kcb-fixed-income-sh', 'KCB', 'KCB Asset Management Ltd', 'fixed_income', '%', 10.47::numeric, 11.04::numeric, 2.00::numeric, 1000::numeric, '1-2 days', 'https://ke.kcbbankgroup.com'),
        ('nabo-fixed-income-sh', 'Nabo', 'Nabo Capital Limited', 'fixed_income', '%', 10.29::numeric, 10.84::numeric, 2.00::numeric, 100000::numeric, '1-2 days', 'https://www.nabocapital.com'),
        ('genafrica-fixed-income-sh', 'GenAfrica', 'GenAfrica Asset Managers Limited', 'fixed_income', '%', 10.18::numeric, 10.71::numeric, 2.00::numeric, 1000::numeric, '1-3 days', 'https://genafrica.com'),
        ('britam-bond-sh', 'Britam Bond', 'Britam Asset Managers', 'bond', '%', 10.00::numeric, 10.52::numeric, 2.00::numeric, 1000::numeric, '1-2 days', 'https://ke.britam.com'),
        ('icea-sh-fixed-income', 'ICEA Ksh', 'ICEA LION Asset Management Ltd', 'fixed_income', '%', 9.89::numeric, 10.39::numeric, 2.00::numeric, 500::numeric, '1-2 days', 'https://icealion.co.ke'),
        ('gulfcap-fixed-sh', 'GulfCap', 'GulfCap Asset Management', 'fixed_income', '%', 9.69::numeric, 10.17::numeric, 2.00::numeric, 1000::numeric, '1-2 days', 'https://gulfcap.co.ke'),
        ('orient-hifadhi-sh', 'Orient Hifadhi', 'Orient Asset Managers Limited', 'fixed_income', '%', 8.76::numeric, 9.15::numeric, 2.00::numeric, 100000::numeric, '1-2 days', 'https://orientasset.co.ke'),
        ('cpf-bond-sh', 'CPF Bond', 'CPF Financial Services', 'bond', '%', 8.61::numeric, 8.99::numeric, 2.00::numeric, 1000::numeric, '1-2 days', 'https://www.cpf.or.ke'),
        ('sanlamallianz-fixed-income-sh', 'SanlamAllianz', 'Sanlam Allianz Investments Limited', 'fixed_income', '%', 7.26::numeric, 7.53::numeric, 2.00::numeric, 2500::numeric, '1-2 days', 'https://www.sanlam.co.ke'),
        ('ncba-fixed-income-sh', 'NCBA', 'NCBA Investment Bank', 'fixed_income', '%', 7.11::numeric, 7.37::numeric, 2.00::numeric, 1000::numeric, '1-2 days', 'https://investment-bank.ncbagroup.com'),
        ('etica-shariah-special-sh', 'Etica Shariah', 'Etica Capital Ltd', 'special', '%', 5.16::numeric, 5.30::numeric, 2.00::numeric, 100::numeric, '1-2 days', 'https://eticacapital.com'),
        ('arvocap-fixed-income-sh', 'Arvocap Almasi', 'Arvocap Asset Managers Limited', 'fixed_income', '%', 1.66::numeric, 1.67::numeric, 1.00::numeric, 100000::numeric, '1-2 days', 'https://www.arvocap.com'),
        ('cic-fixed-income-sh', 'CIC', 'CIC Asset Management Ltd', 'fixed_income', '%', 9.99::numeric, 10.51::numeric, 2.00::numeric, 1000000::numeric, '1-2 days', 'https://cic.co.ke')
    ) AS t(slug, name, manager, fund_type, yield_unit, daily_yield, annual_yield, management_fee, minimum_investment, withdrawal_time, website)
  LOOP
    SELECT EXISTS (SELECT 1 FROM public.funds WHERE lower(slug) = lower(r.slug)) INTO v_exists;

    IF v_exists THEN
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

      -- If nothing changed, still get fund_id for snapshot verification
      IF v_fund_id IS NULL THEN
        SELECT id INTO v_fund_id FROM public.funds WHERE lower(slug) = lower(r.slug);
      ELSE
        v_changed_count := v_changed_count + 1;
      END IF;
    ELSE
      INSERT INTO public.funds (
        slug, name, manager, fund_type, yield_unit,
        annual_yield, daily_yield, seven_day_yield, thirty_day_yield,
        minimum_investment, management_fee, withdrawal_time,
        website, fact_sheet_date, cma_licensed, is_published, description
      ) VALUES (
        r.slug, r.name, r.manager, r.fund_type, r.yield_unit,
        r.annual_yield, r.daily_yield, 0, 0,
        r.minimum_investment, r.management_fee, r.withdrawal_time,
        r.website, v_effective_date, true, true,
        format('The %s is a CMA-regulated %s fund managed by %s.', r.name, r.fund_type, r.manager)
      )
      RETURNING id INTO v_fund_id;
      v_changed_count := v_changed_count + 1;
    END IF;

    IF v_fund_id IS NOT NULL THEN
      INSERT INTO public.fund_yield_snapshots (fund_id, annual_yield, daily_yield, snapshot_date)
      VALUES (v_fund_id, r.annual_yield, r.daily_yield, v_effective_date)
      ON CONFLICT (fund_id, snapshot_date) DO UPDATE
      SET annual_yield = EXCLUDED.annual_yield,
          daily_yield  = EXCLUDED.daily_yield;
    END IF;

    v_fund_id := NULL;
  END LOOP;

  -- Update section_live_status
  INSERT INTO public.section_live_status (section_key, is_live, last_verified_at, updated_at)
  VALUES ('funds', true, now(), now())
  ON CONFLICT (section_key) DO UPDATE
  SET is_live = true,
      last_verified_at = now(),
      updated_at = CASE WHEN v_changed_count > 0 THEN now() ELSE section_live_status.updated_at END;

  -- Sync site_pages live-status meta
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
END
$sync$;

-- 4. Schedule dual weekday cron jobs in pg_cron
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    BEGIN PERFORM cron.unschedule('fetch-market-data-funds'); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN PERFORM cron.unschedule('fetch-market-data-funds-catchup'); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN PERFORM cron.unschedule('fetch-market-data-mmf'); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN PERFORM cron.unschedule('fetch-market-data-mmf-catchup'); EXCEPTION WHEN OTHERS THEN NULL; END;

    -- 1. Primary morning run: 06:30 UTC (09:30 AM EAT), Mon-Fri
    PERFORM cron.schedule(
      'fetch-market-data-funds',
      '30 6 * * 1-5',
      $command$
        select net.http_post(
          url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'kff_project_url'), '/') || '/functions/v1/fetch-market-data',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'kff_automations_secret_key')
          ),
          body := '{"fetch_type":"funds"}'::jsonb
        );
      $command$
    );

    -- 2. Afternoon catch-up run: 11:00 UTC (02:00 PM EAT), Mon-Fri
    PERFORM cron.schedule(
      'fetch-market-data-funds-catchup',
      '0 11 * * 1-5',
      $command$
        select net.http_post(
          url := rtrim((select decrypted_secret from vault.decrypted_secrets where name = 'kff_project_url'), '/') || '/functions/v1/fetch-market-data',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'kff_automations_secret_key')
          ),
          body := '{"fetch_type":"funds"}'::jsonb
        );
      $command$
    );
  END IF;
END
$cron$;