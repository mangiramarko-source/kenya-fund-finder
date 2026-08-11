CREATE TABLE public.stock_disclosure_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
  source_url text NOT NULL UNIQUE CHECK (source_url ~ '^https://'),
  source_domain text NOT NULL CHECK (source_domain !~ '[[:space:]/]'),
  source_type text NOT NULL DEFAULT 'html' CHECK (source_type IN ('html', 'rss', 'sitemap')),
  is_enabled boolean NOT NULL DEFAULT true,
  rate_limit_ms integer NOT NULL DEFAULT 1500 CHECK (rate_limit_ms BETWEEN 500 AND 60000),
  etag text,
  last_modified text,
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  checkpoint jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX stock_disclosure_sources_stock_id_idx
  ON public.stock_disclosure_sources(stock_id);

CREATE TABLE public.stock_disclosures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
  source_id uuid REFERENCES public.stock_disclosure_sources(id) ON DELETE SET NULL,
  canonical_url text NOT NULL UNIQUE CHECK (canonical_url ~ '^https://'),
  source_domain text NOT NULL,
  title text NOT NULL,
  disclosure_type text NOT NULL CHECK (disclosure_type IN (
    'financial_results', 'dividend', 'agm', 'rights_issue', 'stock_split',
    'acquisition', 'governance', 'other'
  )),
  published_at timestamptz NOT NULL,
  summary text,
  key_facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_text text,
  content_hash text NOT NULL,
  model_version text,
  prompt_version text,
  extraction_status text NOT NULL DEFAULT 'review_required' CHECK (extraction_status IN (
    'published', 'review_required', 'rejected', 'superseded'
  )),
  extraction_error text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stock_id, content_hash)
);

CREATE INDEX stock_disclosures_stock_date_idx
  ON public.stock_disclosures(stock_id, published_at DESC);
CREATE INDEX stock_disclosures_status_idx
  ON public.stock_disclosures(extraction_status, published_at DESC);

CREATE TABLE public.stock_corporate_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disclosure_id uuid NOT NULL REFERENCES public.stock_disclosures(id) ON DELETE CASCADE,
  stock_id uuid NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN (
    'dividend', 'agm', 'rights_issue', 'stock_split', 'bonus_issue',
    'merger', 'acquisition', 'other'
  )),
  announcement_date date NOT NULL,
  ex_date date,
  book_closure_date date,
  payment_date date,
  amount numeric,
  currency text,
  ratio text,
  source_url text NOT NULL CHECK (source_url ~ '^https://'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (disclosure_id, action_type)
);

CREATE INDEX stock_corporate_actions_stock_date_idx
  ON public.stock_corporate_actions(stock_id, announcement_date DESC);

ALTER TABLE public.stock_disclosure_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_disclosures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_corporate_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage disclosure sources"
  ON public.stock_disclosure_sources FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage disclosures"
  ON public.stock_disclosures FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage corporate actions"
  ON public.stock_corporate_actions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_stock_disclosure_sources_updated_at
  BEFORE UPDATE ON public.stock_disclosure_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stock_disclosures_updated_at
  BEFORE UPDATE ON public.stock_disclosures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stock_corporate_actions_updated_at
  BEFORE UPDATE ON public.stock_corporate_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE VIEW public.stock_disclosures_public
WITH (security_invoker = true)
AS
SELECT
  id,
  stock_id,
  title,
  disclosure_type,
  published_at,
  summary,
  key_facts,
  canonical_url AS source_url,
  source_domain
FROM public.stock_disclosures
WHERE extraction_status = 'published';

CREATE OR REPLACE VIEW public.stock_corporate_actions_public
WITH (security_invoker = true)
AS
SELECT
  action.id,
  action.stock_id,
  action.action_type,
  action.announcement_date,
  action.ex_date,
  action.book_closure_date,
  action.payment_date,
  action.amount,
  action.currency,
  action.ratio,
  action.source_url
FROM public.stock_corporate_actions action
JOIN public.stock_disclosures disclosure ON disclosure.id = action.disclosure_id
WHERE disclosure.extraction_status = 'published';

CREATE POLICY "Public reads published disclosures"
  ON public.stock_disclosures FOR SELECT
  USING (extraction_status = 'published');

CREATE POLICY "Public reads published corporate actions"
  ON public.stock_corporate_actions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.stock_disclosures disclosure
    WHERE disclosure.id = disclosure_id
      AND disclosure.extraction_status = 'published'
  ));

GRANT SELECT ON public.stock_disclosures_public TO anon, authenticated;
GRANT SELECT ON public.stock_corporate_actions_public TO anon, authenticated;
GRANT SELECT ON public.stock_disclosures TO anon, authenticated;
GRANT SELECT ON public.stock_corporate_actions TO anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fetch-stock-disclosures-daily') THEN
    PERFORM cron.unschedule('fetch-stock-disclosures-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'fetch-stock-disclosures-daily',
  '20 2 * * *',
  $$
  SELECT net.http_post(
    url := rtrim((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'kff_project_url' LIMIT 1), '/') || '/functions/v1/fetch-stock-disclosures',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'kff_anon_key' LIMIT 1),
      'x-webhook-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'kff_disclosures_webhook_secret' LIMIT 1)
    ),
    body := '{"mode":"daily"}'::jsonb
  );
  $$
);

INSERT INTO public.stock_disclosure_sources (stock_id, source_url, source_domain, source_type)
SELECT id, source.url, source.domain, 'html'
FROM public.stocks
JOIN (VALUES
  ('SCOM', 'https://www.safaricom.co.ke/investor-relations-landing/reports/financial-report/financial-results', 'www.safaricom.co.ke'),
  ('EQTY', 'https://equitygroupholdings.com/investor-relations/', 'equitygroupholdings.com'),
  ('KCB', 'https://kcbgroup.com/contact-us', 'kcbgroup.com')
) AS source(symbol, url, domain) ON upper(public.stocks.symbol) = source.symbol
ON CONFLICT (source_url) DO NOTHING;
