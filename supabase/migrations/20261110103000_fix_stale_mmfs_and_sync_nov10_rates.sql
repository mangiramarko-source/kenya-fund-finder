-- =============================================================================
-- Unpublish 3 legacy/unmapped MMFs not tracked by Serrari Group:
--   1. mali-sh-mmf (Mali — discontinued in 2023 and replaced by Ziidi)
--   2. cic-wealth-sh-mmf (CIC Wealth — legacy duplicate alongside cic-sh-mmf)
--   3. gulfcap-sh-mmf (GulfCap — tracked as Fixed Income under gulfcap-fixed-sh)
-- Live 2026-11-10 Serrari rates are ingested by the fetch-market-data Edge Function.
-- =============================================================================

UPDATE public.funds
SET is_published = false
WHERE lower(slug) IN ('mali-sh-mmf', 'cic-wealth-sh-mmf', 'gulfcap-sh-mmf');
