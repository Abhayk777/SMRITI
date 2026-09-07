begin;

create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (
  id, email, phone, encrypted_password, email_confirmed_at,
  raw_app_meta_data, aud, role
)
values
  ('11111111-1111-1111-1111-111111111111', 'int01-a@test.com', null, 'x', now(),
   '{"provider":"email"}', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'int01-b@test.com', null, 'x', now(),
   '{"provider":"email"}', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'int01-viewer@test.com', null, 'x', now(),
   '{"provider":"email"}', 'authenticated', 'authenticated'),
  ('44444444-4444-4444-4444-444444444444', 'int01-invite@test.com', '+919876500004', 'x', now(),
   '{"provider":"email"}', 'authenticated', 'authenticated');

insert into patients (id, display_name, age, education_years, timezone, created_by)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'INT01 Patient A', 76, 8,
   'Asia/Kolkata', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'INT01 Patient B', 80, 12,
   'Asia/Kolkata', '22222222-2222-2222-2222-222222222222');

insert into patient_members (patient_id, user_id, role)
values
  ('aaaaaaaa-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111', 'caregiver'),
  ('bbbbbbbb-0000-0000-0000-000000000002',
   '22222222-2222-2222-2222-222222222222', 'caregiver'),
  ('aaaaaaaa-0000-0000-0000-000000000001',
   '33333333-3333-3333-3333-333333333333', 'family_viewer');

insert into people (id, patient_id, name, relationship, photo_path)
values
  ('a0000000-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001', 'A Person', 'Daughter', 'a/person.jpg'),
  ('b0000000-0000-0000-0000-000000000002',
   'bbbbbbbb-0000-0000-0000-000000000002', 'B Person', 'Son', 'b/person.jpg');

insert into flags (
  id, patient_id, type, severity, status, z_scores, evidence_session_ids
)
values (
  'fa000000-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'decline', 'moderate', 'active', '{"memory":-2.1}',
  array['a1000000-0000-0000-0000-000000000001'::uuid]
);

insert into memos (
  id, patient_id, storage_path, duration_ms, recorded_at, transcript
)
values (
  'aa000000-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001/memo.webm',
  12000, 1760000000000, 'Original transcript'
);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select throws_ok(
  $$insert into patient_members (patient_id, user_id, role)
    values ('bbbbbbbb-0000-0000-0000-000000000002',
            '11111111-1111-1111-1111-111111111111', 'caregiver')$$,
  '42501',
  'permission denied for table patient_members',
  'an authenticated user cannot self-enrol into an arbitrary patient'
);

select lives_ok(
  $$select create_patient(
      'INT01 RPC Patient', 70, 10, 'hi', 'Asia/Kolkata', 'Caregiver', '+919876500001'
    )$$,
  'create_patient still creates membership through its trusted path'
);

select lives_ok(
  $$select invite_member(
      'aaaaaaaa-0000-0000-0000-000000000001', '+919876500004', 'family_viewer'
    )$$,
  'invite_member still creates membership through its trusted path'
);

select results_eq(
  $$update people set name = 'Cross-patient rewrite'
    where id = 'b0000000-0000-0000-0000-000000000002'
    returning 1$$,
  $$select 1 where false$$,
  'a caregiver cannot update another patient'
);

select throws_ok(
  $$update flags set severity = 'high'
    where id = 'fa000000-0000-0000-0000-000000000001'$$,
  '42501',
  'permission denied for table flags',
  'a caregiver cannot alter server-owned flag evidence'
);

select throws_ok(
  $$update memos set transcript = 'Tampered transcript'
    where id = 'aa000000-0000-0000-0000-000000000001'$$,
  '42501',
  'permission denied for table memos',
  'a caregiver cannot alter device-owned memo evidence'
);

select lives_ok(
  $$update flags
    set status = 'acknowledged', acknowledged_at = '2000-01-01T00:00:00Z'
    where id = 'fa000000-0000-0000-0000-000000000001'$$,
  'a caregiver can acknowledge an active flag'
);

select lives_ok(
  $$update memos set read_at = '2000-01-01T00:00:00Z'
    where id = 'aa000000-0000-0000-0000-000000000001'$$,
  'a caregiver can mark an unread memo read'
);

reset role;

select is(
  (select acknowledged_by from flags
   where id = 'fa000000-0000-0000-0000-000000000001'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'flag acknowledgement records the authenticated actor'
);

select ok(
  (select acknowledged_at > '2000-01-02T00:00:00Z'::timestamptz from flags
   where id = 'fa000000-0000-0000-0000-000000000001'),
  'flag acknowledgement uses server time'
);

select ok(
  (select read_at > '2000-01-02T00:00:00Z'::timestamptz from memos
   where id = 'aa000000-0000-0000-0000-000000000001'),
  'memo read state uses server time'
);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select results_eq(
  $$update people set name = 'Viewer rewrite'
    where id = 'a0000000-0000-0000-0000-000000000001'
    returning 1$$,
  $$select 1 where false$$,
  'a family viewer cannot update caregiver-owned content'
);

select results_eq(
  $$update flags set status = 'acknowledged', acknowledged_at = now()
    where id = 'fa000000-0000-0000-0000-000000000001'
    returning 1$$,
  $$select 1 where false$$,
  'a family viewer cannot acknowledge flags'
);

reset role;

select is(
  (select count(*) from patient_members
   where user_id = '44444444-4444-4444-4444-444444444444'
     and patient_id = 'aaaaaaaa-0000-0000-0000-000000000001'
     and role = 'family_viewer'),
  1::bigint,
  'invite_member inserted the intended membership'
);

select is(
  (select count(*) from patients
   where display_name = 'INT01 RPC Patient'
     and created_by = '11111111-1111-1111-1111-111111111111'),
  1::bigint,
  'create_patient inserted the patient as the authenticated actor'
);

insert into medications (
  id, patient_id, name, dose,
  window_start_min, window_end_min, chosen_time_min, days_of_week
)
values (
  'da000000-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'INT01 Medicine', 'One tablet', 480, 660, 540, '1,2,3,4,5,6,7'
);

insert into reminder_events (
  id, patient_id, medication_id, scheduled_at,
  responded_at, outcome, channel, ladder_step
)
values
  ('de000000-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'da000000-0000-0000-0000-000000000001',
   1760000000000, 1760000060000, 'no_response', 'in_app', 1),
  ('de000000-0000-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'da000000-0000-0000-0000-000000000001',
   1760000000000, 1760000120000, 'confirmed', 'call', 2),
  ('de000000-0000-0000-0000-000000000003',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'da000000-0000-0000-0000-000000000001',
   1760000000000, 1760000180000, 'confirmed', 'call', 2),
  ('de000000-0000-0000-0000-000000000004',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'da000000-0000-0000-0000-000000000001',
   1760003600000, 1760003660000, 'no_response', 'in_app', 1),
  ('de000000-0000-0000-0000-000000000005',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'da000000-0000-0000-0000-000000000001',
   1760003600000, 1760003720000, 'no_response', 'watchdog', 2);

select results_eq(
  $$select scheduled, confirmed, via_tablet, via_call, missed
    from daily_adherence
    where patient_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  $$values (2::bigint, 1::bigint, 0::bigint, 1::bigint, 1::bigint)$$,
  'tablet and Twilio rows count once per logical scheduled dose'
);

select * from finish();
rollback;
