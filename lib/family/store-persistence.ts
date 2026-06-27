import { createEmptyFamilyOpenStore } from "@/lib/family/default-store";
import type { FamilyOpenStore } from "@/lib/family/types";

export const LEGACY_LOCAL_STORE_KEY = "seed-family-open-store-v1";

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
    teachers: Array.isArray(parsed.teachers) ? parsed.teachers : defaults.teachers,
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
  };
}
