-- Gateway requests come only from paired device sessions.  Keep the limit
-- server-side so a client cannot bypass it by opening another connection.
create table public.voicebot_gateway_rate_limits (
  patient_id uuid not null references public.patients(id) on delete cascade,
  device_user_id uuid not null references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  primary key (patient_id, device_user_id)
);

alter table public.voicebot_gateway_rate_limits enable row level security;
create policy voicebot_gateway_rate_limits_no_client_access
  on public.voicebot_gateway_rate_limits for all using (false) with check (false);

create or replace function public.claim_voicebot_gateway_request(
  p_patient_id uuid,
  p_device_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare accepted boolean;
begin
  insert into public.voicebot_gateway_rate_limits (
    patient_id, device_user_id, window_started_at, request_count
  ) values (
    p_patient_id, p_device_user_id, date_trunc('minute', now()), 1
  )
  on conflict (patient_id, device_user_id) do update
    set window_started_at = case
          when voicebot_gateway_rate_limits.window_started_at < date_trunc('minute', now())
          then date_trunc('minute', now())
          else voicebot_gateway_rate_limits.window_started_at
        end,
        request_count = case
          when voicebot_gateway_rate_limits.window_started_at < date_trunc('minute', now()) then 1
          else voicebot_gateway_rate_limits.request_count + 1
        end
  returning request_count <= 60 into accepted;
  return accepted;
end;
$$;

revoke all on table public.voicebot_gateway_rate_limits from public, anon, authenticated;
grant all on table public.voicebot_gateway_rate_limits to service_role;
revoke all on function public.claim_voicebot_gateway_request(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_voicebot_gateway_request(uuid, uuid) to service_role;
