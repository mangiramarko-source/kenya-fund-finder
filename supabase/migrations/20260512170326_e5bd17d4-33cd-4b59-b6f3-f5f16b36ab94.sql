CREATE OR REPLACE FUNCTION public.bulk_sync_funds(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  v_user_id uuid := auth.uid();
  updated_ids uuid[] := ARRAY[]::uuid[];
  created_ids uuid[] := ARRAY[]::uuid[];
  v_id uuid;
  row_idx int := 0;
BEGIN
  IF NOT public.has_role(v_user_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized: admin role required';
  END IF;

  IF jsonb_typeof(payload) <> 'array' THEN
    RAISE EXCEPTION 'Payload must be a JSON array';
  END IF;

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

  RETURN jsonb_build_object(
    'updated', to_jsonb(updated_ids),
    'created', to_jsonb(created_ids)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.bulk_sync_funds(jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bulk_sync_funds(jsonb) TO authenticated;