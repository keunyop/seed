import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Supabase family open database", () => {
  it("keeps Supabase configuration and the family open app state migration present", () => {
    expect(existsSync(join(process.cwd(), "supabase", "config.toml"))).toBe(true);

    const migrations = readdirSync(join(process.cwd(), "supabase", "migrations")).filter((name) =>
      name.endsWith(".sql"),
    );
    expect(migrations).toContain("20260626000100_family_open_app_state.sql");
    expect(migrations).toContain("20260626000200_normalized_family_schema.sql");
    expect(migrations).toContain("20260627000100_nullable_child_birth.sql");
    expect(migrations).toContain("20260702000100_teacher_auth_and_attendance_memos.sql");
    expect(migrations).toContain("20260712000100_attendance_memo_acknowledgements.sql");

    const legacyMigration = readFileSync(
      join(process.cwd(), "supabase", "migrations", "20260626000100_family_open_app_state.sql"),
      "utf8",
    );
    expect(legacyMigration).toContain("create table if not exists public.family_open_app_state");
    expect(legacyMigration).toContain("alter table public.family_open_app_state enable row level security");
    expect(legacyMigration).toContain("to anon, authenticated");

    const normalizedMigration = readFileSync(
      join(process.cwd(), "supabase", "migrations", "20260626000200_normalized_family_schema.sql"),
      "utf8",
    );
    expect(normalizedMigration).toContain("create table if not exists public.organizations");
    expect(normalizedMigration).toContain("create table if not exists public.teachers");
    expect(normalizedMigration).toContain("create table if not exists public.classes");
    expect(normalizedMigration).toContain("create table if not exists public.children");
    expect(normalizedMigration).toContain("create table if not exists public.child_parents");
    expect(normalizedMigration).toContain("create table if not exists public.attendance_sessions");
    expect(normalizedMigration).toContain("create table if not exists public.attendance_records");
    expect(normalizedMigration).toContain("jsonb_array_elements(coalesce(source.state->'children'");
    expect(normalizedMigration).toContain("alter table public.children enable row level security");
    expect(normalizedMigration).toContain("organization_id = '00000000-0000-0000-0000-000000000001'");

    const nullableBirthMigration = readFileSync(
      join(process.cwd(), "supabase", "migrations", "20260627000100_nullable_child_birth.sql"),
      "utf8",
    );
    expect(nullableBirthMigration).toContain("alter column birth_month drop not null");
    expect(nullableBirthMigration).toContain("alter column birth_day drop not null");

    const teacherAuthMigration = readFileSync(
      join(process.cwd(), "supabase", "migrations", "20260702000100_teacher_auth_and_attendance_memos.sql"),
      "utf8",
    );
    expect(teacherAuthMigration).toContain("add column if not exists is_admin boolean");
    expect(teacherAuthMigration).toContain("create table if not exists public.attendance_memos");
    expect(teacherAuthMigration).toContain("is_secret boolean not null default false");
    expect(teacherAuthMigration).toContain("alter table public.attendance_memos enable row level security");
    expect(teacherAuthMigration).toContain("grant select, insert, update, delete on public.attendance_memos");

    const memoAcknowledgementsMigration = readFileSync(
      join(process.cwd(), "supabase", "migrations", "20260712000100_attendance_memo_acknowledgements.sql"),
      "utf8",
    );
    expect(memoAcknowledgementsMigration).toContain("add column if not exists acknowledged_at timestamptz");
    expect(memoAcknowledgementsMigration).toContain("add column if not exists acknowledged_by_teacher_id text");
    expect(memoAcknowledgementsMigration).toContain("references public.teachers(id) on delete set null");
    expect(memoAcknowledgementsMigration).toContain("where acknowledged_at is null");
  });
});
