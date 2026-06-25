import { describe, expect, it } from "vitest";
import { createDefaultFamilyOpenStore } from "@/lib/family/default-store";
import { getDashboardSummary, isValidBirthMonthDay } from "@/lib/family/stats";

describe("family open stats", () => {
  it("validates real birth month and day combinations", () => {
    expect(isValidBirthMonthDay(2, 29)).toBe(true);
    expect(isValidBirthMonthDay(2, 30)).toBe(false);
    expect(isValidBirthMonthDay(13, 1)).toBe(false);
  });

  it("calculates weekly attendance and monthly qt summary", () => {
    const store = createDefaultFamilyOpenStore();
    const sessionDate = "2026-06-28";
    store.attendanceByDate[sessionDate] = {
      sessionDate,
      note: "",
      savedAt: "2026-06-25T00:00:00.000Z",
      records: {
        "child-harin": { status: "present", qtCompleted: true },
        "child-joon": { status: "absent", qtCompleted: false },
        "child-yuna": { status: "present", qtCompleted: true },
      },
    };

    const summary = getDashboardSummary(store, sessionDate, 6);

    expect(summary.weeklyPresentCount).toBe(2);
    expect(summary.weeklyTotalCount).toBe(3);
    expect(summary.monthlyQtParticipants).toBe(2);
    expect(summary.monthlyQtCompletions).toBe(2);
    expect(summary.monthlyBirthdays.map((child) => child.name)).toEqual(["하린", "유나"]);
  });
});

