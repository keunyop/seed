"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createEmptyFamilyOpenStore } from "@/lib/family/default-store";
import { isValidBirthMonthDay, parseBirthDateParts } from "@/lib/family/stats";
import { LEGACY_LOCAL_STORE_KEY } from "@/lib/family/store-persistence";
import {
  saveAttendanceMemoToSupabase,
  saveAttendanceRecordNoteToSupabase,
  saveAttendanceRecordToSupabase,
  saveChildPhotoToSupabase,
  loadFamilyOpenStoreFromSupabase,
  setAttendanceMemoAcknowledgementInSupabase,
  saveAttendanceSessionToSupabase,
  saveFamilyOpenStoreToSupabase,
} from "@/lib/family/supabase-store";
import { getDataUrlByteSize, PHOTO_DATA_URL_MAX_BYTES } from "@/lib/family/photo-data-url";
import type {
  AttendanceMemo,
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
  ChildGender,
  FamilyChild,
  FamilyOpenStore,
  ParentContact,
  ParentRelation,
} from "@/lib/family/types";

type SaveState = "idle" | "loading" | "saved" | "error";
type SaveResult = { ok: boolean; message: string };

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
  isAdmin?: boolean;
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

type SaveAttendanceMemoInput = {
  sessionDate: string;
  classId?: string;
  teacherId: string;
  note: string;
  isSecret: boolean;
};

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}`;
}

function createUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const value = Math.floor(Math.random() * 16);
    const nibble = character === "x" ? value : (value & 0x3) | 0x8;
    return nibble.toString(16);
  });
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

function cloneAttendanceRecords(records: AttendanceSession["records"]) {
  return Object.fromEntries(
    Object.entries(records).map(([childId, record]) => [
      childId,
      { status: record.status, qtCompleted: record.qtCompleted, note: record.note } satisfies AttendanceRecord,
    ]),
  );
}

function useFamilyOpenStoreState() {
  const [store, setStore] = useState<FamilyOpenStore>(() => createEmptyFamilyOpenStore());
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [isReady, setIsReady] = useState(false);
  const saveRequestIdRef = useRef(0);

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

  const runRemoteSave = useCallback(async (operation: () => Promise<SaveResult>) => {
    const requestId = saveRequestIdRef.current + 1;
    saveRequestIdRef.current = requestId;
    setSaveState("loading");

    let result: SaveResult;
    try {
      result = await operation();
    } catch {
      result = { ok: false, message: "네트워크 연결을 확인한 뒤 다시 저장해 주세요." };
    }

    if (saveRequestIdRef.current === requestId) {
      setSaveState(result.ok ? "saved" : "error");
    }

    return result;
  }, []);

  const saveStore = useCallback(
    (nextStore: FamilyOpenStore) => {
      void runRemoteSave(() => saveFamilyOpenStoreToSupabase(nextStore));
    },
    [runRemoteSave],
  );

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
      const hasActiveAdmin = store.teachers.some((teacher) => teacher.isActive && teacher.isAdmin);
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
            isAdmin: input.isAdmin ?? !hasActiveAdmin,
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

      const nextIsAdmin = input.isAdmin ?? currentTeacher.isAdmin;
      const activeAdminCount = store.teachers.filter((teacher) => teacher.isActive && teacher.isAdmin).length;
      if (currentTeacher.isAdmin && !nextIsAdmin && activeAdminCount <= 1) {
        return { ok: false, message: "관리자는 최소 1명 이상 필요합니다." };
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
                isAdmin: nextIsAdmin,
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

      const activeAdminCount = store.teachers.filter((teacher) => teacher.isActive && teacher.isAdmin).length;
      if (currentTeacher.isAdmin && activeAdminCount <= 1) {
        return { ok: false, message: "관리자는 최소 1명 이상 필요합니다." };
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

  const saveChildPhoto = useCallback(
    async (childId: string, photoDataUrl: string) => {
      const currentChild = store.children.find((child) => child.id === childId && child.isActive);
      if (!currentChild) {
        return { ok: false, message: "아이 정보를 찾을 수 없습니다." };
      }

      if (!photoDataUrl.startsWith("data:image/") || getDataUrlByteSize(photoDataUrl) > PHOTO_DATA_URL_MAX_BYTES) {
        return { ok: false, message: "사진 형식이나 크기를 확인한 뒤 다시 선택해 주세요." };
      }

      const result = await runRemoteSave(() => saveChildPhotoToSupabase(childId, photoDataUrl));
      if (!result.ok) {
        return result;
      }

      setStore((current) => ({
        ...current,
        children: current.children.map((child) =>
          child.id === childId ? { ...child, photoDataUrl } : child,
        ),
      }));

      return result;
    },
    [runRemoteSave, store.children],
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
                [childId]: { status, qtCompleted, note: session.records[childId]?.note },
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
            note: records[childId]?.note,
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

  const saveAttendanceRecord = useCallback(
    async (sessionDate: string, childId: string, record: AttendanceRecord) => {
      const savedAt = new Date().toISOString();
      const nextRecord: AttendanceRecord = {
        status: record.status,
        qtCompleted: record.qtCompleted,
      };
      const result = await runRemoteSave(() =>
        saveAttendanceRecordToSupabase(sessionDate, childId, nextRecord, savedAt),
      );

      if (!result.ok) {
        return result;
      }

      setStore((current) => {
        const session = current.attendanceByDate[sessionDate] ?? {
          sessionDate,
          records: {},
          note: "",
          shareWithPastor: false,
          savedAt: "",
        };

        return {
          ...current,
          attendanceByDate: {
            ...current.attendanceByDate,
            [sessionDate]: {
              ...session,
              savedAt,
              records: {
                ...session.records,
                [childId]: nextRecord,
              },
            },
          },
        };
      });

      return result;
    },
    [runRemoteSave],
  );

  const saveAttendanceRecordNote = useCallback(
    async (sessionDate: string, childId: string, value: string) => {
      if (!store.children.some((child) => child.id === childId && child.isActive)) {
        return { ok: false, message: "아이 정보를 찾을 수 없습니다." };
      }

      const note = value.trim();
      if (note.length > 100) {
        return { ok: false, message: "아이 메모는 100자 이내로 입력해 주세요." };
      }

      const savedAt = new Date().toISOString();
      const result = await runRemoteSave(() =>
        saveAttendanceRecordNoteToSupabase(sessionDate, childId, note, savedAt),
      );

      if (!result.ok) {
        return result;
      }

      setStore((current) => {
        const session = current.attendanceByDate[sessionDate] ?? {
          sessionDate,
          records: {},
          note: "",
          shareWithPastor: false,
          savedAt: "",
        };
        const currentRecord = session.records[childId] ?? { qtCompleted: false };

        return {
          ...current,
          attendanceByDate: {
            ...current.attendanceByDate,
            [sessionDate]: {
              ...session,
              savedAt,
              records: {
                ...session.records,
                [childId]: { ...currentRecord, note: note || undefined },
              },
            },
          },
        };
      });

      return result;
    },
    [runRemoteSave, store.children],
  );

  const saveAttendanceMemo = useCallback(
    async (input: SaveAttendanceMemoInput) => {
      const note = input.note.trim();
      if (!note) {
        return { ok: false, message: "메모 내용을 입력해 주세요." };
      }

      if (!store.teachers.some((teacher) => teacher.id === input.teacherId && teacher.isActive)) {
        return { ok: false, message: "로그인한 선생님 정보를 찾을 수 없습니다." };
      }

      if (input.classId && !store.classes.some((item) => item.id === input.classId)) {
        return { ok: false, message: "반을 선택해 주세요." };
      }

      const savedAt = new Date().toISOString();
      const nextMemo: AttendanceMemo = {
        id: createUuid(),
        sessionDate: input.sessionDate,
        classId: input.classId,
        teacherId: input.teacherId,
        note,
        isSecret: input.isSecret,
        savedAt,
      };
      const result = await runRemoteSave(() => saveAttendanceMemoToSupabase(nextMemo));

      if (!result.ok) {
        return result;
      }

      setStore((current) => ({
        ...current,
        attendanceMemos: [nextMemo, ...current.attendanceMemos],
      }));

      return result;
    },
    [runRemoteSave, store.classes, store.teachers],
  );

  const setAttendanceMemoAcknowledged = useCallback(
    async (memoId: string, acknowledged: boolean, teacherId: string) => {
      if (!store.attendanceMemos.some((memo) => memo.id === memoId)) {
        return { ok: false, message: "메모를 찾을 수 없습니다." };
      }

      if (
        !store.teachers.some(
          (teacher) => teacher.id === teacherId && teacher.isActive && teacher.isAdmin,
        )
      ) {
        return { ok: false, message: "관리자만 메모를 확인 처리할 수 있습니다." };
      }

      const acknowledgedAt = acknowledged ? new Date().toISOString() : undefined;
      const acknowledgedByTeacherId = acknowledged ? teacherId : undefined;
      const result = await runRemoteSave(() =>
        setAttendanceMemoAcknowledgementInSupabase(
          memoId,
          acknowledgedAt,
          acknowledgedByTeacherId,
        ),
      );

      if (!result.ok) {
        return result;
      }

      setStore((current) => ({
        ...current,
        attendanceMemos: current.attendanceMemos.map((memo) =>
          memo.id === memoId
            ? { ...memo, acknowledgedAt, acknowledgedByTeacherId }
            : memo,
        ),
      }));

      return result;
    },
    [runRemoteSave, store.attendanceMemos, store.teachers],
  );

  const saveAttendanceSession = useCallback(
    async (
      sessionDate: string,
      records: FamilyOpenStore["attendanceByDate"][string]["records"],
      note: string,
      shareWithPastor: boolean,
    ) => {
      const nextSession: AttendanceSession = {
        sessionDate,
        records: cloneAttendanceRecords(records),
        note,
        shareWithPastor,
        savedAt: new Date().toISOString(),
      };
      const result = await runRemoteSave(() => saveAttendanceSessionToSupabase(nextSession));

      if (!result.ok) {
        return result;
      }

      setStore((current) => {
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
              ...nextSession,
            },
          },
        };
      });

      return result;
    },
    [runRemoteSave],
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
      saveChildPhoto,
      updateClass,
      updateTeacher,
      deleteChild,
      deleteClass,
      deleteTeacher,
      setAttendanceRecord,
      setAllAttendance,
      setSessionNote,
      saveAttendanceRecord,
      saveAttendanceRecordNote,
      saveAttendanceMemo,
      setAttendanceMemoAcknowledged,
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
      saveAttendanceMemo,
      saveAttendanceRecord,
      saveAttendanceRecordNote,
      setAttendanceMemoAcknowledged,
      saveAttendanceSession,
      saveState,
      setAllAttendance,
      setAttendanceRecord,
      setSessionNote,
      store,
      updateChild,
      saveChildPhoto,
      updateClass,
      updateTeacher,
    ],
  );
}

type FamilyOpenStoreContextValue = ReturnType<typeof useFamilyOpenStoreState>;

const FamilyOpenStoreContext = createContext<FamilyOpenStoreContextValue | null>(null);

export function FamilyOpenStoreProvider({ children }: { children: ReactNode }) {
  const value = useFamilyOpenStoreState();

  return createElement(FamilyOpenStoreContext.Provider, { value }, children);
}

export function useFamilyOpenStore() {
  const value = useContext(FamilyOpenStoreContext);

  if (!value) {
    throw new Error("useFamilyOpenStore must be used inside FamilyOpenStoreProvider");
  }

  return value;
}
