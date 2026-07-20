import { describe, expect, it } from "vitest";
import { createDefaultFamilyOpenStore, createEmptyFamilyOpenStore } from "@/lib/family/default-store";
import {
  formatChildBirthDate,
  formatParentRelation,
  formatTeacherBirthDate,
  canCreateSecretAttendanceMemo,
  canViewAttendanceMemo,
  getAllAttendanceMemosLatestFirst,
  getActiveChildrenWithoutBirthday,
  getAttendanceMemosForView,
  getAttendanceRosterChildren,
  getChildRecord,
  getClassLabel,
  getDashboardSummary,
  getMonthlyQtDetails,
  getMonthlyAttendanceOverview,
  getMonthlyBirthdayBuckets,
  getMonthlyQtBuckets,
  getRecentWeeklyAttendanceBuckets,
  getSession,
  getSundaysInMonth,
  getTeacherName,
  getWeeklyAttendanceDetails,
  getWeeklyAttendanceBuckets,
  getYearlyBirthdayBuckets,
  getYearlyQtBuckets,
  isValidBirthMonthDay,
  parseBirthDateParts,
  sortChildrenForRoster,
  sortTeachersByName,
} from "@/lib/family/stats";
import { normalizeFamilyOpenStore } from "@/lib/family/store-persistence";

describe("family open stats", () => {
  it("keeps the runtime empty store free of sample data", () => {
    const store = createEmptyFamilyOpenStore();

    expect(store.classes).toEqual([]);
    expect(store.teachers).toEqual([]);
    expect(store.children).toEqual([]);
    expect(normalizeFamilyOpenStore(null).classes).toEqual([]);
  });

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

  it("builds eight Sunday attendance buckets across a year boundary with zero weeks and present active children only", () => {
    const store = createDefaultFamilyOpenStore();
    store.children[0] = { ...store.children[0], isActive: false };
    store.attendanceByDate["2026-12-27"] = {
      sessionDate: "2026-12-27",
      note: "",
      savedAt: "2026-12-27T20:00:00.000Z",
      records: {
        "child-harin": { status: "present", qtCompleted: false },
        "child-joon": { status: "present", qtCompleted: false },
        "child-yuna": { status: "absent", qtCompleted: true },
      },
    };

    const buckets = getRecentWeeklyAttendanceBuckets(store, "2027-01-02");

    expect(buckets).toHaveLength(8);
    expect(buckets.map((bucket) => bucket.sessionDate)).toEqual([
      "2026-11-15",
      "2026-11-22",
      "2026-11-29",
      "2026-12-06",
      "2026-12-13",
      "2026-12-20",
      "2026-12-27",
      "2027-01-03",
    ]);
    expect(buckets[0]).toMatchObject({ presentCount: 0, attendees: [] });
    expect(buckets[6].presentCount).toBe(1);
    expect(buckets[6].attendees.map((item) => item.child.id)).toEqual(["child-joon"]);
    expect(buckets[7]).toMatchObject({ presentCount: 0, attendees: [] });
  });

  it("builds a generic weekly attendance range from its starting Sunday", () => {
    const store = createDefaultFamilyOpenStore();
    store.attendanceByDate["2026-07-12"] = {
      sessionDate: "2026-07-12",
      note: "",
      savedAt: "2026-07-12T20:00:00.000Z",
      records: {
        "child-harin": { status: "present", qtCompleted: false },
        "child-joon": { status: "absent", qtCompleted: false },
      },
    };

    const buckets = getWeeklyAttendanceBuckets(store, "2026-07-05", 3);

    expect(buckets.map((bucket) => bucket.sessionDate)).toEqual(["2026-07-05", "2026-07-12", "2026-07-19"]);
    expect(buckets.map((bucket) => bucket.presentCount)).toEqual([0, 1, 0]);
    expect(() => getWeeklyAttendanceBuckets(store, "2026-07-06", 3)).toThrow("must be a Sunday");
  });

  it("builds a mobile monthly overview from every Sunday for the currently selected class", () => {
    const store = createDefaultFamilyOpenStore();
    store.children.push({
      id: "child-inactive",
      name: "비활성 아이",
      classId: "class-kindergarten",
      isActive: false,
    });
    store.attendanceByDate = {
      "2026-07-05": {
        sessionDate: "2026-07-05",
        note: "",
        savedAt: "2026-07-05T20:00:00.000Z",
        records: {
          "child-harin": { status: "present", qtCompleted: true },
          "child-joon": { status: "present", qtCompleted: true },
          "child-inactive": { status: "present", qtCompleted: true },
        },
      },
      "2026-07-12": {
        sessionDate: "2026-07-12",
        note: "",
        savedAt: "2026-07-12T20:00:00.000Z",
        records: {
          "child-harin": { status: "absent", qtCompleted: true },
        },
      },
    };

    expect(getSundaysInMonth("2026-07")).toEqual([
      "2026-07-05",
      "2026-07-12",
      "2026-07-19",
      "2026-07-26",
    ]);
    expect(getSundaysInMonth("2026-08")).toHaveLength(5);

    const overview = getMonthlyAttendanceOverview(store, "class-kindergarten", "2026-07");

    expect(overview.children.map((item) => item.child.id)).toEqual(["child-joon", "child-harin"]);
    expect(overview.children.map(({ child, presentCount, qtCount }) => [child.id, presentCount, qtCount])).toEqual([
      ["child-joon", 1, 1],
      ["child-harin", 1, 2],
    ]);
    expect(overview.dates.map(({ presentCount, qtCount, recordedCount }) => [presentCount, qtCount, recordedCount])).toEqual([
      [2, 2, 2],
      [0, 1, 1],
      [0, 0, 0],
      [0, 0, 0],
    ]);
  });

  it("builds twelve qt buckets with unique participants, per-child completions, totals, and empty months", () => {
    const store = createDefaultFamilyOpenStore();
    store.children[2] = { ...store.children[2], isActive: false };
    store.attendanceByDate = {
      "2025-12-28": {
        sessionDate: "2025-12-28",
        note: "",
        savedAt: "2025-12-28T20:00:00.000Z",
        records: { "child-harin": { qtCompleted: true } },
      },
      "2026-01-04": {
        sessionDate: "2026-01-04",
        note: "",
        savedAt: "2026-01-04T20:00:00.000Z",
        records: {
          "child-harin": { qtCompleted: true },
          "child-joon": { qtCompleted: true },
          "child-yuna": { qtCompleted: true },
        },
      },
      "2026-01-11": {
        sessionDate: "2026-01-11",
        note: "",
        savedAt: "2026-01-11T20:00:00.000Z",
        records: { "child-harin": { qtCompleted: true } },
      },
      "2027-01-03": {
        sessionDate: "2027-01-03",
        note: "",
        savedAt: "2027-01-03T20:00:00.000Z",
        records: { "child-joon": { qtCompleted: true } },
      },
    };

    const buckets = getYearlyQtBuckets(store, 2026);
    const january = buckets[0];

    expect(buckets).toHaveLength(12);
    expect(buckets.map((bucket) => bucket.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(january).toMatchObject({ year: 2026, month: 1, participantCount: 2, totalCompletions: 3 });
    expect(january.participants.map((item) => [item.child.id, item.completions])).toEqual(
      expect.arrayContaining([
        ["child-harin", 2],
        ["child-joon", 1],
      ]),
    );
    expect(january.participants.find((item) => item.child.id === "child-yuna")).toBeUndefined();
    expect(buckets[1]).toMatchObject({ participantCount: 0, totalCompletions: 0, participants: [] });
    expect(buckets[11]).toMatchObject({ participantCount: 0, totalCompletions: 0, participants: [] });
  });

  it("builds cross-year monthly qt buckets and applies a minimum completion count", () => {
    const store = createDefaultFamilyOpenStore();
    store.attendanceByDate = {
      "2026-07-05": {
        sessionDate: "2026-07-05",
        note: "",
        savedAt: "2026-07-05T20:00:00.000Z",
        records: {
          "child-harin": { qtCompleted: true },
          "child-joon": { qtCompleted: true },
        },
      },
      "2026-07-12": {
        sessionDate: "2026-07-12",
        note: "",
        savedAt: "2026-07-12T20:00:00.000Z",
        records: {
          "child-harin": { qtCompleted: true },
          "child-joon": { qtCompleted: true },
        },
      },
      "2026-07-19": {
        sessionDate: "2026-07-19",
        note: "",
        savedAt: "2026-07-19T20:00:00.000Z",
        records: { "child-harin": { qtCompleted: true } },
      },
      "2027-01-03": {
        sessionDate: "2027-01-03",
        note: "",
        savedAt: "2027-01-03T20:00:00.000Z",
        records: { "child-yuna": { qtCompleted: true } },
      },
      "2027-01-10": {
        sessionDate: "2027-01-10",
        note: "",
        savedAt: "2027-01-10T20:00:00.000Z",
        records: { "child-yuna": { qtCompleted: true } },
      },
      "2027-01-17": {
        sessionDate: "2027-01-17",
        note: "",
        savedAt: "2027-01-17T20:00:00.000Z",
        records: { "child-yuna": { qtCompleted: true } },
      },
    };

    const buckets = getMonthlyQtBuckets(store, 2026, 7, 12, 3);

    expect(buckets).toHaveLength(12);
    expect(buckets.map(({ year, month }) => `${year}-${month}`)).toEqual([
      "2026-7",
      "2026-8",
      "2026-9",
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-1",
      "2027-2",
      "2027-3",
      "2027-4",
      "2027-5",
      "2027-6",
    ]);
    expect(buckets[0]).toMatchObject({ participantCount: 1, totalCompletions: 3 });
    expect(buckets[0].participants.map((item) => item.child.id)).toEqual(["child-harin"]);
    expect(buckets[6].participants.map((item) => item.child.id)).toEqual(["child-yuna"]);
  });

  it("builds all twelve birthday buckets from active children only", () => {
    const store = createDefaultFamilyOpenStore();
    store.children[2] = { ...store.children[2], isActive: false };
    store.children.push({
      id: "child-no-birthday",
      name: "생일미정",
      classId: "class-elementary",
      isActive: true,
    });

    const buckets = getYearlyBirthdayBuckets(store, 2026);

    expect(buckets).toHaveLength(12);
    expect(buckets.map((bucket) => bucket.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(buckets[5]).toMatchObject({ year: 2026, month: 6, birthdayCount: 1 });
    expect(buckets[5].children.map((child) => child.id)).toEqual(["child-harin"]);
    expect(buckets[8].children.map((child) => child.id)).toEqual(["child-joon"]);
    expect(buckets[0]).toMatchObject({ birthdayCount: 0, children: [] });
  });

  it("builds cross-year birthday buckets and finds active children without a valid birthday", () => {
    const store = createDefaultFamilyOpenStore();
    store.children.push(
      {
        id: "child-no-birthday",
        name: "생일미정",
        classId: "class-elementary",
        isActive: true,
      },
      {
        id: "child-invalid-birthday",
        name: "생일오류",
        classId: "class-kindergarten",
        birthMonth: 2,
        birthDay: 30,
        isActive: true,
      },
      {
        id: "child-inactive-no-birthday",
        name: "비활성",
        classId: "class-kindergarten",
        isActive: false,
      },
    );

    const buckets = getMonthlyBirthdayBuckets(store, 2026, 7, 12);

    expect(buckets).toHaveLength(12);
    expect(buckets[2]).toMatchObject({ year: 2026, month: 9, birthdayCount: 1 });
    expect(buckets[11]).toMatchObject({ year: 2027, month: 6, birthdayCount: 2 });
    expect(getActiveChildrenWithoutBirthday(store).map((child) => child.id)).toEqual([
      "child-invalid-birthday",
      "child-no-birthday",
    ]);
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
    expect(getClassLabel(store, "class-kindergarten")).toBe("테스트 1반 · 김민지 선생님");
    expect(store.teachers[0].isAdmin).toBe(true);
  });

  it("sorts teachers by Korean name without mutating the source list", () => {
    const store = createDefaultFamilyOpenStore();
    const teachers = [
      { ...store.teachers[1], name: "최하늘 선생님" },
      { ...store.teachers[0], name: "김가람 선생님" },
      { ...store.teachers[1], id: "teacher-park", name: "박다은 선생님" },
    ];

    expect(sortTeachersByName(teachers).map((teacher) => teacher.name)).toEqual([
      "김가람 선생님",
      "박다은 선생님",
      "최하늘 선생님",
    ]);
    expect(teachers.map((teacher) => teacher.name)).toEqual([
      "최하늘 선생님",
      "김가람 선생님",
      "박다은 선생님",
    ]);
  });

  it("filters attendance memos by selected class and protects secret memo content", () => {
    const store = createDefaultFamilyOpenStore();
    store.attendanceMemos = [
      {
        id: "memo-1",
        sessionDate: "2026-06-28",
        classId: "class-kindergarten",
        teacherId: "teacher-minji",
        note: "유치부 비밀",
        isSecret: true,
        savedAt: "2026-06-28T20:00:00.000Z",
      },
      {
        id: "memo-2",
        sessionDate: "2026-06-28",
        classId: "class-elementary",
        teacherId: "teacher-daniel",
        note: "초등부 일반",
        isSecret: false,
        savedAt: "2026-06-28T21:00:00.000Z",
      },
    ];

    expect(getAttendanceMemosForView(store, "2026-06-28", "class-kindergarten").map((memo) => memo.id)).toEqual([
      "memo-1",
    ]);
    expect(getAttendanceMemosForView(store, "2026-06-28").map((memo) => memo.id)).toEqual(["memo-2", "memo-1"]);
    expect(canViewAttendanceMemo(store.attendanceMemos[0], "teacher-daniel", false)).toBe(false);
    expect(canViewAttendanceMemo(store.attendanceMemos[0], "teacher-minji", false)).toBe(true);
    expect(canViewAttendanceMemo(store.attendanceMemos[0], "teacher-daniel", true)).toBe(true);
    expect(canCreateSecretAttendanceMemo(store, "class-kindergarten", "teacher-minji")).toBe(true);
    expect(canCreateSecretAttendanceMemo(store, "class-kindergarten", "teacher-daniel")).toBe(false);
  });

  it("returns every attendance memo newest first without mutating the store", () => {
    const store = createDefaultFamilyOpenStore();
    store.attendanceMemos = [
      {
        id: "memo-middle",
        sessionDate: "2026-06-28",
        note: "중간",
        isSecret: false,
        savedAt: "2026-06-28T20:00:00.000Z",
      },
      {
        id: "memo-oldest",
        sessionDate: "2026-06-21",
        note: "예전",
        isSecret: false,
        savedAt: "2026-06-21T20:00:00.000Z",
      },
      {
        id: "memo-newest",
        sessionDate: "2026-07-05",
        note: "최신",
        isSecret: true,
        savedAt: "2026-07-05T20:00:00.000Z",
      },
    ];

    expect(getAllAttendanceMemosLatestFirst(store).map((memo) => memo.id)).toEqual([
      "memo-newest",
      "memo-middle",
      "memo-oldest",
    ]);
    expect(store.attendanceMemos.map((memo) => memo.id)).toEqual(["memo-middle", "memo-oldest", "memo-newest"]);
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

  it("sorts attendance roster children by class for all classes and by name for a selected class", () => {
    const store = createDefaultFamilyOpenStore();
    const children = [
      { ...store.children[1], name: "하준", classId: "class-kindergarten" },
      { ...store.children[2], name: "가은", classId: "class-elementary" },
      { ...store.children[0], name: "나래", classId: "class-kindergarten" },
    ];
    const attendanceStore = { ...store, children };

    expect(getAttendanceRosterChildren(attendanceStore, "class-kindergarten").map((child) => child.name)).toEqual([
      "나래",
      "하준",
    ]);
    expect(getAttendanceRosterChildren(attendanceStore).map((child) => child.name)).toEqual([
      "나래",
      "하준",
      "가은",
    ]);
  });
});
