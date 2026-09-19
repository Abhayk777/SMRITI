-- Forward-only WV-01 correction.  0022 was already applied locally and is
-- intentionally left intact.
alter table voicebot_patient_state
  alter column desired_revision type bigint using desired_revision::bigint,
  alter column applied_revision type bigint using applied_revision::bigint,
  add column last_attempt_at timestamptz,
  add column last_synced_at timestamptz,
  add column attempt_count integer not null default 0 check (attempt_count >= 0),
  add column next_attempt_at timestamptz,
  add column created_at timestamptz not null default now();

alter table voicebot_sync_queue
  alter column revision type bigint using revision::bigint,
  add column locked_until timestamptz;

-- Preserve 0022's compatibility lock columns for the uncommitted worker, but
-- make the documented expiry lease the authoritative eligibility condition.
create or replace function public.enqueue_voicebot_sync(p_patient_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare next_revision bigint;
begin
  update voicebot_patient_state
     set desired_revision = desired_revision + 1,
         status = 'pending', last_error_code = null, last_error_at = null,
         next_attempt_at = null, updated_at = now()
   where patient_id = p_patient_id and enabled
   returning desired_revision into next_revision;
  if next_revision is null then return; end if;

  insert into voicebot_sync_queue (patient_id, revision, available_at, locked_until, updated_at)
  values (p_patient_id, next_revision, now(), null, now())
  on conflict (patient_id) do update set
    revision = excluded.revision, available_at = excluded.available_at,
    locked_until = null, locked_at = null, lock_token = null, updated_at = now();
end $$;

drop function public.claim_voicebot_sync_jobs(integer, uuid);
create or replace function public.claim_voicebot_sync_jobs(p_limit integer, p_lock_token uuid)
returns table(patient_id uuid, revision bigint) language sql security definer set search_path = public as $$
  with claimed as (
    select q.patient_id
      from voicebot_sync_queue q
     where q.available_at <= now()
       and (q.locked_until is null or q.locked_until <= now())
     order by q.available_at, q.created_at
     for update skip locked
     limit greatest(least(p_limit, 25), 1)
  )
  update voicebot_sync_queue q
     set locked_at = now(), locked_until = now() + interval '5 minutes',
         lock_token = p_lock_token, attempts = q.attempts + 1, updated_at = now()
    from claimed c
   where q.patient_id = c.patient_id
  returning q.patient_id, q.revision;
$$;

-- Explicit privileges complement RLS: browser roles can only read the
-- caregiver-scoped state row, and cannot invoke trusted queue primitives.
revoke all on table voicebot_patient_state from public, anon, authenticated;
grant select on table voicebot_patient_state to authenticated;
grant all on table voicebot_patient_state to service_role;
revoke all on table voicebot_sync_queue from public, anon, authenticated;
grant all on table voicebot_sync_queue to service_role;
revoke all on table voicebot_gateway_resources from public, anon, authenticated;
grant all on table voicebot_gateway_resources to service_role;

revoke all on function public.enqueue_voicebot_sync(uuid) from public, anon, authenticated;
revoke all on function public.queue_voicebot_content_sync() from public, anon, authenticated;
revoke all on function public.queue_voicebot_patient_sync() from public, anon, authenticated;
revoke all on function public.claim_voicebot_sync_jobs(integer, uuid) from public, anon, authenticated;
grant execute on function public.enqueue_voicebot_sync(uuid) to service_role;
grant execute on function public.claim_voicebot_sync_jobs(integer, uuid) to service_role;
