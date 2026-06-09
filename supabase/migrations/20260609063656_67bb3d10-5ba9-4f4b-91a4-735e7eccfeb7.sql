
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.social_platform AS ENUM ('instagram','facebook','x');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.social_post_status AS ENUM ('draft','in_review','approved','scheduled','posted','failed','manually_posted','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.social_cadence AS ENUM ('one_time','daily','weekly','monthly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ TEMPLATES ============
CREATE TABLE IF NOT EXISTS public.social_post_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  content_type text NOT NULL,
  platform_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  system_prompt text NOT NULL,
  caption_skeleton text,
  image_prompt text NOT NULL,
  hashtags_default text[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_post_templates TO authenticated;
GRANT ALL ON public.social_post_templates TO service_role;
ALTER TABLE public.social_post_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage social templates" ON public.social_post_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ POSTS ============
CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.social_post_templates(id) ON DELETE SET NULL,
  content_type text NOT NULL,
  platform public.social_platform NOT NULL,
  status public.social_post_status NOT NULL DEFAULT 'draft',
  caption text NOT NULL DEFAULT '',
  hashtags text[] NOT NULL DEFAULT '{}',
  image_headline text,
  image_subtext text,
  cta text,
  disclaimer text,
  utm_url text,
  image_url text,
  image_size text,
  source_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  fund_ids uuid[] NOT NULL DEFAULT '{}',
  fund_names text[] NOT NULL DEFAULT '{}',
  yield_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_as_of date,
  scheduled_at timestamptz,
  posted_at timestamptz,
  error_message text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON public.social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled_at ON public.social_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON public.social_posts(platform);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_posts TO authenticated;
GRANT ALL ON public.social_posts TO service_role;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage social posts" ON public.social_posts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ SCHEDULES ============
CREATE TABLE IF NOT EXISTS public.social_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.social_posts(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.social_post_templates(id) ON DELETE SET NULL,
  platform public.social_platform NOT NULL,
  cadence public.social_cadence NOT NULL DEFAULT 'one_time',
  day_of_week int,
  time_of_day time,
  next_run_at timestamptz,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_schedules TO authenticated;
GRANT ALL ON public.social_schedules TO service_role;
ALTER TABLE public.social_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage social schedules" ON public.social_schedules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ ACCOUNTS ============
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform public.social_platform NOT NULL,
  handle text,
  display_name text,
  connection_status text NOT NULL DEFAULT 'manual',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_accounts TO authenticated;
GRANT ALL ON public.social_accounts TO service_role;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage social accounts" ON public.social_accounts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ ANALYTICS ============
CREATE TABLE IF NOT EXISTS public.social_post_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.social_posts(id) ON DELETE CASCADE,
  event text NOT NULL,
  platform public.social_platform,
  content_type text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_social_post_analytics_event ON public.social_post_analytics(event);
CREATE INDEX IF NOT EXISTS idx_social_post_analytics_occurred ON public.social_post_analytics(occurred_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_post_analytics TO authenticated;
GRANT ALL ON public.social_post_analytics TO service_role;
ALTER TABLE public.social_post_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage social analytics" ON public.social_post_analytics
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ TRIGGERS ============
CREATE TRIGGER trg_social_posts_updated_at BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_social_templates_updated_at BEFORE UPDATE ON public.social_post_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_social_schedules_updated_at BEFORE UPDATE ON public.social_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_social_accounts_updated_at BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SEED TEMPLATES ============
INSERT INTO public.social_post_templates (key, name, content_type, system_prompt, caption_skeleton, image_prompt, hashtags_default) VALUES
('daily_mmf_update','Daily MMF Yield Update','daily_mmf_update',
 'You write social posts for KenyaFundFinder. Brand voice: clear, calm, educational. NEVER use: best investment, guaranteed returns, risk-free, you should invest, put your money here, will make you rich. PREFER: current published yield, compare available options, learn how the fund works, review the latest data, check provider details. Never give direct financial advice.',
 'Here are some of the latest published money market fund yields in Kenya. Compare options before deciding where to place your money.',
 'Clean finance dashboard card, dark navy background, green accent. Headline "Kenya MMF Yields Today". Three rows of fund name + yield. Small KenyaFundFinder logo and kenyafundfinder.com. Professional, minimal.',
 ARRAY['KenyaFinance','MoneyMarketFund','Investing','Kenya','MMF']),
('top_kes_mmf','Top KES MMF Yields','top_kes_mmf',
 'You write social posts for KenyaFundFinder. Brand voice: clear, calm, educational. NEVER use: best investment, guaranteed returns, risk-free, you should invest. PREFER safer wording. No direct financial advice.',
 'Latest published KES money market fund yields. Compare available options and verify with the fund provider.',
 'Dark navy card, green accent, headline "Top KES Money Market Yields". Three fund rows with yields. KenyaFundFinder branding.',
 ARRAY['KES','MMF','Kenya','Investing']),
('top_usd_mmf','Top USD MMF Yields','top_usd_mmf',
 'You write social posts for KenyaFundFinder. Same safety rules: no hype, no advice.',
 'Latest published USD money market fund yields available in Kenya. Compare options before deciding.',
 'Dark navy card, green accent, headline "Top USD Money Market Yields". Fund rows. KenyaFundFinder branding.',
 ARRAY['USD','MMF','Kenya','DiasporaInvesting']),
('weekly_summary','Weekly Fund Summary','weekly_summary',
 'You write a brief weekly summary post for KenyaFundFinder. No advice, no hype. Educational tone.',
 'This week in Kenyan money market funds. Compare current published yields and review the latest data.',
 'Weekly summary card, dark navy, green accent, headline "This Week in Kenyan Funds". KenyaFundFinder branding.',
 ARRAY['WeeklyUpdate','Kenya','MMF','Investing']),
('fund_comparison','Fund Comparison','fund_comparison',
 'You write a fund comparison post. Educational and neutral. No "best" language. No advice.',
 'Two funds can have different yields, fees, minimums, and withdrawal timelines. Compare clearly before deciding.',
 'Comparison card, two fund columns side by side, dark navy, green accent. Headline "Compare Before You Invest". KenyaFundFinder branding.',
 ARRAY['Compare','MMF','Kenya','Investing']),
('fund_spotlight','Single Fund Spotlight','fund_spotlight',
 'Spotlight a single fund: name, manager, current published yield, minimum investment. Educational tone. No recommendation language.',
 'A look at one Kenyan money market fund. Always verify details with the fund provider before investing.',
 'Fund spotlight card, dark navy, green accent, fund name and key stats. KenyaFundFinder branding.',
 ARRAY['Spotlight','Kenya','MMF','Investing']),
('edu_what_is_mmf','Education: What is a Money Market Fund','edu_what_is_mmf',
 'Write a short educational explainer about money market funds. Plain English. No advice.',
 'A money market fund pools investor money into low-risk short-term debt instruments. Learn how it works.',
 'Education card, dark navy, green accent. Headline "What is a Money Market Fund?". Simple icon. KenyaFundFinder branding.',
 ARRAY['LearnInvesting','MMF','PersonalFinance','Kenya']),
('edu_effective_yield','Education: Effective Annual Yield','edu_effective_yield',
 'Explain effective annual yield in plain Kenyan English. No hype.',
 'Effective annual yield shows the annual return after compounding. Useful when comparing money market funds.',
 'Education card, dark navy, green accent. Headline "What is Effective Annual Yield?". KenyaFundFinder branding.',
 ARRAY['LearnInvesting','PersonalFinance','Kenya']),
('edu_how_to_compare','Education: How to Compare Funds','edu_how_to_compare',
 'Educational post on what to compare across funds: yield, fees, minimum, withdrawal time, manager. No advice.',
 'Compare funds across yield, fees, minimum investment, and withdrawal timelines. Review the latest data.',
 'Education card, dark navy, green accent. Headline "How to Compare Funds". KenyaFundFinder branding.',
 ARRAY['Compare','LearnInvesting','Kenya']),
('calculator_promo','Calculator Promotion','calculator_promo',
 'Promote the KenyaFundFinder investment calculator. No hype. Educational framing.',
 'Use the KenyaFundFinder calculator to estimate how your savings may grow over time based on published fund yields.',
 'Calculator card, dark navy, green accent. Headline "See How Your Money Could Grow". Small calculator icon. KenyaFundFinder branding.',
 ARRAY['Calculator','PersonalFinance','Kenya','Investing']),
('diaspora_edu','Diaspora Investing Education','diaspora_edu',
 'Educational post for Kenyans abroad. No advice. Encourage comparing and verifying.',
 'Kenyans abroad: compare Kenyan fund options clearly before sending money home.',
 'Diaspora card, dark navy, green accent. Headline "Kenyans Abroad: Compare Before Sending Money Home". KenyaFundFinder branding.',
 ARRAY['Diaspora','Kenya','Investing','PersonalFinance']),
('new_fund_added','New Fund Added','new_fund_added',
 'Announce a new fund added to KenyaFundFinder. Neutral tone. No advice.',
 'A new fund has been added to KenyaFundFinder. Review the details and compare with other options.',
 'Announcement card, dark navy, green accent. Headline "New Fund Added". KenyaFundFinder branding.',
 ARRAY['NewFund','Kenya','MMF','Update']),
('website_feature','Website Feature Post','website_feature',
 'Highlight a KenyaFundFinder website feature. Educational tone. No hype.',
 'Compare, calculate, and review Kenyan funds in one place on KenyaFundFinder.',
 'Feature highlight card, dark navy, green accent, headline naming the feature. KenyaFundFinder branding.',
 ARRAY['KenyaFundFinder','Investing','Kenya']),
('finance_tip','Personal Finance Tip','finance_tip',
 'Short, practical personal finance tip for Kenyans. No advice. Educational only.',
 'A practical personal finance tip for Kenyans.',
 'Tip card, dark navy, green accent. Headline "Personal Finance Tip". KenyaFundFinder branding.',
 ARRAY['PersonalFinance','Kenya','MoneyTips'])
ON CONFLICT (key) DO NOTHING;
