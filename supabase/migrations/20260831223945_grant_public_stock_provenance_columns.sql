-- stocks_public is a security-invoker view. Its two provenance columns were
-- added after the original column-level anon grant, so anonymous Data API
-- reads could no longer execute the view. These fields are intentionally part
-- of the public stock projection; no private attribution columns are granted.
GRANT SELECT (provider_updated_at, quote_source)
ON public.stocks
TO anon;
