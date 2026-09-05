insert into storage.buckets (id, name, public) values
  ('patient-media', 'patient-media', false),
  ('patient-memos', 'patient-memos', false),
  ('lang-packs',    'lang-packs',    false),
  ('reports',       'reports',       false)
on conflict do nothing;

-- path convention: {patient_id}/{filename}
create policy media_read on storage.objects for select
  using (bucket_id = 'patient-media'
         and can_read(((storage.foldername(name))[1])::uuid));

create policy media_write on storage.objects for insert
  with check (bucket_id = 'patient-media'
    and is_caregiver(((storage.foldername(name))[1])::uuid)
    and (metadata->>'size')::int < 5242880);

create policy memo_read on storage.objects for select
  using (bucket_id = 'patient-memos'
         and is_member(((storage.foldername(name))[1])::uuid));

create policy memo_write on storage.objects for insert
  with check (bucket_id = 'patient-memos'
    and is_device(((storage.foldername(name))[1])::uuid)
    and (metadata->>'size')::int < 10485760);

create policy lang_read on storage.objects for select
  using (bucket_id = 'lang-packs' and auth.role() = 'authenticated');

create policy report_read on storage.objects for select
  using (bucket_id = 'reports'
         and is_member(((storage.foldername(name))[1])::uuid));
