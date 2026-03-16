-- Social links table for admin-managed footer links
CREATE TABLE public.social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  url text NOT NULL DEFAULT '',
  icon_name text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read active social links" ON public.social_links
  FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Authenticated can read active social links" ON public.social_links
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage social links" ON public.social_links
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all social links" ON public.social_links
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE VIEW public.social_links_public AS
  SELECT id, platform, url, icon_name, sort_order
  FROM public.social_links
  WHERE is_active = true;