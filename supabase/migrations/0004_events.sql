create table sessions (
  id             uuid primary key,                 -- CLIENT-generated
  patient_id     uuid not null references patients(id) on delete cascade,
  started_at     bigint not null,                  -- device epoch ms
  ended_at       bigint,
  game_ids       text not null,
  completed      boolean not null default false,
  abandoned_at_ms bigint,
  demo_replays   int not null default 0,
  server_received_at timestamptz not null default now()
);
create index on sessions (patient_id, started_at desc);

create table events (
  id              uuid primary key,                -- CLIENT-generated
  patient_id      uuid not null references patients(id) on delete cascade,
  session_id      uuid not null,
  game_id         text not null,
  domain          text not null
                  check (domain in ('memory','attention','executive','visuospatial','language')),

  item_id         text not null,                   -- per-item trajectories & savings
  item_difficulty real not null,
  theta_before    real not null,
  correct         boolean not null,

  initiation_ms   int not null,                    -- executive initiation
  movement_ms     int not null,                    -- motor speed
  response_time_ms int not null,

  chosen_id       text,
  error_class     text,                            -- semantic|random|perseverative|
                                                   -- repeat_selection|omission|mirror|
                                                   -- rotation|detail|sequence_error|
                                                   -- item_error|miss|false_alarm
  trial_index     int not null,
  trial_context   text,                            -- post_switch|first_exposure|
                                                   -- repeat_exposure|delayed_recall
  hint_level      int not null default 0,
  metrics         jsonb,

  ts              bigint not null,
  hour_of_day     int not null,
  tz_offset_min   int not null,
  server_received_at timestamptz not null default now()
);

-- indexes the report page depends on
create index events_patient_ts        on events (patient_id, ts desc);
create index events_patient_domain_ts on events (patient_id, domain, ts desc);
create index events_patient_item      on events (patient_id, item_id);
create index events_session_trial     on events (session_id, trial_index);
create index events_patient_game      on events (patient_id, game_id, session_id);
create index events_metrics_gin       on events using gin (metrics jsonb_path_ops);
create index events_delayed_recall    on events (patient_id, item_id)
                                      where trial_context = 'delayed_recall';

create table reminder_events (
  id             uuid primary key,                 -- client OR server generated
  patient_id     uuid not null references patients(id) on delete cascade,
  medication_id  uuid not null,
  scheduled_at   bigint not null,
  fired_at       bigint,
  responded_at   bigint,
  outcome        text check (outcome in ('confirmed','declined','no_response')),
  channel        text not null check (channel in ('in_app','call','sms','watchdog')),
  ladder_step    int not null,
  server_received_at timestamptz not null default now()
);
create index on reminder_events (patient_id, scheduled_at desc);
create index on reminder_events (patient_id, medication_id, scheduled_at);

create table memos (
  id           uuid primary key,
  patient_id   uuid not null references patients(id) on delete cascade,
  storage_path text not null,
  duration_ms  int not null,
  recorded_at  bigint not null,
  context_tag  text,
  transcript   text,
  read_at      timestamptz,
  server_received_at timestamptz not null default now()
);
create index on memos (patient_id, recorded_at desc);

create table escalations (
  id                text primary key,              -- "{reminderEventId}_{step}"
  patient_id        uuid not null references patients(id) on delete cascade,
  reminder_event_id uuid,
  medication_id     uuid,
  step              int not null,
  status            text not null default 'requested'
                    check (status in ('requested','executing','completed','cancelled','failed')),
  reason            text,
  twilio_sid        text,
  requested_at      bigint not null,
  executed_at       timestamptz,
  source            text not null default 'device' check (source in ('device','watchdog')),
  created_at        timestamptz not null default now()
);
create index on escalations (status, created_at) where status = 'requested';
create index on escalations (patient_id, created_at desc);

-- ─────────────── RLS ───────────────
-- Enabled at declaration so these tables are deny-all until the policies
-- land in 0007_rls_policies.sql. Non-negotiable #1.
alter table sessions enable row level security;
alter table events enable row level security;
alter table reminder_events enable row level security;
alter table memos enable row level security;
alter table escalations enable row level security;
