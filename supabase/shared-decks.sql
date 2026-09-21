-- Run this once in Supabase Dashboard → SQL Editor.
-- The app can only access the two RPC functions below. It cannot list rows.
create table if not exists public.hanzi_shared_decks (
  code text primary key check (code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$'),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.hanzi_shared_decks enable row level security;

revoke all on public.hanzi_shared_decks from anon, authenticated;

create or replace function public.publish_hanzi_shared_deck(p_code text, p_payload jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted boolean;
begin
  if p_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$'
    or jsonb_typeof(p_payload) <> 'object'
    or jsonb_typeof(p_payload -> 'words') <> 'array'
    or jsonb_array_length(p_payload -> 'words') not between 1 and 500 then
    return false;
  end if;

  insert into public.hanzi_shared_decks(code, payload)
  values (p_code, p_payload)
  on conflict (code) do nothing
  returning true into inserted;
  return coalesce(inserted, false);
end;
$$;

create or replace function public.fetch_hanzi_shared_deck(p_code text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select payload from public.hanzi_shared_decks where code = upper(trim(p_code)) limit 1;
$$;

grant execute on function public.publish_hanzi_shared_deck(text, jsonb) to anon;
grant execute on function public.fetch_hanzi_shared_deck(text) to anon;
