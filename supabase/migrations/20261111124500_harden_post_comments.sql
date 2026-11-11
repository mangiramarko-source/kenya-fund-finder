-- Migration: Harden public.post_comments constraints, guest link moderation, and rate limiting
-- Description:
-- 1. Pre-cleans historical comments violating new length and non-empty bounds.
-- 2. Adds table CHECK constraints for content (1..1000), author_name (1..80 or NULL), and post_id (1..120).
-- 3. Creates a SECURITY DEFINER BEFORE INSERT/UPDATE trigger that:
--    - Locks immutable fields (post_id, user_id, created_at) on UPDATE.
--    - Normalizes and trims string fields.
--    - Blocks links/phishing in unauthenticated guest comments without false positives on Kenyan finance terms.
--    - Enforces rate limiting on INSERT for authenticated users (10/min) and guests (5/min per IP or 15/min burst per post).

-- 1. Ensure pgcrypto extension is available for sha256 hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Pre-clean existing rows before adding constraints
DELETE FROM public.post_comments
WHERE content IS NULL OR char_length(btrim(content)) = 0;

DELETE FROM public.post_comments
WHERE post_id IS NULL OR char_length(btrim(post_id)) = 0;

UPDATE public.post_comments
SET author_name = NULL
WHERE author_name IS NOT NULL AND char_length(btrim(author_name)) = 0;

UPDATE public.post_comments
SET
  content = left(btrim(content), 1000),
  author_name = CASE
    WHEN author_name IS NOT NULL AND char_length(btrim(author_name)) > 0 THEN left(btrim(author_name), 80)
    ELSE NULL
  END,
  post_id = left(btrim(post_id), 120)
WHERE
  char_length(btrim(content)) > 1000
  OR (author_name IS NOT NULL AND char_length(btrim(author_name)) > 80)
  OR char_length(btrim(post_id)) > 120;

-- 3. Add table CHECK constraints
ALTER TABLE public.post_comments
  DROP CONSTRAINT IF EXISTS post_comments_content_length_check,
  ADD CONSTRAINT post_comments_content_length_check
    CHECK (char_length(btrim(content)) BETWEEN 1 AND 1000);

ALTER TABLE public.post_comments
  DROP CONSTRAINT IF EXISTS post_comments_author_name_length_check,
  ADD CONSTRAINT post_comments_author_name_length_check
    CHECK (author_name IS NULL OR char_length(btrim(author_name)) BETWEEN 1 AND 80);

ALTER TABLE public.post_comments
  DROP CONSTRAINT IF EXISTS post_comments_post_id_length_check,
  ADD CONSTRAINT post_comments_post_id_length_check
    CHECK (char_length(btrim(post_id)) BETWEEN 1 AND 120);

-- Index for performant comment lookups
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id_created_at
  ON public.post_comments (post_id, created_at DESC);

-- 4. Create BEFORE INSERT OR UPDATE trigger function
CREATE OR REPLACE FUNCTION public.enforce_post_comment_security()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_headers_raw text;
  v_headers jsonb := '{}'::jsonb;
  v_client_ip text;
  v_rate_key text;
  v_limit int;
BEGIN
  -- Lock immutable fields on UPDATE
  IF TG_OP = 'UPDATE' THEN
    NEW.post_id := OLD.post_id;
    NEW.user_id := OLD.user_id;
    NEW.created_at := OLD.created_at;
  END IF;

  -- Normalization & Trimming
  NEW.content := btrim(NEW.content);
  NEW.post_id := btrim(NEW.post_id);

  IF NEW.author_name IS NOT NULL THEN
    NEW.author_name := btrim(NEW.author_name);
    IF char_length(NEW.author_name) = 0 THEN
      NEW.author_name := 'User';
    END IF;
  ELSE
    NEW.author_name := 'User';
  END IF;

  -- Block links and phishing in unauthenticated guest comments
  IF NEW.user_id IS NULL THEN
    IF NEW.content ~* '(https?://|www\.|[a-z0-9-]+\.(com|net|org|io|xyz|co\.ke|or\.ke|ac\.ke)(/|$|[[:space:]]|[?!,;:])|[a-z0-9-]+\.(me|co|ke|ly)/)' THEN
      RAISE EXCEPTION 'Links are not allowed in guest comments';
    END IF;
  END IF;

  -- Enforce rate limits on INSERT
  IF TG_OP = 'INSERT' THEN
    IF NEW.user_id IS NOT NULL THEN
      -- Authenticated user: max 10 comments per minute per user ID
      v_rate_key := 'comment:user:' || NEW.user_id::text;
      v_limit := 10;
    ELSE
      -- Unauthenticated guest: extract client IP from PostgREST request headers
      BEGIN
        v_headers_raw := current_setting('request.headers', true);
        IF v_headers_raw IS NOT NULL AND length(trim(v_headers_raw)) > 0 THEN
          v_headers := v_headers_raw::jsonb;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_headers := '{}'::jsonb;
      END;

      v_client_ip := coalesce(
        nullif(trim(v_headers ->> 'cf-connecting-ip'), ''),
        nullif(trim(v_headers ->> 'x-real-ip'), ''),
        nullif(trim(split_part(v_headers ->> 'x-forwarded-for', ',', 1)), '')
      );

      IF v_client_ip IS NOT NULL AND length(v_client_ip) > 0 THEN
        -- Hash IP using SHA-256 via pgcrypto
        v_rate_key := 'comment:guest:ip:' || encode(extensions.digest(convert_to(v_client_ip, 'UTF8'), 'sha256'), 'hex');
        v_limit := 5; -- Max 5 comments per minute per guest IP
      ELSE
        -- Fallback per-post burst limit if headers are unavailable
        v_rate_key := 'comment:guest:burst:' || NEW.post_id;
        v_limit := 15; -- Max 15 guest comments per minute per post
      END IF;
    END IF;

    -- Evaluate rate limit against public.check_rate_limit
    IF NOT public.check_rate_limit(v_rate_key, 60, v_limit) THEN
      RAISE EXCEPTION 'Rate limit exceeded: Please wait before posting another comment';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Restrict direct execute privileges (triggers run automatically; do NOT expose via RPC to anon/authenticated)
REVOKE ALL ON FUNCTION public.enforce_post_comment_security() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_post_comment_security() TO service_role;

-- 5. Attach BEFORE INSERT OR UPDATE trigger
DROP TRIGGER IF EXISTS trg_enforce_post_comment_security ON public.post_comments;
CREATE TRIGGER trg_enforce_post_comment_security
  BEFORE INSERT OR UPDATE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_post_comment_security();
