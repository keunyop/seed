alter table public.children
  alter column birth_month drop not null,
  alter column birth_day drop not null;
