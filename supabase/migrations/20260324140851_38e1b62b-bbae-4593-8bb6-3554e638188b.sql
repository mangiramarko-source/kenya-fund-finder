-- Grant anon SELECT on site_pages but only non-sensitive columns (exclude updated_by)
GRANT SELECT (id, slug, title, content, meta, updated_at) ON public.site_pages TO anon;