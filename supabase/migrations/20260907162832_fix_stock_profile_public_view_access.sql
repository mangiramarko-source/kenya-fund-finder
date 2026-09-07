BEGIN;
SET LOCAL lock_timeout = '5s';

-- stocks_public is a security-invoker view and evaluates is_published in its
-- join predicate. This column is needed for evaluation only; source_url stays
-- intentionally unavailable to public roles.
GRANT SELECT (stock_id, summary, official_website, is_published)
  ON public.stock_company_profiles TO anon, authenticated;

COMMIT;
