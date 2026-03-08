-- Allow admins to delete ad events (needed for cascading ad deletion)
CREATE POLICY "Admins can delete ad events"
  ON public.ad_events FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow anyone to insert ad events (replace restrictive policy with permissive)
DROP POLICY IF EXISTS "Public can insert ad events with valid data" ON public.ad_events;
CREATE POLICY "Anyone can insert ad events"
  ON public.ad_events FOR INSERT
  WITH CHECK (
    event_type IN ('impression', 'click') AND ad_id IS NOT NULL
  );