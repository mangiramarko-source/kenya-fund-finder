-- Restore the scoped queue claim contract expected by the deployed worker.
-- The four-argument signature keeps internal-mode claims restricted to the
-- resolved allowlist and remains unrestricted only when live mode passes NULL.
create or replace function public.claim_communication_category_batch(
  p_category text,
  p_limit integer,
  p_lease_seconds integer,
  p_allowed_user_ids uuid[] default null
)
returns setof public.communication_outbox
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_category not in ('market_brief', 'price_alert', 'news_highlights') then
    raise exception 'Unsupported communication category';
  end if;
  if p_limit < 1 or p_limit > 5 then
    raise exception 'p_limit must be between 1 and 5';
  end if;
  if p_lease_seconds < 60 or p_lease_seconds > 300 then
    raise exception 'p_lease_seconds must be between 60 and 300';
  end if;

  return query
  with claimable as (
    select co.id
    from public.communication_outbox co
    where co.category = p_category
      and co.attempts < 3
      and (p_allowed_user_ids is null or co.user_id = any(p_allowed_user_ids))
      and (
        (co.status in ('pending', 'retry_wait') and co.next_attempt_at <= now())
        or (co.status = 'processing' and co.lease_expires_at < now())
      )
    order by co.next_attempt_at, co.created_at
    for update skip locked
    limit p_limit
  )
  update public.communication_outbox co
  set status = 'processing',
      attempts = co.attempts + 1,
      claim_token = gen_random_uuid(),
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      failure_reason = null,
      updated_at = now()
  from claimable
  where co.id = claimable.id
  returning co.*;
end;
$$;

revoke all on function public.claim_communication_category_batch(text, integer, integer, uuid[])
  from public, anon, authenticated;
grant execute on function public.claim_communication_category_batch(text, integer, integer, uuid[])
  to service_role;
