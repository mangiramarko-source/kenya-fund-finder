
-- Fix 1: Add CHECK constraint on ads.click_url to prevent javascript: URLs
ALTER TABLE public.ads
  ADD CONSTRAINT ads_click_url_scheme
  CHECK (click_url = '' OR click_url ~* '^https?://');

-- Fix 2: Replace overly permissive ad_events INSERT policy
-- Drop the old permissive policy
DROP POLICY IF EXISTS "Anyone can insert ad events" ON public.ad_events;

-- Create a stricter policy that requires a non-empty event_type
CREATE POLICY "Public can insert ad events with valid data"
ON public.ad_events FOR INSERT
TO public
WITH CHECK (
  event_type IN ('impression', 'click')
  AND ad_id IS NOT NULL
);
