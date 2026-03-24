-- Revoke full table SELECT for authenticated, then grant only safe columns
REVOKE SELECT ON public.site_pages FROM authenticated;
GRANT SELECT (id, slug, title, content, meta, updated_at, updated_by) ON public.site_pages TO authenticated;

-- Note: updated_by is needed for admin dashboard queries, but the public view
-- (site_pages_public) already excludes it, so regular users won't see it through the view.