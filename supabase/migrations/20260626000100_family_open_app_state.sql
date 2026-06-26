create table if not exists public.family_open_app_state (
  id text primary key default 'default' check (id = 'default'),
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.set_family_open_app_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_family_open_app_state_updated_at on public.family_open_app_state;

create trigger set_family_open_app_state_updated_at
before update on public.family_open_app_state
for each row
execute function public.set_family_open_app_state_updated_at();

alter table public.family_open_app_state enable row level security;

drop policy if exists "family open app state read" on public.family_open_app_state;
drop policy if exists "family open app state insert" on public.family_open_app_state;
drop policy if exists "family open app state update" on public.family_open_app_state;

create policy "family open app state read"
on public.family_open_app_state
for select
to anon, authenticated
using (true);

create policy "family open app state insert"
on public.family_open_app_state
for insert
to anon, authenticated
with check (id = 'default');

create policy "family open app state update"
on public.family_open_app_state
for update
to anon, authenticated
using (id = 'default')
with check (id = 'default');

grant select, insert, update on public.family_open_app_state to anon, authenticated;
