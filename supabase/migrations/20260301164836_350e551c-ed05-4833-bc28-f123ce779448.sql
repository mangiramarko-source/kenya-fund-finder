
-- Table for admin-editable pages (about, contact, etc.)
CREATE TABLE public.site_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  meta jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY "Anyone can view site pages"
  ON public.site_pages FOR SELECT
  USING (true);

-- Admins can manage
CREATE POLICY "Admins can manage site pages"
  ON public.site_pages FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_site_pages_updated_at
  BEFORE UPDATE ON public.site_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed default pages
INSERT INTO public.site_pages (slug, title, content, meta) VALUES
  ('about', 'About MMF Compare Kenya', 'MMF Compare Kenya is an independent platform dedicated to helping Kenyans make informed decisions about Money Market Fund investments. We aggregate publicly available data from CMA-regulated fund managers and present it in a clear, easy-to-compare format.

Our mission is to promote financial literacy and transparency in the Kenyan money market fund space. We are not affiliated with any fund manager or financial institution.

Whether you are a first-time investor or a seasoned saver, our tools — including our fund comparison table, investment calculator, and educational resources — are designed to empower you with the information you need.', '{}'),
  ('contact', 'Contact Us', 'We would love to hear from you. Whether you have a question, feedback, or a partnership inquiry, feel free to reach out.

For general inquiries, corrections, or suggestions, please email us at: info@mmfcompare.co.ke

We typically respond within 48 hours on business days.

You can also connect with us on our social media channels for the latest updates and announcements.', '{"email": "info@mmfcompare.co.ke"}');
