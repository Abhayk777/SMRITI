-- Cron jobs must never carry one environment's project URL into another.
-- The deployment operator provisions this non-secret value separately in each
-- environment: app_config('functions_base_url') = https://<ref>.supabase.co

create or replace function public.cron_function_url(p_function_name text)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  base_url text;
begin
  select value into base_url
  from public.app_config
  where key = 'functions_base_url';

  if base_url is null or base_url !~ '^https://[^/]+$' then
    raise exception
      'functions_base_url must be an HTTPS origin without a path'
      using errcode = '22023';
  end if;

  return base_url || '/functions/v1/' || p_function_name;
end;
$$;

revoke all on function public.cron_function_url(text) from public, anon, authenticated;

select cron.unschedule('smriti-watchdog');
select cron.schedule('smriti-watchdog', '*/10 * * * *', $$
  select net.http_post(
    url := public.cron_function_url('watchdog'),
    headers := jsonb_build_object('x-internal-secret',
      (select value from public.app_config where key = 'cron_secret')),
    body := '{}'::jsonb);
$$);

select cron.unschedule('smriti-escalation-sweep');
select cron.schedule('smriti-escalation-sweep', '*/2 * * * *', $$
  select net.http_post(
    url := public.cron_function_url('escalation-worker'),
    headers := jsonb_build_object('x-internal-secret',
      (select value from public.app_config where key = 'cron_secret')),
    body := jsonb_build_object('mode', 'sweep'));
$$);
