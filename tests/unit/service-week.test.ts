import { describe, expect, it } from "vitest";
import { assertIsoDate, getNearestWeekdayDate } from "@/lib/dates/service-week";
import {
  AWANA_START_DATE,
  getDefaultAttendanceDate,
  getServiceWeekday,
} from "@/lib/family/ministry-group";

describe("service week dates", () => {
  it("keeps Sunday when the base date is already Sunday", () => {
    expect(getNearestWeekdayDate("2026-06-21", 0)).toBe("2026-06-21");
  });

  it("chooses the nearest Sunday around a weekday", () => {
    expect(getNearestWeekdayDate("2026-06-23", 0)).toBe("2026-06-21");
    expect(getNearestWeekdayDate("2026-06-26", 0)).toBe("2026-06-28");
  });

  it("uses Friday as the AWANA service day", () => {
    expect(getServiceWeekday("elementary")).toBe(0);
    expect(getServiceWeekday("awana")).toBe(5);
    expect(getNearestWeekdayDate("2026-08-31", getServiceWeekday("awana"))).toBe("2026-08-28");
    expect(getNearestWeekdayDate("2026-09-03", getServiceWeekday("awana"))).toBe("2026-09-04");
  });

  it("does not default AWANA attendance before its September 4 start", () => {
    expect(AWANA_START_DATE).toBe("2026-09-04");
    expect(getDefaultAttendanceDate("awana", "2026-08-31")).toBe("2026-09-04");
    expect(getDefaultAttendanceDate("awana", "2026-09-10")).toBe("2026-09-11");
    expect(getDefaultAttendanceDate("elementary", "2026-08-31")).toBe("2026-08-30");
  });

  it("rejects impossible ISO dates", () => {
    expect(() => assertIsoDate("2026-02-30")).toThrow("valid calendar date");
  });
});
