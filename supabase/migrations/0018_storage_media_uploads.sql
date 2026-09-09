-- Browser uploads arrive before Storage has finalized object metadata. Keep
-- authorization based on the path and caregiver membership, and let the bucket
-- enforce its byte limit after the upload is received.

update storage.buckets
set file_size_limit = 5242880
where id = 'patient-media'
  and file_size_limit is distinct from 5242880;

drop policy if exists media_write on storage.objects;

create policy media_write on storage.objects
for insert to authenticated
with check (
  bucket_id = 'patient-media'
  and public.is_caregiver(
    case
      when name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
        then split_part(name, '/', 1)::uuid
      else null
    end
  )
);
