import type { FamilyOpenStore } from "@/lib/family/types";

export const FAMILY_OPEN_STORAGE_KEY = "seed-family-open-store-v1";

export function createDefaultFamilyOpenStore(): FamilyOpenStore {
  return {
    version: 1,
    classes: [
      { id: "class-kindergarten", name: "유치부 믿음반" },
      { id: "class-elementary", name: "초등부 소망반" },
    ],
    children: [
      {
        id: "child-harin",
        name: "하린",
        classId: "class-kindergarten",
        birthMonth: 6,
        birthDay: 12,
        isActive: true,
      },
      {
        id: "child-joon",
        name: "준",
        classId: "class-kindergarten",
        birthMonth: 9,
        birthDay: 3,
        isActive: true,
      },
      {
        id: "child-yuna",
        name: "유나",
        classId: "class-elementary",
        birthMonth: 6,
        birthDay: 28,
        isActive: true,
      },
    ],
    attendanceByDate: {},
  };
}

