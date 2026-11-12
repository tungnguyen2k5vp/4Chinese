-- Disposable PostgreSQL only. Storage byte transfer is covered separately by live QA.
\set ON_ERROR_STOP on
\o /dev/null
insert into auth.users values('66666666-6666-4666-8666-666666666666'),('77777777-7777-4777-8777-777777777777');
set role authenticated;
select set_config('request.jwt.claim.sub','66666666-6666-4666-8666-666666666666',false);
select public.social_api('profile','{}');
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777777',false);
select public.social_api('profile','{}');
select public.social_api('friend','{"peer":"66666666-6666-4666-8666-666666666666","verb":"request"}');
select set_config('request.jwt.claim.sub','66666666-6666-4666-8666-666666666666',false);
select public.social_api('friend','{"peer":"77777777-7777-4777-8777-777777777777","verb":"accept"}');
select public.social_api('presence_ping','{"device":"66666666-0000-4000-8000-000000000001"}');
select public.social_api('presence_ping','{"device":"66666666-0000-4000-8000-000000000002"}');
select public.social_api('presence_leave','{"device":"66666666-0000-4000-8000-000000000001"}');
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777777',false);
select pg_temp.check_ok(public.social_api('presence_status','{"ids":["66666666-6666-4666-8666-666666666666"]}')->0->>'online'='true','second device remains online');
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
select pg_temp.check_ok(public.social_api('presence_status','{"ids":["66666666-6666-4666-8666-666666666666"]}')='[]','presence private to accepted friends');
select set_config('request.jwt.claim.sub','66666666-6666-4666-8666-666666666666',false);
select pg_temp.reject('media_prepare','{"name":"bad.html","mime":"text/html","bytes":4}','SOCIAL_MEDIA_INVALID');
select pg_temp.reject('media_prepare','{"name":"../photo.png","mime":"image/png","bytes":4}','SOCIAL_MEDIA_INVALID');
select pg_temp.reject('media_prepare','{"name":"photo.png","mime":"image/png","bytes":8388609}','SOCIAL_MEDIA_INVALID');
select public.social_api('media_prepare','{"name":"photo.png","mime":"image/png","bytes":4}') as upload \gset
select (:'upload'::jsonb->>'id') as aid, (:'upload'::jsonb->>'path') as apath \gset
select pg_temp.reject('media_finish',jsonb_build_object('id',:'aid'),'SOCIAL_MEDIA_INVALID');
insert into storage.objects(bucket_id,name,metadata) values('social-media',:'apath','{"size":4,"mimetype":"image/png"}');
select public.social_api('media_finish',jsonb_build_object('id',:'aid'));
select public.social_api('post',jsonb_build_object('id','66666666-0000-4000-8000-000000000003','body','image post','category','share','attachments',jsonb_build_array(:'aid')));
select pg_temp.check_ok(jsonb_array_length(public.social_api('post',jsonb_build_object('id','66666666-0000-4000-8000-000000000003','body','image post','category','share','attachments',jsonb_build_array(:'aid')))->'attachments')=1,'post retry preserves one file');
select pg_temp.reject('post','{"id":"66666666-0000-4000-8000-000000000003","body":"image post","category":"share"}','SOCIAL_IDEMPOTENCY_CONFLICT');
select public.social_api('media_prepare','{"name":"lesson.pdf","mime":"application/pdf","bytes":5,"peer":"77777777-7777-4777-8777-777777777777"}') as dm \gset
select (:'dm'::jsonb->>'id') as did, (:'dm'::jsonb->>'path') as dpath \gset
insert into storage.objects(bucket_id,name,metadata) values('social-media',:'dpath','{"size":5,"mimetype":"application/pdf"}');
select public.social_api('media_finish',jsonb_build_object('id',:'did'));
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777777',false);
select pg_temp.check_ok(not public.social_file_read(:'dpath'),'recipient cannot open unsent draft');
select set_config('request.jwt.claim.sub','66666666-6666-4666-8666-666666666666',false);
select public.social_api('send',jsonb_build_object('peer','77777777-7777-4777-8777-777777777777','id','66666666-0000-4000-8000-000000000004','body','document','attachments',jsonb_build_array(:'did'))) as sent \gset
select (:'sent'::jsonb->>'id')::bigint as mid \gset
select pg_temp.check_ok(jsonb_array_length(:'sent'::jsonb->'attachments')=1,'DM serializer includes file');
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777777',false);
select pg_temp.check_ok(public.social_file_read(:'dpath'),'recipient can open sent file');
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);
select pg_temp.check_ok(not public.social_file_read(:'dpath'),'outsider cannot open DM file');
select pg_temp.check_ok((select count(*)=0 from storage.objects where name=:'dpath'),'storage RLS hides DM file');
select set_config('request.jwt.claim.sub','66666666-6666-4666-8666-666666666666',false);
select public.social_api('withdraw',jsonb_build_object('peer','77777777-7777-4777-8777-777777777777','id',:mid));
select pg_temp.check_ok(not public.social_file_read(:'dpath'),'withdrawal revokes new file access');
select pg_temp.reject('media_discard',jsonb_build_object('id',:'did'),'SOCIAL_INVALID_STATE');
select public.social_api('block','{"peer":"77777777-7777-4777-8777-777777777777","active":true}');
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777777',false);
select pg_temp.check_ok(public.social_api('presence_status','{"ids":["66666666-6666-4666-8666-666666666666"]}')='[]','block hides online state');
reset role;
update public.social_presence set seen_at=now()-interval '2 minutes';
update public.social_friendships set state='accepted' where user_low='66666666-6666-4666-8666-666666666666' and user_high='77777777-7777-4777-8777-777777777777';
delete from public.social_blocks where owner_id='66666666-6666-4666-8666-666666666666';
set role authenticated;
select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777777',false);
select pg_temp.check_ok(public.social_api('presence_status','{"ids":["66666666-6666-4666-8666-666666666666"]}')->0->>'online'='false','stale heartbeat expires');
reset role;
select pg_temp.check_ok((select value='keep-learning-progress' from public.learning_sentinel),'learning data unchanged');
select pg_temp.check_ok(not has_function_privilege('authenticated','public.social_api_v2(text,jsonb)','execute'),'legacy wrapper remains private');
\o
select 'community media and presence SQL checks passed' as result;
