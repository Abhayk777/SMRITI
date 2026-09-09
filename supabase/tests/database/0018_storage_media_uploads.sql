begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (
  id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, aud, role
)
values
  ('18111111-1111-1111-1111-111111111111', 'int18-caregiver@test.com', 'x', now(),
   '{"provider":"email"}', 'authenticated', 'authenticated'),
  ('18222222-2222-2222-2222-222222222222', 'int18-other@test.com', 'x', now(),
   '{"provider":"email"}', 'authenticated', 'authenticated'),
  ('18333333-3333-3333-3333-333333333333', 'int18-viewer@test.com', 'x', now(),
   '{"provider":"email"}', 'authenticated', 'authenticated');

insert into patients (id, display_name, age, education_years, timezone, created_by)
values
  ('18aaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'INT18 Patient A', 76, 8,
   'Asia/Kolkata', '18111111-1111-1111-1111-111111111111'),
  ('18bbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'INT18 Patient B', 80, 12,
   'Asia/Kolkata', '18222222-2222-2222-2222-222222222222');

insert into patient_members (patient_id, user_id, role)
values
  ('18aaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '18111111-1111-1111-1111-111111111111', 'caregiver'),
  ('18bbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '18222222-2222-2222-2222-222222222222', 'caregiver'),
  ('18aaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '18333333-3333-3333-3333-333333333333', 'family_viewer');

select is(
  (select file_size_limit from storage.buckets where id = 'patient-media'),
  5242880::bigint,
  'patient-media has a 5 MB Storage-enforced size limit'
);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"18111111-1111-1111-1111-111111111111","role":"authenticated"}';

select lives_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values (
      'patient-media',
      '18aaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/photo.jpg',
      '18111111-1111-1111-1111-111111111111'
    )$$,
  'a caregiver can upload beneath their own patient path'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values (
      'patient-media',
      '18bbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/cross-patient.jpg',
      '18111111-1111-1111-1111-111111111111'
    )$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a caregiver cannot upload beneath another patient path'
);

select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values ('patient-media', 'not-a-patient/photo.jpg',
            '18111111-1111-1111-1111-111111111111')$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a malformed patient-media path is rejected'
);

set local request.jwt.claims =
  '{"sub":"18333333-3333-3333-3333-333333333333","role":"authenticated"}';

select throws_ok(
  $$insert into storage.objects (bucket_id, name, owner_id)
    values (
      'patient-media',
      '18aaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/viewer.jpg',
      '18333333-3333-3333-3333-333333333333'
    )$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a family viewer cannot upload patient media'
);

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('patient-media',
            '18aaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/anonymous.jpg')$$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'an unauthenticated caller cannot upload patient media'
);

reset role;

select is(
  (select count(*) from pg_policies
   where schemaname = 'storage'
     and tablename = 'objects'
     and policyname = 'media_write'
     and roles = array['authenticated'::name]),
  1::bigint,
  'media insert policy applies only to authenticated callers'
);

select * from finish();
rollback;
