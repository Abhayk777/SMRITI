-- ═══ Fix delete_patient to avoid direct storage.objects DML ═══
-- Supabase Storage disallows direct SQL DELETE on storage.objects.
-- Deleting the patient row triggers ON DELETE CASCADE across all 16 child tables.

create or replace function public.delete_patient(p_patient_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if not (public.is_caregiver(p_patient_id) or exists (
    select 1 from public.patients where id = p_patient_id and created_by = (select auth.uid())
  )) then
    raise exception 'caregiver only' using errcode = '42501';
  end if;

  -- Delete the patient row; foreign key ON DELETE CASCADE clears all 16 child tables
  delete from public.patients where id = p_patient_id;

  return true;
end;
$$;

-- Caregiver storage deletion policy so the Storage API can remove files if called
create policy media_delete on storage.objects for delete to authenticated
  using (
    bucket_id in ('patient-media', 'patient-memos', 'reports')
    and (
      public.is_caregiver(
        case
          when name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
            then split_part(name, '/', 1)::uuid
          else null
        end
      )
    )
  );
