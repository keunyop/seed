import { describe, expect, it } from "vitest";
import { createDefaultFamilyOpenStore } from "@/lib/family/default-store";
import {
  formatChildBirthDate,
  formatParentRelation,
  formatTeacherBirthDate,
  getChildRecord,
  getClassLabel,
  getDashboardSummary,
  getMonthlyQtDetails,
  getSession,
  getTeacherName,
  getWeeklyAttendanceDetails,
  isValidBirthMonthDay,
  parseBirthDateParts,
  sortChildrenForRoster,
} from "@/lib/family/stats";
import { normalizeFamilyOpenStore } from "@/lib/family/store-persistence";

describe("family open stats", () => {
  it("validates real birth month and day combinations", () => {
    expect(isValidBirthMonthDay(2, 29)).toBe(true);
    expect(isValidBirthMonthDay(2, 30)).toBe(false);
    expect(isValidBirthMonthDay(13, 1)).toBe(false);
    expect(parseBirthDateParts("2020-02-29")).toEqual({ year: 2020, month: 2, day: 29 });
    expect(parseBirthDateParts("2021-02-29")).toBeNull();
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

    const weeklyDetails = getWeeklyAttendanceDetails(store, sessionDate);
    expect(weeklyDetails.find((item) => item.child.id === "child-harin")).toMatchObject({
      status: "present",
      qtCompleted: true,
    });

    const qtDetails = getMonthlyQtDetails(store, sessionDate, 6);
    expect(qtDetails.map((item) => `${item.child.name}:${item.completions}`)).toEqual(
      expect.arrayContaining(["하린:1", "유나:1"]),
    );
    expect(formatChildBirthDate(store.children[0])).toBe("2020년 6월 12일");
    expect(formatTeacherBirthDate(store.teachers[0])).toBe("5월 10일");
  });

  it("excludes children without birthdays from birthday summaries", () => {
    const store = createDefaultFamilyOpenStore();
    store.children[0] = {
      ...store.children[0],
      birthDate: undefined,
      birthYear: undefined,
      birthMonth: undefined,
      birthDay: undefined,
    };

    expect(formatChildBirthDate(store.children[0])).toBe("생년월일 미입력");
    expect(getDashboardSummary(store, "2026-06-28", 6).monthlyBirthdays.map((child) => child.name)).toEqual(["유나"]);

    store.children[0] = { ...store.children[0], birthYear: 2020 };
    expect(formatChildBirthDate(store.children[0])).toBe("2020년 생일 미입력");
  });

  it("ignores inactive children when calculating monthly qt summary", () => {
    const store = createDefaultFamilyOpenStore();
    store.children[0] = { ...store.children[0], isActive: false };
    store.attendanceByDate["2026-06-28"] = {
      sessionDate: "2026-06-28",
      note: "",
      savedAt: "2026-06-25T00:00:00.000Z",
      records: {
        "child-harin": { status: "present", qtCompleted: true },
      },
    };

    const summary = getDashboardSummary(store, "2026-06-28", 6);
    const qtDetails = getMonthlyQtDetails(store, "2026-06-28", 6);

    expect(summary.monthlyQtParticipants).toBe(0);
    expect(summary.monthlyQtCompletions).toBe(0);
    expect(qtDetails).toEqual([]);
  });

  it("normalizes parent relation and formats its label", () => {
    const store = normalizeFamilyOpenStore({
      ...createDefaultFamilyOpenStore(),
      children: [
        {
          ...createDefaultFamilyOpenStore().children[0],
          parents: [{ id: "parent-1", name: "보호자", phone: "010-0000-0000" }],
        },
      ],
    });

    expect(store.children[0].parents?.[0].relation).toBe("other");
    expect(formatParentRelation("father")).toBe("아빠");
    expect(formatParentRelation("mother")).toBe("엄마");
    expect(formatParentRelation("other")).toBe("기타");
  });

  it("keeps new attendance records unselected by default", () => {
    const store = createDefaultFamilyOpenStore();
    const record = getChildRecord(getSession(store, "2026-06-28"), "child-harin");

    expect(record.status).toBeUndefined();
    expect(record.qtCompleted).toBe(false);
    expect(getSession(store, "2026-06-28").shareWithPastor).toBe(false);
  });

  it("formats class labels with homeroom teachers", () => {
    const store = createDefaultFamilyOpenStore();

    expect(getTeacherName(store, "teacher-minji")).toBe("김민지 선생님");
    expect(getClassLabel(store, "class-kindergarten")).toBe("유치부 믿음반 · 김민지 선생님");
  });

  it("sorts children by name by default or by class order", () => {
    const store = createDefaultFamilyOpenStore();
    const children = [
      { ...store.children[1], name: "하준", classId: "class-elementary" },
      { ...store.children[2], name: "가은", classId: "class-elementary" },
      { ...store.children[0], name: "나래", classId: "class-kindergarten" },
    ];

    expect(sortChildrenForRoster(children, store.classes, "name").map((child) => child.name)).toEqual([
      "가은",
      "나래",
      "하준",
    ]);
    expect(sortChildrenForRoster(children, store.classes, "class").map((child) => child.name)).toEqual([
      "나래",
      "가은",
      "하준",
    ]);
    expect(children.map((child) => child.name)).toEqual(["하준", "가은", "나래"]);
  });
});
