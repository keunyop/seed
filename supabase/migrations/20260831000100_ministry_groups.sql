-- Separate elementary and AWANA data without moving or deleting existing rows.
-- Every existing row is backfilled to elementary by the column default.

alter table public.teachers
  add column if not exists ministry_group text not null default 'elementary'
  check (ministry_group in ('elementary', 'awana'));
alter table public.classes
  add column if not exists ministry_group text not null default 'elementary'
  check (ministry_group in ('elementary', 'awana'));
alter table public.children
  add column if not exists ministry_group text not null default 'elementary'
  check (ministry_group in ('elementary', 'awana'));
alter table public.child_parents
  add column if not exists ministry_group text not null default 'elementary'
  check (ministry_group in ('elementary', 'awana'));
alter table public.attendance_sessions
  add column if not exists ministry_group text not null default 'elementary'
  check (ministry_group in ('elementary', 'awana'));
alter table public.attendance_records
  add column if not exists ministry_group text not null default 'elementary'
  check (ministry_group in ('elementary', 'awana'));
alter table public.attendance_memos
  add column if not exists ministry_group text not null default 'elementary'
  check (ministry_group in ('elementary', 'awana'));

update public.teachers set ministry_group = 'elementary' where ministry_group is null;
update public.classes set ministry_group = 'elementary' where ministry_group is null;
update public.children set ministry_group = 'elementary' where ministry_group is null;
update public.child_parents set ministry_group = 'elementary' where ministry_group is null;
update public.attendance_sessions set ministry_group = 'elementary' where ministry_group is null;
update public.attendance_records set ministry_group = 'elementary' where ministry_group is null;
update public.attendance_memos set ministry_group = 'elementary' where ministry_group is null;

alter table public.attendance_sessions
  drop constraint if exists attendance_sessions_organization_id_session_date_key;

create unique index if not exists attendance_sessions_organization_group_date_key
  on public.attendance_sessions(organization_id, ministry_group, session_date);

create unique index if not exists teachers_id_organization_group_key
  on public.teachers(id, organization_id, ministry_group);
create unique index if not exists classes_id_organization_group_key
  on public.classes(id, organization_id, ministry_group);
create unique index if not exists children_id_organization_group_key
  on public.children(id, organization_id, ministry_group);
create unique index if not exists attendance_sessions_id_organization_group_key
  on public.attendance_sessions(id, organization_id, ministry_group);

create index if not exists teachers_organization_group_idx
  on public.teachers(organization_id, ministry_group);
create index if not exists classes_organization_group_idx
  on public.classes(organization_id, ministry_group);
create index if not exists children_organization_group_idx
  on public.children(organization_id, ministry_group);
create index if not exists child_parents_organization_group_idx
  on public.child_parents(organization_id, ministry_group);
create index if not exists attendance_sessions_organization_group_date_idx
  on public.attendance_sessions(organization_id, ministry_group, session_date);
create index if not exists attendance_records_organization_group_idx
  on public.attendance_records(organization_id, ministry_group);
create index if not exists attendance_memos_organization_group_date_idx
  on public.attendance_memos(organization_id, ministry_group, session_date, saved_at desc);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'classes_teacher_same_group_fkey') then
    alter table public.classes
      add constraint classes_teacher_same_group_fkey
      foreign key (teacher_id, organization_id, ministry_group)
      references public.teachers(id, organization_id, ministry_group)
      on delete set null (teacher_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'children_class_same_group_fkey') then
    alter table public.children
      add constraint children_class_same_group_fkey
      foreign key (class_id, organization_id, ministry_group)
      references public.classes(id, organization_id, ministry_group)
      on delete set null (class_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'child_parents_child_same_group_fkey') then
    alter table public.child_parents
      add constraint child_parents_child_same_group_fkey
      foreign key (child_id, organization_id, ministry_group)
      references public.children(id, organization_id, ministry_group)
      on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'attendance_records_session_same_group_fkey') then
    alter table public.attendance_records
      add constraint attendance_records_session_same_group_fkey
      foreign key (session_id, organization_id, ministry_group)
      references public.attendance_sessions(id, organization_id, ministry_group)
      on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'attendance_records_child_same_group_fkey') then
    alter table public.attendance_records
      add constraint attendance_records_child_same_group_fkey
      foreign key (child_id, organization_id, ministry_group)
      references public.children(id, organization_id, ministry_group)
      on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'attendance_memos_class_same_group_fkey') then
    alter table public.attendance_memos
      add constraint attendance_memos_class_same_group_fkey
      foreign key (class_id, organization_id, ministry_group)
      references public.classes(id, organization_id, ministry_group)
      on delete set null (class_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'attendance_memos_teacher_same_group_fkey') then
    alter table public.attendance_memos
      add constraint attendance_memos_teacher_same_group_fkey
      foreign key (teacher_id, organization_id, ministry_group)
      references public.teachers(id, organization_id, ministry_group)
      on delete set null (teacher_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'attendance_memos_ack_teacher_same_group_fkey') then
    alter table public.attendance_memos
      add constraint attendance_memos_ack_teacher_same_group_fkey
      foreign key (acknowledged_by_teacher_id, organization_id, ministry_group)
      references public.teachers(id, organization_id, ministry_group)
      on delete set null (acknowledged_by_teacher_id);
  end if;
end
$$;

comment on column public.attendance_records.qt_completed is
  'Group-specific activity completion: elementary QT or AWANA memorization.';
