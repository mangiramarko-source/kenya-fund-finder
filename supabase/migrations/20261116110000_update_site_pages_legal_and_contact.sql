-- Standardize site_pages (about, contact, privacy, terms, disclaimer) for Elyon Innovation LTD
-- and remove legacy MMF Compare Kenya / info@mmfcompare.co.ke seed text.

INSERT INTO public.site_pages (slug, title, content, meta)
VALUES
  (
    'about',
    'About Kenya Fund Finder',
    'Kenya Fund Finder is an independent financial research and market comparison platform operated by Elyon Innovation LTD, a company incorporated in the Republic of Kenya. We aggregate publicly reported data across CMA-regulated Money Market Funds and Unit Trusts, Nairobi Securities Exchange (NSE) listed equities, Central Bank of Kenya (CBK) Treasury Bills, Bonds, commercial bank fixed deposits, FX rates, and SASRA-regulated DT-SACCOs.

Our mission is to promote financial literacy and data transparency for Kenyan retail and institutional researchers. We are strictly a read-only educational and informational platform — we do not offer personal loans, credit facilities, banking, or brokerage services, and we are not affiliated with any fund manager, commercial bank, SACCO, the CMA, the NSE, or the CBK.

Whether you are comparing daily MMF yields after 15% withholding tax, tracking NSE share prices, or modeling fixed-income scenarios in our calculators and AI Lab, Kenya Fund Finder equips you with clear, source-attributed market intelligence.',
    '{"company": "Elyon Innovation LTD", "website": "https://kenyafundfinder.com"}'::jsonb
  ),
  (
    'contact',
    'Contact Us',
    'We welcome questions, data correction reports, privacy inquiries, and partnership requests regarding Kenya Fund Finder.

Kenya Fund Finder is owned and operated by Elyon Innovation LTD (Nairobi, Republic of Kenya).

For general inquiries, data corrections, or Data Protection / account deletion support under the Kenya Data Protection Act, 2019, please email our team directly at: kenyafundfinder@outlook.com

We typically respond within 24 to 48 hours on business days. To request instant or manual deletion of your account and personal records, you may also visit https://kenyafundfinder.com/delete-account at any time.',
    '{"email": "kenyafundfinder@outlook.com", "company": "Elyon Innovation LTD"}'::jsonb
  ),
  (
    'disclaimer',
    'Financial & Regulatory Disclaimer',
    'Important Disclaimer: This platform provides read-only market information and educational comparison tools only and does not constitute investment, financial, or tax advice. Kenya Fund Finder does not offer personal loans, credit facilities, banking, or brokerage services. Past performance is not indicative of future results. All investments carry risk. Please consult with a qualified licensed financial advisor before making any investment decisions.
Unit trust funds listed are regulated by the Capital Markets Authority (CMA) of Kenya, listed equities trade on the Nairobi Securities Exchange (NSE), government securities and commercial banks are regulated by the Central Bank of Kenya (CBK), and DT-SACCOs are regulated by SASRA. Yields shown are gross annual effective yields before 15% withholding tax unless stated otherwise. Data may not reflect real-time executable values.',
    '{}'::jsonb
  )
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  meta = EXCLUDED.meta,
  updated_at = now();
