create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  department text,
  timezone text not null default 'America/Vancouver',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_not_empty check (length(trim(slug)) > 0),
  constraint organizations_name_not_empty check (length(trim(name)) > 0)
);

create table if not exists public.teachers (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  photo_data_url text,
  birth_date date,
  birth_month integer check (birth_month between 1 and 12),
  birth_day integer check (birth_day between 1 and 31),
  phone text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teachers_name_not_empty check (length(trim(name)) > 0)
);

create table if not exists public.classes (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  teacher_id text references public.teachers(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classes_name_not_empty check (length(trim(name)) > 0)
);

create table if not exists public.children (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  class_id text references public.classes(id) on delete set null,
  name text not null,
  photo_data_url text,
  gender text not null default 'unspecified' check (gender in ('male', 'female', 'unspecified')),
  birth_date date,
  birth_year integer,
  birth_month integer not null check (birth_month between 1 and 12),
  birth_day integer not null check (birth_day between 1 and 31),
  address text,
  email text,
  registered_at date,
  notes text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint children_name_not_empty check (length(trim(name)) > 0)
);

create table if not exists public.child_parents (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  child_id text not null references public.children(id) on delete cascade,
  relation text not null default 'other' check (relation in ('father', 'mother', 'other')),
  name text not null default '',
  phone text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint child_parents_has_contact check (length(trim(name)) > 0 or length(trim(phone)) > 0)
);

create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  session_date date not null,
  note text not null default '',
  share_with_pastor boolean not null default false,
  saved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, session_date)
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  child_id text not null references public.children(id) on delete cascade,
  status text check (status in ('present', 'absent')),
  qt_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, child_id)
);

create index if not exists teachers_organization_id_idx on public.teachers(organization_id);
create index if not exists classes_organization_id_idx on public.classes(organization_id);
create index if not exists classes_teacher_id_idx on public.classes(teacher_id);
create index if not exists children_organization_id_idx on public.children(organization_id);
create index if not exists children_class_id_idx on public.children(class_id);
create index if not exists child_parents_child_id_idx on public.child_parents(child_id);
create index if not exists attendance_sessions_organization_date_idx on public.attendance_sessions(organization_id, session_date);
create index if not exists attendance_records_session_id_idx on public.attendance_records(session_id);
create index if not exists attendance_records_child_id_idx on public.attendance_records(child_id);

drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists set_teachers_updated_at on public.teachers;
create trigger set_teachers_updated_at
before update on public.teachers
for each row execute function public.set_updated_at();

drop trigger if exists set_classes_updated_at on public.classes;
create trigger set_classes_updated_at
before update on public.classes
for each row execute function public.set_updated_at();

drop trigger if exists set_children_updated_at on public.children;
create trigger set_children_updated_at
before update on public.children
for each row execute function public.set_updated_at();

drop trigger if exists set_child_parents_updated_at on public.child_parents;
create trigger set_child_parents_updated_at
before update on public.child_parents
for each row execute function public.set_updated_at();

drop trigger if exists set_attendance_sessions_updated_at on public.attendance_sessions;
create trigger set_attendance_sessions_updated_at
before update on public.attendance_sessions
for each row execute function public.set_updated_at();

drop trigger if exists set_attendance_records_updated_at on public.attendance_records;
create trigger set_attendance_records_updated_at
before update on public.attendance_records
for each row execute function public.set_updated_at();

insert into public.organizations (id, slug, name, department)
values ('00000000-0000-0000-0000-000000000001', 'default', '밴쿠버한인침례교회', '초등부')
on conflict (id) do update
set slug = excluded.slug,
    name = excluded.name,
    department = excluded.department;

with source as (
  select state
  from public.family_open_app_state
  where id = 'default'
)
insert into public.teachers (
  id,
  organization_id,
  name,
  photo_data_url,
  birth_date,
  birth_month,
  birth_day,
  phone,
  is_active,
  sort_order
)
select
  item.value->>'id',
  '00000000-0000-0000-0000-000000000001',
  item.value->>'name',
  nullif(item.value->>'photoDataUrl', ''),
  case
    when item.value->>'birthDate' ~ '^\d{4}-\d{2}-\d{2}$' then (item.value->>'birthDate')::date
    else null
  end,
  nullif(item.value->>'birthMonth', '')::integer,
  nullif(item.value->>'birthDay', '')::integer,
  nullif(item.value->>'phone', ''),
  coalesce((item.value->>'isActive')::boolean, true),
  item.ordinality::integer - 1
from source, jsonb_array_elements(coalesce(source.state->'teachers', '[]'::jsonb)) with ordinality as item(value, ordinality)
where item.value ? 'id' and item.value ? 'name'
on conflict (id) do update
set organization_id = excluded.organization_id,
    name = excluded.name,
    photo_data_url = excluded.photo_data_url,
    birth_date = excluded.birth_date,
    birth_month = excluded.birth_month,
    birth_day = excluded.birth_day,
    phone = excluded.phone,
    is_active = excluded.is_active,
    sort_order = excluded.sort_order;

with source as (
  select state
  from public.family_open_app_state
  where id = 'default'
)
insert into public.classes (id, organization_id, name, teacher_id, sort_order)
select
  item.value->>'id',
  '00000000-0000-0000-0000-000000000001',
  item.value->>'name',
  case
    when exists (select 1 from public.teachers t where t.id = nullif(item.value->>'teacherId', '')) then nullif(item.value->>'teacherId', '')
    else null
  end,
  item.ordinality::integer - 1
from source, jsonb_array_elements(coalesce(source.state->'classes', '[]'::jsonb)) with ordinality as item(value, ordinality)
where item.value ? 'id' and item.value ? 'name'
on conflict (id) do update
set organization_id = excluded.organization_id,
    name = excluded.name,
    teacher_id = excluded.teacher_id,
    sort_order = excluded.sort_order;

with source as (
  select state
  from public.family_open_app_state
  where id = 'default'
)
insert into public.children (
  id,
  organization_id,
  class_id,
  name,
  photo_data_url,
  gender,
  birth_date,
  birth_year,
  birth_month,
  birth_day,
  address,
  email,
  registered_at,
  notes,
  is_active,
  sort_order
)
select
  item.value->>'id',
  '00000000-0000-0000-0000-000000000001',
  case
    when exists (select 1 from public.classes c where c.id = nullif(item.value->>'classId', '')) then nullif(item.value->>'classId', '')
    else null
  end,
  item.value->>'name',
  nullif(item.value->>'photoDataUrl', ''),
  case
    when item.value->>'gender' in ('male', 'female', 'unspecified') then item.value->>'gender'
    else 'unspecified'
  end,
  case
    when item.value->>'birthDate' ~ '^\d{4}-\d{2}-\d{2}$' then (item.value->>'birthDate')::date
    else null
  end,
  nullif(item.value->>'birthYear', '')::integer,
  coalesce(nullif(item.value->>'birthMonth', '')::integer, 1),
  coalesce(nullif(item.value->>'birthDay', '')::integer, 1),
  nullif(item.value->>'address', ''),
  nullif(item.value->>'email', ''),
  case
    when item.value->>'registeredAt' ~ '^\d{4}-\d{2}-\d{2}$' then (item.value->>'registeredAt')::date
    else null
  end,
  nullif(item.value->>'notes', ''),
  coalesce((item.value->>'isActive')::boolean, true),
  item.ordinality::integer - 1
from source, jsonb_array_elements(coalesce(source.state->'children', '[]'::jsonb)) with ordinality as item(value, ordinality)
where item.value ? 'id' and item.value ? 'name'
on conflict (id) do update
set organization_id = excluded.organization_id,
    class_id = excluded.class_id,
    name = excluded.name,
    photo_data_url = excluded.photo_data_url,
    gender = excluded.gender,
    birth_date = excluded.birth_date,
    birth_year = excluded.birth_year,
    birth_month = excluded.birth_month,
    birth_day = excluded.birth_day,
    address = excluded.address,
    email = excluded.email,
    registered_at = excluded.registered_at,
    notes = excluded.notes,
    is_active = excluded.is_active,
    sort_order = excluded.sort_order;

with source as (
  select state
  from public.family_open_app_state
  where id = 'default'
),
child_items as (
  select child.value as child_json
  from source, jsonb_array_elements(coalesce(source.state->'children', '[]'::jsonb)) as child(value)
)
insert into public.child_parents (id, organization_id, child_id, relation, name, phone, sort_order)
select
  coalesce(nullif(parent.value->>'id', ''), 'parent-' || md5(child_items.child_json->>'id' || '-' || parent.ordinality::text)),
  '00000000-0000-0000-0000-000000000001',
  child_items.child_json->>'id',
  case
    when parent.value->>'relation' in ('father', 'mother', 'other') then parent.value->>'relation'
    else 'other'
  end,
  coalesce(parent.value->>'name', ''),
  coalesce(parent.value->>'phone', ''),
  parent.ordinality::integer - 1
from child_items,
jsonb_array_elements(coalesce(child_items.child_json->'parents', '[]'::jsonb)) with ordinality as parent(value, ordinality)
where child_items.child_json ? 'id'
  and exists (select 1 from public.children c where c.id = child_items.child_json->>'id')
  and (length(trim(coalesce(parent.value->>'name', ''))) > 0 or length(trim(coalesce(parent.value->>'phone', ''))) > 0)
on conflict (id) do update
set organization_id = excluded.organization_id,
    child_id = excluded.child_id,
    relation = excluded.relation,
    name = excluded.name,
    phone = excluded.phone,
    sort_order = excluded.sort_order;

with source as (
  select state
  from public.family_open_app_state
  where id = 'default'
)
insert into public.attendance_sessions (organization_id, session_date, note, share_with_pastor, saved_at)
select
  '00000000-0000-0000-0000-000000000001',
  coalesce(item.value->>'sessionDate', item.key)::date,
  coalesce(item.value->>'note', ''),
  coalesce(nullif(item.value->>'shareWithPastor', '')::boolean, false),
  nullif(item.value->>'savedAt', '')::timestamptz
from source, jsonb_each(coalesce(source.state->'attendanceByDate', '{}'::jsonb)) as item(key, value)
where coalesce(item.value->>'sessionDate', item.key) ~ '^\d{4}-\d{2}-\d{2}$'
on conflict (organization_id, session_date) do update
set note = excluded.note,
    share_with_pastor = excluded.share_with_pastor,
    saved_at = excluded.saved_at;

with source as (
  select state
  from public.family_open_app_state
  where id = 'default'
),
session_items as (
  select
    coalesce(item.value->>'sessionDate', item.key)::date as session_date,
    item.value as session_json
  from source, jsonb_each(coalesce(source.state->'attendanceByDate', '{}'::jsonb)) as item(key, value)
  where coalesce(item.value->>'sessionDate', item.key) ~ '^\d{4}-\d{2}-\d{2}$'
),
record_items as (
  select
    session_items.session_date,
    record.key as child_id,
    record.value as record_json
  from session_items,
  jsonb_each(coalesce(session_items.session_json->'records', '{}'::jsonb)) as record(key, value)
)
insert into public.attendance_records (organization_id, session_id, child_id, status, qt_completed)
select
  '00000000-0000-0000-0000-000000000001',
  attendance_sessions.id,
  record_items.child_id,
  case
    when record_items.record_json->>'status' in ('present', 'absent') then record_items.record_json->>'status'
    else null
  end,
  coalesce(nullif(record_items.record_json->>'qtCompleted', '')::boolean, false)
from record_items
join public.attendance_sessions
  on attendance_sessions.organization_id = '00000000-0000-0000-0000-000000000001'
 and attendance_sessions.session_date = record_items.session_date
where exists (select 1 from public.children c where c.id = record_items.child_id)
on conflict (session_id, child_id) do update
set status = excluded.status,
    qt_completed = excluded.qt_completed;

alter table public.organizations enable row level security;
alter table public.teachers enable row level security;
alter table public.classes enable row level security;
alter table public.children enable row level security;
alter table public.child_parents enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;

drop policy if exists "default organization read" on public.organizations;
drop policy if exists "default organization insert" on public.organizations;
drop policy if exists "default organization update" on public.organizations;
drop policy if exists "default organization delete" on public.organizations;

create policy "default organization read"
on public.organizations
for select
to anon, authenticated
using (id = '00000000-0000-0000-0000-000000000001');

create policy "default organization insert"
on public.organizations
for insert
to anon, authenticated
with check (id = '00000000-0000-0000-0000-000000000001');

create policy "default organization update"
on public.organizations
for update
to anon, authenticated
using (id = '00000000-0000-0000-0000-000000000001')
with check (id = '00000000-0000-0000-0000-000000000001');

create policy "default organization delete"
on public.organizations
for delete
to anon, authenticated
using (false);

drop policy if exists "default organization rows read" on public.teachers;
drop policy if exists "default organization rows insert" on public.teachers;
drop policy if exists "default organization rows update" on public.teachers;
drop policy if exists "default organization rows delete" on public.teachers;
drop policy if exists "default organization rows read" on public.classes;
drop policy if exists "default organization rows insert" on public.classes;
drop policy if exists "default organization rows update" on public.classes;
drop policy if exists "default organization rows delete" on public.classes;
drop policy if exists "default organization rows read" on public.children;
drop policy if exists "default organization rows insert" on public.children;
drop policy if exists "default organization rows update" on public.children;
drop policy if exists "default organization rows delete" on public.children;
drop policy if exists "default organization rows read" on public.child_parents;
drop policy if exists "default organization rows insert" on public.child_parents;
drop policy if exists "default organization rows update" on public.child_parents;
drop policy if exists "default organization rows delete" on public.child_parents;
drop policy if exists "default organization rows read" on public.attendance_sessions;
drop policy if exists "default organization rows insert" on public.attendance_sessions;
drop policy if exists "default organization rows update" on public.attendance_sessions;
drop policy if exists "default organization rows delete" on public.attendance_sessions;
drop policy if exists "default organization rows read" on public.attendance_records;
drop policy if exists "default organization rows insert" on public.attendance_records;
drop policy if exists "default organization rows update" on public.attendance_records;
drop policy if exists "default organization rows delete" on public.attendance_records;

create policy "default organization rows read"
on public.teachers
for select
to anon, authenticated
using (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows insert"
on public.teachers
for insert
to anon, authenticated
with check (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows update"
on public.teachers
for update
to anon, authenticated
using (organization_id = '00000000-0000-0000-0000-000000000001')
with check (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows delete"
on public.teachers
for delete
to anon, authenticated
using (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows read"
on public.classes
for select
to anon, authenticated
using (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows insert"
on public.classes
for insert
to anon, authenticated
with check (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows update"
on public.classes
for update
to anon, authenticated
using (organization_id = '00000000-0000-0000-0000-000000000001')
with check (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows delete"
on public.classes
for delete
to anon, authenticated
using (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows read"
on public.children
for select
to anon, authenticated
using (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows insert"
on public.children
for insert
to anon, authenticated
with check (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows update"
on public.children
for update
to anon, authenticated
using (organization_id = '00000000-0000-0000-0000-000000000001')
with check (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows delete"
on public.children
for delete
to anon, authenticated
using (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows read"
on public.child_parents
for select
to anon, authenticated
using (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows insert"
on public.child_parents
for insert
to anon, authenticated
with check (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows update"
on public.child_parents
for update
to anon, authenticated
using (organization_id = '00000000-0000-0000-0000-000000000001')
with check (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows delete"
on public.child_parents
for delete
to anon, authenticated
using (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows read"
on public.attendance_sessions
for select
to anon, authenticated
using (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows insert"
on public.attendance_sessions
for insert
to anon, authenticated
with check (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows update"
on public.attendance_sessions
for update
to anon, authenticated
using (organization_id = '00000000-0000-0000-0000-000000000001')
with check (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows delete"
on public.attendance_sessions
for delete
to anon, authenticated
using (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows read"
on public.attendance_records
for select
to anon, authenticated
using (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows insert"
on public.attendance_records
for insert
to anon, authenticated
with check (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows update"
on public.attendance_records
for update
to anon, authenticated
using (organization_id = '00000000-0000-0000-0000-000000000001')
with check (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows delete"
on public.attendance_records
for delete
to anon, authenticated
using (organization_id = '00000000-0000-0000-0000-000000000001');

grant select, insert, update on public.organizations to anon, authenticated;
grant select, insert, update, delete on public.teachers to anon, authenticated;
grant select, insert, update, delete on public.classes to anon, authenticated;
grant select, insert, update, delete on public.children to anon, authenticated;
grant select, insert, update, delete on public.child_parents to anon, authenticated;
grant select, insert, update, delete on public.attendance_sessions to anon, authenticated;
grant select, insert, update, delete on public.attendance_records to anon, authenticated;
