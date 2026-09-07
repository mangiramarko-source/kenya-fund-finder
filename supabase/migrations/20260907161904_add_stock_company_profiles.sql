BEGIN;
SET LOCAL lock_timeout = '5s';

-- Editorial company information is deliberately kept apart from live quote data.
-- `source_url` supports internal review and is never exposed by the public view.
CREATE TABLE IF NOT EXISTS public.stock_company_profiles (
  stock_id uuid PRIMARY KEY REFERENCES public.stocks(id) ON DELETE CASCADE,
  summary text NOT NULL CHECK (char_length(summary) BETWEEN 80 AND 600),
  official_website text NOT NULL CHECK (official_website ~ '^https://'),
  source_url text NOT NULL CHECK (source_url ~ '^https://kenyanstocks[.]com/stock/nse/'),
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.stock_company_profiles IS
  'Reviewed, editorial company profiles. source_url is review-only and intentionally excluded from public market data.';

ALTER TABLE public.stock_company_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published stock company profiles" ON public.stock_company_profiles;
CREATE POLICY "Public can read published stock company profiles"
  ON public.stock_company_profiles
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- Deliberately grant only display-safe columns. The research reference remains private.
REVOKE ALL ON public.stock_company_profiles FROM anon, authenticated;
GRANT SELECT (stock_id, summary, official_website) ON public.stock_company_profiles TO anon, authenticated;

CREATE OR REPLACE VIEW public.stocks_public WITH (security_invoker = true) AS
SELECT s.id, s.symbol, s.name, s.sector, s.price, s.previous_price, s.day_change,
       s.day_change_percent, s.volume, s.market_cap, s.year_high, s.year_low, s.pe_ratio,
       s.dividend_yield, s.is_active, s.sort_order, s.updated_at,
       s.provider_updated_at, s.quote_source, s.logo_url,
       p.summary AS company_summary, p.official_website
FROM public.stocks s
LEFT JOIN public.stock_company_profiles p
  ON p.stock_id = s.id AND p.is_published = true
WHERE s.is_active = true;

GRANT SELECT ON public.stocks_public TO anon, authenticated;

-- Descriptions are original editorial summaries prepared from reviewed company information.
INSERT INTO public.stock_company_profiles (stock_id, summary, official_website, source_url, reviewed_at)
SELECT s.id, p.summary, p.official_website, p.source_url, now()
FROM public.stocks s
JOIN (VALUES
  ('SCOM', 'Safaricom is a Kenyan technology and communications business providing mobile connectivity, digital services, enterprise solutions and M-PESA financial products. Its operations also extend beyond Kenya through its regional growth strategy.', 'https://www.safaricom.co.ke', 'https://kenyanstocks.com/stock/nse/SCOM'),
  ('EQTY', 'Equity Group is a regional financial-services group with banking operations across East and Central Africa. It serves individuals, businesses and institutions through branch, agency, digital and mobile channels.', 'https://equitygroupholdings.com', 'https://kenyanstocks.com/stock/nse/EQTY'),
  ('KCB', 'KCB Group is a regional banking group offering retail, business and corporate financial services. Its network spans several East African markets and includes digital banking, lending and treasury services.', 'https://ke.kcbgroup.com', 'https://kenyanstocks.com/stock/nse/KCB'),
  ('COOP', 'Co-operative Bank is a Kenyan universal bank with deep roots in the co-operative movement. It serves co-operatives, households, small businesses and larger organisations through physical and digital banking channels.', 'https://www.co-opbank.co.ke', 'https://kenyanstocks.com/stock/nse/COOP'),
  ('ABSA', 'Absa Bank Kenya provides personal, business and corporate banking, alongside wealth and investment services. It is part of the wider Absa Group network operating across Africa.', 'https://www.absabank.co.ke', 'https://kenyanstocks.com/stock/nse/ABSA'),
  ('EABL', 'East African Breweries develops, produces and distributes beer, spirits and other beverage brands in East Africa. It operates as part of the Diageo group and has a long-established Kenyan presence.', 'https://www.eabl.com', 'https://kenyanstocks.com/stock/nse/EABL'),
  ('BAT', 'BAT Kenya manufactures and markets tobacco and nicotine products for the Kenyan market and selected export destinations. The listed business forms part of the wider BAT international group.', 'https://www.batkenya.com', 'https://kenyanstocks.com/stock/nse/BAT'),
  ('KNRE', 'Kenya Re provides reinsurance cover to insurance companies in Kenya and other markets. Its business helps insurers spread risk across areas including property, engineering, marine and life insurance.', 'https://www.kenyare.co.ke', 'https://kenyanstocks.com/stock/nse/KNRE'),
  ('KPLC', 'Kenya Power purchases, transmits, distributes and retails electricity across Kenya. It connects customers to the national grid and manages the countrywide electricity distribution network.', 'https://www.kplc.co.ke', 'https://kenyanstocks.com/stock/nse/KPLC'),
  ('BAMB', 'Bamburi Cement produces cement and related building solutions for Kenya and the wider region. The company supplies construction customers through manufacturing, distribution and technical support operations.', 'https://www.bamburigroup.com', 'https://kenyanstocks.com/stock/nse/BAMB'),
  ('SASN', 'Sasini is an agricultural business with tea, coffee, horticulture and livestock interests. Its operations combine farming, processing and export-oriented value chains.', 'https://www.sasini.co.ke', 'https://kenyanstocks.com/stock/nse/SASN'),
  ('KPC', 'Kenya Pipeline Company transports, stores and distributes petroleum products through its national pipeline and depot network. It supports fuel supply infrastructure across Kenya and the region.', 'https://www.kpc.co.ke', 'https://kenyanstocks.com/stock/nse/KPC'),
  ('TOTL', 'TotalEnergies Marketing Kenya markets petroleum products and related energy services. Its network serves motorists, commercial customers and industrial users through service stations and supply channels.', 'https://totalenergies.co.ke', 'https://kenyanstocks.com/stock/nse/TOTL'),
  ('NCBA', 'NCBA Group is a financial-services group serving retail, business and corporate customers. It is known for banking, asset finance and digital financial products delivered across several African markets.', 'https://ncbagroup.com', 'https://kenyanstocks.com/stock/nse/NCBA'),
  ('SCBK', 'Standard Chartered Bank Kenya provides banking and wealth-management services to retail, business and corporate clients. It connects local customers to the Standard Chartered international network.', 'https://www.sc.com/ke', 'https://kenyanstocks.com/stock/nse/SCBK'),
  ('SBIC', 'Stanbic Holdings brings together financial-services businesses in Kenya, including banking and investment services. It is part of Standard Bank Group, which operates across Africa.', 'https://www.stanbicbank.co.ke', 'https://kenyanstocks.com/stock/nse/SBIC'),
  ('IMH', 'I&M Group is a regional financial-services holding company with banking operations in East Africa. Its businesses provide retail, commercial and corporate financial products.', 'https://www.iandmgroup.com', 'https://kenyanstocks.com/stock/nse/IMH'),
  ('KEGN', 'KenGen generates electricity from geothermal, hydro, wind and thermal sources. It is a major supplier of power to Kenya’s national grid and a key participant in renewable-energy development.', 'https://www.kengen.co.ke', 'https://kenyanstocks.com/stock/nse/KEGN'),
  ('BKG', 'BK Group is a Rwanda-based financial-services group led by Bank of Kigali. It provides banking and related financial products to individuals, businesses and institutions.', 'https://bk.rw', 'https://kenyanstocks.com/stock/nse/BKG'),
  ('DTK', 'Diamond Trust Bank Kenya offers personal, business and corporate banking services. It operates within the DTB regional banking network and provides digital, branch and trade-finance solutions.', 'https://dtbk.dtbafrica.com', 'https://kenyanstocks.com/stock/nse/DTK'),
  ('BRIT', 'Britam is a diversified financial-services group with insurance, asset-management and property interests. It serves customers in Kenya and other markets in the region.', 'https://www.britam.com', 'https://kenyanstocks.com/stock/nse/BRIT'),
  ('JUB', 'Jubilee Holdings is an insurance group offering general and life insurance products in East Africa. Its operations serve individuals, businesses and institutional clients.', 'https://jubileeinsurance.com/ke', 'https://kenyanstocks.com/stock/nse/JUB'),
  ('KQ', 'Kenya Airways is Kenya’s national carrier, operating passenger and cargo services through Nairobi and a network of African and international destinations.', 'https://www.kenya-airways.com', 'https://kenyanstocks.com/stock/nse/KQ'),
  ('HFCK', 'HF Group provides mortgage, banking and property-finance services in Kenya. Its business supports home ownership, property development and related financial needs.', 'https://www.hfgroup.co.ke', 'https://kenyanstocks.com/stock/nse/HFCK'),
  ('CIC', 'CIC Insurance Group provides general, life and micro-insurance products, with strong links to Kenya’s co-operative sector. It also offers investment and asset-management services.', 'https://www.cic.co.ke', 'https://kenyanstocks.com/stock/nse/CIC'),
  ('CTUM', 'Centum is an investment company that allocates capital across private equity, real estate and marketable securities. It builds and manages businesses across several sectors in East Africa.', 'https://centum.co.ke', 'https://kenyanstocks.com/stock/nse/CTUM'),
  ('KUKZ', 'Kakuzi is an agricultural company producing avocados, blueberries, macadamia, tea and other crops. It combines estate farming, processing and export-market distribution.', 'https://www.kakuzi.co.ke', 'https://kenyanstocks.com/stock/nse/KUKZ'),
  ('CRWN', 'Crown Paints Kenya manufactures and distributes decorative and industrial paint products. Its range serves households, contractors and commercial projects in Kenya and neighbouring markets.', 'https://www.crownpaints.co.ke', 'https://kenyanstocks.com/stock/nse/CRWN'),
  ('PORT', 'East African Portland Cement manufactures cement and related building materials for Kenya’s construction industry. The company has historically supplied infrastructure and private-sector projects.', 'https://www.eapcc.co.ke', 'https://kenyanstocks.com/stock/nse/PORT'),
  ('CARB', 'Carbacid Investments produces and distributes carbon dioxide for industrial, food-and-beverage and other commercial uses. Its operations also include related gases and environmental products.', 'https://www.carbacid.co.ke', 'https://kenyanstocks.com/stock/nse/CARB'),
  ('NSE20', 'Nairobi Securities Exchange operates Kenya’s main securities marketplace. It provides trading and listing infrastructure for shares, debt instruments, funds and other capital-market products.', 'https://www.nse.co.ke', 'https://kenyanstocks.com/stock/nse/NSE'),
  ('CGEN', 'Car & General supplies and supports equipment, vehicles, motorcycles and power products. Its business serves consumers, farms and commercial customers through distribution and after-sales networks.', 'https://www.carandgeneral.co.ke', 'https://kenyanstocks.com/stock/nse/CGEN'),
  ('LBTY', 'Liberty Kenya Holdings provides life insurance, investment and related financial-protection products. It is part of the Liberty financial-services group operating in Africa.', 'https://www.liberty.co.ke', 'https://kenyanstocks.com/stock/nse/LBTY'),
  ('WTK', 'Williamson Tea Kenya grows, processes and markets tea from its Kenyan estates. The company focuses on quality tea production for domestic and export markets.', 'https://www.williamsontea.com', 'https://kenyanstocks.com/stock/nse/WTK'),
  ('SMER', 'Sameer Africa is a diversified Kenyan company with interests in manufacturing, trading and property. Its business has historically included tyre and automotive-related operations.', 'https://www.sameerafrica.com', 'https://kenyanstocks.com/stock/nse/SMER'),
  ('TPSE', 'TPS Eastern Africa is the holding company behind Serena Hotels in East Africa. It owns and manages hospitality properties serving leisure, business and conference travellers.', 'https://www.serenahotels.com', 'https://kenyanstocks.com/stock/nse/TPSE'),
  ('NMG', 'Nation Media Group is an East African media business operating newspapers, television, radio and digital publishing platforms. Its brands provide news, advertising and audience services across the region.', 'https://nation.africa', 'https://kenyanstocks.com/stock/nse/NMG'),
  ('UNGA', 'Unga Group produces and markets food and animal-nutrition products. Its brands serve households, farmers and commercial customers through Kenyan and regional distribution networks.', 'https://www.ungagroup.com', 'https://kenyanstocks.com/stock/nse/UNGA'),
  ('SLAM', 'Sanlam Kenya provides life insurance, investment and other financial-protection services. It forms part of the wider Sanlam financial-services group.', 'https://www.sanlam.co.ke', 'https://kenyanstocks.com/stock/nse/SLAM'),
  ('TCL', 'TransCentury is an investment holding company with interests in infrastructure-related businesses. Its portfolio has included power, engineering and transport-linked operations in East Africa.', 'https://www.transcentury.co.ke', 'https://kenyanstocks.com/stock/nse/TCL'),
  ('LKL', 'Longhorn Publishers develops and distributes educational and general-interest books. It serves schools, learners and readers in Kenya and other African markets.', 'https://www.longhornpublishers.com', 'https://kenyanstocks.com/stock/nse/LKL'),
  ('SGL', 'Standard Group is a Kenyan media company operating print, television, radio and digital news platforms. Its products serve audiences, advertisers and commercial partners.', 'https://www.standardmedia.co.ke', 'https://kenyanstocks.com/stock/nse/SGL'),
  ('UMME', 'Umeme distributes electricity to customers in Uganda through a large national network. The company supports connections, metering and customer service for homes and businesses.', 'https://www.umeme.co.ug', 'https://kenyanstocks.com/stock/nse/UMME')
) AS p(symbol, summary, official_website, source_url)
  ON s.symbol = p.symbol
ON CONFLICT (stock_id) DO UPDATE
SET summary = EXCLUDED.summary,
    official_website = EXCLUDED.official_website,
    source_url = EXCLUDED.source_url,
    reviewed_at = EXCLUDED.reviewed_at,
    is_published = true,
    updated_at = now();

COMMIT;
