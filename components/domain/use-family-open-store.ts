"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createEmptyFamilyOpenStore } from "@/lib/family/default-store";
import { isValidBirthMonthDay, parseBirthDateParts } from "@/lib/family/stats";
import { LEGACY_LOCAL_STORE_KEY } from "@/lib/family/store-persistence";
import { loadFamilyOpenStoreFromSupabase, saveFamilyOpenStoreToSupabase } from "@/lib/family/supabase-store";
import type {
  AttendanceStatus,
  ChildGender,
  FamilyChild,
  FamilyOpenStore,
  ParentContact,
  ParentRelation,
} from "@/lib/family/types";

type SaveState = "idle" | "loading" | "saved" | "error";

type ParentInput = {
  id?: string;
  relation?: ParentRelation;
  name: string;
  phone: string;
};

type AddChildInput = {
  name: string;
  classId: string;
  birthDate?: string;
  birthMonth?: number;
  birthDay?: number;
  photoDataUrl?: string;
  gender?: ChildGender;
  parents?: ParentInput[];
  address?: string;
  email?: string;
  registeredAt?: string;
  notes?: string;
};

type UpdateChildInput = AddChildInput & {
  id: string;
};

type TeacherInput = {
  name: string;
  birthMonth: number;
  birthDay: number;
  classId: string;
  phone?: string;
  photoDataUrl?: string;
};

type AddTeacherInput = TeacherInput;

type UpdateTeacherInput = TeacherInput & {
  id: string;
};

type UpdateClassInput = {
  id: string;
  name: string;
  teacherId: string;
};

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}`;
}

function getLocalIsoDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim() ?? "";
  return trimmed || undefined;
}

function normalizeMonthDay(month: number, day: number) {
  return {
    birthMonth: Number(month),
    birthDay: Number(day),
  };
}

function parseOptionalChildBirthDate(input?: { birthDate?: string; birthMonth?: number; birthDay?: number }) {
  const birthDate = input?.birthDate?.trim() ?? "";
  const parsedBirthDate = birthDate ? parseBirthDateParts(birthDate) : null;

  if (birthDate && !parsedBirthDate) {
    return { ok: false as const, message: "생년월일을 확인해 주세요." };
  }

  const birthMonth = parsedBirthDate?.month ?? input?.birthMonth;
  const birthDay = parsedBirthDate?.day ?? input?.birthDay;
  if ((birthMonth || birthDay) && !isValidBirthMonthDay(birthMonth ?? 0, birthDay ?? 0)) {
    return { ok: false as const, message: "생년월일을 확인해 주세요." };
  }

  return {
    ok: true as const,
    birthDate: birthDate || undefined,
    birthYear: parsedBirthDate?.year,
    birthMonth,
    birthDay,
  };
}

function removeLegacyLocalStore() {
  try {
    window.localStorage.removeItem(LEGACY_LOCAL_STORE_KEY);
  } catch {
    // Storage access can be blocked; Supabase remains the source of truth.
  }
}

export function useFamilyOpenStore() {
  const [store, setStore] = useState<FamilyOpenStore>(() => createEmptyFamilyOpenStore());
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadStore() {
      removeLegacyLocalStore();
      setSaveState("loading");

      const result = await loadFamilyOpenStoreFromSupabase();
      if (isCancelled) {
        return;
      }

      setStore(result.store);
      setSaveState(result.ok ? "saved" : "error");
      setIsReady(true);
    }

    void loadStore();

    return () => {
      isCancelled = true;
    };
  }, []);

  const saveStore = useCallback((nextStore: FamilyOpenStore) => {
    setSaveState("loading");
    void saveFamilyOpenStoreToSupabase(nextStore).then((result) => {
      setSaveState(result.ok ? "saved" : "error");
    });
  }, []);

  const persist = useCallback(
    (nextStore: FamilyOpenStore) => {
      setStore(nextStore);
      saveStore(nextStore);
    },
    [saveStore],
  );

  const updateStore = useCallback(
    (recipe: (current: FamilyOpenStore) => FamilyOpenStore) => {
      setStore((current) => {
        const nextStore = recipe(current);
        saveStore(nextStore);
        return nextStore;
      });
    },
    [saveStore],
  );

  const addChild = useCallback(
    (input: AddChildInput) => {
      const name = input.name.trim();
      if (!name) {
        return { ok: false, message: "아이 이름을 입력해 주세요." };
      }

      const birth = parseOptionalChildBirthDate(input);
      if (!birth.ok) {
        return { ok: false, message: birth.message };
      }

      if (input.classId && !store.classes.some((item) => item.id === input.classId)) {
        return { ok: false, message: "반을 선택해 주세요." };
      }

      const registeredAt = input.registeredAt?.trim() || getLocalIsoDate();
      if (!parseBirthDateParts(registeredAt)) {
        return { ok: false, message: "등록일을 확인해 주세요." };
      }

      const email = normalizeOptionalText(input.email);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, message: "이메일 형식을 확인해 주세요." };
      }

      const parents: ParentContact[] = (input.parents ?? [])
        .map((parent) => ({
          id: createId("parent"),
          relation: parent.relation ?? "other",
          name: parent.name.trim(),
          phone: parent.phone.trim(),
        }))
        .filter((parent) => parent.name || parent.phone);

      const child: FamilyChild = {
        id: createId("child"),
        name,
        classId: input.classId,
        photoDataUrl: normalizeOptionalText(input.photoDataUrl),
        gender: input.gender ?? "unspecified",
        birthDate: birth.birthDate,
        birthYear: birth.birthYear,
        birthMonth: birth.birthMonth,
        birthDay: birth.birthDay,
        parents,
        address: normalizeOptionalText(input.address),
        email,
        registeredAt,
        notes: normalizeOptionalText(input.notes),
        isActive: true,
      };

      persist({
        ...store,
        children: [...store.children, child],
      });

      return { ok: true, message: "" };
    },
    [persist, store],
  );

  const addTeacher = useCallback(
    (input: AddTeacherInput) => {
      const name = input.name.trim();
      const { birthMonth, birthDay } = normalizeMonthDay(input.birthMonth, input.birthDay);

      if (!name) {
        return { ok: false, message: "선생님 이름을 입력해 주세요." };
      }

      if (!isValidBirthMonthDay(birthMonth, birthDay)) {
        return { ok: false, message: "생일 월/일을 확인해 주세요." };
      }

      if (input.classId && !store.classes.some((item) => item.id === input.classId)) {
        return { ok: false, message: "반을 선택해 주세요." };
      }

      const teacherId = createId("teacher");
      persist({
        ...store,
        teachers: [
          ...store.teachers,
          {
            id: teacherId,
            name,
            photoDataUrl: normalizeOptionalText(input.photoDataUrl),
            birthDate: undefined,
            birthMonth,
            birthDay,
            phone: normalizeOptionalText(input.phone),
            isActive: true,
          },
        ],
        classes: store.classes.map((item) => (item.id === input.classId ? { ...item, teacherId } : item)),
      });

      return { ok: true, message: "" };
    },
    [persist, store],
  );

  const updateTeacher = useCallback(
    (input: UpdateTeacherInput) => {
      const name = input.name.trim();
      const { birthMonth, birthDay } = normalizeMonthDay(input.birthMonth, input.birthDay);
      const currentTeacher = store.teachers.find((teacher) => teacher.id === input.id && teacher.isActive);

      if (!currentTeacher) {
        return { ok: false, message: "선생님 정보를 찾을 수 없습니다." };
      }

      if (!name) {
        return { ok: false, message: "선생님 이름을 입력해 주세요." };
      }

      if (!isValidBirthMonthDay(birthMonth, birthDay)) {
        return { ok: false, message: "생일 월/일을 확인해 주세요." };
      }

      if (input.classId && !store.classes.some((item) => item.id === input.classId)) {
        return { ok: false, message: "반을 선택해 주세요." };
      }

      persist({
        ...store,
        teachers: store.teachers.map((teacher) =>
          teacher.id === input.id
            ? {
                ...teacher,
                name,
                photoDataUrl: normalizeOptionalText(input.photoDataUrl),
                birthDate: undefined,
                birthMonth,
                birthDay,
                phone: normalizeOptionalText(input.phone),
              }
            : teacher,
        ),
        classes: store.classes.map((item) => {
          if (item.id === input.classId) {
            return { ...item, teacherId: input.id };
          }

          if (item.teacherId === input.id) {
            return { ...item, teacherId: undefined };
          }

          return item;
        }),
      });

      return { ok: true, message: "" };
    },
    [persist, store],
  );

  const deleteTeacher = useCallback(
    (teacherId: string) => {
      const currentTeacher = store.teachers.find((teacher) => teacher.id === teacherId && teacher.isActive);
      if (!currentTeacher) {
        return { ok: false, message: "선생님 정보를 찾을 수 없습니다." };
      }

      persist({
        ...store,
        teachers: store.teachers.map((teacher) => (teacher.id === teacherId ? { ...teacher, isActive: false } : teacher)),
        classes: store.classes.map((item) => (item.teacherId === teacherId ? { ...item, teacherId: undefined } : item)),
      });

      return { ok: true, message: "" };
    },
    [persist, store],
  );

  const addClass = useCallback(
    (input: { name: string; teacherId: string }) => {
      const name = input.name.trim();
      if (!name) {
        return { ok: false, message: "반 이름을 입력해 주세요." };
      }

      const teacherId = normalizeOptionalText(input.teacherId);

      if (teacherId && !store.teachers.some((teacher) => teacher.id === teacherId && teacher.isActive)) {
        return { ok: false, message: "담임 선생님을 선택해 주세요." };
      }

      persist({
        ...store,
        classes: [...store.classes, { id: createId("class"), name, teacherId }],
      });

      return { ok: true, message: "" };
    },
    [persist, store],
  );

  const updateClass = useCallback(
    (input: UpdateClassInput) => {
      const name = input.name.trim();
      const currentClass = store.classes.find((item) => item.id === input.id);

      if (!currentClass) {
        return { ok: false, message: "반 정보를 찾을 수 없습니다." };
      }

      if (!name) {
        return { ok: false, message: "반 이름을 입력해 주세요." };
      }

      const teacherId = normalizeOptionalText(input.teacherId);

      if (teacherId && !store.teachers.some((teacher) => teacher.id === teacherId && teacher.isActive)) {
        return { ok: false, message: "담임 선생님을 선택해 주세요." };
      }

      persist({
        ...store,
        classes: store.classes.map((item) => (item.id === input.id ? { ...item, name, teacherId } : item)),
      });

      return { ok: true, message: "" };
    },
    [persist, store],
  );

  const deleteClass = useCallback(
    (classId: string) => {
      const currentClass = store.classes.find((item) => item.id === classId);

      if (!currentClass) {
        return { ok: false, message: "반 정보를 찾을 수 없습니다." };
      }

      persist({
        ...store,
        classes: store.classes.filter((item) => item.id !== classId),
        children: store.children.map((child) => (child.classId === classId ? { ...child, classId: "" } : child)),
      });

      return { ok: true, message: "" };
    },
    [persist, store],
  );

  const updateChild = useCallback(
    (input: UpdateChildInput) => {
      const name = input.name.trim();
      if (!name) {
        return { ok: false, message: "이름을 입력해 주세요." };
      }

      const currentChild = store.children.find((child) => child.id === input.id);
      if (!currentChild) {
        return { ok: false, message: "아이 정보를 찾을 수 없습니다." };
      }

      const birth = parseOptionalChildBirthDate(input);
      if (!birth.ok) {
        return { ok: false, message: birth.message };
      }

      if (input.classId && !store.classes.some((item) => item.id === input.classId)) {
        return { ok: false, message: "반을 선택해 주세요." };
      }

      const registeredAt = input.registeredAt?.trim() || currentChild.registeredAt || getLocalIsoDate();
      if (!parseBirthDateParts(registeredAt)) {
        return { ok: false, message: "등록일을 확인해 주세요." };
      }

      const email = normalizeOptionalText(input.email);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, message: "이메일 형식을 확인해 주세요." };
      }

      const parents: ParentContact[] = (input.parents ?? [])
        .map((parent) => ({
          id: parent.id ?? createId("parent"),
          relation: parent.relation ?? "other",
          name: parent.name.trim(),
          phone: parent.phone.trim(),
        }))
        .filter((parent) => parent.name || parent.phone);

      const updatedChild: FamilyChild = {
        ...currentChild,
        name,
        classId: input.classId,
        photoDataUrl: normalizeOptionalText(input.photoDataUrl),
        gender: input.gender ?? "unspecified",
        birthDate: birth.birthDate,
        birthYear: birth.birthYear,
        birthMonth: birth.birthMonth,
        birthDay: birth.birthDay,
        parents,
        address: normalizeOptionalText(input.address),
        email,
        registeredAt,
        notes: normalizeOptionalText(input.notes),
      };

      persist({
        ...store,
        children: store.children.map((child) => (child.id === input.id ? updatedChild : child)),
      });

      return { ok: true, message: "" };
    },
    [persist, store],
  );

  const deleteChild = useCallback(
    (childId: string) => {
      const currentChild = store.children.find((child) => child.id === childId && child.isActive);

      if (!currentChild) {
        return { ok: false, message: "아이 정보를 찾을 수 없습니다." };
      }

      persist({
        ...store,
        children: store.children.map((child) => (child.id === childId ? { ...child, isActive: false } : child)),
      });

      return { ok: true, message: "" };
    },
    [persist, store],
  );

  const setAttendanceRecord = useCallback(
    (sessionDate: string, childId: string, status: AttendanceStatus, qtCompleted: boolean) => {
      updateStore((current) => {
        const session = current.attendanceByDate[sessionDate] ?? {
          sessionDate,
          records: {},
          note: "",
          savedAt: "",
        };

        return {
          ...current,
          attendanceByDate: {
            ...current.attendanceByDate,
            [sessionDate]: {
              ...session,
              savedAt: new Date().toISOString(),
              records: {
                ...session.records,
                [childId]: { status, qtCompleted },
              },
            },
          },
        };
      });
    },
    [updateStore],
  );

  const setAllAttendance = useCallback(
    (sessionDate: string, childIds: string[], status: AttendanceStatus) => {
      updateStore((current) => {
        const session = current.attendanceByDate[sessionDate] ?? {
          sessionDate,
          records: {},
          note: "",
          savedAt: "",
        };
        const records = { ...session.records };

        childIds.forEach((childId) => {
          records[childId] = {
            status,
            qtCompleted: records[childId]?.qtCompleted ?? false,
          };
        });

        return {
          ...current,
          attendanceByDate: {
            ...current.attendanceByDate,
            [sessionDate]: {
              ...session,
              savedAt: new Date().toISOString(),
              records,
            },
          },
        };
      });
    },
    [updateStore],
  );

  const setSessionNote = useCallback(
    (sessionDate: string, note: string) => {
      updateStore((current) => {
        const session = current.attendanceByDate[sessionDate] ?? {
          sessionDate,
          records: {},
          note: "",
          savedAt: "",
        };

        return {
          ...current,
          attendanceByDate: {
            ...current.attendanceByDate,
            [sessionDate]: {
              ...session,
              note,
              savedAt: new Date().toISOString(),
            },
          },
        };
      });
    },
    [updateStore],
  );

  const saveAttendanceSession = useCallback(
    (
      sessionDate: string,
      records: FamilyOpenStore["attendanceByDate"][string]["records"],
      note: string,
      shareWithPastor: boolean,
    ) => {
      updateStore((current) => {
        const session = current.attendanceByDate[sessionDate] ?? {
          sessionDate,
          records: {},
          note: "",
          savedAt: "",
        };

        return {
          ...current,
          attendanceByDate: {
            ...current.attendanceByDate,
            [sessionDate]: {
              ...session,
              records,
              note,
              shareWithPastor,
              savedAt: new Date().toISOString(),
            },
          },
        };
      });
    },
    [updateStore],
  );

  return useMemo(
    () => ({
      store,
      saveState,
      isReady,
      addChild,
      addClass,
      addTeacher,
      updateChild,
      updateClass,
      updateTeacher,
      deleteChild,
      deleteClass,
      deleteTeacher,
      setAttendanceRecord,
      setAllAttendance,
      setSessionNote,
      saveAttendanceSession,
    }),
    [
      addChild,
      addClass,
      addTeacher,
      deleteChild,
      deleteClass,
      deleteTeacher,
      isReady,
      saveAttendanceSession,
      saveState,
      setAllAttendance,
      setAttendanceRecord,
      setSessionNote,
      store,
      updateChild,
      updateClass,
      updateTeacher,
    ],
  );
}
