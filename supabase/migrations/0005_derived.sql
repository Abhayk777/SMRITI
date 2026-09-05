create table ability_mirror (
  patient_id  uuid not null references patients(id) on delete cascade,
  domain      text not null,
  theta       real not null,
  n_trials    int  not null,
  rt_mean_log real,
  rt_var      real,
  updated_at  timestamptz not null default now(),
  primary key (patient_id, domain)
);

create table flags (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid not null references patients(id) on delete cascade,
  type                text not null
                      check (type in ('decline','engagement_drop','adherence_drop',
                                      'device_offline','pattern_mismatch')),
  domains             text[] not null default '{}',
  severity            text not null check (severity in ('info','moderate','high')),
  changepoint_date    date,
  z_scores            jsonb,
  evidence_session_ids uuid[],
  baseline_window     daterange,
  recent_window       daterange,
  confidence          real,
  status              text not null default 'active'
                      check (status in ('active','acknowledged','resolved')),
  created_at          timestamptz not null default now(),
  acknowledged_by     uuid references auth.users(id),
  acknowledged_at     timestamptz
);
create index on flags (patient_id, status, created_at desc);

create table bandit_state (
  medication_id uuid primary key references medications(id) on delete cascade,
  patient_id    uuid not null references patients(id) on delete cascade,
  posteriors    jsonb not null default '{}'::jsonb,   -- {"morning_weekday__510":{"a":4.2,"b":1.8}}
  last_decay_at timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table reports (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references patients(id) on delete cascade,
  storage_path text not null,
  months       int not null,
  generated_by uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

-- ─────────────── RLS ───────────────
-- Enabled at declaration so these tables are deny-all until the policies
-- land in 0007_rls_policies.sql. Non-negotiable #1.
alter table ability_mirror enable row level security;
alter table flags enable row level security;
alter table bandit_state enable row level security;
alter table reports enable row level security;
