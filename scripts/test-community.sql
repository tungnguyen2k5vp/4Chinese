\set ON_ERROR_STOP on
\o /dev/null
create function pg_temp.check_ok(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',label; end if; end $$;
create function pg_temp.reject(action text, data jsonb, expected text) returns void language plpgsql as $$
declare rejected boolean:=false;
begin
  begin perform public.social_api(action,data);
  exception when others then
    if sqlerrm not like '%'||expected||'%' then raise exception 'Unexpected rejection: %',sqlerrm; end if;
    rejected:=true;
  end;
  perform pg_temp.check_ok(rejected,'reject '||action||' '||expected);
end $$;
insert into auth.users values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222'),
 ('33333333-3333-4333-8333-333333333333');
set role authenticated;
select pg_temp.reject('profile','{}','SOCIAL_AUTH_REQUIRED');
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select pg_temp.check_ok(public.social_api('profile','{}')->>'id'=auth.uid()::text,'profile belongs to JWT');
select pg_temp.check_ok(public.social_api('profile','{}')->>'handle' ~ '^[A-F0-9]{10}$','short public ID');
select pg_temp.reject('profile','{"id":"22222222-2222-4222-8222-222222222222"}','SOCIAL_INVALID_INPUT');
select pg_temp.reject('post','{"id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","body":null,"category":"share"}','SOCIAL_INVALID_INPUT');
select pg_temp.reject('profile','{"avatar":null}','SOCIAL_INVALID_INPUT');
select pg_temp.reject('send','{"body":"missing peer"}','SOCIAL_INVALID_INPUT');
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
select public.social_api('profile','{"display_name":"QA friend"}');
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
select public.social_api('profile','{}');
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select pg_temp.reject('send','{"peer":"22222222-2222-4222-8222-222222222222","id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","body":"hi"}','SOCIAL_FRIEND_REQUIRED');
select public.social_api('friend','{"peer":"22222222-2222-4222-8222-222222222222","verb":"request"}');
select pg_temp.reject('friend','{"peer":"22222222-2222-4222-8222-222222222222","verb":"accept"}','SOCIAL_INVALID_STATE');
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
select public.social_api('friend','{"peer":"11111111-1111-4111-8111-111111111111","verb":"accept"}');
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select public.social_api('send','{"peer":"22222222-2222-4222-8222-222222222222","id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","body":"first"}');
select public.social_api('send','{"peer":"22222222-2222-4222-8222-222222222222","id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","body":"first"}');
select pg_temp.check_ok((select count(*)=1 from public.social_messages),'retry applied once');
select pg_temp.reject('send','{"peer":"22222222-2222-4222-8222-222222222222","id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","body":"changed"}','SOCIAL_IDEMPOTENCY_CONFLICT');
select public.social_api('send','{"peer":"22222222-2222-4222-8222-222222222222","id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","body":"second"}');
select pg_temp.check_ok(jsonb_array_length(public.social_api('messages','{"peer":"22222222-2222-4222-8222-222222222222","after":1}') -> 'messages')=1,'catch up after sequence');
select pg_temp.check_ok(jsonb_array_length(public.social_api('messages','{"peer":"22222222-2222-4222-8222-222222222222","before":2}') -> 'messages')=1,'older history cursor');
select pg_temp.reject('messages','{"peer":"22222222-2222-4222-8222-222222222222","before":1,"after":2}','SOCIAL_INVALID_INPUT');
select pg_temp.reject('read','{"peer":"22222222-2222-4222-8222-222222222222","id":2}','SOCIAL_NOT_FOUND');
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
select public.social_api('read','{"peer":"11111111-1111-4111-8111-111111111111","id":2}');
select public.social_api('read','{"peer":"11111111-1111-4111-8111-111111111111","id":1}');
select pg_temp.check_ok(public.social_api('messages','{"peer":"11111111-1111-4111-8111-111111111111"}')->>'read'='0','peer read distinct from own read');
select pg_temp.check_ok((select message_id=2 from public.social_reads where reader_id=auth.uid()),'read receipt never moves backward');
select pg_temp.check_ok((public.social_api('inbox','{}')->0->>'unread')::integer=0,'inbox read counter');
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
select pg_temp.check_ok((select count(*)=0 from public.social_messages),'outsider RLS hides DM');
select pg_temp.check_ok((select count(*)=0 from public.social_reads),'outsider RLS hides reads');
select pg_temp.check_ok((select count(*)=0 from public.social_friendships),'outsider hides friendships');
select pg_temp.check_ok(jsonb_array_length(public.social_api('messages','{"peer":"11111111-1111-4111-8111-111111111111"}')->'messages')=0,'RPC cannot read third party DM');
do $$ begin
  begin insert into public.social_messages(client_id,sender_id,recipient_id,body)
    values(gen_random_uuid(),'11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','spoof');
    raise exception 'FAIL direct write'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select public.social_api('post','{"id":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","body":"学习中文","category":"practice"}');
select public.social_api('post','{"id":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","body":"学习中文","category":"practice"}');
select pg_temp.check_ok(jsonb_array_length(public.social_api('feed','{}'))=1,'post retry dedupe + feed composite');
select public.social_api('comment','{"id":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","post":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","body":"加油"}');
select public.social_api('comment','{"id":"dddddddd-dddd-4ddd-8ddd-dddddddddddd","post":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","body":"加油"}');
select pg_temp.check_ok(jsonb_array_length(public.social_api('post_detail','{"id":"cccccccc-cccc-4ccc-8ccc-cccccccccccc"}')->'comments')=1,'comment dedupe');
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
select public.social_api('react','{"post":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","kind":"like"}');
select public.social_api('react','{"post":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","kind":"heart"}');
select pg_temp.check_ok(public.social_api('feed','{}')->0->>'hearts'='1' and public.social_api('feed','{}')->0->>'likes'='0','one reaction per person');
select public.social_api('react','{"post":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","kind":null}');
select pg_temp.check_ok(public.social_api('feed','{}')->0->>'hearts'='0','reaction removal');
select public.social_api('delete','{"id":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","kind":"post"}');
select pg_temp.check_ok(jsonb_array_length(public.social_api('feed','{}'))=1,'cannot delete another author post');
select public.social_api('report','{"kind":"post","id":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","reason":"QA report"}');
select public.social_api('block','{"peer":"11111111-1111-4111-8111-111111111111","active":true}');
select pg_temp.check_ok(jsonb_array_length(public.social_api('feed','{}'))=0,'blocked author hidden');
select pg_temp.check_ok((select count(*)=0 from public.social_messages),'block hides old DM');
select pg_temp.reject('send','{"peer":"11111111-1111-4111-8111-111111111111","id":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","body":"blocked"}','SOCIAL_NOT_FOUND');
select public.social_api('block','{"peer":"11111111-1111-4111-8111-111111111111","active":false}');
select pg_temp.reject('send','{"peer":"11111111-1111-4111-8111-111111111111","id":"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee","body":"unblocked"}','SOCIAL_FRIEND_REQUIRED');
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select pg_temp.check_ok((select count(*)=0 from public.social_reports),'reports private to reporter');
select public.social_api('delete','{"id":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","kind":"post"}');
select pg_temp.check_ok(jsonb_array_length(public.social_api('feed','{}'))=0,'author soft delete');
reset role;
select pg_temp.check_ok((select value='keep-learning-progress' from public.learning_sentinel),'learning sentinel untouched');
select pg_temp.check_ok((select count(*)=7 from pg_publication_tables where pubname='supabase_realtime'),'realtime allowlist');
select pg_temp.check_ok(not has_function_privilege('anon','public.social_api(text,jsonb)','execute'),'anonymous role cannot call RPC');
select pg_temp.check_ok(not has_function_privilege('authenticated','public.social_limit(text,integer,integer)','execute'),'quota helper private');
insert into public.social_rate_limits values('11111111-1111-4111-8111-111111111111','post',to_timestamp(floor(extract(epoch from clock_timestamp())/3600)*3600),20)
on conflict(actor_id,action,window_start) do update set count=20;
set role authenticated;
select pg_temp.reject('post','{"id":"ffffffff-ffff-4fff-8fff-ffffffffffff","body":"quota","category":"share"}','SOCIAL_RATE_LIMITED');
reset role;
\o
select 'community SQL checks passed' as result;
