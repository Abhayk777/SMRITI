-- ═══ Web: delete a patient completely with all their data ═══

create or replace function public.delete_patient(p_patient_id uuid)
returns boolean language plpgsql security definer set search_path = public, storage as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if not (public.is_caregiver(p_patient_id) or exists (
    select 1 from public.patients where id = p_patient_id and created_by = (select auth.uid())
  )) then
    raise exception 'caregiver only' using errcode = '42501';
  end if;

  -- Remove storage objects across buckets for this patient
  delete from storage.objects
  where bucket_id in ('patient-media', 'patient-memos', 'reports')
    and (
      split_part(name, '/', 1) = p_patient_id::text
      or (storage.foldername(name))[1] = p_patient_id::text
    );

  -- Delete the patient row; foreign key ON DELETE CASCADE clears all 16 child tables
  delete from public.patients where id = p_patient_id;

  return true;
end;
$$;

-- Allow direct delete policy on patients for caregivers and creator
create policy p_delete on public.patients for delete
  using (is_caregiver(id) or created_by = (select auth.uid()));
