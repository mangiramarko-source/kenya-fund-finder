-- Ensure any obsolete 4-argument overload of claim_communication_category_batch is removed,
-- leaving only the canonical 3-argument signature defined in 20260824181132_news_highlights_delivery.sql.
drop function if exists public.claim_communication_category_batch(text, integer, integer, uuid[]);
