-- SECURITY DEFINER bypasses RLS on patient_members, which is what prevents
-- infinite recursion when patient_members' own policy needs a membership check.
create or replace function public.patient_role(p uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from patient_members
  where patient_id = p and user_id = (select auth.uid())
  limit 1;
$$;

create or replace function public.is_member(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from patient_members
    where patient_id = p and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_caregiver(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from patient_members
    where patient_id = p and user_id = (select auth.uid()) and role = 'caregiver'
  );
$$;

-- the tablet's identity: app_metadata is signed into the JWT and
-- cannot be modified by the client
create or replace function public.is_device(p uuid)
returns boolean language sql stable as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'patient_id')::uuid = p
    and coalesce((auth.jwt() -> 'app_metadata' ->> 'is_device')::boolean, false),
    false
  );
$$;

create or replace function public.can_read(p uuid)
returns boolean language sql stable as $$
  select public.is_member(p) or public.is_device(p);
$$;
