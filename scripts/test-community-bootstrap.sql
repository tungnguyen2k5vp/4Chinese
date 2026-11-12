-- Only for an empty, disposable local PostgreSQL QA database.
create schema auth;
create role anon nologin;
create role authenticated nologin;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
grant usage on schema auth, public to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create publication supabase_realtime;
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid default gen_random_uuid() primary key,bucket_id text references storage.buckets(id),name text,metadata jsonb,unique(bucket_id,name));
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant select,insert,delete on storage.objects to authenticated;
create table public.learning_sentinel(value text);
insert into public.learning_sentinel values('keep-learning-progress');
