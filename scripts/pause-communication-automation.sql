-- Queue-preserving pause. Stops only the new communication jobs; it does not
-- delete, cancel, claim, or resend any outbox row.
begin;
do $$
declare name text;
begin
  foreach name in array array[
    'news-highlights-weekdays', 'process-news-highlights',
    'market-overview-weekdays', 'market-brief-weekdays', 'process-market-brief'
  ] loop
    if exists (select 1 from cron.job where jobname = name) then
      perform cron.unschedule(name);
    end if;
  end loop;
end $$;
commit;
