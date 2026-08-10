-- Create a trigger to call enrich-stock-data edge function on new article insertion

DROP TRIGGER IF EXISTS "enrich_news_on_insert" ON "public"."news_articles";

CREATE TRIGGER "enrich_news_on_insert"
  AFTER INSERT ON "public"."news_articles"
  FOR EACH ROW
  EXECUTE FUNCTION "supabase_functions"."http_request"(
    'https://caawgzuofnujrznwbuxk.supabase.co/functions/v1/enrich-stock-data',
    'POST',
    '{"Content-type":"application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYXdnenVvZm51anJ6bndidXhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMjI0ODYsImV4cCI6MjA5MTg5ODQ4Nn0.Ci7AcNBlIa4LhINAEvpmeDjLQfxWUxcROd8q5hNAQnA", "x-webhook-secret": "internal-webhook-trigger"}',
    '{}',
    '5000'
  );
