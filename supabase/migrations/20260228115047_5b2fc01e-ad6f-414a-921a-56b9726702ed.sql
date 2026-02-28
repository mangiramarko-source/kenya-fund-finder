
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'reviewer');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS: only admins can view roles
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Funds table
CREATE TABLE public.funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  manager TEXT NOT NULL,
  cma_licensed BOOLEAN NOT NULL DEFAULT true,
  annual_yield NUMERIC(5,2) NOT NULL,
  seven_day_yield NUMERIC(5,2) NOT NULL,
  thirty_day_yield NUMERIC(5,2) NOT NULL,
  minimum_investment NUMERIC(12,2) NOT NULL,
  management_fee NUMERIC(5,2) NOT NULL,
  withdrawal_time TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  fact_sheet_date DATE,
  source_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.funds ENABLE ROW LEVEL SECURITY;

-- Public can read published funds
CREATE POLICY "Anyone can view published funds" ON public.funds
  FOR SELECT USING (is_published = true);

-- Admins can do everything
CREATE POLICY "Admins can manage funds" ON public.funds
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Fund historical yields
CREATE TABLE public.fund_historical_yields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID REFERENCES public.funds(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL,
  yield NUMERIC(5,2) NOT NULL,
  UNIQUE(fund_id, month)
);
ALTER TABLE public.fund_historical_yields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view yields" ON public.fund_historical_yields
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage yields" ON public.fund_historical_yields
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- News articles table
CREATE TABLE public.news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  date_published DATE NOT NULL DEFAULT CURRENT_DATE,
  url TEXT,
  category TEXT NOT NULL DEFAULT 'Market News',
  read_time TEXT NOT NULL DEFAULT '3 min read',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

-- Public can read published news
CREATE POLICY "Anyone can view published news" ON public.news_articles
  FOR SELECT USING (status = 'published');

-- Admins can see all news (including drafts)
CREATE POLICY "Admins can manage news" ON public.news_articles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Change log table
CREATE TABLE public.change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view change log" ON public.change_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert change log" ON public.change_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_funds_updated_at
  BEFORE UPDATE ON public.funds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_news_updated_at
  BEFORE UPDATE ON public.news_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
