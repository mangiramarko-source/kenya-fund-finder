-- Preserve published/admin-created records while allowing their author account
-- to be removed. All five columns are nullable, so attribution is anonymized.
ALTER TABLE public.change_log
  DROP CONSTRAINT IF EXISTS change_log_changed_by_fkey,
  ADD CONSTRAINT change_log_changed_by_fkey
    FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.funds
  DROP CONSTRAINT IF EXISTS funds_created_by_fkey,
  ADD CONSTRAINT funds_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS funds_updated_by_fkey,
  ADD CONSTRAINT funds_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.news_articles
  DROP CONSTRAINT IF EXISTS news_articles_created_by_fkey,
  ADD CONSTRAINT news_articles_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  DROP CONSTRAINT IF EXISTS news_articles_updated_by_fkey,
  ADD CONSTRAINT news_articles_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
