-- Disposable CI database only. Tests persistent quotas under simulated Supabase JWTs.
do $$
begin
  if has_function_privilege('anon', 'public.consume_ai_quota(text)', 'EXECUTE') then
    raise exception 'Anonymous role can execute the privileged AI quota RPC';
  end if;
  if not has_function_privilege('authenticated', 'public.consume_ai_quota(text)', 'EXECUTE') then
    raise exception 'Authenticated role cannot reserve AI quota';
  end if;
  if has_schema_privilege('authenticated', 'aethr_private', 'USAGE') then
    raise exception 'Authenticated role can access private quota schema';
  end if;
  if not (select c.relrowsecurity from pg_class c
    where c.oid = 'aethr_private.ai_request_quota'::regclass) then
    raise exception 'Private quota table has RLS disabled';
  end if;
end $$;

-- Anonymous callers may not execute the RPC even with an arbitrary kind.
begin;
set local role anon;
do $$
begin
  begin
    perform public.consume_ai_quota('parse');
    raise exception 'Anonymous caller executed privileged RPC';
  exception when insufficient_privilege then
    null;
  end;
end $$;
rollback;

-- A role without an authenticated JWT may not spend a token.
begin;
set local role authenticated;
do $$
begin
  if public.consume_ai_quota('parse') then
    raise exception 'User without JWT consumed quota';
  end if;
  if public.consume_ai_quota('invalid') then
    raise exception 'Invalid request kind consumed quota';
  end if;
end $$;
rollback;

-- Concurrent-safe quota contract, independent users/kinds, zero direct access.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
declare
  i integer;
begin
  for i in 1..12 loop
    if not public.consume_ai_quota('parse') then
      raise exception 'User A parse request % unexpectedly denied', i;
    end if;
  end loop;
  if public.consume_ai_quota('parse') then
    raise exception 'User A exceeded 12 parse requests';
  end if;

  for i in 1..4 loop
    if not public.consume_ai_quota('transcribe') then
      raise exception 'User A audio request % unexpectedly denied', i;
    end if;
  end loop;
  if public.consume_ai_quota('transcribe') then
    raise exception 'User A exceeded 4 voice transcriptions';
  end if;

  begin
    perform count(*) from aethr_private.ai_request_quota;
    raise exception 'Authenticated role queried internal counters directly';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- User B must have their own quota, even when A exhausted both limits.
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$
begin
  if not public.consume_ai_quota('parse') then
    raise exception 'User B was incorrectly blocked by user A limit';
  end if;
  if not public.consume_ai_quota('transcribe') then
    raise exception 'User B was incorrectly blocked by user A voice limit';
  end if;
end $$;

-- Return to A: B's requests cannot replenish A's already exhausted allowance.
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
begin
  if public.consume_ai_quota('parse') or public.consume_ai_quota('transcribe') then
    raise exception 'User A unexpectedly regained exhausted quota';
  end if;
end $$;
rollback;
