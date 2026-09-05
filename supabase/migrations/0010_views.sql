-- ─── per patient, per day: play ───
create or replace view daily_play with (security_invoker = true) as
select
  e.patient_id,
  (to_timestamp(e.ts/1000.0) at time zone p.timezone)::date as day,
  count(distinct e.session_id)                     as sessions,
  count(*)                                          as trials,
  round(avg(e.correct::int)::numeric, 3)            as accuracy,
  round(avg(e.response_time_ms))                    as mean_rt_ms,
  round(avg(e.initiation_ms))                       as mean_initiation_ms,
  round(avg(e.movement_ms))                         as mean_movement_ms,
  round(stddev(e.response_time_ms))                 as rt_variability,
  round(avg(e.hint_level)::numeric, 2)              as mean_hint_level,
  count(*) filter (where e.error_class = 'perseverative')    as perseverations,
  count(*) filter (where e.error_class = 'repeat_selection') as repeat_errors,
  count(*) filter (where e.error_class = 'semantic')         as semantic_errors,
  max(e.item_difficulty)                            as peak_difficulty,
  array_agg(distinct e.game_id)                     as games_played
from events e join patients p on p.id = e.patient_id
group by 1,2;

-- ─── per domain ───
create or replace view daily_domain with (security_invoker = true) as
select
  e.patient_id,
  (to_timestamp(e.ts/1000.0) at time zone p.timezone)::date as day,
  e.domain,
  count(*)                                as trials,
  round(avg(e.correct::int)::numeric, 3)  as accuracy,
  round(avg(e.theta_before)::numeric, 3)  as mean_theta,
  round(avg(e.response_time_ms))          as mean_rt_ms,
  round(stddev(e.response_time_ms))       as rt_variability
from events e join patients p on p.id = e.patient_id
group by 1,2,3;

-- ─── sessions ───
create or replace view daily_sessions with (security_invoker = true) as
select
  s.patient_id,
  (to_timestamp(s.started_at/1000.0) at time zone p.timezone)::date as day,
  count(*)                                                     as sessions,
  round(sum(coalesce(s.ended_at, s.started_at) - s.started_at)/60000.0, 1) as minutes_played,
  count(*) filter (where not s.completed)                      as abandoned,
  sum(s.demo_replays)                                          as demo_replays
from sessions s join patients p on p.id = s.patient_id
group by 1,2;

-- ─── adherence ───
create or replace view daily_adherence with (security_invoker = true) as
select
  r.patient_id,
  (to_timestamp(r.scheduled_at/1000.0) at time zone p.timezone)::date as day,
  count(*)                                                  as scheduled,
  count(*) filter (where r.outcome = 'confirmed')           as confirmed,
  count(*) filter (where r.outcome='confirmed' and r.channel='in_app') as via_tablet,
  count(*) filter (where r.outcome='confirmed' and r.channel='call')   as via_call,
  count(*) filter (where r.outcome = 'no_response')         as missed
from reminder_events r join patients p on p.id = r.patient_id
group by 1,2;

-- ─── THE view the dashboard reads ───
create or replace view daily_report with (security_invoker = true) as
select
  coalesce(pl.patient_id, ad.patient_id) as patient_id,
  coalesce(pl.day, ad.day)               as day,
  (pl.trials is not null)                as played,
  se.minutes_played, se.sessions, se.abandoned, se.demo_replays,
  pl.trials, pl.accuracy, pl.mean_rt_ms, pl.mean_initiation_ms,
  pl.mean_movement_ms, pl.rt_variability, pl.mean_hint_level,
  pl.perseverations, pl.repeat_errors, pl.semantic_errors,
  pl.peak_difficulty, pl.games_played,
  ad.scheduled, ad.confirmed, ad.via_tablet, ad.via_call, ad.missed
from daily_play pl
full outer join daily_adherence ad using (patient_id, day)
left  join daily_sessions se using (patient_id, day);
