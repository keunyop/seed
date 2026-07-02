import { createEmptyFamilyOpenStore } from "@/lib/family/default-store";
import type { AttendanceMemo, FamilyOpenStore, FamilyTeacher } from "@/lib/family/types";

export const LEGACY_LOCAL_STORE_KEY = "seed-family-open-store-v1";

function normalizeTeachers(teachers: FamilyTeacher[]) {
  const normalizedTeachers = teachers.map((teacher) => ({
    ...teacher,
    isAdmin: teacher.isAdmin ?? false,
  }));
  const hasActiveAdmin = normalizedTeachers.some((teacher) => teacher.isActive && teacher.isAdmin);
  const firstActiveTeacherId = normalizedTeachers.find((teacher) => teacher.isActive)?.id;

  if (hasActiveAdmin || !firstActiveTeacherId) {
    return normalizedTeachers;
  }

  return normalizedTeachers.map((teacher) =>
    teacher.id === firstActiveTeacherId ? { ...teacher, isAdmin: true } : teacher,
  );
}

function normalizeAttendanceMemos(memos: AttendanceMemo[]) {
  return memos
    .filter((memo) => memo.id && memo.sessionDate && memo.note.trim())
    .map((memo) => ({
      ...memo,
      classId: memo.classId || undefined,
      teacherId: memo.teacherId || undefined,
      isSecret: memo.isSecret ?? false,
    }))
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function normalizeFamilyOpenStore(value: unknown): FamilyOpenStore {
  const defaults = createEmptyFamilyOpenStore();
  const parsed = value as Partial<FamilyOpenStore> | null;

  if (
    !parsed ||
    parsed.version !== 1 ||
    !Array.isArray(parsed.classes) ||
    !Array.isArray(parsed.children)
  ) {
    return defaults;
  }

  return {
    ...defaults,
    ...parsed,
    teachers: normalizeTeachers(Array.isArray(parsed.teachers) ? parsed.teachers : defaults.teachers),
    classes: (parsed.classes ?? defaults.classes).map((item, index) => ({
      ...item,
      teacherId: item.teacherId ?? defaults.classes[index]?.teacherId,
    })),
    children: (parsed.children ?? defaults.children).map((child) => ({
      ...child,
      parents: Array.isArray(child.parents)
        ? child.parents.map((parent) => ({
            ...parent,
            relation:
              parent.relation === "father" || parent.relation === "mother" || parent.relation === "other"
                ? parent.relation
                : "other",
          }))
        : [],
    })),
    attendanceByDate: Object.fromEntries(
      Object.entries(parsed.attendanceByDate ?? {}).map(([date, session]) => [
        date,
        {
          ...session,
          shareWithPastor: session.shareWithPastor ?? false,
        },
      ]),
    ),
    attendanceMemos: normalizeAttendanceMemos(
      Array.isArray(parsed.attendanceMemos) ? parsed.attendanceMemos : defaults.attendanceMemos,
    ),
  };
}
