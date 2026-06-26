import type {
  AttendanceRecord,
  AttendanceSession,
  DashboardSummary,
  FamilyOpenStore,
  MonthlyQtDetail,
  ParentRelation,
  WeeklyAttendanceDetail,
} from "@/lib/family/types";

function getClassName(store: FamilyOpenStore, classId: string) {
  return store.classes.find((item) => item.id === classId)?.name ?? "반 미지정";
}

export function getTeacherName(store: FamilyOpenStore, teacherId?: string) {
  if (!teacherId) {
    return "담임 미지정";
  }

  return store.teachers.find((teacher) => teacher.id === teacherId && teacher.isActive)?.name ?? "담임 미지정";
}

export function getClassLabel(store: FamilyOpenStore, classId: string) {
  const familyClass = store.classes.find((item) => item.id === classId);
  if (!familyClass) {
    return "반 미지정";
  }

  return `${familyClass.name} · ${getTeacherName(store, familyClass.teacherId)}`;
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

export function formatChildBirthDate(child: { birthDate?: string; birthYear?: number; birthMonth: number; birthDay: number }) {
  if (child.birthDate) {
    const parts = parseBirthDateParts(child.birthDate);
    if (parts) {
      return `${parts.year}년 ${parts.month}월 ${parts.day}일`;
    }
  }

  return child.birthYear
    ? `${child.birthYear}년 ${child.birthMonth}월 ${child.birthDay}일`
    : `${child.birthMonth}월 ${child.birthDay}일`;
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

export function getMonthlyBirthdays(store: FamilyOpenStore, month: number) {
  return getActiveChildren(store)
    .filter((child) => child.birthMonth === month)
    .sort(
      (a, b) =>
        a.birthDay - b.birthDay ||
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
