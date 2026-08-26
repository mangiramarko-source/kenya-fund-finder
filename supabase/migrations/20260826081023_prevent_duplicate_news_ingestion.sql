-- Keep only the intended three-hour news schedule. The older hourly job ran
-- concurrently with fetch-news-cron and created duplicate ingestion races.
DO $cleanup_schedule$
BEGIN
  PERFORM cron.unschedule('fetch-news-hourly');
EXCEPTION
  WHEN OTHERS THEN NULL;
END
$cleanup_schedule$;

-- Retain the earliest copy of each sourced article. A source URL is the
-- ingestion identity; URLs are normalised by the Edge Function before insert.
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

-- A non-partial constraint is necessary for PostgREST's `on_conflict=source,url`
-- target. PostgreSQL still permits multiple NULL URLs, which have no reliable
-- source identity and continue through the title-level application checks.
ALTER TABLE public.news_articles
  ADD CONSTRAINT news_articles_source_url_key UNIQUE (source, url);
