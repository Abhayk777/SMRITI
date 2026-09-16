-- VoiceBot is opt-in per patient.  The Edge Functions are the only writers;
-- caregiver visibility is deliberately limited to the state row.
create table voicebot_patient_state (
  patient_id uuid primary key references patients(id) on delete cascade,
  enabled boolean not null default false,
  desired_revision integer not null default 0 check (desired_revision >= 0),
  applied_revision integer not null default 0 check (applied_revision >= 0),
  status text not null default 'disabled'
    check (status in ('disabled', 'pending', 'syncing', 'ready', 'error', 'unavailable')),
  last_error_code text,
  last_error_at timestamptz,
  updated_at timestamptz not null default now()
);

create table voicebot_sync_queue (
  patient_id uuid primary key references patients(id) on delete cascade,
  revision integer not null check (revision >= 0),
  available_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  locked_at timestamptz,
  lock_token uuid,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index voicebot_sync_queue_available_idx on voicebot_sync_queue (available_at)
  where locked_at is null;

-- The upstream ordinary key is shared across authorized patients.  These
-- durable bindings prevent a valid tablet from probing another patient's
-- session, job, or short-lived audio object through that key.
create table voicebot_gateway_resources (
  resource_type text not null check (resource_type in ('session', 'job', 'audio')),
  upstream_id text not null check (char_length(upstream_id) between 1 and 256),
  patient_id uuid not null references patients(id) on delete cascade,
  device_user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (resource_type, upstream_id)
);
create index voicebot_gateway_resources_owner_idx
  on voicebot_gateway_resources (patient_id, device_user_id, resource_type);

alter table voicebot_patient_state enable row level security;
alter table voicebot_sync_queue enable row level security;
alter table voicebot_gateway_resources enable row level security;

create policy voicebot_state_read on voicebot_patient_state for select
  using (public.is_caregiver(patient_id));
create policy voicebot_state_no_client_write on voicebot_patient_state for all
  using (false) with check (false);
create policy voicebot_queue_no_client_access on voicebot_sync_queue for all
  using (false) with check (false);
create policy voicebot_resources_no_client_access on voicebot_gateway_resources for all
  using (false) with check (false);

create or replace function public.enqueue_voicebot_sync(p_patient_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare next_revision integer;
begin
  update voicebot_patient_state
     set desired_revision = desired_revision + 1,
         status = 'pending', last_error_code = null, last_error_at = null,
         updated_at = now()
   where patient_id = p_patient_id and enabled
   returning desired_revision into next_revision;

  if next_revision is null then return; end if;
  insert into voicebot_sync_queue (patient_id, revision, available_at, updated_at)
  values (p_patient_id, next_revision, now(), now())
  on conflict (patient_id) do update set
    revision = excluded.revision, available_at = excluded.available_at,
    locked_at = null, lock_token = null, updated_at = now();
end $$;

create or replace function public.queue_voicebot_content_sync()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.enqueue_voicebot_sync(coalesce(new.patient_id, old.patient_id));
  return coalesce(new, old);
end $$;

create trigger t_voicebot_people after insert or update or delete on people
  for each row execute function public.queue_voicebot_content_sync();
create trigger t_voicebot_meds after insert or update or delete on medications
  for each row execute function public.queue_voicebot_content_sync();
create trigger t_voicebot_routine after insert or update or delete on routine_items
  for each row execute function public.queue_voicebot_content_sync();

create or replace function public.queue_voicebot_patient_sync()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.archived_at is not null then
    update voicebot_patient_state set enabled = false, status = 'disabled', updated_at = now()
      where patient_id = new.id;
    delete from voicebot_sync_queue where patient_id = new.id;
  else
    perform public.enqueue_voicebot_sync(new.id);
  end if;
  return new;
end $$;

create trigger t_voicebot_patient after update of display_name, lang_code, timezone, archived_at on patients
  for each row execute function public.queue_voicebot_patient_sync();

-- A service-role worker leases each patient at most once.  The lease expires
-- so a crashed invocation cannot strand a sync permanently.
create or replace function public.claim_voicebot_sync_jobs(p_limit integer, p_lock_token uuid)
returns table(patient_id uuid, revision integer) language sql security definer set search_path = public as $$
  with claimed as (
    select q.patient_id
      from voicebot_sync_queue q
     where q.available_at <= now()
       and (q.locked_at is null or q.locked_at < now() - interval '5 minutes')
     order by q.available_at, q.created_at
     for update skip locked
     limit greatest(least(p_limit, 25), 1)
  )
  update voicebot_sync_queue q
     set locked_at = now(), lock_token = p_lock_token, attempts = q.attempts + 1,
         updated_at = now()
    from claimed c
   where q.patient_id = c.patient_id
  returning q.patient_id, q.revision;
$$;
