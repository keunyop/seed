import { describe, expect, it } from "vitest";
import { assertIsoDate, getNearestWeekdayDate } from "@/lib/dates/service-week";

describe("service week dates", () => {
  it("keeps Sunday when the base date is already Sunday", () => {
    expect(getNearestWeekdayDate("2026-06-21", 0)).toBe("2026-06-21");
  });

  it("chooses the nearest Sunday around a weekday", () => {
    expect(getNearestWeekdayDate("2026-06-23", 0)).toBe("2026-06-21");
    expect(getNearestWeekdayDate("2026-06-26", 0)).toBe("2026-06-28");
  });

  it("rejects impossible ISO dates", () => {
    expect(() => assertIsoDate("2026-02-30")).toThrow("valid calendar date");
  });
});

