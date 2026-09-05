create table people (
  id             uuid primary key default gen_random_uuid(),
  patient_id     uuid not null references patients(id) on delete cascade,
  name           text not null,
  relationship   text not null,
  photo_path     text not null,             -- storage path, NOT a URL
  voice_path     text,
  memory_prompt  text,
  is_deceased    boolean not null default false,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);
create index on people (patient_id, sort_order);

create table medications (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references patients(id) on delete cascade,
  name             text not null,
  dose             text not null,
  pill_photo_path  text,
  voice_path       text,

  -- minutes from midnight, integers. NEVER a time type.
  -- (the previous project used `time` + string comparison and broke nightly at 23:55)
  window_start_min int not null check (window_start_min between 0 and 1439),
  window_end_min   int not null check (window_end_min   between 0 and 1439),
  chosen_time_min  int not null check (chosen_time_min  between 0 and 1439),

  days_of_week     text not null default '1,2,3,4,5,6,7',
  active           boolean not null default true,
  created_at       timestamptz not null default now(),

  constraint chosen_within_window check (
    chosen_time_min >= window_start_min and chosen_time_min <= window_end_min
  )
);
create index on medications (patient_id) where active;

create table routine_items (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references patients(id) on delete cascade,
  time_min    int not null check (time_min between 0 and 1439),
  label_key   text not null,
  icon_asset  text not null,
  created_at  timestamptz not null default now()
);
create index on routine_items (patient_id, time_min);

create table escalation_config (
  patient_id      uuid primary key references patients(id) on delete cascade,
  steps           jsonb not null default
    '[{"step":0,"minutes":0,"channel":"in_app"},
      {"step":1,"minutes":15,"channel":"in_app"},
      {"step":2,"minutes":30,"channel":"call"},
      {"step":3,"minutes":50,"channel":"call"},
      {"step":4,"minutes":75,"channel":"sms_primary"},
      {"step":5,"minutes":180,"channel":"sms_secondary"}]'::jsonb,
  primary_name    text not null,
  primary_phone   text not null,            -- E.164
  secondary_name  text,
  secondary_phone text,
  updated_at      timestamptz not null default now()
);

-- ─────────────── RLS ───────────────
-- Enabled at declaration so these tables are deny-all until the policies
-- land in 0007_rls_policies.sql. Non-negotiable #1.
alter table people enable row level security;
alter table medications enable row level security;
alter table routine_items enable row level security;
alter table escalation_config enable row level security;
