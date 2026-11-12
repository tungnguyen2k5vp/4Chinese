-- Additive social storage only. Never run a learning database reset/migration.
begin;

create table public.social_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  display_name text not null default 'Bạn học' check (char_length(btrim(display_name)) between 1 and 40),
  bio text not null default '' check (char_length(bio) <= 180),
  avatar smallint not null default 0 check (avatar between 0 and 5),
  created_at timestamptz not null default now()
);
create table public.social_friendships (
  user_low uuid references public.social_profiles(id) on delete cascade,
  user_high uuid references public.social_profiles(id) on delete cascade,
  requested_by uuid not null references public.social_profiles(id),
  state text not null check (state in ('pending','accepted','declined')),
  updated_at timestamptz not null default now(),
  primary key (user_low,user_high), check (user_low < user_high), check (requested_by in (user_low,user_high))
);
create index social_friendships_high on public.social_friendships(user_high, state);
create table public.social_blocks (
  owner_id uuid references public.social_profiles(id) on delete cascade,
  target_id uuid references public.social_profiles(id) on delete cascade,
  active boolean not null default true,
  primary key (owner_id,target_id), check (owner_id <> target_id)
);
create table public.social_posts (
  id uuid primary key,
  author_id uuid not null references public.social_profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 3000),
  category text not null check (category in ('question','share','practice')),
  created_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);
create index social_posts_feed on public.social_posts(created_at desc, id desc) where deleted_at is null;
create table public.social_comments (
  id uuid primary key,
  post_id uuid not null references public.social_posts(id) on delete cascade,
  author_id uuid not null references public.social_profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz
);
create index social_comments_post on public.social_comments(post_id, created_at, id);
create table public.social_reactions (
  post_id uuid references public.social_posts(id) on delete cascade,
  author_id uuid references public.social_profiles(id) on delete cascade,
  kind text check (kind in ('like','heart')),
  primary key (post_id,author_id)
);
create table public.social_messages (
  id bigint generated always as identity primary key,
  client_id uuid not null,
  sender_id uuid not null references public.social_profiles(id) on delete cascade,
  recipient_id uuid not null references public.social_profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default clock_timestamp(),
  unique (sender_id,client_id), check (sender_id <> recipient_id)
);
create index social_messages_received on public.social_messages(recipient_id, id desc);
create index social_messages_sent on public.social_messages(sender_id, recipient_id, id desc);
create table public.social_reads (
  reader_id uuid references public.social_profiles(id) on delete cascade,
  peer_id uuid references public.social_profiles(id) on delete cascade,
  message_id bigint not null,
  primary key (reader_id,peer_id), check (reader_id <> peer_id)
);
create table public.social_reports (
  reporter_id uuid references public.social_profiles(id) on delete cascade,
  kind text check (kind in ('post','message','profile')),
  target_id text,
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  created_at timestamptz not null default now(),
  primary key (reporter_id,kind,target_id)
);
create table public.social_rate_limits (
  actor_id uuid references auth.users(id) on delete cascade,
  action text,
  window_start timestamptz,
  count integer not null,
  primary key (actor_id,action,window_start)
);

create function public.social_blocked(other_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is null or exists (select 1 from public.social_blocks b where b.active and
    ((b.owner_id=auth.uid() and b.target_id=other_id) or (b.target_id=auth.uid() and b.owner_id=other_id)));
$$;
revoke all on function public.social_blocked(uuid) from public, anon;
grant execute on function public.social_blocked(uuid) to authenticated;

-- Durable, atomic quotas shared by all Edge/Realtime instances.
create function public.social_limit(action_name text, maximum integer, seconds integer default 3600) returns void
language plpgsql security definer set search_path = '' as $$
declare n integer; bucket timestamptz := to_timestamp(floor(extract(epoch from clock_timestamp())/seconds)*seconds);
begin
  delete from public.social_rate_limits where actor_id=auth.uid() and window_start < now()-interval '2 days';
  insert into public.social_rate_limits values(auth.uid(),action_name,bucket,1)
    on conflict (actor_id,action,window_start) do update set count=public.social_rate_limits.count+1
    returning count into n;
  if n > maximum then raise exception 'SOCIAL_RATE_LIMITED'; end if;
end;
$$;
revoke all on function public.social_limit(text,integer,integer) from public, anon, authenticated;

create function public.social_post_json(post public.social_posts) returns jsonb
language sql stable security definer set search_path = '' as $$
  select to_jsonb(post) || jsonb_build_object(
    'author', (select to_jsonb(p) from public.social_profiles p where p.id=post.author_id),
    'likes', (select count(*) from public.social_reactions r where r.post_id=post.id and r.kind='like' and not public.social_blocked(r.author_id)),
    'hearts', (select count(*) from public.social_reactions r where r.post_id=post.id and r.kind='heart' and not public.social_blocked(r.author_id)),
    'comments', (select count(*) from public.social_comments c where c.post_id=post.id and c.deleted_at is null and not public.social_blocked(c.author_id)),
    'reaction', (select r.kind from public.social_reactions r where r.post_id=post.id and r.author_id=auth.uid()));
$$;
revoke all on function public.social_post_json(public.social_posts) from public, anon, authenticated;

create function public.social_api(p_action text, p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid(); peer uuid; low_id uuid; high_id uuid; op_id uuid; target uuid;
  allowed text[]; required text[]; result jsonb; person public.social_profiles; post public.social_posts;
  msg public.social_messages; relation public.social_friendships; verb text; content text;
  before_id bigint; after_id bigint; page_size integer; n integer;
begin
  if actor is null then raise exception 'SOCIAL_AUTH_REQUIRED'; end if;
  allowed := case p_action
    when 'profile' then array['display_name','bio','avatar']
    when 'search' then array['handle'] when 'person' then array['peer']
    when 'relations' then array['friends_after','blocked_after'] when 'inbox' then array[]::text[]
    when 'friend' then array['peer','verb'] when 'block' then array['peer','active']
    when 'feed' then array['before','before_id','limit'] when 'post' then array['id','body','category']
    when 'post_detail' then array['id','before','before_id','limit'] when 'delete' then array['id','kind']
    when 'comment' then array['id','post','body'] when 'react' then array['post','kind']
    when 'messages' then array['peer','before','after','limit'] when 'send' then array['peer','id','body']
    when 'read' then array['peer','id'] when 'report' then array['kind','id','reason']
    else null end;
  if allowed is null or jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text)>20000 or
     exists(select 1 from jsonb_object_keys(p_data) k where not k=any(allowed)) then raise exception 'SOCIAL_INVALID_INPUT'; end if;
  required := case p_action
    when 'search' then array['handle'] when 'person' then array['peer']
    when 'friend' then array['peer','verb'] when 'block' then array['peer','active']
    when 'post' then array['id','body','category'] when 'post_detail' then array['id']
    when 'delete' then array['id','kind'] when 'comment' then array['id','post','body']
    when 'react' then array['post','kind'] when 'messages' then array['peer']
    when 'send' then array['peer','id','body'] when 'read' then array['peer','id']
    when 'report' then array['kind','id','reason'] else array[]::text[] end;
  if not p_data ?& required then raise exception 'SOCIAL_INVALID_INPUT'; end if;
  if exists(select 1 from jsonb_each(p_data) e where e.key in ('body','display_name','bio','handle','verb','category','reason','peer','post','before_id','friends_after','blocked_after') and jsonb_typeof(e.value)<>'string') or
    (p_data ? 'id' and p_action<>'read' and jsonb_typeof(p_data->'id')<>'string') or
    (p_data ? 'avatar' and (jsonb_typeof(p_data->'avatar')<>'number' or (p_data->>'avatar') !~ '^[0-5]$')) or
    (p_data ? 'limit' and (jsonb_typeof(p_data->'limit')<>'number' or (p_data->>'limit') !~ '^[1-9][0-9]?$' or (p_data->>'limit')::integer>50)) or
    (p_action='search' and (p_data->>'handle') !~ '^[A-Fa-f0-9]{10}$') or
    (p_action in ('feed','post_detail') and ((p_data ? 'before') <> (p_data ? 'before_id') or (p_data ? 'before' and jsonb_typeof(p_data->'before')<>'string'))) or
    (p_action='react' and p_data->'kind'<>'null'::jsonb and (jsonb_typeof(p_data->'kind')<>'string' or p_data->>'kind' not in ('like','heart'))) or
    (p_action='messages' and p_data ?& array['before','after']) then raise exception 'SOCIAL_INVALID_INPUT'; end if;
  if (p_action='read' and (jsonb_typeof(p_data->'id')<>'number' or (p_data->>'id') !~ '^[0-9]{1,16}$' or (p_data->>'id')::numeric>9007199254740991)) or
    (p_action='messages' and exists(select 1 from jsonb_each(p_data) e where e.key in ('before','after') and
      (jsonb_typeof(e.value)<>'number' or (e.value#>>'{}') !~ '^[0-9]{1,16}$' or (e.value#>>'{}')::numeric>9007199254740991))) then raise exception 'SOCIAL_INVALID_INPUT'; end if;

  if p_action='profile' then
    -- ID is always the authenticated principal, never a client-provided author ID.
    for n in 1..4 loop
      begin
        insert into public.social_profiles(id) values(actor) on conflict(id) do nothing;
        exit;
      exception when unique_violation then if n=4 then raise; end if; end;
    end loop;
    if p_data <> '{}'::jsonb then
      perform public.social_limit('profile',20);
      if (p_data ? 'display_name' and jsonb_typeof(p_data->'display_name') <> 'string') or
         (p_data ? 'bio' and jsonb_typeof(p_data->'bio') <> 'string') or
         (p_data ? 'avatar' and (p_data->>'avatar') !~ '^[0-5]$') then raise exception 'SOCIAL_INVALID_INPUT'; end if;
      update public.social_profiles set display_name=coalesce(btrim(p_data->>'display_name'),display_name),
        bio=coalesce(p_data->>'bio',bio), avatar=coalesce((p_data->>'avatar')::smallint,avatar) where id=actor;
    end if;
    select to_jsonb(p) into result from public.social_profiles p where id=actor;
    return result;
  end if;
  if not exists(select 1 from public.social_profiles where id=actor) then raise exception 'SOCIAL_PROFILE_REQUIRED'; end if;
  if p_data ? 'peer' then
    peer := (p_data->>'peer')::uuid;
    if peer is null or peer=actor or not exists(select 1 from public.social_profiles where id=peer) then raise exception 'SOCIAL_NOT_FOUND'; end if;
    low_id := least(actor,peer); high_id := greatest(actor,peer);
    if p_action in ('friend','block','send') then perform pg_advisory_xact_lock(hashtextextended(low_id::text||high_id::text,0)); end if;
    if p_action <> 'block' and public.social_blocked(peer) then raise exception 'SOCIAL_NOT_FOUND'; end if;
  end if;
  if p_action in ('person','search') then
    perform public.social_limit(case when p_action='search' then 'lookup' else 'person' end,case when p_action='search' then 180 else 1200 end);
    if p_action='search' then
      select * into person from public.social_profiles where handle=upper(btrim(p_data->>'handle')) and not public.social_blocked(id);
      if person.id is null then return 'null'; end if;
      peer:=person.id; low_id:=least(actor,peer); high_id:=greatest(actor,peer);
    else select * into person from public.social_profiles where id=peer; end if;
    select * into relation from public.social_friendships where user_low=low_id and user_high=high_id;
    return jsonb_build_object('profile',to_jsonb(person),'state',relation.state,'requested_by',relation.requested_by);
  elsif p_action='relations' then
    select jsonb_build_object('friends',coalesce((select jsonb_agg(x.person order by x.id) from
      (select p.id,jsonb_build_object('profile',to_jsonb(p),'state',f.state,'requested_by',f.requested_by) as person
       from public.social_friendships f join public.social_profiles p on p.id=case when f.user_low=actor then f.user_high else f.user_low end
       where actor in(f.user_low,f.user_high) and f.state<>'declined' and not public.social_blocked(p.id)
         and (not p_data ? 'friends_after' or p.id>(p_data->>'friends_after')::uuid) order by p.id limit 50) x), '[]'::jsonb),
      'blocked',coalesce((select jsonb_agg(to_jsonb(x) order by x.id) from
        (select p.* from public.social_blocks b join public.social_profiles p on p.id=b.target_id
         where b.owner_id=actor and b.active and (not p_data ? 'blocked_after' or p.id>(p_data->>'blocked_after')::uuid)
         order by p.id limit 50) x),'[]'::jsonb)) into result;
    return result;
  elsif p_action='friend' then
    verb:=p_data->>'verb'; select * into relation from public.social_friendships where user_low=low_id and user_high=high_id;
    if verb='request' then
      if relation.state in ('pending','accepted') then return 'true'; end if;
      perform public.social_limit('friend',30);
      insert into public.social_friendships values(low_id,high_id,actor,'pending',now()) on conflict(user_low,user_high)
        do update set requested_by=actor,state='pending',updated_at=now();
    elsif verb='accept' then
      if relation.state='accepted' then return 'true'; end if;
      if relation.state is distinct from 'pending' or relation.requested_by=actor then raise exception 'SOCIAL_INVALID_STATE'; end if;
      update public.social_friendships set state='accepted',updated_at=now() where user_low=low_id and user_high=high_id;
    elsif verb in ('decline','remove') then
      update public.social_friendships set state='declined',updated_at=now() where user_low=low_id and user_high=high_id;
    else raise exception 'SOCIAL_INVALID_INPUT'; end if;
    return 'true';
  elsif p_action='block' then
    if jsonb_typeof(p_data->'active') is distinct from 'boolean' then raise exception 'SOCIAL_INVALID_INPUT'; end if;
    perform public.social_limit('block',60);
    insert into public.social_blocks values(actor,peer,(p_data->>'active')::boolean) on conflict(owner_id,target_id) do update set active=excluded.active;
    if (p_data->>'active')::boolean then update public.social_friendships set state='declined',updated_at=now() where user_low=low_id and user_high=high_id; end if;
    return 'true';
  elsif p_action='post' then
    op_id:=(p_data->>'id')::uuid; content:=btrim(p_data->>'body');
    if op_id is null or content is null or p_data->>'category' is null then raise exception 'SOCIAL_INVALID_INPUT'; end if;
    perform pg_advisory_xact_lock(hashtextextended(op_id::text,1));
    select * into post from public.social_posts where id=op_id;
    if post.id is not null then
      if post.author_id<>actor or post.body<>content or post.category<>p_data->>'category' then raise exception 'SOCIAL_IDEMPOTENCY_CONFLICT'; end if;
      return public.social_post_json(post);
    end if;
    perform public.social_limit('post',20);
    insert into public.social_posts(id,author_id,body,category) values(op_id,actor,content,p_data->>'category') returning * into post;
    return public.social_post_json(post);
  elsif p_action in ('feed','post_detail','comment','react') then
    if p_action <> 'feed' then
      target:=coalesce(p_data->>'post',p_data->>'id')::uuid;
      select * into post from public.social_posts where id=target and deleted_at is null and not public.social_blocked(author_id);
      if post.id is null then raise exception 'SOCIAL_NOT_FOUND'; end if;
    end if;
    if p_action='comment' then
      op_id:=(p_data->>'id')::uuid; content:=btrim(p_data->>'body');
      if op_id is null or content is null then raise exception 'SOCIAL_INVALID_INPUT'; end if;
      perform pg_advisory_xact_lock(hashtextextended(op_id::text,1));
      select jsonb_build_object('post',c.post_id,'body',c.body,'author',c.author_id) into result from public.social_comments c where c.id=op_id;
      if result is not null then
        if result->>'post'<>target::text or result->>'body'<>content or result->>'author'<>actor::text then raise exception 'SOCIAL_IDEMPOTENCY_CONFLICT'; end if;
      else
        perform public.social_limit('comment',100);
        insert into public.social_comments(id,post_id,author_id,body) values(op_id,target,actor,content);
      end if;
      return 'true';
    elsif p_action='react' then
      if not (p_data ? 'kind') then raise exception 'SOCIAL_INVALID_INPUT'; end if;
      perform public.social_limit('react',300);
      insert into public.social_reactions values(target,actor,p_data->>'kind') on conflict(post_id,author_id) do update set kind=excluded.kind;
      return 'true';
    end if;
    page_size:=least(50,greatest(1,coalesce((p_data->>'limit')::integer,20)));
    if p_action='feed' then
      select coalesce(jsonb_agg(public.social_post_json(x) order by x.created_at desc,x.id desc),'[]'::jsonb) into result from
        (select * from public.social_posts p where p.deleted_at is null and not public.social_blocked(p.author_id)
          and (not (p_data ? 'before') or (p.created_at,p.id)<((p_data->>'before')::timestamptz,(p_data->>'before_id')::uuid))
          order by p.created_at desc,p.id desc limit page_size) x;
      return result;
    end if;
    select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('author',(select to_jsonb(p) from public.social_profiles p where p.id=c.author_id)) order by c.created_at desc,c.id desc),'[]'::jsonb)
      into result from (select * from public.social_comments c where c.post_id=target and c.deleted_at is null and not public.social_blocked(c.author_id)
        and (not (p_data ? 'before') or (c.created_at,c.id)<((p_data->>'before')::timestamptz,(p_data->>'before_id')::uuid))
        order by c.created_at desc,c.id desc limit page_size) c;
    return jsonb_build_object('post',public.social_post_json(post),'comments',result);
  elsif p_action='delete' then
    target:=(p_data->>'id')::uuid;
    if p_data->>'kind'='post' then update public.social_posts set deleted_at=coalesce(deleted_at,now()) where id=target and author_id=actor;
    elsif p_data->>'kind'='comment' then update public.social_comments set deleted_at=coalesce(deleted_at,now()) where id=target and author_id=actor;
    else raise exception 'SOCIAL_INVALID_INPUT'; end if;
    return 'true';
  elsif p_action='send' then
    op_id:=(p_data->>'id')::uuid; content:=btrim(p_data->>'body');
    if op_id is null or content is null then raise exception 'SOCIAL_INVALID_INPUT'; end if;
    select * into msg from public.social_messages where sender_id=actor and client_id=op_id;
    if msg.id is not null then
      if msg.recipient_id<>peer or msg.body<>content then raise exception 'SOCIAL_IDEMPOTENCY_CONFLICT'; end if;
      return to_jsonb(msg);
    end if;
    if not exists(select 1 from public.social_friendships where user_low=low_id and user_high=high_id and state='accepted') then raise exception 'SOCIAL_FRIEND_REQUIRED'; end if;
    perform public.social_limit('message',300); perform public.social_limit('message_minute',20,60);
    insert into public.social_messages(client_id,sender_id,recipient_id,body) values(op_id,actor,peer,content) returning * into msg;
    return to_jsonb(msg);
  elsif p_action='messages' then
    before_id:=(p_data->>'before')::bigint; after_id:=(p_data->>'after')::bigint;
    page_size:=least(100,greatest(1,coalesce((p_data->>'limit')::integer,50)));
    select coalesce(jsonb_agg(to_jsonb(m) order by m.id),'[]'::jsonb) into result from
      (select * from public.social_messages m where ((m.sender_id=actor and m.recipient_id=peer) or (m.sender_id=peer and m.recipient_id=actor))
        and (before_id is null or m.id<before_id) and (after_id is null or m.id>after_id)
        order by (case when after_id is not null then m.id end) asc, m.id desc limit page_size) m;
    return jsonb_build_object('messages',result,'read',coalesce((select r.message_id from public.social_reads r where r.reader_id=peer and r.peer_id=actor),0));
  elsif p_action='read' then
    before_id:=(p_data->>'id')::bigint;
    if not exists(select 1 from public.social_messages where id=before_id and sender_id=peer and recipient_id=actor) then raise exception 'SOCIAL_NOT_FOUND'; end if;
    insert into public.social_reads values(actor,peer,before_id) on conflict(reader_id,peer_id) do update set message_id=greatest(public.social_reads.message_id,excluded.message_id);
    return 'true';
  elsif p_action='inbox' then
    select coalesce(jsonb_agg(jsonb_build_object('profile',to_jsonb(p),'message',to_jsonb(last_msg),'unread',
      (select count(*) from public.social_messages m where m.sender_id=p.id and m.recipient_id=actor and m.id>coalesce((select message_id from public.social_reads where reader_id=actor and peer_id=p.id),0))) order by last_msg.id desc),'[]'::jsonb)
      into result from (select case when sender_id=actor then recipient_id else sender_id end as peer_id,max(id) as last_id from public.social_messages where actor in(sender_id,recipient_id) group by 1 order by 2 desc limit 50) peers
      join public.social_profiles p on p.id=peers.peer_id
      cross join lateral (select * from public.social_messages m where (m.sender_id=actor and m.recipient_id=p.id) or (m.sender_id=p.id and m.recipient_id=actor) order by m.id desc limit 1) last_msg
      where not public.social_blocked(p.id);
    return result;
  elsif p_action='report' then
    verb:=p_data->>'kind'; content:=btrim(p_data->>'reason');
    if verb='profile' then
      if not exists(select 1 from public.social_profiles where id=(p_data->>'id')::uuid and id<>actor and not public.social_blocked(id)) then raise exception 'SOCIAL_NOT_FOUND'; end if;
    elsif verb='post' then
      if not exists(select 1 from public.social_posts where id=(p_data->>'id')::uuid and deleted_at is null and not public.social_blocked(author_id)) then raise exception 'SOCIAL_NOT_FOUND'; end if;
    elsif verb='message' then
      if not exists(select 1 from public.social_messages where id=(p_data->>'id')::bigint and actor in(sender_id,recipient_id)) then raise exception 'SOCIAL_NOT_FOUND'; end if;
    else raise exception 'SOCIAL_INVALID_INPUT'; end if;
    perform public.social_limit('report',30);
    insert into public.social_reports values(actor,verb,p_data->>'id',content,now()) on conflict(reporter_id,kind,target_id) do update set reason=excluded.reason;
    return 'true';
  end if;
  raise exception 'SOCIAL_INVALID_INPUT';
end;
$$;
revoke all on function public.social_api(text,jsonb) from public, anon;
grant execute on function public.social_api(text,jsonb) to authenticated;

do $$ declare t text; begin
  foreach t in array array['profiles','friendships','blocks','posts','comments','reactions','messages','reads','reports','rate_limits'] loop
    execute format('alter table public.social_%I enable row level security', t);
    execute format('revoke all on public.social_%I from public, anon, authenticated', t);
    if t <> 'rate_limits' then execute format('grant select on public.social_%I to authenticated', t); end if;
  end loop;
end $$;
create policy social_profiles_read on public.social_profiles for select to authenticated using (not public.social_blocked(id));
create policy social_friendships_read on public.social_friendships for select to authenticated using (auth.uid() in(user_low,user_high));
create policy social_blocks_read on public.social_blocks for select to authenticated using (owner_id=auth.uid());
create policy social_posts_read on public.social_posts for select to authenticated using (deleted_at is null and not public.social_blocked(author_id));
create policy social_comments_read on public.social_comments for select to authenticated using (deleted_at is null and not public.social_blocked(author_id) and exists(select 1 from public.social_posts p where p.id=post_id));
create policy social_reactions_read on public.social_reactions for select to authenticated using (not public.social_blocked(author_id) and exists(select 1 from public.social_posts p where p.id=post_id));
create policy social_messages_read on public.social_messages for select to authenticated using (auth.uid() in(sender_id,recipient_id) and not public.social_blocked(case when sender_id=auth.uid() then recipient_id else sender_id end));
create policy social_reads_read on public.social_reads for select to authenticated using (auth.uid() in(reader_id,peer_id) and not public.social_blocked(case when reader_id=auth.uid() then peer_id else reader_id end));
create policy social_reports_read on public.social_reports for select to authenticated using (reporter_id=auth.uid());

-- Realtime only broadcasts rows permitted by RLS. Soft changes avoid DELETE payload leakage.
do $$ declare t text; begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    foreach t in array array['social_posts','social_comments','social_reactions','social_friendships','social_messages','social_reads','social_blocks'] loop
      execute format('alter publication supabase_realtime add table public.%I',t);
    end loop;
  end if;
end $$;
notify pgrst, 'reload schema';
commit;
