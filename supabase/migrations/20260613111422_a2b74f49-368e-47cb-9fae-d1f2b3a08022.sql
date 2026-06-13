
-- Per-user, security-definer backfill that ONLY updates the caller's own
-- holdings, with strict confidence rules:
--   1) ticker == fund.slug / stock.symbol (case-insensitive)
--   2) UNIQUE normalized name match against funds or stocks
-- Ambiguous matches (>1 candidate) are skipped. Already-assigned rows are skipped.
CREATE OR REPLACE FUNCTION public.backfill_my_portfolio_asset_ids()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_updated int := 0;
  v_skipped int := 0;
  v_total int := 0;
  rec record;
  v_match uuid;
  v_count int;
  v_norm text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  FOR rec IN
    SELECT id, asset_type, asset_name, ticker
    FROM public.mock_portfolios
    WHERE user_id = v_user_id AND asset_id IS NULL
  LOOP
    v_total := v_total + 1;
    v_match := NULL;

    -- Normalized name: lowercase, alnum-only, single spaces
    v_norm := lower(regexp_replace(regexp_replace(coalesce(rec.asset_name,''), '&', ' and ', 'g'), '[^a-z0-9]+', ' ', 'g'));
    v_norm := btrim(regexp_replace(v_norm, '\s+', ' ', 'g'));

    IF rec.asset_type = 'mmf' THEN
      -- (1) ticker == funds.slug
      IF rec.ticker IS NOT NULL AND length(btrim(rec.ticker)) > 0 THEN
        SELECT id INTO v_match FROM public.funds
        WHERE lower(slug) = lower(rec.ticker) AND is_published = true
        LIMIT 2;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count <> 1 THEN v_match := NULL; END IF;
      END IF;

      -- (2) unique normalized name match
      IF v_match IS NULL AND v_norm <> '' THEN
        SELECT count(*) INTO v_count FROM public.funds
        WHERE is_published = true
          AND btrim(regexp_replace(regexp_replace(lower(coalesce(name,'')), '&', ' and ', 'g'), '[^a-z0-9]+', ' ', 'g')) = v_norm;
        IF v_count = 1 THEN
          SELECT id INTO v_match FROM public.funds
          WHERE is_published = true
            AND btrim(regexp_replace(regexp_replace(lower(coalesce(name,'')), '&', ' and ', 'g'), '[^a-z0-9]+', ' ', 'g')) = v_norm
          LIMIT 1;
        END IF;
      END IF;

    ELSIF rec.asset_type = 'stock' THEN
      IF rec.ticker IS NOT NULL AND length(btrim(rec.ticker)) > 0 THEN
        SELECT id INTO v_match FROM public.stocks
        WHERE lower(symbol) = lower(rec.ticker)
        LIMIT 2;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count <> 1 THEN v_match := NULL; END IF;
      END IF;

      IF v_match IS NULL AND v_norm <> '' THEN
        SELECT count(*) INTO v_count FROM public.stocks
        WHERE btrim(regexp_replace(regexp_replace(lower(coalesce(name,'')), '&', ' and ', 'g'), '[^a-z0-9]+', ' ', 'g')) = v_norm;
        IF v_count = 1 THEN
          SELECT id INTO v_match FROM public.stocks
          WHERE btrim(regexp_replace(regexp_replace(lower(coalesce(name,'')), '&', ' and ', 'g'), '[^a-z0-9]+', ' ', 'g')) = v_norm
          LIMIT 1;
        END IF;
      END IF;
    END IF;

    IF v_match IS NOT NULL THEN
      UPDATE public.mock_portfolios
      SET asset_id = v_match, updated_at = now()
      WHERE id = rec.id AND user_id = v_user_id;
      v_updated := v_updated + 1;
    ELSE
      v_skipped := v_skipped + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'scanned', v_total,
    'updated', v_updated,
    'skipped', v_skipped
  );
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_my_portfolio_asset_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_my_portfolio_asset_ids() TO authenticated;
