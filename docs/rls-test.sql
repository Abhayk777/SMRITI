-- ═══════════════════════════════════════════════════════════════
-- RLS isolation test — T07 checkpoint
-- Run in Studio SQL Editor (localhost:54323) after any RLS or view change.
-- Sections 1-5 in order. Section 5 tears down.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. SEED: two users, two patients, one person each ──────────

insert into auth.users (id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, aud, role)
values
 ('11111111-1111-1111-1111-111111111111','a@test.com','x',now(),
  '{"provider":"email"}','authenticated','authenticated'),
 ('22222222-2222-2222-2222-222222222222','b@test.com','x',now(),
  '{"provider":"email"}','authenticated','authenticated');

insert into patients (id, display_name, age, education_years, created_by)
values
 ('aaaaaaaa-0000-0000-0000-000000000001','Patient A',76,8,
  '11111111-1111-1111-1111-111111111111'),
 ('bbbbbbbb-0000-0000-0000-000000000002','Patient B',80,12,
  '22222222-2222-2222-2222-222222222222');

insert into patient_members (patient_id, user_id, role) values
 ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','caregiver'),
 ('bbbbbbbb-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','caregiver');

insert into people (patient_id, name, relationship, photo_path, sort_order) values
 ('aaaaaaaa-0000-0000-0000-000000000001','Bina','daughter','a/1.jpg',0),
 ('bbbbbbbb-0000-0000-0000-000000000002','Tomba','son','b/1.jpg',0);

-- events for BOTH patients, so the views have data to leak if broken
insert into sessions (id, patient_id, started_at, ended_at, game_ids, completed)
values
 (gen_random_uuid(),'aaaaaaaa-0000-0000-0000-000000000001',
  extract(epoch from now())*1000, extract(epoch from now())*1000+300000,'market_basket',true),
 (gen_random_uuid(),'bbbbbbbb-0000-0000-0000-000000000002',
  extract(epoch from now())*1000, extract(epoch from now())*1000+300000,'faces_family',true);

insert into events (id, patient_id, session_id, game_id, domain, item_id,
  item_difficulty, theta_before, correct, initiation_ms, movement_ms,
  response_time_ms, trial_index, ts, hour_of_day, tz_offset_min)
select gen_random_uuid(), s.patient_id, s.id, 'market_basket','memory','item1',
  0.5, 0.8, true, 900, 1200, 2100, g,
  extract(epoch from now())*1000, 9, 330
from sessions s, generate_series(0,4) g;


-- ── 2. TABLE ISOLATION: user A must see only Patient A ─────────

begin;
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select 'patients' as t, count(*) from patients
union all select 'people',  count(*) from people
union all select 'members', count(*) from patient_members
union all select 'events',  count(*) from events;
commit;
-- EXPECT: patients 1, people 1, members 1, events 5


-- ── 3. VIEW ISOLATION: views must not bypass RLS ───────────────
-- Views run as OWNER unless created with (security_invoker = true).
-- Without it, every count below returns 2 and T07 still "passes".

begin;
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select 'daily_report'    as v, count(distinct patient_id) from daily_report
union all select 'daily_play',      count(distinct patient_id) from daily_play
union all select 'daily_domain',    count(distinct patient_id) from daily_domain
union all select 'daily_sessions',  count(distinct patient_id) from daily_sessions
union all select 'daily_adherence', count(distinct patient_id) from daily_adherence;
commit;
-- EXPECT: every count = 1


-- ── 4. DEVICE + ANON ───────────────────────────────────────────

begin;
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated",
    "app_metadata":{"is_device":true,
                    "patient_id":"aaaaaaaa-0000-0000-0000-000000000001"}}';

select 'patients' as t, count(*) from patients
union all select 'people', count(*) from people
union all select 'flags',  count(*) from flags;
commit;
-- EXPECT: patients 1, people 1, flags 0  (device never reads flags)

begin;
set local role anon;
select count(*) from patients;
commit;
-- EXPECT: 0


-- ── 5. TEARDOWN ────────────────────────────────────────────────
-- patients first: created_by has no cascade to auth.users

delete from patients
where id in ('aaaaaaaa-0000-0000-0000-000000000001',
             'bbbbbbbb-0000-0000-0000-000000000002');

delete from auth.users where email in ('a@test.com','b@test.com');