-- Additive social-only upgrade. Does not access learning tables or merge accounts.
begin;
alter table public.social_posts add column if not exists title text not null default '' check(char_length(title)<=120);
alter table public.social_posts add column if not exists topic text not null default 'general' check(topic in('general','vocabulary','grammar','pronunciation','hsk','culture'));
alter table public.social_messages add column if not exists reply_to bigint references public.social_messages(id);
alter table public.social_messages add column if not exists withdrawn_at timestamptz;
create table if not exists public.social_bookmarks (
  owner_id uuid references public.social_profiles(id) on delete cascade,
  post_id uuid references public.social_posts(id) on delete cascade,
  primary key(owner_id,post_id)
);
create table if not exists public.social_message_reactions (
  message_id bigint references public.social_messages(id) on delete cascade,
  author_id uuid references public.social_profiles(id) on delete cascade,
  emoji text not null check(emoji in('❤️','👍','😂','😮','😢','加油')),
  primary key(message_id,author_id)
);
-- Content-free invalidation stays visible after a withdrawal hides the original row.
create table if not exists public.social_message_updates (
  message_id bigint primary key references public.social_messages(id) on delete cascade,
  sender_id uuid not null references public.social_profiles(id) on delete cascade,
  recipient_id uuid not null references public.social_profiles(id) on delete cascade,
  changed_at timestamptz not null default clock_timestamp()
);
alter table public.social_message_updates enable row level security;
revoke all on public.social_message_updates from anon,authenticated;
grant select on public.social_message_updates to authenticated;
drop policy if exists social_message_updates_read on public.social_message_updates;
create policy social_message_updates_read on public.social_message_updates for select to authenticated using(
  auth.uid() in(sender_id,recipient_id) and not public.social_blocked(case when sender_id=auth.uid() then recipient_id else sender_id end)
);
create or replace function public.social_message_changed() returns trigger language plpgsql security definer set search_path='' as $$
declare target bigint;
begin
  if tg_table_name='social_messages' then target:=new.id; else target:=coalesce(new.message_id,old.message_id); end if;
  insert into public.social_message_updates(message_id,sender_id,recipient_id)
    select m.id,m.sender_id,m.recipient_id from public.social_messages m
      join public.social_profiles s on s.id=m.sender_id join public.social_profiles r on r.id=m.recipient_id where m.id=target
    on conflict(message_id) do update set changed_at=clock_timestamp();
  return null;
end $$;
revoke all on function public.social_message_changed() from public,anon,authenticated;
drop trigger if exists social_message_withdrawn on public.social_messages;
create trigger social_message_withdrawn after update of withdrawn_at on public.social_messages for each row when(old.withdrawn_at is distinct from new.withdrawn_at) execute function public.social_message_changed();
drop trigger if exists social_message_reacted on public.social_message_reactions;
create trigger social_message_reacted after insert or update or delete on public.social_message_reactions for each row execute function public.social_message_changed();
alter table public.social_bookmarks enable row level security;
alter table public.social_message_reactions enable row level security;
revoke all on public.social_bookmarks,public.social_message_reactions from anon,authenticated;
grant select on public.social_bookmarks,public.social_message_reactions to authenticated;
drop policy if exists social_bookmarks_read on public.social_bookmarks;
create policy social_bookmarks_read on public.social_bookmarks for select to authenticated using(owner_id=auth.uid());
drop policy if exists social_message_reactions_read on public.social_message_reactions;
create policy social_message_reactions_read on public.social_message_reactions for select to authenticated using (
  not public.social_blocked(author_id) and exists(select 1 from public.social_messages m where m.id=message_id)
);
-- Withdrawn text remains admin-only; public clients receive a tombstone via RPC.
drop policy if exists social_messages_read on public.social_messages;
create policy social_messages_read on public.social_messages for select to authenticated using (
  withdrawn_at is null and auth.uid() in(sender_id,recipient_id) and
  not public.social_blocked(case when sender_id=auth.uid() then recipient_id else sender_id end)
);
create or replace function public.social_post_json(post public.social_posts) returns jsonb
language sql stable security definer set search_path='' as $$
  select to_jsonb(post)||jsonb_build_object(
    'author',(select to_jsonb(p) from public.social_profiles p where p.id=post.author_id),
    'likes',(select count(*) from public.social_reactions r where r.post_id=post.id and r.kind='like' and not public.social_blocked(r.author_id)),
    'hearts',(select count(*) from public.social_reactions r where r.post_id=post.id and r.kind='heart' and not public.social_blocked(r.author_id)),
    'comments',(select count(*) from public.social_comments c where c.post_id=post.id and c.deleted_at is null and not public.social_blocked(c.author_id)),
    'reaction',(select r.kind from public.social_reactions r where r.post_id=post.id and r.author_id=auth.uid()),
    'saved',exists(select 1 from public.social_bookmarks b where b.owner_id=auth.uid() and b.post_id=post.id));
$$;
create or replace function public.social_message_json(msg public.social_messages) returns jsonb
language sql stable security definer set search_path='' as $$
  select to_jsonb(msg)||jsonb_build_object(
    'body',case when msg.withdrawn_at is null then msg.body else 'Tin nhắn đã thu hồi' end,
    'reply', (select jsonb_build_object('id',r.id,'sender_id',r.sender_id,'body',case when r.withdrawn_at is null then left(r.body,240) else 'Tin nhắn đã thu hồi' end)
      from public.social_messages r where r.id=msg.reply_to and r.sender_id in(msg.sender_id,msg.recipient_id) and r.recipient_id in(msg.sender_id,msg.recipient_id)),
    'reactions',coalesce((select jsonb_agg(jsonb_build_object('emoji',r.emoji,'count',r.n,'mine',r.mine) order by r.emoji)
      from (select emoji,count(*) n,bool_or(author_id=auth.uid()) mine from public.social_message_reactions where message_id=msg.id and msg.withdrawn_at is null group by emoji) r),'[]'::jsonb));
$$;
revoke all on function public.social_message_json(public.social_messages) from public,anon,authenticated;
do $$ begin
  if to_regprocedure('public.social_api_v1(text,jsonb)') is null then
    alter function public.social_api(text,jsonb) rename to social_api_v1;
  end if;
end $$;
revoke all on function public.social_api_v1(text,jsonb) from public,anon,authenticated;
create or replace function public.social_api(p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=auth.uid(); peer uuid; msg public.social_messages; existing public.social_messages;
  target bigint; reply_id bigint; result jsonb; post public.social_posts; permitted text[];
begin
  if actor is null then raise exception 'SOCIAL_AUTH_REQUIRED'; end if;
  if jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>20000 then raise exception 'SOCIAL_INVALID_INPUT'; end if;
  permitted:=case p_action
    when 'send' then array['peer','id','body','reply_to']
    when 'message_react' then array['peer','id','emoji'] when 'withdraw' then array['peer','id']
    when 'message_details' then array['peer','ids']
    when 'bookmark' then array['post','active']
    when 'post' then array['id','body','category','title','topic']
    when 'feed' then array['before','before_id','limit','category','topic','query','saved']
    else null end;
  if permitted is not null and exists(select 1 from jsonb_object_keys(p_data) k where not k=any(permitted)) then raise exception 'SOCIAL_INVALID_INPUT'; end if;
  if p_action in('send','message_react','withdraw','message_details') then
    if not(p_data ? 'peer') or jsonb_typeof(p_data->'peer')<>'string' then raise exception 'SOCIAL_INVALID_INPUT'; end if;
    peer:=(p_data->>'peer')::uuid;
    if peer is null or peer=actor or public.social_blocked(peer) then raise exception 'SOCIAL_NOT_FOUND'; end if;
  end if;
  if p_action='send' then
    if p_data ? 'reply_to' and p_data->'reply_to'<>'null'::jsonb and (jsonb_typeof(p_data->'reply_to')<>'number' or (p_data->>'reply_to') !~ '^[0-9]{1,16}$') then raise exception 'SOCIAL_INVALID_INPUT'; end if;
    reply_id:=(p_data->>'reply_to')::bigint;
    perform pg_advisory_xact_lock(hashtextextended(actor::text||coalesce(p_data->>'id',''),1));
    select * into existing from public.social_messages where sender_id=actor and client_id=(p_data->>'id')::uuid;
    if found and existing.reply_to is distinct from reply_id then raise exception 'SOCIAL_IDEMPOTENCY_CONFLICT'; end if;
    if reply_id is not null and not exists(select 1 from public.social_messages where id=reply_id and sender_id in(actor,peer) and recipient_id in(actor,peer)) then raise exception 'SOCIAL_NOT_FOUND'; end if;
    result:=public.social_api_v1('send',p_data-'reply_to');
    update public.social_messages set reply_to=reply_id where id=(result->>'id')::bigint returning * into msg;
    return public.social_message_json(msg);
  elsif p_action in('message_react','withdraw') then
    if jsonb_typeof(p_data->'id') is distinct from 'number' or (p_data->>'id') !~ '^[0-9]{1,16}$' then raise exception 'SOCIAL_INVALID_INPUT'; end if;
    target:=(p_data->>'id')::bigint;
    select * into msg from public.social_messages where id=target and sender_id in(actor,peer) and recipient_id in(actor,peer) for update;
    if not found then raise exception 'SOCIAL_NOT_FOUND'; end if;
    if p_action='withdraw' then
      if msg.sender_id<>actor then raise exception 'SOCIAL_NOT_FOUND'; end if;
      update public.social_messages set withdrawn_at=coalesce(withdrawn_at,clock_timestamp()) where id=target returning * into msg;
      delete from public.social_message_reactions where message_id=target;
    else
      if msg.withdrawn_at is not null then raise exception 'SOCIAL_NOT_FOUND'; end if;
      if not(p_data ? 'emoji') or (p_data->'emoji'<>'null'::jsonb and (jsonb_typeof(p_data->'emoji')<>'string' or p_data->>'emoji' not in('❤️','👍','😂','😮','😢','加油'))) then raise exception 'SOCIAL_INVALID_INPUT'; end if;
      perform public.social_limit('message_react',120,60);
      if p_data->'emoji'='null'::jsonb then delete from public.social_message_reactions where message_id=target and author_id=actor;
      else insert into public.social_message_reactions values(target,actor,p_data->>'emoji') on conflict(message_id,author_id) do update set emoji=excluded.emoji; end if;
    end if;
    return public.social_message_json(msg);
  elsif p_action='message_details' then
    if jsonb_typeof(p_data->'ids') is distinct from 'array' or jsonb_array_length(p_data->'ids')>200 then raise exception 'SOCIAL_INVALID_INPUT'; end if;
    if exists(select 1 from jsonb_array_elements(p_data->'ids') x where jsonb_typeof(x)<>'number' or x::text !~ '^[0-9]{1,16}$') then raise exception 'SOCIAL_INVALID_INPUT'; end if;
    select coalesce(jsonb_agg(public.social_message_json(m) order by m.id),'[]'::jsonb) into result from public.social_messages m
      where m.id in(select x::text::bigint from jsonb_array_elements(p_data->'ids') x) and m.sender_id in(actor,peer) and m.recipient_id in(actor,peer);
    return result;
  elsif p_action='bookmark' then
    if jsonb_typeof(p_data->'active') is distinct from 'boolean' then raise exception 'SOCIAL_INVALID_INPUT'; end if;
    select * into post from public.social_posts where id=(p_data->>'post')::uuid and deleted_at is null and not public.social_blocked(author_id);
    if not found then raise exception 'SOCIAL_NOT_FOUND'; end if;
    if (p_data->>'active')::boolean then insert into public.social_bookmarks values(actor,post.id) on conflict do nothing;
    else delete from public.social_bookmarks where owner_id=actor and post_id=post.id; end if;
    return 'true'::jsonb;
  elsif p_action='post' then
    if (p_data ? 'title' and (jsonb_typeof(p_data->'title')<>'string' or char_length(p_data->>'title')>120)) or
      (p_data ? 'topic' and (jsonb_typeof(p_data->'topic')<>'string' or p_data->>'topic' not in('general','vocabulary','grammar','pronunciation','hsk','culture'))) then raise exception 'SOCIAL_INVALID_INPUT'; end if;
    perform pg_advisory_xact_lock(hashtextextended(actor::text||coalesce(p_data->>'id',''),2));
    select * into post from public.social_posts where id=(p_data->>'id')::uuid;
    if found and (post.title<>coalesce(btrim(p_data->>'title'),'') or post.topic<>coalesce(p_data->>'topic','general')) then raise exception 'SOCIAL_IDEMPOTENCY_CONFLICT'; end if;
    result:=public.social_api_v1('post',p_data-'title'-'topic');
    update public.social_posts set title=coalesce(btrim(p_data->>'title'),''),topic=coalesce(p_data->>'topic','general') where id=(result->>'id')::uuid returning * into post;
    return public.social_post_json(post);
  elsif p_action='feed' then
    if ((p_data ? 'before')<>(p_data ? 'before_id')) or
      (p_data ? 'category' and p_data->>'category' not in('question','share','practice')) or
      (p_data ? 'topic' and p_data->>'topic' not in('general','vocabulary','grammar','pronunciation','hsk','culture')) or
      (p_data ? 'query' and (jsonb_typeof(p_data->'query')<>'string' or char_length(p_data->>'query')>80)) or
      (p_data ? 'saved' and jsonb_typeof(p_data->'saved')<>'boolean') then raise exception 'SOCIAL_INVALID_INPUT'; end if;
    perform public.social_limit('feed',1200);
    select coalesce(jsonb_agg(public.social_post_json(p) order by p.created_at desc,p.id desc),'[]'::jsonb) into result from (
      select * from public.social_posts p where p.deleted_at is null and not public.social_blocked(p.author_id)
      and (not(p_data ? 'before') or (p.created_at,p.id)<((p_data->>'before')::timestamptz,(p_data->>'before_id')::uuid))
      and (not(p_data ? 'category') or p.category=p_data->>'category') and (not(p_data ? 'topic') or p.topic=p_data->>'topic')
      and (not(p_data ? 'query') or strpos(lower(p.title||' '||p.body),lower(btrim(p_data->>'query')))>0)
      and (not coalesce((p_data->>'saved')::boolean,false) or exists(select 1 from public.social_bookmarks b where b.owner_id=actor and b.post_id=p.id))
      order by p.created_at desc,p.id desc limit 20) p;
    return result;
  end if;
  result:=public.social_api_v1(p_action,p_data);
  if p_action='messages' then
    select coalesce(jsonb_agg(public.social_message_json(m) order by m.id),'[]'::jsonb) into result
      from public.social_messages m where m.id in(select (v->>'id')::bigint from jsonb_array_elements(result->'messages') v);
    return jsonb_build_object('messages',result,'read',coalesce((select message_id from public.social_reads where reader_id=(p_data->>'peer')::uuid and peer_id=actor),0));
  elsif p_action='inbox' then
    select coalesce(jsonb_agg(v||jsonb_build_object('message',public.social_message_json(m)) order by m.id desc),'[]'::jsonb) into result
      from jsonb_array_elements(result) v join public.social_messages m on m.id=(v->'message'->>'id')::bigint;
  end if;
  return result;
end;
$$;
revoke all on function public.social_api(text,jsonb) from public,anon;
grant execute on function public.social_api(text,jsonb) to authenticated;
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='social_message_reactions' and schemaname='public') then
    alter publication supabase_realtime add table public.social_message_reactions;
  end if;
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='social_message_updates' and schemaname='public') then
    alter publication supabase_realtime add table public.social_message_updates;
  end if;
end $$;
notify pgrst,'reload schema';
commit;
