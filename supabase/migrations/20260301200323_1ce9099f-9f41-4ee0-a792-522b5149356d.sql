CREATE TABLE public.auth_gate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  action text NOT NULL DEFAULT 'signup',
  session_id text,
  page_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_gate_clicks ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anon + authenticated)
CREATE POLICY "Anyone can insert auth gate clicks"
  ON public.auth_gate_clicks FOR INSERT
  WITH CHECK (true);

-- Admins can read
CREATE POLICY "Admins can read auth gate clicks"
  ON public.auth_gate_clicks FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));