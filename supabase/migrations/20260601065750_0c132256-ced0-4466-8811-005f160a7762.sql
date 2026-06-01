
-- Add logo_url to funds
ALTER TABLE public.funds ADD COLUMN IF NOT EXISTS logo_url text;

-- Create public bucket for fund logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('fund-logos', 'fund-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "Fund logos public read" ON storage.objects;
CREATE POLICY "Fund logos public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'fund-logos');

-- Admin write/update/delete (uses existing has_role function)
DROP POLICY IF EXISTS "Admins upload fund logos" ON storage.objects;
CREATE POLICY "Admins upload fund logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'fund-logos' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update fund logos" ON storage.objects;
CREATE POLICY "Admins update fund logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'fund-logos' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete fund logos" ON storage.objects;
CREATE POLICY "Admins delete fund logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'fund-logos' AND public.has_role(auth.uid(), 'admin'));
