begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, aud, role)
values
  ('55555555-1111-1111-1111-111111111111', 'vb-caregiver@test.com', 'x', now(), '{"provider":"email"}', 'authenticated', 'authenticated'),
  ('66666666-1111-1111-1111-111111111111', 'vb-viewer@test.com', 'x', now(), '{"provider":"email"}', 'authenticated', 'authenticated');
insert into patients (id, display_name, age, education_years, timezone)
values
  ('cccccccc-0000-0000-0000-000000000001', 'VoiceBot enabled', 76, 8, 'Asia/Kolkata'),
  ('dddddddd-0000-0000-0000-000000000002', 'VoiceBot disabled', 77, 8, 'Asia/Kolkata');
insert into patient_members (patient_id, user_id, role) values
  ('cccccccc-0000-0000-0000-000000000001', '55555555-1111-1111-1111-111111111111', 'caregiver'),
  ('cccccccc-0000-0000-0000-000000000001', '66666666-1111-1111-1111-111111111111', 'family_viewer');
insert into voicebot_patient_state (patient_id, enabled, status)
values ('cccccccc-0000-0000-0000-000000000001', true, 'ready');

insert into people (patient_id, name, relationship, photo_path)
values ('cccccccc-0000-0000-0000-000000000001', 'One', 'Daughter', 'voicebot/one.jpg');
update people set name = 'Two' where patient_id = 'cccccccc-0000-0000-0000-000000000001';

select is((select desired_revision from voicebot_patient_state where patient_id = 'cccccccc-0000-0000-0000-000000000001'), 2::bigint, 'enabled content changes advance the bigint VoiceBot revision');
select is((select count(*) from voicebot_sync_queue where patient_id = 'cccccccc-0000-0000-0000-000000000001'), 1::bigint, 'enabled content changes coalesce to one queue row');
select is((select revision from voicebot_sync_queue where patient_id = 'cccccccc-0000-0000-0000-000000000001'), 2::bigint, 'coalesced queue retains the latest revision');
select is((select content_version from patients where id = 'cccccccc-0000-0000-0000-000000000001'), 3, 'VoiceBot trigger does not add an extra tablet content_version bump');

insert into people (patient_id, name, relationship, photo_path)
values ('dddddddd-0000-0000-0000-000000000002', 'Disabled', 'Son', 'voicebot/disabled.jpg');
select is((select count(*) from voicebot_sync_queue where patient_id = 'dddddddd-0000-0000-0000-000000000002'), 0::bigint, 'disabled patients are never queued');

update patients set archived_at = now() where id = 'cccccccc-0000-0000-0000-000000000001';
select is((select status from voicebot_patient_state where patient_id = 'cccccccc-0000-0000-0000-000000000001'), 'disabled', 'archival disables VoiceBot state');
select is((select count(*) from voicebot_sync_queue where patient_id = 'cccccccc-0000-0000-0000-000000000001'), 0::bigint, 'archival removes pending VoiceBot work');

set local role authenticated;
set local request.jwt.claims = '{"sub":"55555555-1111-1111-1111-111111111111","role":"authenticated"}';
select is((select count(*) from voicebot_patient_state), 1::bigint, 'caregiver can read only their patient VoiceBot status');
select throws_ok($$select public.enqueue_voicebot_sync('cccccccc-0000-0000-0000-000000000001')$$, '42501', 'permission denied for function enqueue_voicebot_sync', 'browser roles cannot invoke queue functions');
select throws_ok($$select * from voicebot_sync_queue$$, '42501', 'permission denied for table voicebot_sync_queue', 'browser roles cannot read the queue');
select throws_ok($$select * from voicebot_gateway_resources$$, '42501', 'permission denied for table voicebot_gateway_resources', 'browser roles cannot read resource ownership bindings');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"66666666-1111-1111-1111-111111111111","role":"authenticated"}';
select is((select count(*) from voicebot_patient_state), 0::bigint, 'family viewers cannot read VoiceBot status');
reset role;

select * from finish();
rollback;
