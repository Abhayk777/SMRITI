-- ─────────────── PATIENTS ───────────────
create table patients (
  id                  uuid primary key default gen_random_uuid(),
  display_name        text not null,
  age                 int  not null check (age between 30 and 120),
  education_years     int  not null default 8 check (education_years between 0 and 25),
  lang_code           text not null default 'en',
  script              text not null default 'latin',
  timezone            text not null default 'Asia/Kolkata',

  -- content sync
  content_version     int  not null default 1,
  lang_pack_version   int  not null default 1,

  -- device binding (one patient, one active device)
  device_user_id      uuid,
  device_last_seen_at timestamptz,
  device_pending_events int default 0,
  device_app_version  text,
  clock_skew_ms       bigint default 0,

  consent_given_at    timestamptz,
  active_flag_count   int not null default 0,

  created_by          uuid references auth.users(id),
  created_at          timestamptz not null default now(),
  archived_at         timestamptz
);

-- ─────────────── MEMBERSHIP (the access model) ───────────────
create table patient_members (
  patient_id uuid not null references patients(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('caregiver','family_viewer','health_worker')),
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (patient_id, user_id)
);

-- critical for RLS performance: every policy check hits this index
create index patient_members_user_idx on patient_members (user_id, patient_id);

-- ─────────────── PAIRING ───────────────
create table pairing_tokens (
  token       text primary key,             -- 8 chars, unambiguous alphabet
  patient_id  uuid not null references patients(id) on delete cascade,
  created_by  uuid not null references auth.users(id),
  expires_at  timestamptz not null,
  consumed    boolean not null default false,
  consumed_at timestamptz,
  attempts    int not null default 0,
  created_at  timestamptz not null default now()
);
create index on pairing_tokens (patient_id, expires_at);

-- ─────────────── AUDIT ───────────────
create table audit_log (
  id         bigserial primary key,
  patient_id uuid references patients(id) on delete cascade,
  actor      uuid,
  action     text not null,
  detail     jsonb,
  created_at timestamptz not null default now()
);
create index on audit_log (patient_id, created_at desc);

-- ─────────────── RLS ───────────────
-- Enabled at declaration so these tables are deny-all until the policies
-- land in 0007_rls_policies.sql. Non-negotiable #1.
alter table patients enable row level security;
alter table patient_members enable row level security;
alter table pairing_tokens enable row level security;
alter table audit_log enable row level security;
