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

    const migration = readFileSync(
      join(process.cwd(), "supabase", "migrations", "20260626000100_family_open_app_state.sql"),
      "utf8",
    );
    expect(migration).toContain("create table if not exists public.family_open_app_state");
    expect(migration).toContain("alter table public.family_open_app_state enable row level security");
    expect(migration).toContain("to anon, authenticated");
  });
});
