ALTER TABLE public.news_articles
  ALTER COLUMN date_published DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS source_published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quality_reasons TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS quality_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS classification_version TEXT,
  ADD COLUMN IF NOT EXISTS stock_match_evidence JSONB;

CREATE INDEX IF NOT EXISTS idx_news_articles_publication_order
ON public.news_articles (source_published_at DESC, date_published DESC, created_at DESC)
WHERE status = 'published';

DROP VIEW IF EXISTS public.news_articles_public;
CREATE VIEW public.news_articles_public WITH (security_invoker = on) AS
SELECT id, title, summary, content, source, url, category, read_time, status,
       image_url, date_published, source_published_at, is_featured, created_at, updated_at,
       related_stock_id, ai_insight
FROM public.news_articles
WHERE status = 'published';

GRANT SELECT ON public.news_articles_public TO anon, authenticated, service_role;
