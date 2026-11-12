-- Community presentation only; learner/SRS tables and auth identities are untouched.
begin;
alter table public.social_profiles add column if not exists icon smallint check(icon between 0 and 59);
alter table public.social_posts add column if not exists community_topic text;
create or replace function public.social_valid_stickers(ids text[]) returns boolean
language sql immutable set search_path='' as $$
 select cardinality(ids)<=4 and cardinality(ids)=(select count(distinct id) from unnest(ids) id)
   and not exists(select 1 from unnest(ids) id where id is null or id !~ '^m(00[1-9]|0[1-6][0-9]|07[0-2])$');
$$;
revoke all on function public.social_valid_stickers(text[]) from public,anon,authenticated;
alter table public.social_posts add column if not exists stickers text[] not null default '{}' check(public.social_valid_stickers(stickers));
do $$ begin
 if not exists(select 1 from pg_constraint where conname='social_posts_community_topic_check' and conrelid='public.social_posts'::regclass) then
  alter table public.social_posts add constraint social_posts_community_topic_check check(community_topic in('general','vocabulary','grammar','pronunciation','hsk','culture','translation','study_abroad','travel','study_buddy','tutor','careers','technology','business','daily_life','entertainment','engineering','health','other'));
 end if;
end $$;
create table if not exists public.social_post_views (
 post_id uuid references public.social_posts(id) on delete cascade,
 viewer_id uuid references public.social_profiles(id) on delete cascade,
 created_at timestamptz not null default clock_timestamp(), primary key(post_id,viewer_id)
);
alter table public.social_post_views enable row level security;
revoke all on public.social_post_views from public,anon,authenticated;
-- Old clients still receive the six base topics and avatar values 0..5.
create or replace function public.social_post_json(post public.social_posts) returns jsonb
language sql stable security definer set search_path='' as $$
 select public.social_post_json_v2(post)||jsonb_build_object('attachments',public.social_files(post.id,null),
   'views',(select count(*) from public.social_post_views v where v.post_id=post.id));
$$;
revoke all on function public.social_post_json(public.social_posts) from public,anon,authenticated;

create or replace function public.social_community_api(p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result jsonb; post public.social_posts; ids text[]; topic_key text;
 topics text[]:=array['general','vocabulary','grammar','pronunciation','hsk','culture','translation','study_abroad','travel','study_buddy','tutor','careers','technology','business','daily_life','entertainment','engineering','health','other'];
begin
 if actor is null then raise exception 'SOCIAL_AUTH_REQUIRED'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>20000 then raise exception 'SOCIAL_INVALID_INPUT'; end if;
 if p_action='profile' and p_data ? 'icon' then
  if jsonb_typeof(p_data->'icon') is distinct from 'number' or (p_data->>'icon') !~ '^([0-9]|[1-5][0-9])$' then raise exception 'SOCIAL_INVALID_INPUT'; end if;
  result:=public.social_api('profile',(p_data-'icon')||jsonb_build_object('avatar',case when (p_data->>'icon')::int<6 then (p_data->>'icon')::int else 0 end));
  update public.social_profiles set icon=(p_data->>'icon')::smallint where id=actor;
  select to_jsonb(p) into result from public.social_profiles p where p.id=actor;
  return result;
 elsif p_action='post' then
  if p_data ? 'stickers' and jsonb_typeof(p_data->'stickers') is distinct from 'array' then raise exception 'SOCIAL_INVALID_INPUT'; end if;
  if exists(select 1 from jsonb_array_elements(coalesce(p_data->'stickers','[]'::jsonb)) x where jsonb_typeof(x)<>'string') then raise exception 'SOCIAL_INVALID_INPUT'; end if;
  select coalesce(array_agg(value order by ord),'{}'::text[]) into ids from jsonb_array_elements_text(coalesce(p_data->'stickers','[]'::jsonb)) with ordinality a(value,ord);
  if not public.social_valid_stickers(ids) then raise exception 'SOCIAL_INVALID_INPUT'; end if;
  topic_key:=coalesce(p_data->>'community_topic',p_data->>'topic','general');
  if not(topic_key=any(topics)) or (p_data ? 'community_topic' and jsonb_typeof(p_data->'community_topic') is distinct from 'string') then raise exception 'SOCIAL_INVALID_INPUT'; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text||coalesce(p_data->>'id',''),84621437));
  select * into post from public.social_posts where id=(p_data->>'id')::uuid;
  if found and (post.stickers is distinct from ids or coalesce(post.community_topic,post.topic)<>topic_key) then raise exception 'SOCIAL_IDEMPOTENCY_CONFLICT'; end if;
  result:=public.social_api('post',(p_data-'stickers'-'community_topic')||jsonb_build_object('topic',case when topic_key in('general','vocabulary','grammar','pronunciation','hsk','culture') then topic_key else 'general' end));
  update public.social_posts set stickers=ids,community_topic=topic_key where id=(result->>'id')::uuid and author_id=actor returning * into post;
  return public.social_post_json(post);
 elsif p_action='feed' then
  if p_data-array['before','before_id','limit','category','topic','query','saved']<>'{}'::jsonb or
   ((p_data ? 'before')<>(p_data ? 'before_id')) or
   (p_data ? 'before' and (jsonb_typeof(p_data->'before') is distinct from 'string' or jsonb_typeof(p_data->'before_id') is distinct from 'string')) or
   (p_data ? 'limit' and (jsonb_typeof(p_data->'limit') is distinct from 'number' or (p_data->>'limit') !~ '^([1-9]|[1-4][0-9]|50)$')) or
   (p_data ? 'category' and (jsonb_typeof(p_data->'category') is distinct from 'string' or p_data->>'category' not in('question','share','practice'))) or
   (p_data ? 'topic' and (jsonb_typeof(p_data->'topic') is distinct from 'string' or not(p_data->>'topic'=any(topics)))) or
   (p_data ? 'query' and (jsonb_typeof(p_data->'query') is distinct from 'string' or char_length(p_data->>'query')>80)) or
   (p_data ? 'saved' and jsonb_typeof(p_data->'saved') is distinct from 'boolean') then raise exception 'SOCIAL_INVALID_INPUT'; end if;
  if not exists(select 1 from public.social_profiles where id=actor) then raise exception 'SOCIAL_PROFILE_REQUIRED'; end if;
  perform public.social_limit('feed',1200);
  select coalesce(jsonb_agg(public.social_post_json(p) order by p.created_at desc,p.id desc),'[]'::jsonb) into result from (
   select * from public.social_posts p where p.deleted_at is null and not public.social_blocked(p.author_id)
   and (not(p_data ? 'before') or (p.created_at,p.id)<((p_data->>'before')::timestamptz,(p_data->>'before_id')::uuid))
   and (not(p_data ? 'category') or p.category=p_data->>'category')
   and (not(p_data ? 'topic') or coalesce(p.community_topic,p.topic)=p_data->>'topic')
   and (not(p_data ? 'query') or strpos(lower(p.title||' '||p.body),lower(btrim(p_data->>'query')))>0)
   and (not coalesce((p_data->>'saved')::boolean,false) or exists(select 1 from public.social_bookmarks b where b.owner_id=actor and b.post_id=p.id))
   order by p.created_at desc,p.id desc limit 20) p;
  return result;
 elsif p_action='post_view' then
  if p_data-array['id']<>'{}'::jsonb or jsonb_typeof(p_data->'id') is distinct from 'string' then raise exception 'SOCIAL_INVALID_INPUT'; end if;
  if not exists(select 1 from public.social_profiles where id=actor) then raise exception 'SOCIAL_PROFILE_REQUIRED'; end if;
  select * into post from public.social_posts where id=(p_data->>'id')::uuid and deleted_at is null and not public.social_blocked(author_id);
  if not found then raise exception 'SOCIAL_NOT_FOUND'; end if;
  perform public.social_limit('post_view',300);
  if post.author_id<>actor then insert into public.social_post_views(post_id,viewer_id) values(post.id,actor) on conflict do nothing; end if;
  return (select to_jsonb(count(*)) from public.social_post_views where post_id=post.id);
 end if;
 return public.social_api(p_action,p_data);
end $$;
revoke all on function public.social_community_api(text,jsonb) from public,anon;
grant execute on function public.social_community_api(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
