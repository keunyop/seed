import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Phase 0 database baseline", () => {
  it("keeps Supabase local configuration present and business migrations empty", () => {
    expect(existsSync(join(process.cwd(), "supabase", "config.toml"))).toBe(true);

    const migrations = readdirSync(join(process.cwd(), "supabase", "migrations")).filter((name) =>
      name.endsWith(".sql"),
    );
    expect(migrations).toEqual([]);
  });
});

