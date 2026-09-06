-- watchdog: every 10 minutes
select cron.schedule('smriti-watchdog', '*/10 * * * *', $$
  select net.http_post(
    url := 'https://yzhtgpaekoqaszxgbeyn.supabase.co/functions/v1/watchdog',
    headers := jsonb_build_object('x-internal-secret',
      current_setting('app.cron_secret', true)),
    body := '{}'::jsonb);
$$);

-- stuck escalations: every 5 minutes
select cron.schedule('smriti-escalation-sweep', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://yzhtgpaekoqaszxgbeyn.supabase.co/functions/v1/escalation-worker',
    headers := jsonb_build_object('x-internal-secret',
      current_setting('app.cron_secret', true)),
    body := jsonb_build_object('mode','sweep'));
$$);

-- nightly analysis (ML engineer's job): 02:00 IST = 20:30 UTC
select cron.schedule('smriti-analysis', '30 20 * * *', $$
  select net.http_post(
    url := 'https://<analysis-host>/run',
    headers := jsonb_build_object('x-internal-secret',
      current_setting('app.cron_secret', true)),
    body := '{}'::jsonb);
$$);

-- bandit decay: weekly, Sunday 03:00 IST
select cron.schedule('smriti-bandit-decay', '30 21 * * 0', $$
  update bandit_state
  set posteriors = (
        select jsonb_object_agg(k,
          jsonb_build_object('a', (v->>'a')::numeric * 0.99,
                             'b', (v->>'b')::numeric * 0.99))
        from jsonb_each(posteriors) as t(k,v)),
      last_decay_at = now()
  where last_decay_at < now() - interval '7 days';
$$);

-- keep the project awake (free tier pauses after ~1 week idle)
select cron.schedule('smriti-keepalive', '0 */6 * * *', $$ select 1; $$);
