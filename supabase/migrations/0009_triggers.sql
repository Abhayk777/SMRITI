-- ─── content version auto-bump ───
-- The web app does plain CRUD. Versioning is automatic and cannot be forgotten.
create or replace function bump_content_version()
returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  pid := coalesce(new.patient_id, old.patient_id);
  update patients set content_version = content_version + 1 where id = pid;
  return coalesce(new, old);
end $$;

create trigger t_bump_people    after insert or update or delete on people
  for each row execute function bump_content_version();
create trigger t_bump_meds      after insert or update or delete on medications
  for each row execute function bump_content_version();
create trigger t_bump_routine   after insert or update or delete on routine_items
  for each row execute function bump_content_version();
create trigger t_bump_esc       after insert or update on escalation_config
  for each row execute function bump_content_version();

-- ─── seed chosen_time_min from window start ───
create or replace function default_chosen_time()
returns trigger language plpgsql as $$
begin
  if new.chosen_time_min is null then
    new.chosen_time_min := new.window_start_min;
  end if;
  return new;
end $$;
create trigger t_default_chosen before insert on medications
  for each row execute function default_chosen_time();

-- ─── ability mirror ───
create or replace function update_ability_mirror()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into ability_mirror (patient_id, domain, theta, n_trials, updated_at)
  values (new.patient_id, new.domain, new.theta_before, 1, now())
  on conflict (patient_id, domain) do update
    set theta = excluded.theta,
        n_trials = ability_mirror.n_trials + 1,
        updated_at = now();
  return new;
end $$;
create trigger t_ability_mirror after insert on events
  for each row execute function update_ability_mirror();

-- ─── flag count denormalization ───
create or replace function sync_flag_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update patients set active_flag_count = (
    select count(*) from flags
    where patient_id = coalesce(new.patient_id, old.patient_id) and status = 'active'
  ) where id = coalesce(new.patient_id, old.patient_id);
  return coalesce(new, old);
end $$;
create trigger t_flag_count after insert or update or delete on flags
  for each row execute function sync_flag_count();
