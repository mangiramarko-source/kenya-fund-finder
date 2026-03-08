
-- Ad analytics table for impressions and clicks
CREATE TABLE public.ad_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT 'impression', -- 'impression' or 'click'
  session_id text,
  page_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_ad_events_ad_id ON public.ad_events(ad_id);
CREATE INDEX idx_ad_events_created_at ON public.ad_events(created_at);
CREATE INDEX idx_ad_events_type ON public.ad_events(event_type);

-- RLS
ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events (anonymous tracking)
CREATE POLICY "Anyone can insert ad events"
ON public.ad_events FOR INSERT
TO public
WITH CHECK (true);

-- Admins can read all events
CREATE POLICY "Admins can read ad events"
ON public.ad_events FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
