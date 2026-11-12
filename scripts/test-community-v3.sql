-- Run only after V1/V2/media checks in the disposable QA container.
\set ON_ERROR_STOP on
\o /dev/null
create function pg_temp.reject_v3(action text,data jsonb,expected text) returns void language plpgsql as $$
declare rejected boolean:=false;
begin
 begin perform public.social_community_api(action,data);
 exception when others then
  if sqlerrm not like '%'||expected||'%' then raise exception 'Unexpected rejection: %',sqlerrm; end if;
  rejected:=true;
 end;
 perform pg_temp.check_ok(rejected,'v3 reject '||action||' '||expected);
end $$;
insert into auth.users values('88888888-8888-4888-8888-888888888888'),('99999999-9999-4999-8999-999999999999');
set role authenticated;
select set_config('request.jwt.claim.sub','',false);
select pg_temp.reject_v3('feed','{}','SOCIAL_AUTH_REQUIRED');
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888888',false);
select pg_temp.check_ok(public.social_community_api('profile','{"icon":59,"avatar":0}')->>'icon'='59','expanded avatar');
select pg_temp.check_ok(public.social_api('profile','{}')->>'avatar'='0','legacy avatar remains in range');
select pg_temp.reject_v3('profile','{"icon":60}','SOCIAL_INVALID_INPUT');
select pg_temp.reject_v3('profile','{"icon":null}','SOCIAL_INVALID_INPUT');
select public.social_community_api('post','{"id":"66666666-0000-4000-8000-000000000001","body":"表情","category":"share","community_topic":"travel","topic":"grammar","stickers":["m001","m072"]}') as post \gset
select pg_temp.check_ok(:'post'::jsonb->>'community_topic'='travel' and :'post'::jsonb->>'topic'='general','server normalizes legacy topic');
select pg_temp.check_ok(:'post'::jsonb->'stickers'='["m001","m072"]'::jsonb,'sticker order persists');
select pg_temp.check_ok(public.social_community_api('post','{"id":"66666666-0000-4000-8000-000000000001","body":"表情","category":"share","community_topic":"travel","stickers":["m001","m072"]}')->>'id'=:'post'::jsonb->>'id','post retry deduped');
select pg_temp.reject_v3('post','{"id":"66666666-0000-4000-8000-000000000001","body":"表情","category":"share","community_topic":"travel","stickers":["m002"]}','SOCIAL_IDEMPOTENCY_CONFLICT');
select pg_temp.reject_v3('post','{"id":"66666666-0000-4000-8000-000000000002","body":"QA","category":"share","stickers":["m001","m001"]}','SOCIAL_INVALID_INPUT');
select pg_temp.reject_v3('post','{"id":"66666666-0000-4000-8000-000000000002","body":"QA","category":"share","stickers":["m073"]}','SOCIAL_INVALID_INPUT');
select pg_temp.reject_v3('post','{"id":"66666666-0000-4000-8000-000000000002","body":"QA","category":"share","stickers":["m001","m002","m003","m004","m005"]}','SOCIAL_INVALID_INPUT');
select pg_temp.reject_v3('post','{"id":"66666666-0000-4000-8000-000000000002","body":"QA","category":"share","community_topic":"bad"}','SOCIAL_INVALID_INPUT');
select pg_temp.reject_v3('post','{"id":"66666666-0000-4000-8000-000000000002","body":"QA","category":"share","author_id":"99999999-9999-4999-8999-999999999999"}','SOCIAL_INVALID_INPUT');
select pg_temp.check_ok(jsonb_array_length(public.social_community_api('feed','{"topic":"travel"}'))=1,'extended topic filter');
select pg_temp.check_ok(jsonb_array_length(public.social_community_api('feed','{"topic":"technology"}'))=0,'extended topic excludes unmatched');
select pg_temp.check_ok(public.social_community_api('post_view','{"id":"66666666-0000-4000-8000-000000000001"}')='0'::jsonb,'self view excluded');
select set_config('request.jwt.claim.sub','99999999-9999-4999-8999-999999999999',false);
select public.social_community_api('profile','{}');
select pg_temp.check_ok(public.social_community_api('post_view','{"id":"66666666-0000-4000-8000-000000000001"}')='1'::jsonb,'reader counts once');
select pg_temp.check_ok(public.social_community_api('post_view','{"id":"66666666-0000-4000-8000-000000000001"}')='1'::jsonb,'reload does not inflate views');
select pg_temp.check_ok(public.social_api('post_detail','{"id":"66666666-0000-4000-8000-000000000001"}')->'post'->>'views'='1','legacy detail returns view count');
select public.social_api('block','{"peer":"88888888-8888-4888-8888-888888888888","active":true}');
select pg_temp.reject_v3('post_view','{"id":"66666666-0000-4000-8000-000000000001"}','SOCIAL_NOT_FOUND');
select pg_temp.check_ok(jsonb_array_length(public.social_community_api('feed','{"topic":"travel"}'))=0,'blocked posts hidden in new feed');
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888888',false);
select public.social_api('delete','{"id":"66666666-0000-4000-8000-000000000001","kind":"post"}');
select pg_temp.reject_v3('post_view','{"id":"66666666-0000-4000-8000-000000000001"}','SOCIAL_NOT_FOUND');
reset role;
select pg_temp.check_ok(not has_table_privilege('authenticated','public.social_post_views','select,insert,update,delete'),'viewers table private');
select pg_temp.check_ok(not has_function_privilege('anon','public.social_community_api(text,jsonb)','execute'),'anonymous RPC forbidden');
select pg_temp.check_ok((select value='keep-learning-progress' from public.learning_sentinel),'learning sentinel unchanged after v3');
\o
select 'community v3 SQL checks passed' as result;
