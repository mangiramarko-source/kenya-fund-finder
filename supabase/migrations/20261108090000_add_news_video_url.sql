ALTER TABLE public.news_articles
  ADD COLUMN IF NOT EXISTS video_url text;

WITH ranked_duplicates AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY source, url
      ORDER BY created_at ASC, id ASC
    ) AS duplicate_rank
  FROM public.news_articles
  WHERE url IS NOT NULL
)
DELETE FROM public.news_articles articles
USING ranked_duplicates duplicates
WHERE articles.id = duplicates.id
  AND duplicates.duplicate_rank > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'news_articles_source_url_key'
      AND conrelid = 'public.news_articles'::regclass
  ) THEN
    ALTER TABLE public.news_articles
      ADD CONSTRAINT news_articles_source_url_key UNIQUE (source, url);
  END IF;
END $$;

DROP VIEW IF EXISTS public.news_articles_public;
CREATE VIEW public.news_articles_public WITH (security_invoker = on) AS
SELECT id,
       title,
       summary,
       content,
       source,
       url,
       category,
       read_time,
       status,
       image_url,
       video_url,
       date_published,
       source_published_at,
       is_featured,
       created_at,
       updated_at,
       related_stock_id,
       ai_insight
FROM public.news_articles
WHERE status = 'published';

GRANT SELECT ON public.news_articles_public TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
