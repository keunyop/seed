import type {
  AttendanceRecord,
  AttendanceSession,
  DashboardSummary,
  FamilyOpenStore,
} from "@/lib/family/types";

export function isValidBirthMonthDay(month: number, day: number) {
  if (!Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  if (month < 1 || month > 12 || day < 1) {
    return false;
  }

  return day <= new Date(Date.UTC(2024, month, 0)).getUTCDate();
}

export function getActiveChildren(store: FamilyOpenStore, classId?: string) {
  return store.children.filter((child) => child.isActive && (!classId || child.classId === classId));
}

export function createEmptySession(sessionDate: string): AttendanceSession {
  return {
    sessionDate,
    records: {},
    note: "",
    savedAt: "",
  };
}

export function getSession(store: FamilyOpenStore, sessionDate: string) {
  return store.attendanceByDate[sessionDate] ?? createEmptySession(sessionDate);
}

export function getChildRecord(session: AttendanceSession, childId: string): AttendanceRecord {
  return session.records[childId] ?? { status: "absent", qtCompleted: false };
}

export function getMonthlyBirthdays(store: FamilyOpenStore, month: number) {
  return getActiveChildren(store)
    .filter((child) => child.birthMonth === month)
    .sort((a, b) => a.birthDay - b.birthDay || a.name.localeCompare(b.name, "ko"));
}

export function getDashboardSummary(store: FamilyOpenStore, sessionDate: string, month: number): DashboardSummary {
  const activeChildren = getActiveChildren(store);
  const session = getSession(store, sessionDate);
  const monthPrefix = `${sessionDate.slice(0, 4)}-${String(month).padStart(2, "0")}`;
  const qtParticipantIds = new Set<string>();
  let monthlyQtCompletions = 0;

  for (const [date, item] of Object.entries(store.attendanceByDate)) {
    if (!date.startsWith(monthPrefix)) {
      continue;
    }

    for (const [childId, record] of Object.entries(item.records)) {
      if (record.qtCompleted) {
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
