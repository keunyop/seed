alter table public.attendance_memos
add column if not exists acknowledged_at timestamptz,
add column if not exists acknowledged_by_teacher_id text references public.teachers(id) on delete set null;

create index if not exists attendance_memos_unacknowledged_idx
on public.attendance_memos(organization_id, saved_at desc)
where acknowledged_at is null;
