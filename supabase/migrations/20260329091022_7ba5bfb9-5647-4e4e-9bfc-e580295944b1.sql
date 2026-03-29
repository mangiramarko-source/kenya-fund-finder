-- Grant anon and authenticated access to the news_articles_public view
GRANT SELECT ON public.news_articles_public TO anon;
GRANT SELECT ON public.news_articles_public TO authenticated;

-- The view references news_articles, so anon needs SELECT on it too
GRANT SELECT ON public.news_articles TO anon;
GRANT SELECT ON public.news_articles TO authenticated;