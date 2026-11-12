-- Social files and short-lived activity only. No learner tables or auth account changes.
begin;
create table if not exists public.social_attachments (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.social_profiles(id) on delete cascade,
  path text not null unique, name text not null check(char_length(name) between 1 and 120),
  mime text not null, bytes bigint not null check(bytes between 1 and 26214400), ready boolean not null default false,
  peer_id uuid references public.social_profiles(id) on delete cascade,
  post_id uuid references public.social_posts(id) on delete cascade,
  message_id bigint references public.social_messages(id) on delete cascade,
  created_at timestamptz not null default now(), check(num_nonnulls(post_id,message_id)<=1)
);
create table if not exists public.social_presence (
  user_id uuid references public.social_profiles(id) on delete cascade, device_id uuid not null,
  seen_at timestamptz not null default now(), active boolean not null default true, primary key(user_id,device_id)
);
alter table public.social_attachments enable row level security;
alter table public.social_presence enable row level security;
revoke all on public.social_attachments,public.social_presence from public,anon,authenticated;

create or replace function public.social_file_read(file_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.social_attachments a where a.path=file_path and (
   (a.owner_id=auth.uid() and a.post_id is null and a.message_id is null) or
   (a.ready and a.post_id is not null and exists(select 1 from public.social_posts p where p.id=a.post_id and p.deleted_at is null and not public.social_blocked(p.author_id))) or
   (a.ready and a.message_id is not null and exists(select 1 from public.social_messages m where m.id=a.message_id and m.withdrawn_at is null and auth.uid() in(m.sender_id,m.recipient_id) and not public.social_blocked(case when m.sender_id=auth.uid() then m.recipient_id else m.sender_id end)))
 ));
$$;
revoke all on function public.social_file_read(text) from public,anon;
grant execute on function public.social_file_read(text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values(
 'social-media','social-media',false,26214400,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime','application/pdf','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation']
) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists social_media_read on storage.objects;
create policy social_media_read on storage.objects for select to authenticated using(bucket_id='social-media' and public.social_file_read(name));
create or replace function public.social_file_upload(file_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.social_attachments a where a.path=file_path and a.owner_id=auth.uid() and not a.ready and a.created_at>now()-interval '1 hour' and a.post_id is null and a.message_id is null);
$$;
revoke all on function public.social_file_upload(text) from public,anon;
grant execute on function public.social_file_upload(text) to authenticated;
drop policy if exists social_media_upload on storage.objects;
create policy social_media_upload on storage.objects for insert to authenticated with check(bucket_id='social-media' and public.social_file_upload(name));
create or replace function public.social_file_discard(file_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.social_attachments a where a.path=file_path and a.owner_id=auth.uid() and a.post_id is null and a.message_id is null);
$$;
revoke all on function public.social_file_discard(text) from public,anon;
grant execute on function public.social_file_discard(text) to authenticated;
drop policy if exists social_media_discard on storage.objects;
create policy social_media_discard on storage.objects for delete to authenticated using(bucket_id='social-media' and public.social_file_discard(name));

create or replace function public.social_files(post uuid, message bigint) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'path',a.path,'name',a.name,'mime',a.mime,'bytes',a.bytes) order by a.created_at,a.id),'[]'::jsonb)
 from public.social_attachments a where a.ready and ((post is not null and a.post_id=post) or (message is not null and a.message_id=message));
$$;
revoke all on function public.social_files(uuid,bigint) from public,anon,authenticated;
-- Preserve the V2 serializers, then add metadata without changing old clients' contracts.
do $$ begin
 if to_regprocedure('public.social_post_json_v2(public.social_posts)') is null then alter function public.social_post_json(public.social_posts) rename to social_post_json_v2; end if;
 if to_regprocedure('public.social_message_json_v2(public.social_messages)') is null then alter function public.social_message_json(public.social_messages) rename to social_message_json_v2; end if;
 if to_regprocedure('public.social_api_v2(text,jsonb)') is null then alter function public.social_api(text,jsonb) rename to social_api_v2; end if;
end $$;
revoke all on function public.social_post_json_v2(public.social_posts),public.social_message_json_v2(public.social_messages),public.social_api_v2(text,jsonb) from public,anon,authenticated;
create or replace function public.social_post_json(post public.social_posts) returns jsonb language sql stable security definer set search_path='' as $$
 select public.social_post_json_v2(post)||jsonb_build_object('attachments',public.social_files(post.id,null));
$$;
create or replace function public.social_message_json(msg public.social_messages) returns jsonb language sql stable security definer set search_path='' as $$
 select public.social_message_json_v2(msg)||jsonb_build_object('attachments',case when msg.withdrawn_at is null then public.social_files(null,msg.id) else '[]'::jsonb end);
$$;
revoke all on function public.social_post_json(public.social_posts),public.social_message_json(public.social_messages) from public,anon,authenticated;
create or replace function public.social_api(p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); peer uuid; file public.social_attachments; result jsonb; ids uuid[]; used uuid[]; target uuid; mid bigint; filename text; mime_type text; size bigint; extension text; session_id uuid;
begin
 if actor is null then raise exception 'SOCIAL_AUTH_REQUIRED'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>20000 then raise exception 'SOCIAL_INVALID_INPUT'; end if;
 if p_action in('presence_ping','presence_leave') then
   if p_data-array['device']<>'{}'::jsonb then raise exception 'SOCIAL_INVALID_INPUT'; end if;
   session_id:=(p_data->>'device')::uuid;
   if session_id is null then raise exception 'SOCIAL_INVALID_INPUT'; end if;
   if p_action='presence_leave' then update public.social_presence set active=false where user_id=actor and device_id=session_id;
   else
     perform public.social_limit('presence',60,60);
     delete from public.social_presence where user_id=actor and seen_at<now()-interval '1 day';
     insert into public.social_presence(user_id,device_id,seen_at,active) values(actor,session_id,clock_timestamp(),true) on conflict(user_id,device_id) do update set seen_at=excluded.seen_at,active=true;
   end if;
   return 'true';
 elsif p_action='presence_status' then
   if p_data-array['ids']<>'{}'::jsonb or jsonb_typeof(p_data->'ids') is distinct from 'array' or jsonb_array_length(p_data->'ids')>200 then raise exception 'SOCIAL_INVALID_INPUT'; end if;
   perform public.social_limit('presence_status',120,60);
   select coalesce(jsonb_agg(jsonb_build_object('id',x.user_id,'online',x.online,'seen_at',x.seen_at)),'[]'::jsonb) into result from (
     select p.user_id,max(p.seen_at) seen_at,bool_or(p.active and p.seen_at>now()-interval '65 seconds') online from public.social_presence p join public.social_friendships f on f.user_low=least(actor,p.user_id) and f.user_high=greatest(actor,p.user_id)
     where p.user_id in(select value::uuid from jsonb_array_elements_text(p_data->'ids')) and f.state='accepted' and not public.social_blocked(p.user_id) group by p.user_id
   ) x;
   return result;
 elsif p_action='media_prepare' then
   if p_data-array['name','mime','bytes','peer']<>'{}'::jsonb then raise exception 'SOCIAL_INVALID_INPUT'; end if;
   filename:=p_data->>'name'; mime_type:=p_data->>'mime'; size:=(p_data->>'bytes')::bigint; peer:=(p_data->>'peer')::uuid;
   extension:=lower(substring(filename from '\.([^.]+)$'));
   if filename is null or mime_type is null or extension is null or char_length(filename) not between 1 and 120 or filename ~ '[/\\[:cntrl:]]' or size is null or size<1 or size>26214400 or
      not ((mime_type='image/jpeg' and extension in('jpg','jpeg')) or (mime_type='image/png' and extension='png') or (mime_type='image/webp' and extension='webp') or (mime_type='image/gif' and extension='gif') or
       (mime_type='video/mp4' and extension='mp4') or (mime_type='video/webm' and extension='webm') or (mime_type='video/quicktime' and extension='mov') or
       (mime_type='application/pdf' and extension='pdf') or (mime_type='text/plain' and extension='txt') or (mime_type='application/msword' and extension='doc') or
       (mime_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document' and extension='docx') or (mime_type='application/vnd.ms-excel' and extension='xls') or
       (mime_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' and extension='xlsx') or (mime_type='application/vnd.ms-powerpoint' and extension='ppt') or
       (mime_type='application/vnd.openxmlformats-officedocument.presentationml.presentation' and extension='pptx')) or
      (mime_type like 'image/%' and size>8388608) or (mime_type not like 'video/%' and size>10485760) then raise exception 'SOCIAL_MEDIA_INVALID'; end if;
   if peer is not null and (public.social_blocked(peer) or not exists(select 1 from public.social_friendships where user_low=least(actor,peer) and user_high=greatest(actor,peer) and state='accepted')) then raise exception 'SOCIAL_FRIEND_REQUIRED'; end if;
   perform public.social_limit('media',40);
   perform pg_advisory_xact_lock(84621436);
   if (select coalesce(sum(bytes),0) from public.social_attachments where owner_id=actor)>209715200-size or
      (select coalesce(sum(greatest(a.bytes,coalesce((o.metadata->>'size')::bigint,0))),0) from public.social_attachments a left join storage.objects o on o.bucket_id='social-media' and o.name=a.path)>734003200-size then raise exception 'SOCIAL_MEDIA_QUOTA'; end if;
   target:=gen_random_uuid();
   insert into public.social_attachments(id,owner_id,path,name,mime,bytes,peer_id) values(target,actor,actor::text||'/'||target::text||'.'||extension,filename,mime_type,size,peer) returning * into file;
   return jsonb_build_object('id',file.id,'path',file.path,'name',file.name,'mime',file.mime,'bytes',file.bytes);
 elsif p_action in('media_finish','media_discard') then
   if p_data-array['id']<>'{}'::jsonb then raise exception 'SOCIAL_INVALID_INPUT'; end if;
   select * into file from public.social_attachments where id=(p_data->>'id')::uuid and owner_id=actor for update;
   if not found then raise exception 'SOCIAL_NOT_FOUND'; end if;
   if p_action='media_discard' then
     if file.post_id is not null or file.message_id is not null or exists(select 1 from storage.objects where bucket_id='social-media' and name=file.path) then raise exception 'SOCIAL_INVALID_STATE'; end if;
     delete from public.social_attachments where id=file.id; return 'true';
   end if;
   if not exists(select 1 from storage.objects where bucket_id='social-media' and name=file.path and (metadata->>'size')::bigint=file.bytes and metadata->>'mimetype'=file.mime) then raise exception 'SOCIAL_MEDIA_INVALID'; end if;
   update public.social_attachments set ready=true where id=file.id;
   return jsonb_build_object('id',file.id,'path',file.path,'name',file.name,'mime',file.mime,'bytes',file.bytes);
 elsif p_action in('post','send') then
   if p_data ? 'attachments' and (jsonb_typeof(p_data->'attachments')<>'array' or jsonb_array_length(p_data->'attachments')>4) then raise exception 'SOCIAL_INVALID_INPUT'; end if;
   select coalesce(array_agg(value::uuid order by value),'{}'::uuid[]) into ids from jsonb_array_elements_text(coalesce(p_data->'attachments','[]'::jsonb));
   if cardinality(ids)<>(select count(distinct x) from unnest(ids) x) then raise exception 'SOCIAL_INVALID_INPUT'; end if;
   perform pg_advisory_xact_lock(hashtextextended(actor::text,84621436));
   if p_action='post' then target:=(p_data->>'id')::uuid; select array_agg(id order by id) into used from public.social_attachments where post_id=target;
   else peer:=(p_data->>'peer')::uuid; select id into mid from public.social_messages where sender_id=actor and client_id=(p_data->>'id')::uuid; select array_agg(id order by id) into used from public.social_attachments where message_id=mid; end if;
   if coalesce(cardinality(used),0)>0 and used is distinct from ids then raise exception 'SOCIAL_IDEMPOTENCY_CONFLICT'; end if;
   if exists(select 1 from unnest(ids) x where not exists(select 1 from public.social_attachments a where a.id=x and a.owner_id=actor and a.ready and
     ((p_action='post' and a.peer_id is null and a.message_id is null and (a.post_id is null or a.post_id=target)) or (p_action='send' and a.peer_id=peer and a.post_id is null and (a.message_id is null or a.message_id=mid))))) then raise exception 'SOCIAL_MEDIA_INVALID'; end if;
   -- An existing nonce cannot silently acquire files on retry.
   if coalesce(cardinality(used),0)=0 and cardinality(ids)>0 and ((p_action='post' and exists(select 1 from public.social_posts where id=target)) or mid is not null) then raise exception 'SOCIAL_IDEMPOTENCY_CONFLICT'; end if;
   result:=public.social_api_v2(p_action,p_data-'attachments');
   if p_action='post' then update public.social_attachments set post_id=target where id=any(ids); select public.social_post_json(p) into result from public.social_posts p where p.id=target;
   else mid:=(result->>'id')::bigint; update public.social_attachments set message_id=mid where id=any(ids); select public.social_message_json(m) into result from public.social_messages m where m.id=mid; end if;
   return result;
 end if;
 return public.social_api_v2(p_action,p_data);
end $$;
revoke all on function public.social_api(text,jsonb) from public,anon;
grant execute on function public.social_api(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
