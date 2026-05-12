-- 1) Replace bulk_sync_funds with dry_run support
CREATE OR REPLACE FUNCTION public.bulk_sync_funds(payload jsonb, dry_run boolean DEFAULT false)
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
  result jsonb;
BEGIN
  IF NOT public.has_role(v_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized: admin role required';
  END IF;

  IF jsonb_typeof(payload) <> 'array' THEN
    RAISE EXCEPTION 'Payload must be a JSON array';
  END IF;

  -- Run mutations inside a sub-block. If dry_run, raise a sentinel at the end
  -- to roll back the sub-block while preserving the collected IDs.
  BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(payload) LOOP
      row_idx := row_idx + 1;

      IF (item->>'action') = 'update' THEN
        IF (item->>'id') IS NULL THEN
          RAISE EXCEPTION 'Row %: update requires id', row_idx;
        END IF;
        UPDATE public.funds SET
          annual_yield = (item->>'annual_yield')::numeric,
          daily_yield = (item->>'daily_yield')::numeric,
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
        v_id := NULL;

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
          (item->>'annual_yield')::numeric,
          (item->>'daily_yield')::numeric,
          0, 0,
          COALESCE((item->>'minimum_investment')::numeric, 0),
          COALESCE((item->>'management_fee')::numeric, 0),
          COALESCE(item->>'withdrawal_time', 'T+1'),
          true, true, v_user_id, v_user_id
        )
        RETURNING id INTO v_id;
        created_ids := created_ids || v_id;
        v_id := NULL;
      ELSE
        RAISE EXCEPTION 'Row %: unknown action %', row_idx, item->>'action';
      END IF;
    END LOOP;

    IF dry_run THEN
      -- Trigger rollback of the sub-block; arrays survive because they are
      -- declared in the outer scope.
      RAISE EXCEPTION '__DRY_RUN_ROLLBACK__';
    END IF;
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = '__DRY_RUN_ROLLBACK__' THEN
      -- Swallow sentinel; mutations rolled back, IDs preserved
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
        'created_ids', to_jsonb(created_ids)
      ),
      v_user_id
    );
  END IF;

  result := jsonb_build_object(
    'updated', to_jsonb(updated_ids),
    'created', to_jsonb(created_ids),
    'dry_run', dry_run
  );
  RETURN result;
END;
$function$;

-- 2) Revert last bulk paste sync — restores funds to most recent snapshot,
--    deletes any newly-created funds from that batch, logs the revert.
CREATE OR REPLACE FUNCTION public.revert_last_bulk_sync()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_log RECORD;
  v_updated_ids uuid[];
  v_created_ids uuid[];
  v_fund_id uuid;
  v_snap RECORD;
  v_restored uuid[] := ARRAY[]::uuid[];
  v_deleted uuid[] := ARRAY[]::uuid[];
  v_skipped uuid[] := ARRAY[]::uuid[];
BEGIN
  IF NOT public.has_role(v_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized: admin role required';
  END IF;

  SELECT * INTO v_log
  FROM public.change_log
  WHERE action = 'bulk_paste_sync'
  ORDER BY changed_at DESC
  LIMIT 1;

  IF v_log IS NULL THEN
    RAISE EXCEPTION 'No bulk paste sync found to revert';
  END IF;

  -- Extract id arrays from the logged payload
  SELECT ARRAY(SELECT (jsonb_array_elements_text(v_log.new_values->'updated_ids'))::uuid)
    INTO v_updated_ids;
  SELECT ARRAY(SELECT (jsonb_array_elements_text(v_log.new_values->'created_ids'))::uuid)
    INTO v_created_ids;

  -- Restore each updated fund to its most recent yield snapshot
  IF v_updated_ids IS NOT NULL THEN
    FOREACH v_fund_id IN ARRAY v_updated_ids LOOP
      SELECT annual_yield, daily_yield INTO v_snap
      FROM public.fund_yield_snapshots
      WHERE fund_id = v_fund_id
      ORDER BY snapshot_date DESC, created_at DESC
      LIMIT 1;
      IF v_snap IS NULL THEN
        v_skipped := v_skipped || v_fund_id;
        CONTINUE;
      END IF;
      UPDATE public.funds
      SET annual_yield = v_snap.annual_yield,
          daily_yield = v_snap.daily_yield,
          updated_by = v_user_id,
          updated_at = now()
      WHERE id = v_fund_id;
      v_restored := v_restored || v_fund_id;
    END LOOP;
  END IF;

  -- Delete funds that were created in that batch
  IF v_created_ids IS NOT NULL THEN
    FOREACH v_fund_id IN ARRAY v_created_ids LOOP
      DELETE FROM public.funds WHERE id = v_fund_id;
      v_deleted := v_deleted || v_fund_id;
    END LOOP;
  END IF;

  INSERT INTO public.change_log (entity_type, entity_id, action, old_values, new_values, changed_by)
  VALUES (
    'fund',
    gen_random_uuid(),
    'bulk_paste_revert',
    jsonb_build_object('reverted_log_id', v_log.id, 'reverted_at_original', v_log.changed_at),
    jsonb_build_object(
      'restored_count', COALESCE(array_length(v_restored, 1), 0),
      'deleted_count', COALESCE(array_length(v_deleted, 1), 0),
      'skipped_count', COALESCE(array_length(v_skipped, 1), 0),
      'restored_ids', to_jsonb(v_restored),
      'deleted_ids', to_jsonb(v_deleted),
      'skipped_ids', to_jsonb(v_skipped)
    ),
    v_user_id
  );

  RETURN jsonb_build_object(
    'restored', to_jsonb(v_restored),
    'deleted', to_jsonb(v_deleted),
    'skipped', to_jsonb(v_skipped),
    'original_sync_at', v_log.changed_at
  );
END;
$function$;