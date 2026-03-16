DROP VIEW IF EXISTS public.social_links_public;
CREATE VIEW public.social_links_public
  WITH (security_invoker = true)
  AS SELECT id, platform, url, icon_name, sort_order
  FROM public.social_links
  WHERE is_active = true;