-- Migration: Add missing foreign key indexes to resolve unindexed foreign key warnings
-- Note: Ran without CONCURRENTLY to ensure transactional migration compatibility.

CREATE INDEX IF NOT EXISTS idx_admin_posts_author_user_id ON public.admin_posts(author_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_posts_persona_id ON public.admin_posts(persona_id);
CREATE INDEX IF NOT EXISTS idx_corporate_actions_stock_id ON public.corporate_actions(stock_id);
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON public.page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON public.post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_disclosures_source_id ON public.stock_disclosures(source_id);
CREATE INDEX IF NOT EXISTS idx_treasury_bond_auctions_bond_id ON public.treasury_bond_auctions(bond_id);
