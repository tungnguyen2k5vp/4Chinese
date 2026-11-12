-- Only runs in the disposable, network-isolated PostgreSQL test container.
\set ON_ERROR_STOP on
\o /dev/null
insert into auth.users values('44444444-4444-4444-8444-444444444444'),('55555555-5555-4555-8555-555555555555');
set role authenticated;
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
select public.social_api('profile','{}');
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555555',false);
select public.social_api('profile','{}');
select public.social_api('friend','{"peer":"44444444-4444-4444-8444-444444444444","verb":"request"}');
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
select public.social_api('friend','{"peer":"55555555-5555-4555-8555-555555555555","verb":"accept"}');
select public.social_api('send','{"peer":"55555555-5555-4555-8555-555555555555","id":"44444444-0000-4000-8000-000000000001","body":"first"}') as msg \gset
select (:'msg'::jsonb->>'id')::bigint as mid \gset
select public.social_api('send',jsonb_build_object('peer','55555555-5555-4555-8555-555555555555','id','44444444-0000-4000-8000-000000000002','body','reply','reply_to',:mid)) as answer \gset
select pg_temp.check_ok(:'answer'::jsonb->'reply'->>'body'='first','reply quote from server');
select pg_temp.reject('send',jsonb_build_object('peer','55555555-5555-4555-8555-555555555555','id','44444444-0000-4000-8000-000000000002','body','reply'),'SOCIAL_IDEMPOTENCY_CONFLICT');
select public.social_api('message_react',jsonb_build_object('peer','55555555-5555-4555-8555-555555555555','id',:mid,'emoji','❤️'));
select pg_temp.check_ok(public.social_api('message_react',jsonb_build_object('peer','55555555-5555-4555-8555-555555555555','id',:mid,'emoji','❤️'))->'reactions'->0->>'count'='1','reaction retry once');
select pg_temp.reject('message_react',jsonb_build_object('peer','55555555-5555-4555-8555-555555555555','id',:mid,'emoji','bad'),'SOCIAL_INVALID_INPUT');
select public.social_api('post','{"id":"44444444-0000-4000-8000-000000000003","body":"我喜欢学习中文。","category":"question","title":"Cách dùng 喜欢","topic":"grammar"}');
select pg_temp.check_ok(jsonb_array_length(public.social_api('feed','{"topic":"grammar","query":"喜欢"}'))=1,'topic and content filters');
select pg_temp.check_ok(jsonb_array_length(public.social_api('feed','{"topic":"culture"}'))=0,'filter does not ignore unmatched topic');
select public.social_api('bookmark','{"post":"44444444-0000-4000-8000-000000000003","active":true}');
select pg_temp.check_ok(jsonb_array_length(public.social_api('feed','{"saved":true}'))=1,'durable saved posts');
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
select pg_temp.check_ok(jsonb_array_length(public.social_api('message_details',jsonb_build_object('peer','44444444-4444-4444-8444-444444444444','ids',jsonb_build_array(:mid))))=0,'details cannot expose third party messages');
select pg_temp.check_ok((select count(*)=0 from public.social_message_reactions),'reaction RLS hides third party DM');
select pg_temp.check_ok((select count(*)=0 from public.social_bookmarks),'bookmarks private');
select pg_temp.reject('withdraw',jsonb_build_object('peer','44444444-4444-4444-8444-444444444444','id',:mid),'SOCIAL_NOT_FOUND');
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555555',false);
select pg_temp.reject('withdraw',jsonb_build_object('peer','44444444-4444-4444-8444-444444444444','id',:mid),'SOCIAL_NOT_FOUND');
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
select pg_temp.check_ok(public.social_api('withdraw',jsonb_build_object('peer','55555555-5555-4555-8555-555555555555','id',:mid))->>'body'='Tin nhắn đã thu hồi','withdraw returns tombstone');
select pg_temp.check_ok((select count(*)=0 from public.social_messages where id=:mid),'withdrawn original inaccessible by direct SELECT');
select pg_temp.check_ok(public.social_api('messages','{"peer":"55555555-5555-4555-8555-555555555555"}')->'messages'->1->'reply'->>'body'='Tin nhắn đã thu hồi','quote redacts withdrawn message');
select public.social_api('block','{"peer":"55555555-5555-4555-8555-555555555555","active":true}');
select pg_temp.reject('message_details',jsonb_build_object('peer','55555555-5555-4555-8555-555555555555','ids',jsonb_build_array(:mid)),'SOCIAL_NOT_FOUND');
reset role;
-- Deleting a synthetic account must not reinsert invalidations during FK cascades.
insert into public.social_message_reactions values ((:'answer'::jsonb->>'id')::bigint,'55555555-5555-4555-8555-555555555555','👍');
delete from auth.users where id='44444444-4444-4444-8444-444444444444';
select pg_temp.check_ok(not exists(select 1 from public.social_messages where sender_id='44444444-4444-4444-8444-444444444444'),'social account cleanup cascades safely');
select pg_temp.check_ok((select value='keep-learning-progress' from public.learning_sentinel),'learning sentinel unchanged after social v2');
select pg_temp.check_ok(not has_function_privilege('authenticated','public.social_api_v1(text,jsonb)','execute'),'legacy RPC private');
select pg_temp.check_ok(not has_function_privilege('authenticated','public.social_message_json(public.social_messages)','execute'),'message serializer private');
\o
select 'community v2 SQL checks passed' as result;
