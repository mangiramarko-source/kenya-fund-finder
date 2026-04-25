DELETE FROM public.news_articles WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY lower(title) ORDER BY created_at DESC) AS rn
    FROM public.news_articles
  ) t WHERE rn > 1
);