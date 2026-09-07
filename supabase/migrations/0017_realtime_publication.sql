-- INT-02: publish only patient-scoped derived state needed by the web UI.
-- Raw event/session/reminder streams remain private; a patients-row update is
-- the signal for clients to refetch their authorised aggregate views.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'patients'
  ) then
    alter publication supabase_realtime add table public.patients;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'flags'
  ) then
    alter publication supabase_realtime add table public.flags;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'memos'
  ) then
    alter publication supabase_realtime add table public.memos;
  end if;
end
$$;
