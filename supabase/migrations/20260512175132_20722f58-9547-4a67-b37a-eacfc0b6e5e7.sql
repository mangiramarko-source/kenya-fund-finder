-- Drop old overloads of bulk_sync_funds so the new 3-arg version is unambiguous
DROP FUNCTION IF EXISTS public.bulk_sync_funds(jsonb);
DROP FUNCTION IF EXISTS public.bulk_sync_funds(jsonb, boolean);

-- New canonical version: accepts an explicit effective date so admins can
-- backfill data for past business days. The function now ALSO writes the
-- post-sync yields directly into fund_yield_snapshots dated p_effective_date,
-- in addition to whatever the snapshot_yield_on_update trigger captures
-- (which records the OLD value on CURRENT_DATE for continuity).
CREATE OR REPLACE FUNCTION public.bulk_sync_funds(
  payload jsonb,
  dry_run boolean DEFAULT false,
  p_effective_date date DEFAULT CURRENT_DATE
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  item jsonb;
  v_user_id uuid := auth.uid();
  updated_ids uuid[] := ARRAY[]::uuid[];
  created_ids uuid[] := ARRAY[]::uuid[];
  v_id uuid;
  row_idx int := 0;
  v_annual numeric;
  v_daily numeric;
  result jsonb;
BEGIN
  IF NOT public.has_role(v_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized: admin role required';
  END IF;

  IF jsonb_typeof(payload) <> 'array' THEN
    RAISE EXCEPTION 'Payload must be a JSON array';
  END IF;

  IF p_effective_date IS NULL THEN
    p_effective_date := CURRENT_DATE;
  END IF;

  BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(payload) LOOP
      row_idx := row_idx + 1;
      v_annual := (item->>'annual_yield')::numeric;
      v_daily  := (item->>'daily_yield')::numeric;

      IF (item->>'action') = 'update' THEN
        IF (item->>'id') IS NULL THEN
          RAISE EXCEPTION 'Row %: update requires id', row_idx;
        END IF;
        UPDATE public.funds SET
          annual_yield = v_annual,
          daily_yield = v_daily,
          yield_unit = item->>'yield_unit',
          fund_type = item->>'fund_type',
          updated_by = v_user_id,
          updated_at = now()
        WHERE id = (item->>'id')::uuid
        RETURNING id INTO v_id;
        IF v_id IS NULL THEN
          RAISE EXCEPTION 'Row %: fund id % not found', row_idx, item->>'id';
        END IF;
        updated_ids := updated_ids || v_id;

      ELSIF (item->>'action') = 'create' THEN
        IF (item->>'name') IS NULL OR (item->>'manager') IS NULL OR (item->>'slug') IS NULL THEN
          RAISE EXCEPTION 'Row %: create requires name, manager, slug', row_idx;
        END IF;
        INSERT INTO public.funds (
          slug, name, manager, fund_type, yield_unit,
          annual_yield, daily_yield, seven_day_yield, thirty_day_yield,
          minimum_investment, management_fee, withdrawal_time,
          is_published, cma_licensed, created_by, updated_by
        ) VALUES (
          item->>'slug',
          item->>'name',
          item->>'manager',
          COALESCE(item->>'fund_type', 'money_market'),
          COALESCE(item->>'yield_unit', '%'),
          v_annual, v_daily, 0, 0,
          COALESCE((item->>'minimum_investment')::numeric, 0),
          COALESCE((item->>'management_fee')::numeric, 0),
          COALESCE(item->>'withdrawal_time', 'T+1'),
          true, true, v_user_id, v_user_id
        )
        RETURNING id INTO v_id;
        created_ids := created_ids || v_id;
      ELSE
        RAISE EXCEPTION 'Row %: unknown action %', row_idx, item->>'action';
      END IF;

      -- Explicit snapshot for the effective date carrying the NEW yields.
      -- This is the "data of record" for that business day; the trigger may
      -- additionally have stored the prior value dated CURRENT_DATE.
      INSERT INTO public.fund_yield_snapshots (fund_id, annual_yield, daily_yield, snapshot_date)
      VALUES (v_id, v_annual, v_daily, p_effective_date)
      ON CONFLICT (fund_id, snapshot_date) DO UPDATE
      SET annual_yield = EXCLUDED.annual_yield,
          daily_yield  = EXCLUDED.daily_yield;

      v_id := NULL;
    END LOOP;

    IF dry_run THEN
      RAISE EXCEPTION '__DRY_RUN_ROLLBACK__';
    END IF;
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = '__DRY_RUN_ROLLBACK__' THEN
      NULL;
    ELSE
      RAISE;
    END IF;
  END;

  IF NOT dry_run THEN
    INSERT INTO public.change_log (entity_type, entity_id, action, new_values, changed_by)
    VALUES (
      'fund',
      gen_random_uuid(),
      'bulk_paste_sync',
      jsonb_build_object(
        'updated_count', COALESCE(array_length(updated_ids, 1), 0),
        'created_count', COALESCE(array_length(created_ids, 1), 0),
        'updated_ids', to_jsonb(updated_ids),
        'created_ids', to_jsonb(created_ids),
        'effective_date', p_effective_date
      ),
      v_user_id
    );
  END IF;

  result := jsonb_build_object(
    'updated', to_jsonb(updated_ids),
    'created', to_jsonb(created_ids),
    'dry_run', dry_run,
    'effective_date', p_effective_date
  );
  RETURN result;
END;
$function$;

-- Helper for the Data Health Strip: returns distinct snapshot dates that have
-- at least one fund_yield_snapshots row in the given inclusive range.
CREATE OR REPLACE FUNCTION public.fund_snapshot_days_in_range(
  p_start date,
  p_end date
)
 RETURNS TABLE(snapshot_date date, fund_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.snapshot_date, COUNT(DISTINCT s.fund_id) AS fund_count
  FROM public.fund_yield_snapshots s
  WHERE s.snapshot_date BETWEEN p_start AND p_end
  GROUP BY s.snapshot_date
  ORDER BY s.snapshot_date;
$function$;