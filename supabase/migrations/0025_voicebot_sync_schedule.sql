-- Dispatch the durable queue through the same internal-secret pattern used by
-- the existing watchdog and escalation workers.  The worker itself remains
-- feature-disabled until its server-only VoiceBot configuration is enabled.
select cron.unschedule(jobid)
from cron.job
where jobname = 'smriti-voicebot-sync';
select cron.schedule('smriti-voicebot-sync', '*/1 * * * *', $$
  select net.http_post(
    url := public.cron_function_url('voicebot-sync-worker'),
    headers := jsonb_build_object(
      'x-internal-secret',
      (select value from public.app_config where key = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
$$);
