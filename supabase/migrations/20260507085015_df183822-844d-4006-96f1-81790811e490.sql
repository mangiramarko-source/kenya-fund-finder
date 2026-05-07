CREATE TABLE public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  author_role text NOT NULL DEFAULT '',
  quote text NOT NULL,
  avatar_url text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read active testimonials"
  ON public.testimonials FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Auth can read active testimonials"
  ON public.testimonials FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can view all testimonials"
  ON public.testimonials FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage testimonials"
  ON public.testimonials FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_testimonials_updated_at
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.testimonials (author_name, author_role, quote, sort_order) VALUES
  ('Wanjiku M.', 'Personal Investor, Nairobi', 'Kenya Fund Finder makes it incredibly easy to compare unit trust yields side by side. I finally feel confident about where I''m putting my money.', 1),
  ('David O.', 'Financial Analyst', 'The real-time NSE data and FX rates in one place save me hours every week. Clean, fast, and trustworthy.', 2),
  ('Aisha K.', 'First-time Investor', 'I love how transparent everything is — no hidden ranking gimmicks, just the actual numbers I need to make a decision.', 3);
