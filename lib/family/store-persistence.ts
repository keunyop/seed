import { createDefaultFamilyOpenStore, FAMILY_OPEN_STORAGE_KEY } from "@/lib/family/default-store";
import type { FamilyOpenStore } from "@/lib/family/types";

export function normalizeFamilyOpenStore(value: unknown): FamilyOpenStore {
  const defaults = createDefaultFamilyOpenStore();
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
    teachers: Array.isArray(parsed.teachers) ? parsed.teachers : defaults.teachers,
    classes: (parsed.classes ?? defaults.classes).map((item, index) => ({
      ...item,
      teacherId: item.teacherId ?? defaults.classes[index]?.teacherId,
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
  };
}

export function readLocalFamilyOpenStore(): FamilyOpenStore {
  if (typeof window === "undefined") {
    return createDefaultFamilyOpenStore();
  }

  const raw = window.localStorage.getItem(FAMILY_OPEN_STORAGE_KEY);
  if (!raw) {
    return createDefaultFamilyOpenStore();
  }

  try {
    return normalizeFamilyOpenStore(JSON.parse(raw));
  } catch {
    return createDefaultFamilyOpenStore();
  }
}

export function writeLocalFamilyOpenStore(store: FamilyOpenStore) {
  window.localStorage.setItem(FAMILY_OPEN_STORAGE_KEY, JSON.stringify(store));
}
