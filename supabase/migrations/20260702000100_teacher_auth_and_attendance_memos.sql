alter table public.teachers
add column if not exists is_admin boolean not null default false;

with first_active_teacher as (
  select id
  from public.teachers
  where organization_id = '00000000-0000-0000-0000-000000000001'
    and is_active = true
  order by sort_order, created_at, id
  limit 1
)
update public.teachers
set is_admin = true
where id in (select id from first_active_teacher)
  and not exists (
    select 1
    from public.teachers
    where organization_id = '00000000-0000-0000-0000-000000000001'
      and is_active = true
      and is_admin = true
  );

create table if not exists public.attendance_memos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  session_date date not null,
  class_id text references public.classes(id) on delete set null,
  teacher_id text references public.teachers(id) on delete set null,
  note text not null,
  is_secret boolean not null default false,
  saved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_memos_note_not_empty check (length(trim(note)) > 0)
);

create index if not exists attendance_memos_organization_date_idx
on public.attendance_memos(organization_id, session_date, saved_at desc);

create index if not exists attendance_memos_class_id_idx on public.attendance_memos(class_id);
create index if not exists attendance_memos_teacher_id_idx on public.attendance_memos(teacher_id);

drop trigger if exists set_attendance_memos_updated_at on public.attendance_memos;
create trigger set_attendance_memos_updated_at
before update on public.attendance_memos
for each row execute function public.set_updated_at();

insert into public.attendance_memos (
  organization_id,
  session_date,
  class_id,
  teacher_id,
  note,
  is_secret,
  saved_at,
  created_at,
  updated_at
)
select
  organization_id,
  session_date,
  null,
  null,
  note,
  share_with_pastor,
  coalesce(saved_at, updated_at, now()),
  created_at,
  updated_at
from public.attendance_sessions
where length(trim(note)) > 0
  and not exists (
    select 1
    from public.attendance_memos
    where attendance_memos.organization_id = attendance_sessions.organization_id
      and attendance_memos.session_date = attendance_sessions.session_date
      and attendance_memos.note = attendance_sessions.note
      and attendance_memos.teacher_id is null
      and attendance_memos.class_id is null
  );

alter table public.attendance_memos enable row level security;

drop policy if exists "default organization rows read" on public.attendance_memos;
drop policy if exists "default organization rows insert" on public.attendance_memos;
drop policy if exists "default organization rows update" on public.attendance_memos;
drop policy if exists "default organization rows delete" on public.attendance_memos;

create policy "default organization rows read"
on public.attendance_memos
for select
to anon, authenticated
using (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows insert"
on public.attendance_memos
for insert
to anon, authenticated
with check (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows update"
on public.attendance_memos
for update
to anon, authenticated
using (organization_id = '00000000-0000-0000-0000-000000000001')
with check (organization_id = '00000000-0000-0000-0000-000000000001');

create policy "default organization rows delete"
on public.attendance_memos
for delete
to anon, authenticated
using (organization_id = '00000000-0000-0000-0000-000000000001');

grant select, insert, update, delete on public.attendance_memos to anon, authenticated;
