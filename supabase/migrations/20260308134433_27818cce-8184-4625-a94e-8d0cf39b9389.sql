-- Restrict has_role() to authenticated role only (revoke from anon)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;

-- Create filtered public views for news_articles and site_pages (excluding admin UUIDs)
CREATE OR REPLACE VIEW public.news_articles_public WITH (security_invoker = on) AS
SELECT
  id, title, summary, content, source, date_published, url,
  category, read_time, is_featured, status, created_at, updated_at
FROM public.news_articles;

CREATE OR REPLACE VIEW public.site_pages_public WITH (security_invoker = on) AS
SELECT
  id, slug, title, content, meta, updated_at
FROM public.site_pages;