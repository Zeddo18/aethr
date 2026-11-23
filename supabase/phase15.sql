-- Phase 15 — Persistent, cross-instance AI request quotas.
-- Apply ONLY after confirming the intended AETHR Supabase project and reviewing
-- existing schema/migrations. Never run in the unrelated connected projects.
-- Production policy: 12 meal analyses and 4 voice transcriptions per UTC hour,
-- per authenticated user. Requests are charged BEFORE calling OpenAI.
--
-- Internal counters have NO Data API table grants. The public RPC is intentionally
-- SECURITY DEFINER, but narrowly scoped to an auth.uid()-derived counter and
-- executable only by authenticated; it never returns other users' records.

create schema if not exists aethr_private;
revoke all on schema aethr_private from public, anon, authenticated;

create table if not exists aethr_private.ai_request_quota (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_kind text not null check (request_kind in ('parse','transcribe')),
  window_start timestamptz not null,
  request_count integer not null check (request_count between 1 and 1000),
  primary key (user_id, request_kind, window_start)
);

create index if not exists ai_request_quota_cleanup_idx
  on aethr_private.ai_request_quota (user_id, window_start);

alter table aethr_private.ai_request_quota enable row level security;
revoke all on aethr_private.ai_request_quota from public, anon, authenticated;

create or replace function public.consume_ai_quota(p_kind text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_limit integer;
  v_count integer;
  v_window timestamptz := date_trunc('hour', now());
begin
  -- No caller-supplied user ID or quota size. Never authorize using user metadata.
  if v_user is null then
    return false;
  end if;

  case p_kind
    when 'parse' then v_limit := 12;
    when 'transcribe' then v_limit := 4;
    else return false;
  end case;

  -- Keep the table bounded without deleting another user's counters.
  delete from aethr_private.ai_request_quota
    where user_id = v_user and window_start < v_window - interval '48 hours';

  -- One atomic write per request. ON CONFLICT locks the user's matching row:
  -- concurrent app servers cannot both pass the same final available token.
  insert into aethr_private.ai_request_quota
    (user_id, request_kind, window_start, request_count)
  values (v_user, p_kind, v_window, 1)
  on conflict (user_id, request_kind, window_start) do update
    set request_count = aethr_private.ai_request_quota.request_count + 1
    where aethr_private.ai_request_quota.request_count < v_limit
  returning request_count into v_count;

  return v_count is not null;
end;
$$;

-- PostgreSQL grants EXECUTE to PUBLIC by default for new functions.
-- Revoke PUBLIC, anon, and authenticated first; grant authenticated only.
revoke all on function public.consume_ai_quota(text) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(text) to authenticated;
