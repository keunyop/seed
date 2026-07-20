alter table public.attendance_records
  add column if not exists note text not null default '';

alter table public.attendance_records
  add constraint attendance_records_note_length
  check (char_length(note) <= 100);

comment on column public.attendance_records.note is
  'Latest short per-child note for this attendance date; no edit history is retained.';
