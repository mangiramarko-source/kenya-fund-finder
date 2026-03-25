CREATE OR REPLACE VIEW public.news_articles_public AS
SELECT
  id,
  title,
  summary,
  content,
  source,
  date_published,
  url,
  category,
  read_time,
  is_featured,
  status,
  created_at,
  updated_at,
  image_url
FROM public.news_articles
WHERE status = 'published';