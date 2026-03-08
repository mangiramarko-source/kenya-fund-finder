
-- Create ads table
CREATE TABLE public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  media_url text NOT NULL DEFAULT '',
  click_url text NOT NULL DEFAULT '',
  placement text NOT NULL DEFAULT 'sidebar' CHECK (placement IN ('sidebar', 'banner', 'in-feed')),
  is_active boolean NOT NULL DEFAULT true,
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Public can view active ads
CREATE POLICY "Anyone can view active ads" ON public.ads
  FOR SELECT USING (is_active = true);

-- Admins can manage ads
CREATE POLICY "Admins can manage ads" ON public.ads
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for ad media
INSERT INTO storage.buckets (id, name, public) VALUES ('ads', 'ads', true);

-- Storage policies for ads bucket
CREATE POLICY "Anyone can view ad media" ON storage.objects
  FOR SELECT USING (bucket_id = 'ads');

CREATE POLICY "Admins can upload ad media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'ads' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update ad media" ON storage.objects
  FOR UPDATE USING (bucket_id = 'ads' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete ad media" ON storage.objects
  FOR DELETE USING (bucket_id = 'ads' AND has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_ads_updated_at
  BEFORE UPDATE ON public.ads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
