import type { FamilyOpenStore } from "@/lib/family/types";

export function createEmptyFamilyOpenStore(): FamilyOpenStore {
  return {
    version: 1,
    teachers: [],
    classes: [],
    children: [],
    attendanceByDate: {},
    attendanceMemos: [],
  };
}

export function createDefaultFamilyOpenStore(): FamilyOpenStore {
  return {
    version: 1,
    teachers: [
      {
        id: "teacher-minji",
        name: "김민지 선생님",
        birthDate: "1990-05-10",
        birthMonth: 5,
        birthDay: 10,
        phone: "",
        isAdmin: true,
        isActive: true,
      },
      {
        id: "teacher-daniel",
        name: "이대니엘 선생님",
        birthDate: "1988-11-18",
        birthMonth: 11,
        birthDay: 18,
        phone: "",
        isAdmin: false,
        isActive: true,
      },
    ],
    classes: [
      { id: "class-kindergarten", name: "테스트 1반", teacherId: "teacher-minji" },
      { id: "class-elementary", name: "테스트 2반", teacherId: "teacher-daniel" },
    ],
    children: [
      {
        id: "child-harin",
        name: "하린",
        classId: "class-kindergarten",
        gender: "female",
        birthDate: "2020-06-12",
        birthYear: 2020,
        birthMonth: 6,
        birthDay: 12,
        parents: [],
        registeredAt: "2026-06-23",
        isActive: true,
      },
      {
        id: "child-joon",
        name: "준",
        classId: "class-kindergarten",
        gender: "male",
        birthDate: "2019-09-03",
        birthYear: 2019,
        birthMonth: 9,
        birthDay: 3,
        parents: [],
        registeredAt: "2026-06-23",
        isActive: true,
      },
      {
        id: "child-yuna",
        name: "유나",
        classId: "class-elementary",
        gender: "female",
        birthDate: "2017-06-28",
        birthYear: 2017,
        birthMonth: 6,
        birthDay: 28,
        parents: [],
        registeredAt: "2026-06-23",
        isActive: true,
      },
    ],
    attendanceByDate: {},
    attendanceMemos: [],
  };
}
