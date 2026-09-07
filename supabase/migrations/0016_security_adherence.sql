-- INT-01: close direct-write gaps and count one row per logical scheduled dose.

-- Membership is created only by the trusted SECURITY DEFINER RPCs
-- create_patient() and invite_member(). A direct browser insert must never be
-- able to turn a known patient UUID into access.
drop policy if exists pm_write on patient_members;
revoke insert on table patient_members from anon, authenticated;

-- Caregivers may acknowledge a flag, but may not rewrite server-owned
-- evidence. Keep the existing PostgREST payload working while making the
-- timestamp and actor server-owned.
revoke update on table flags from anon, authenticated;
grant update (status, acknowledged_at) on table flags to authenticated;

create or replace function public.enforce_flag_acknowledgement()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  actor_id uuid;
begin
  -- Server jobs own the full flag lifecycle, including resolution and evidence
  -- maintenance. The restricted path below is only for authenticated clients.
  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    return new;
  end if;

  actor_id := (select auth.uid());
  if actor_id is null or not public.is_caregiver(old.patient_id) then
    raise exception 'caregiver only' using errcode = '42501';
  end if;

  if old.status <> 'active' or new.status <> 'acknowledged' then
    raise exception 'only active flags may be acknowledged'
      using errcode = '22023';
  end if;

  new.acknowledged_by := actor_id;
  new.acknowledged_at := now();
  return new;
end;
$$;

drop trigger if exists t_enforce_flag_acknowledgement on flags;
create trigger t_enforce_flag_acknowledgement
before update on flags
for each row execute function public.enforce_flag_acknowledgement();

-- Memos are device-owned evidence. The only authenticated mutation is the
-- first transition from unread to read, with the timestamp chosen by Postgres.
revoke update on table memos from anon, authenticated;
grant update (read_at) on table memos to authenticated;

create or replace function public.enforce_memo_read_state()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  -- Service-role processes may maintain device-owned rows when necessary.
  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    return new;
  end if;

  if (select auth.uid()) is null or not public.is_caregiver(old.patient_id) then
    raise exception 'caregiver only' using errcode = '42501';
  end if;

  if old.read_at is not null or new.read_at is null then
    raise exception 'memo read state may only move from unread to read'
      using errcode = '22023';
  end if;

  new.read_at := now();
  return new;
end;
$$;

drop trigger if exists t_enforce_memo_read_state on memos;
create trigger t_enforce_memo_read_state
before update on memos
for each row execute function public.enforce_memo_read_state();

-- A logical dose is one patient + medication + exact scheduled occurrence.
-- Tablet and telephony rows for that occurrence are evidence about the same
-- dose, not additional scheduled doses. Confirmation wins over no-response;
-- when more than one confirmation exists, the earliest response (then receipt
-- time and UUID for a stable tie-break) owns the confirmation channel.
create or replace view daily_adherence with (security_invoker = true) as
with logical_doses as (
  select
    r.patient_id,
    r.medication_id,
    r.scheduled_at,
    bool_or(r.outcome = 'confirmed') as confirmed,
    bool_or(r.outcome = 'no_response') as had_no_response,
    (
      array_agg(
        r.channel
        order by r.responded_at asc nulls last,
                 r.server_received_at asc,
                 r.id asc
      ) filter (where r.outcome = 'confirmed')
    )[1] as confirmed_channel
  from reminder_events r
  group by r.patient_id, r.medication_id, r.scheduled_at
)
select
  d.patient_id,
  (to_timestamp(d.scheduled_at / 1000.0) at time zone p.timezone)::date as day,
  count(*) as scheduled,
  count(*) filter (where d.confirmed) as confirmed,
  count(*) filter (
    where d.confirmed and d.confirmed_channel = 'in_app'
  ) as via_tablet,
  count(*) filter (
    where d.confirmed and d.confirmed_channel = 'call'
  ) as via_call,
  count(*) filter (
    where not d.confirmed and d.had_no_response
  ) as missed
from logical_doses d
join patients p on p.id = d.patient_id
group by d.patient_id, day;
