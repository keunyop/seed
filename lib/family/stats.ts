import type {
  AttendanceMemo,
  AttendanceRecord,
  AttendanceSession,
  DashboardSummary,
  FamilyChild,
  FamilyClass,
  FamilyOpenStore,
  MonthlyBirthdayBucket,
  MonthlyQtBucket,
  MonthlyQtDetail,
  ParentRelation,
  FamilyTeacher,
  WeeklyAttendanceBucket,
  WeeklyAttendanceDetail,
} from "@/lib/family/types";
import { getNearestWeekdayDate } from "@/lib/dates/service-week";

export type ChildrenSortMode = "name" | "class";

export const RECENT_ATTENDANCE_WEEK_COUNT = 8;

const koreanNameCollator = new Intl.Collator("ko-KR", { sensitivity: "base" });

function getClassName(store: FamilyOpenStore, classId: string) {
  return store.classes.find((item) => item.id === classId)?.name ?? "반 미지정";
}

export function compareKoreanNames(a: { name: string }, b: { name: string }) {
  return koreanNameCollator.compare(a.name, b.name);
}

export function sortTeachersByName(teachers: FamilyTeacher[]) {
  return [...teachers].sort(compareKoreanNames);
}

export function getActiveTeachersByName(store: FamilyOpenStore) {
  return sortTeachersByName(store.teachers.filter((teacher) => teacher.isActive));
}

export function getTeacherName(store: FamilyOpenStore, teacherId?: string) {
  if (!teacherId) {
    return "담임 미지정";
  }

  return store.teachers.find((teacher) => teacher.id === teacherId && teacher.isActive)?.name ?? "담임 미지정";
}

export function getTeacherNameOrUnknown(store: FamilyOpenStore, teacherId?: string) {
  if (!teacherId) {
    return "알 수 없는 선생님";
  }

  return store.teachers.find((teacher) => teacher.id === teacherId)?.name ?? "알 수 없는 선생님";
}

export function getClassLabel(store: FamilyOpenStore, classId: string) {
  const familyClass = store.classes.find((item) => item.id === classId);
  if (!familyClass) {
    return "반 미지정";
  }

  return `${familyClass.name} · ${getTeacherName(store, familyClass.teacherId)}`;
}

export function getClassNameOrAll(store: FamilyOpenStore, classId?: string) {
  if (!classId) {
    return "전체";
  }

  return store.classes.find((item) => item.id === classId)?.name ?? "반 미지정";
}

function compareChildrenByClassAndName(store: FamilyOpenStore) {
  return (a: { className?: string; child: { classId: string; name: string } }, b: { className?: string; child: { classId: string; name: string } }) => {
    const aClass = a.className ?? getClassName(store, a.child.classId);
    const bClass = b.className ?? getClassName(store, b.child.classId);
    return aClass.localeCompare(bClass, "ko") || a.child.name.localeCompare(b.child.name, "ko");
  };
}

export function isValidBirthMonthDay(month: number, day: number) {
  if (!Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  if (month < 1 || month > 12 || day < 1) {
    return false;
  }

  return day <= new Date(Date.UTC(2024, month, 0)).getUTCDate();
}

export function parseBirthDateParts(birthDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day ||
    date.getTime() > Date.now()
  ) {
    return null;
  }

  return { year, month, day };
}

export function formatChildBirthDate(child: { birthDate?: string; birthYear?: number; birthMonth?: number; birthDay?: number }) {
  if (child.birthDate) {
    const parts = parseBirthDateParts(child.birthDate);
    if (parts) {
      return `${parts.year}년 ${parts.month}월 ${parts.day}일`;
    }
  }

  if (child.birthMonth && child.birthDay) {
    return child.birthYear
      ? `${child.birthYear}년 ${child.birthMonth}월 ${child.birthDay}일`
      : `${child.birthMonth}월 ${child.birthDay}일`;
  }

  if (child.birthYear) {
    return `${child.birthYear}년 생일 미입력`;
  }

  return "생년월일 미입력";
}

export function formatTeacherBirthDate(teacher: { birthDate?: string; birthMonth?: number; birthDay?: number }) {
  if (teacher.birthDate) {
    const parts = parseBirthDateParts(teacher.birthDate);
    if (parts) {
      return `${parts.month}월 ${parts.day}일`;
    }
  }

  if (teacher.birthMonth && teacher.birthDay) {
    return `${teacher.birthMonth}월 ${teacher.birthDay}일`;
  }

  return "생일 미입력";
}

export function formatParentRelation(relation?: ParentRelation) {
  if (relation === "father") {
    return "아빠";
  }

  if (relation === "mother") {
    return "엄마";
  }

  return "기타";
}

export function getActiveChildren(store: FamilyOpenStore, classId?: string) {
  return store.children.filter((child) => child.isActive && (!classId || child.classId === classId));
}

export function getAttendanceRosterChildren(store: FamilyOpenStore, classId?: string) {
  return sortChildrenForRoster(getActiveChildren(store, classId), store.classes, classId ? "name" : "class");
}

export function sortChildrenForRoster(children: FamilyChild[], classes: FamilyClass[], sortMode: ChildrenSortMode) {
  const classOrder = new Map(classes.map((item, index) => [item.id, index]));
  const getClassOrder = (classId: string) => classOrder.get(classId) ?? Number.MAX_SAFE_INTEGER;

  return [...children].sort((a, b) => {
    if (sortMode === "class") {
      return getClassOrder(a.classId) - getClassOrder(b.classId) || a.name.localeCompare(b.name, "ko");
    }

    return a.name.localeCompare(b.name, "ko") || getClassOrder(a.classId) - getClassOrder(b.classId);
  });
}

export function createEmptySession(sessionDate: string): AttendanceSession {
  return {
    sessionDate,
    records: {},
    note: "",
    shareWithPastor: false,
    savedAt: "",
  };
}

export function getSession(store: FamilyOpenStore, sessionDate: string) {
  return store.attendanceByDate[sessionDate] ?? createEmptySession(sessionDate);
}

export function getChildRecord(session: AttendanceSession, childId: string): AttendanceRecord {
  return session.records[childId] ?? { qtCompleted: false };
}

export function getAttendanceMemosForView(store: FamilyOpenStore, sessionDate: string, classId?: string) {
  return sortAttendanceMemosLatestFirst(
    store.attendanceMemos
      .filter((memo) => memo.sessionDate === sessionDate)
      .filter((memo) => !classId || memo.classId === classId),
  );
}

function sortAttendanceMemosLatestFirst(memos: AttendanceMemo[]) {
  return [...memos].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function getAllAttendanceMemosLatestFirst(store: FamilyOpenStore) {
  return sortAttendanceMemosLatestFirst(store.attendanceMemos);
}

export function canViewAttendanceMemo(memo: AttendanceMemo, currentTeacherId?: string, isAdmin = false) {
  if (!memo.isSecret) {
    return true;
  }

  return isAdmin || (!!currentTeacherId && memo.teacherId === currentTeacherId);
}

export function canCreateSecretAttendanceMemo(
  store: FamilyOpenStore,
  classId: string | undefined,
  currentTeacherId?: string,
) {
  if (!classId || !currentTeacherId) {
    return false;
  }

  return store.classes.some((item) => item.id === classId && item.teacherId === currentTeacherId);
}

export function getMonthlyBirthdays(store: FamilyOpenStore, month: number) {
  return getActiveChildren(store)
    .filter((child) => child.birthMonth === month && child.birthDay)
    .sort(
      (a, b) =>
        (a.birthDay ?? 0) - (b.birthDay ?? 0) ||
        getClassName(store, a.classId).localeCompare(getClassName(store, b.classId), "ko") ||
        a.name.localeCompare(b.name, "ko"),
    );
}

export function getWeeklyAttendanceDetails(store: FamilyOpenStore, sessionDate: string): WeeklyAttendanceDetail[] {
  const session = getSession(store, sessionDate);
  return getActiveChildren(store)
    .map((child) => {
      const record = getChildRecord(session, child.id);
      return {
        child,
        className: getClassName(store, child.classId),
        status: record.status,
        qtCompleted: record.qtCompleted,
      };
    })
    .sort(compareChildrenByClassAndName(store));
}

export function getMonthlyQtDetails(store: FamilyOpenStore, sessionDate: string, month: number): MonthlyQtDetail[] {
  const monthPrefix = `${sessionDate.slice(0, 4)}-${String(month).padStart(2, "0")}`;
  const activeChildrenById = new Map(getActiveChildren(store).map((child) => [child.id, child]));
  const completionsByChildId = new Map<string, number>();

  for (const [date, item] of Object.entries(store.attendanceByDate)) {
    if (!date.startsWith(monthPrefix)) {
      continue;
    }

    for (const [childId, record] of Object.entries(item.records)) {
      if (!record.qtCompleted || !activeChildrenById.has(childId)) {
        continue;
      }

      completionsByChildId.set(childId, (completionsByChildId.get(childId) ?? 0) + 1);
    }
  }

  return Array.from(completionsByChildId.entries())
    .map(([childId, completions]) => {
      const child = activeChildrenById.get(childId);
      if (!child) {
        return null;
      }

      return {
        child,
        className: getClassName(store, child.classId),
        completions,
      };
    })
    .filter((item): item is MonthlyQtDetail => item !== null)
    .sort(compareChildrenByClassAndName(store));
}

function assertCalendarYear(year: number) {
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new Error("Year must be an integer from 1 to 9999.");
  }
}

function shiftIsoDate(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getRecentWeeklyAttendanceBuckets(
  store: FamilyOpenStore,
  referenceDate: string,
  weekCount = RECENT_ATTENDANCE_WEEK_COUNT,
): WeeklyAttendanceBucket[] {
  if (!Number.isInteger(weekCount) || weekCount < 1) {
    throw new Error("Week count must be a positive integer.");
  }

  const latestSunday = getNearestWeekdayDate(referenceDate, 0);

  return Array.from({ length: weekCount }, (_, index) => {
    const weeksBeforeLatest = weekCount - index - 1;
    const sessionDate = shiftIsoDate(latestSunday, weeksBeforeLatest * -7);
    const attendees = getWeeklyAttendanceDetails(store, sessionDate).filter((item) => item.status === "present");

    return {
      sessionDate,
      presentCount: attendees.length,
      attendees,
    };
  });
}

export function getYearlyQtBuckets(store: FamilyOpenStore, year: number): MonthlyQtBucket[] {
  assertCalendarYear(year);
  const yearDate = `${String(year).padStart(4, "0")}-01-01`;

  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const participants = getMonthlyQtDetails(store, yearDate, month);

    return {
      year,
      month,
      participantCount: participants.length,
      totalCompletions: participants.reduce((total, item) => total + item.completions, 0),
      participants,
    };
  });
}

export function getYearlyBirthdayBuckets(store: FamilyOpenStore, year: number): MonthlyBirthdayBucket[] {
  assertCalendarYear(year);

  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const children = getMonthlyBirthdays(store, month);

    return {
      year,
      month,
      birthdayCount: children.length,
      children,
    };
  });
}

export function getDashboardSummary(store: FamilyOpenStore, sessionDate: string, month: number): DashboardSummary {
  const activeChildren = getActiveChildren(store);
  const activeChildrenById = new Set(activeChildren.map((child) => child.id));
  const session = getSession(store, sessionDate);
  const monthPrefix = `${sessionDate.slice(0, 4)}-${String(month).padStart(2, "0")}`;
  const qtParticipantIds = new Set<string>();
  let monthlyQtCompletions = 0;

  for (const [date, item] of Object.entries(store.attendanceByDate)) {
    if (!date.startsWith(monthPrefix)) {
      continue;
    }

    for (const [childId, record] of Object.entries(item.records)) {
      if (record.qtCompleted && activeChildrenById.has(childId)) {
        qtParticipantIds.add(childId);
        monthlyQtCompletions += 1;
      }
    }
  }

  const weeklyPresentCount = activeChildren.filter((child) => getChildRecord(session, child.id).status === "present").length;

  return {
    activeChildrenCount: activeChildren.length,
    weeklyPresentCount,
    weeklyTotalCount: activeChildren.length,
    monthlyQtParticipants: qtParticipantIds.size,
    monthlyQtCompletions,
    monthlyBirthdays: getMonthlyBirthdays(store, month),
  };
}
