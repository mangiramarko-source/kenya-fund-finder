-- Make canonical_url nullable
ALTER TABLE stock_disclosures
ALTER COLUMN canonical_url DROP NOT NULL;
-- Add source_url for provenance
ALTER TABLE stock_disclosures
ADD COLUMN source_url text;
-- Update the view to safely expose a source_url for the frontend
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
  COALESCE(canonical_url, source_url) AS source_url,
  source_domain
FROM public.stock_disclosures
WHERE extraction_status = 'published';
