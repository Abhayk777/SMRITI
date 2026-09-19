begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('abababab-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','voicebot-rate@example.test','',now(),'{}','{}',now(),now());
insert into patients (id,display_name,age,education_years)
values ('cdcdcdcd-0000-4000-8000-000000000001','Rate Test',75,8);

select is(public.claim_voicebot_gateway_request('cdcdcdcd-0000-4000-8000-000000000001','abababab-0000-4000-8000-000000000001'), true, 'first paired-device gateway request is allowed');
select is((select count(*) from generate_series(1,59) where public.claim_voicebot_gateway_request('cdcdcdcd-0000-4000-8000-000000000001','abababab-0000-4000-8000-000000000001')),59::bigint,'the remaining requests in the one-minute allowance are allowed');
select is(public.claim_voicebot_gateway_request('cdcdcdcd-0000-4000-8000-000000000001','abababab-0000-4000-8000-000000000001'), false, 'the sixty-first request is rejected server-side');

select * from finish();
rollback;
