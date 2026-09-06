-- Correct the deployed project URLs without editing the already-applied cron
-- migrations. The analysis endpoint remains owned by the ML deployment.
select cron.unschedule('smriti-watchdog');
select cron.schedule('smriti-watchdog', '*/10 * * * *', $$
  select net.http_post(
    url := 'https://yzhtgpaekoqaszxgbeyn.supabase.co/functions/v1/watchdog',
    headers := jsonb_build_object('x-internal-secret',
      (select value from app_config where key = 'cron_secret')),
    body := '{}'::jsonb);
$$);

select cron.unschedule('smriti-escalation-sweep');
select cron.schedule('smriti-escalation-sweep', '*/2 * * * *', $$
  select net.http_post(
    url := 'https://yzhtgpaekoqaszxgbeyn.supabase.co/functions/v1/escalation-worker',
    headers := jsonb_build_object('x-internal-secret',
      (select value from app_config where key = 'cron_secret')),
    body := jsonb_build_object('mode','sweep'));
$$);
