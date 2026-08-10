-- Configure these Vault secrets before relying on the trigger:
--   kff_project_url: https://<project-ref>.supabase.co
--   kff_anon_key: the project's publishable/anon JWT
--   kff_enrichment_webhook_secret: shared with the Edge Function secret

CREATE OR REPLACE FUNCTION public.trigger_enrich_news_article()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  project_url text;
  anon_key text;
  webhook_secret text;
BEGIN
  SELECT decrypted_secret INTO project_url
  FROM vault.decrypted_secrets WHERE name = 'kff_project_url' LIMIT 1;

  SELECT decrypted_secret INTO anon_key
  FROM vault.decrypted_secrets WHERE name = 'kff_anon_key' LIMIT 1;

  SELECT decrypted_secret INTO webhook_secret
  FROM vault.decrypted_secrets WHERE name = 'kff_enrichment_webhook_secret' LIMIT 1;

  IF project_url IS NULL OR anon_key IS NULL OR webhook_secret IS NULL THEN
    RAISE WARNING 'Stock-news enrichment skipped: required kff_* Vault secrets are missing';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/enrich-stock-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'x-webhook-secret', webhook_secret
    ),
    body := jsonb_build_object('article_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trigger_enrich_news_article() FROM PUBLIC;

DROP TRIGGER IF EXISTS enrich_news_on_insert ON public.news_articles;

CREATE TRIGGER enrich_news_on_insert
  AFTER INSERT ON public.news_articles
  FOR EACH ROW
  WHEN (NEW.status = 'published')
  EXECUTE FUNCTION public.trigger_enrich_news_article();
