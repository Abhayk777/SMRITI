alter table patients enable row level security;
alter table patient_members enable row level security;
alter table people enable row level security;
alter table medications enable row level security;
alter table routine_items enable row level security;
alter table escalation_config enable row level security;
alter table events enable row level security;
alter table sessions enable row level security;
alter table reminder_events enable row level security;
alter table memos enable row level security;
alter table escalations enable row level security;
alter table flags enable row level security;
alter table ability_mirror enable row level security;
alter table bandit_state enable row level security;
alter table reports enable row level security;
alter table pairing_tokens enable row level security;
alter table audit_log enable row level security;

-- ── patients ──
create policy p_read   on patients for select using (can_read(id));
create policy p_insert on patients for insert with check ((select auth.uid()) is not null);
create policy p_update on patients for update using (is_caregiver(id));

-- ── patient_members — direct check, no helper, avoids recursion ──
create policy pm_read_own on patient_members for select
  using (user_id = (select auth.uid()) or is_caregiver(patient_id));
create policy pm_write on patient_members for insert
  with check (is_caregiver(patient_id) or user_id = (select auth.uid()));
create policy pm_delete on patient_members for delete
  using (is_caregiver(patient_id));

-- ── content: web writes, tablet reads. Never the reverse. ──
create policy c_read_people   on people for select using (can_read(patient_id));
create policy c_write_people  on people for all
  using (is_caregiver(patient_id)) with check (is_caregiver(patient_id));

create policy c_read_meds  on medications for select using (can_read(patient_id));
create policy c_write_meds on medications for all
  using (is_caregiver(patient_id)) with check (is_caregiver(patient_id));

create policy c_read_routine  on routine_items for select using (can_read(patient_id));
create policy c_write_routine on routine_items for all
  using (is_caregiver(patient_id)) with check (is_caregiver(patient_id));

create policy c_read_esc  on escalation_config for select using (can_read(patient_id));
create policy c_write_esc on escalation_config for all
  using (is_caregiver(patient_id)) with check (is_caregiver(patient_id));

-- ── events: device inserts only. Immutable, enforced at the database. ──
create policy e_insert on events for insert with check (is_device(patient_id));
create policy e_read   on events for select using (is_member(patient_id));
create policy e_no_update on events for update using (false);
create policy e_no_delete on events for delete using (false);

create policy s_insert on sessions for insert with check (is_device(patient_id));
create policy s_update on sessions for update using (is_device(patient_id));
create policy s_read   on sessions for select using (is_member(patient_id));
create policy s_no_delete on sessions for delete using (false);

create policy re_insert on reminder_events for insert with check (is_device(patient_id));
create policy re_read   on reminder_events for select using (is_member(patient_id));
create policy re_no_update on reminder_events for update using (false);
create policy re_no_delete on reminder_events for delete using (false);

create policy m_insert on memos for insert with check (is_device(patient_id));
create policy m_read   on memos for select using (is_member(patient_id));
create policy m_update on memos for update using (is_caregiver(patient_id))
  with check (is_caregiver(patient_id));           -- read_at only, enforced in app
create policy m_no_delete on memos for delete using (false);

create policy esc_insert on escalations for insert with check (is_device(patient_id));
create policy esc_read   on escalations for select using (is_caregiver(patient_id));
create policy esc_no_update on escalations for update using (false);  -- service role only

-- ── derived: read-only to everyone; service role bypasses RLS ──
create policy f_read on flags for select using (is_member(patient_id));
create policy f_ack  on flags for update using (is_caregiver(patient_id))
  with check (is_caregiver(patient_id));
create policy f_no_insert on flags for insert with check (false);

create policy am_read on ability_mirror for select using (is_member(patient_id));
create policy am_no_write on ability_mirror for all using (false) with check (false);

create policy bs_no_access on bandit_state for all using (false) with check (false);

create policy r_read on reports for select using (is_member(patient_id));
create policy r_no_write on reports for insert with check (false);

create policy pt_no_access on pairing_tokens for all using (false) with check (false);

create policy al_read on audit_log for select using (is_caregiver(patient_id));
create policy al_no_write on audit_log for insert with check (false);
