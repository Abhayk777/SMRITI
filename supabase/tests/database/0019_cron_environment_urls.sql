begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

insert into public.app_config (key, value)
values ('functions_base_url', 'https://staging.example.supabase.co');

select is(
  public.cron_function_url('watchdog'),
  'https://staging.example.supabase.co/functions/v1/watchdog',
  'watchdog URL is built from the environment configuration'
);

select is(
  public.cron_function_url('escalation-worker'),
  'https://staging.example.supabase.co/functions/v1/escalation-worker',
  'escalation URL is built from the environment configuration'
);

select ok(
  (select command like '%public.cron_function_url(''watchdog'')%'
   from cron.job where jobname = 'smriti-watchdog'),
  'watchdog cron job does not embed a project reference'
);

select ok(
  (select command like '%public.cron_function_url(''escalation-worker'')%'
   from cron.job where jobname = 'smriti-escalation-sweep'),
  'escalation cron job does not embed a project reference'
);

select is(
  (select schedule from cron.job where jobname = 'smriti-watchdog'),
  '*/10 * * * *',
  'watchdog keeps its ten-minute cadence'
);

select ok(
  not has_function_privilege('authenticated', 'public.cron_function_url(text)', 'execute'),
  'browser roles cannot invoke the cron URL helper'
);

select * from finish();
rollback;
