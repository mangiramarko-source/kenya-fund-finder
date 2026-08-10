-- Migration: Add Backend Architecture Data Linking
-- Adds related_stock_id and ai_insight to news_articles
-- Recreates news_articles_public view to expose new fields
-- Creates corporate_actions table

-- 1. Add columns to news_articles
ALTER TABLE public.news_articles 
ADD COLUMN IF NOT EXISTS related_stock_id UUID REFERENCES public.stocks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS ai_insight TEXT;

CREATE INDEX IF NOT EXISTS idx_news_articles_related_stock_id
ON public.news_articles (related_stock_id)
WHERE related_stock_id IS NOT NULL;

-- 2. Update the news_articles_public view
DROP VIEW IF EXISTS public.news_articles_public;
CREATE VIEW public.news_articles_public WITH (security_invoker = on) AS
SELECT id, title, summary, content, source, url, category, read_time, status,
       image_url, date_published, is_featured, created_at, updated_at,
       related_stock_id, ai_insight
FROM public.news_articles
WHERE status = 'published';

GRANT SELECT ON public.news_articles_public TO anon, authenticated, service_role;

-- 3. Create corporate_actions table
CREATE TABLE IF NOT EXISTS public.corporate_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_id UUID NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('earnings', 'dividend', 'agm', 'other')),
    action_date DATE NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS on corporate_actions
ALTER TABLE public.corporate_actions ENABLE ROW LEVEL SECURITY;

-- 5. Policies for corporate_actions
DROP POLICY IF EXISTS "Enable read access for all users" ON public.corporate_actions;
CREATE POLICY "Enable read access for all users" ON public.corporate_actions
    FOR SELECT USING (true);

GRANT SELECT ON public.corporate_actions TO anon, authenticated;
GRANT ALL ON public.corporate_actions TO service_role;
