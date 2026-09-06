-- Escalation ladder rows are created ahead of time and become eligible only
-- after their configured delay. Existing rows are immediately eligible.
alter table escalations
  add column not_before timestamptz not null default now();

create index escalations_due_idx
  on escalations (not_before, patient_id)
  where status = 'requested';

-- Replace the five-minute sweep with a two-minute due-row sweep. The secret is
-- provisioned separately in app_config by the deployment operator.
select cron.unschedule('smriti-escalation-sweep');
select cron.schedule('smriti-escalation-sweep', '*/2 * * * *', $$
  select net.http_post(
    url := 'https://<ref>.supabase.co/functions/v1/escalation-worker',
    headers := jsonb_build_object('x-internal-secret',
      (select value from app_config where key = 'cron_secret')),
    body := jsonb_build_object('mode','sweep'));
$$);
