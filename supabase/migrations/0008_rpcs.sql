-- ═══ Called by the TABLET on every content pull ═══
create or replace function get_patient_content(p_patient_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not (is_device(p_patient_id) or is_member(p_patient_id)) then
    raise exception 'access denied';
  end if;

  select jsonb_build_object(
    'version',           p.content_version,
    'lang_code',         p.lang_code,
    'script',            p.script,
    'timezone',          p.timezone,
    'lang_pack_version', p.lang_pack_version,
    'elder_name',        p.display_name,
    'age',               p.age,
    'education_years',   p.education_years,

    'people', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pe.id, 'name', pe.name, 'relationship', pe.relationship,
        'photo_path', pe.photo_path, 'voice_path', pe.voice_path,
        'memory_prompt', pe.memory_prompt, 'is_deceased', pe.is_deceased,
        'sort_order', pe.sort_order) order by pe.sort_order)
      from people pe where pe.patient_id = p.id), '[]'::jsonb),

    'medications', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'name', m.name, 'dose', m.dose,
        'pill_photo_path', m.pill_photo_path, 'voice_path', m.voice_path,
        'window_start_min', m.window_start_min, 'window_end_min', m.window_end_min,
        'chosen_time_min', m.chosen_time_min, 'days_of_week', m.days_of_week,
        'active', m.active))
      from medications m where m.patient_id = p.id and m.active), '[]'::jsonb),

    'routine', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'time_min', r.time_min,
        'label_key', r.label_key, 'icon_asset', r.icon_asset) order by r.time_min)
      from routine_items r where r.patient_id = p.id), '[]'::jsonb),

    'escalation', (
      select jsonb_build_object(
        'steps', ec.steps,
        'primary_name', ec.primary_name, 'primary_phone', ec.primary_phone,
        'secondary_name', ec.secondary_name, 'secondary_phone', ec.secondary_phone)
      from escalation_config ec where ec.patient_id = p.id)
  ) into result
  from patients p where p.id = p_patient_id;

  return result;
end $$;

-- ═══ Called by the TABLET on every successful sync ═══
create or replace function device_heartbeat(
  p_patient_id uuid, p_app_version text,
  p_pending_events int, p_device_time_ms bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare server_ms bigint; skew bigint;
begin
  if not is_device(p_patient_id) then raise exception 'device only'; end if;

  server_ms := (extract(epoch from now()) * 1000)::bigint;
  skew := p_device_time_ms - server_ms;

  update patients set
    device_last_seen_at   = now(),
    device_app_version    = p_app_version,
    device_pending_events = p_pending_events,
    clock_skew_ms         = skew
  where id = p_patient_id;

  return jsonb_build_object('server_time_ms', server_ms, 'clock_skew_ms', skew);
end $$;

-- ═══ Web: create a patient + membership + defaults atomically ═══
create or replace function create_patient(
  p_name text, p_age int, p_education int, p_lang text,
  p_timezone text default 'Asia/Kolkata',
  p_primary_name text default null, p_primary_phone text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid; uid uuid;
begin
  uid := (select auth.uid());
  if uid is null then raise exception 'not authenticated'; end if;

  insert into patients (display_name, age, education_years, lang_code, timezone, created_by)
  values (p_name, p_age, p_education, p_lang, p_timezone, uid)
  returning id into new_id;

  insert into patient_members (patient_id, user_id, role) values (new_id, uid, 'caregiver');

  insert into escalation_config (patient_id, primary_name, primary_phone)
  values (new_id, coalesce(p_primary_name,'Caregiver'), coalesce(p_primary_phone,''));

  return new_id;
end $$;

-- ═══ Web: overview row per patient — powers the multi-patient landing ═══
-- FORWARD REFERENCE: this function joins `daily_report`, a view created in
-- 0010_views.sql (T10). Its body is language sql, which Postgres validates at
-- CREATE time, so validation is disabled for this one function and restored
-- immediately after. The function is inert until 0010 runs.
set check_function_bodies = off;
create or replace function my_patients_overview()
returns table (
  patient_id uuid, display_name text, role text,
  played_today boolean, session_minutes numeric,
  meds_scheduled int, meds_confirmed int,
  active_flags int, unread_memos int,
  device_last_seen_at timestamptz, device_status text
) language sql stable security definer set search_path = public as $$
  with mine as (
    select pm.patient_id, pm.role from patient_members pm
    where pm.user_id = (select auth.uid())
  )
  select
    p.id, p.display_name, mine.role,
    coalesce(dr.played, false),
    coalesce(dr.minutes_played, 0),
    coalesce(dr.scheduled, 0)::int,
    coalesce(dr.confirmed, 0)::int,
    p.active_flag_count,
    (select count(*)::int from memos m
      where m.patient_id = p.id and m.read_at is null),
    p.device_last_seen_at,
    case
      when p.device_last_seen_at is null then 'never'
      when p.device_last_seen_at < now() - interval '72 hours' then 'offline'
      when p.device_last_seen_at < now() - interval '24 hours' then 'stale'
      else 'ok'
    end
  from mine
  join patients p on p.id = mine.patient_id and p.archived_at is null
  left join daily_report dr
    on dr.patient_id = p.id
   and dr.day = (now() at time zone p.timezone)::date;
$$;

set check_function_bodies = on;
-- ═══ Web: invite by phone ═══
create or replace function invite_member(
  p_patient_id uuid, p_phone text, p_role text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare target uuid;
begin
  if not is_caregiver(p_patient_id) then raise exception 'caregiver only'; end if;
  if p_role not in ('family_viewer','caregiver') then raise exception 'bad role'; end if;

  select id into target from auth.users where phone = p_phone;
  if target is null then
    return jsonb_build_object('status','pending','message','no account yet');
  end if;

  insert into patient_members (patient_id, user_id, role, invited_by)
  values (p_patient_id, target, p_role, (select auth.uid()))
  on conflict (patient_id, user_id) do update set role = excluded.role;

  return jsonb_build_object('status','added');
end $$;
