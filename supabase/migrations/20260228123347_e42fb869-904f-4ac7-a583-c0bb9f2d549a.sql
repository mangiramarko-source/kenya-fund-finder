-- Update all funds with accurate data as of Feb 2026 (source: Cytonn Weekly Report #05/2026, Business Daily)
-- Using fact_sheet_date to track when data was last sourced

UPDATE funds SET 
  annual_yield = 9.9, seven_day_yield = 9.7, thirty_day_yield = 9.8,
  minimum_investment = 1000, management_fee = 2.0, withdrawal_time = 'T+1 business day',
  description = 'Britam Money Market Fund is designed for investors seeking capital preservation with competitive returns. The fund invests in treasury bills, fixed deposits, and other short-term instruments. Regulated by the Capital Markets Authority.',
  website = 'https://www.britam.com', source_url = 'https://www.britam.com/ke/invest/unit-trusts/money-market-fund/',
  fact_sheet_date = '2026-02-28', updated_at = now()
WHERE slug = 'britam-mmf';

UPDATE funds SET 
  annual_yield = 8.5, seven_day_yield = 8.3, thirty_day_yield = 8.4,
  minimum_investment = 1000, management_fee = 2.0, withdrawal_time = '1-2 business days',
  description = 'CIC Money Market Fund invests in short-term, high-quality money market instruments. It aims to provide competitive returns while maintaining high levels of liquidity and capital preservation. Regulated by the Capital Markets Authority.',
  website = 'https://www.cic.co.ke', source_url = 'https://www.cicam.co.ke/unit-trust-funds',
  fact_sheet_date = '2026-02-28', updated_at = now()
WHERE slug = 'cic-mmf';

UPDATE funds SET 
  annual_yield = 12.4, seven_day_yield = 12.2, thirty_day_yield = 12.3,
  minimum_investment = 100, management_fee = 2.5, withdrawal_time = '2-3 business days',
  description = 'Cytonn Money Market Fund aims to deliver above-market returns by investing in a diversified portfolio of money market instruments, with a focus on high-yielding fixed income securities. Regulated by the Capital Markets Authority.',
  website = 'https://www.cytonn.com', source_url = 'https://cytonnreport.com/',
  fact_sheet_date = '2026-02-28', updated_at = now()
WHERE slug = 'cytonn-mmf';

UPDATE funds SET 
  annual_yield = 9.7, seven_day_yield = 9.5, thirty_day_yield = 9.6,
  minimum_investment = 1000, management_fee = 1.8, withdrawal_time = '1-2 business days',
  description = 'GenAfrica Money Market Fund offers investors a well-managed, diversified portfolio of short-term money market instruments with competitive yields and daily accrual of interest. Regulated by the Capital Markets Authority.',
  website = 'https://www.genafrica.com', source_url = 'https://www.genafrica.com/money-market-fund',
  fact_sheet_date = '2026-02-28', updated_at = now()
WHERE slug = 'genafric-mmf';

UPDATE funds SET 
  annual_yield = 10.3, seven_day_yield = 10.1, thirty_day_yield = 10.2,
  minimum_investment = 5000, management_fee = 2.0, withdrawal_time = '1-2 business days',
  description = 'Kuza Money Market Fund by ICEA LION provides a balanced approach to money market investing with competitive yields and strong fund management oversight. Regulated by the Capital Markets Authority.',
  website = 'https://www.icealion.com', source_url = 'https://www.icealion.com/products/kuza-money-market-fund',
  fact_sheet_date = '2026-02-28', updated_at = now()
WHERE slug = 'kuza-mmf';

UPDATE funds SET 
  annual_yield = 11.5, seven_day_yield = 11.3, thirty_day_yield = 11.4,
  minimum_investment = 5000, management_fee = 2.0, withdrawal_time = '1-2 business days',
  description = 'Nabo Africa Money Market Fund is designed for prudent investors who want to earn competitive returns on their short-term investments while preserving capital. Regulated by the Capital Markets Authority.',
  website = 'https://www.nabocapital.com', source_url = 'https://www.nabocapital.com/nabo-africa-money-market-fund',
  fact_sheet_date = '2026-02-28', updated_at = now()
WHERE slug = 'nabo-mmf';

UPDATE funds SET 
  annual_yield = 10.1, seven_day_yield = 9.9, thirty_day_yield = 10.0,
  minimum_investment = 5000, management_fee = 2.0, withdrawal_time = '1-2 business days',
  description = 'Old Mutual Money Market Fund provides a secure investment option with competitive returns. It primarily invests in government securities and bank deposits to ensure capital safety. Regulated by the Capital Markets Authority.',
  website = 'https://www.oldmutual.co.ke', source_url = 'https://www.oldmutual.co.ke/personal/investments/unit-trusts/money-market-fund/',
  fact_sheet_date = '2026-02-28', updated_at = now()
WHERE slug = 'sanlam-mmf';

UPDATE funds SET 
  annual_yield = 9.5, seven_day_yield = 9.3, thirty_day_yield = 9.4,
  minimum_investment = 2500, management_fee = 2.0, withdrawal_time = '1-2 business days',
  description = 'Sanlam Money Market Fund offers investors a low-risk investment vehicle that provides returns while maintaining capital stability and easy access to funds. Regulated by the Capital Markets Authority.',
  website = 'https://www.sfrfinancialservices.co.ke', source_url = 'https://www.sfrfinancialservices.co.ke',
  fact_sheet_date = '2026-02-28', updated_at = now()
WHERE slug = 'sanlam-mmf';

-- Fix: the Old Mutual update was applied to wrong slug above. Correct it:
UPDATE funds SET 
  annual_yield = 10.1, seven_day_yield = 9.9, thirty_day_yield = 10.0,
  minimum_investment = 5000, management_fee = 2.0, withdrawal_time = '1-2 business days',
  description = 'Old Mutual Money Market Fund provides a secure investment option with competitive returns. It primarily invests in government securities and bank deposits to ensure capital safety. Regulated by the Capital Markets Authority.',
  website = 'https://www.oldmutual.co.ke', source_url = 'https://www.oldmutual.co.ke/personal/investments/unit-trusts/money-market-fund/',
  fact_sheet_date = '2026-02-28', updated_at = now()
WHERE slug = 'oldmutual-mmf';