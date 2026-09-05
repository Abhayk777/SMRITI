-- Service-only configuration. Values are provisioned separately and must not
-- be committed to migration files.
create table app_config (
  key   text primary key,
  value text not null
);

alter table app_config enable row level security;

revoke all on table app_config from public, anon, authenticated;
grant select, insert, update, delete on table app_config to service_role;

-- Replace the three HTTP jobs created by 0012 without editing that applied
-- migration. The cron secret row is provisioned separately by hand.
select cron.unschedule('smriti-watchdog');
select cron.schedule('smriti-watchdog', '*/10 * * * *', $$
  select net.http_post(
    url := 'https://<ref>.supabase.co/functions/v1/watchdog',
    headers := jsonb_build_object('x-internal-secret',
      (select value from app_config where key = 'cron_secret')),
    body := '{}'::jsonb);
$$);

select cron.unschedule('smriti-escalation-sweep');
select cron.schedule('smriti-escalation-sweep', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://<ref>.supabase.co/functions/v1/escalation-worker',
    headers := jsonb_build_object('x-internal-secret',
      (select value from app_config where key = 'cron_secret')),
    body := jsonb_build_object('mode','sweep'));
$$);

select cron.unschedule('smriti-analysis');
select cron.schedule('smriti-analysis', '30 20 * * *', $$
  select net.http_post(
    url := 'https://<analysis-host>/run',
    headers := jsonb_build_object('x-internal-secret',
      (select value from app_config where key = 'cron_secret')),
    body := '{}'::jsonb);
$$);
