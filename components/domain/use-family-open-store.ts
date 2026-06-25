"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createDefaultFamilyOpenStore, FAMILY_OPEN_STORAGE_KEY } from "@/lib/family/default-store";
import { isValidBirthMonthDay } from "@/lib/family/stats";
import type { AttendanceStatus, FamilyChild, FamilyOpenStore } from "@/lib/family/types";

type SaveState = "idle" | "loading" | "saved" | "error";

function readStoreFromBrowser(): FamilyOpenStore {
  if (typeof window === "undefined") {
    return createDefaultFamilyOpenStore();
  }

  const raw = window.localStorage.getItem(FAMILY_OPEN_STORAGE_KEY);
  if (!raw) {
    return createDefaultFamilyOpenStore();
  }

  try {
    const parsed = JSON.parse(raw) as FamilyOpenStore;
    if (parsed.version !== 1 || !Array.isArray(parsed.classes) || !Array.isArray(parsed.children)) {
      return createDefaultFamilyOpenStore();
    }

    return {
      ...createDefaultFamilyOpenStore(),
      ...parsed,
      attendanceByDate: parsed.attendanceByDate ?? {},
    };
  } catch {
    return createDefaultFamilyOpenStore();
  }
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}`;
}

export function useFamilyOpenStore() {
  const [store, setStore] = useState<FamilyOpenStore>(() => createDefaultFamilyOpenStore());
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setStore(readStoreFromBrowser());
      setSaveState("saved");
      setIsReady(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const persist = useCallback((nextStore: FamilyOpenStore) => {
    setStore(nextStore);
    setSaveState("saved");
    try {
      window.localStorage.setItem(FAMILY_OPEN_STORAGE_KEY, JSON.stringify(nextStore));
      setLastSavedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
    } catch {
      setSaveState("error");
    }
  }, []);

  const updateStore = useCallback(
    (recipe: (current: FamilyOpenStore) => FamilyOpenStore) => {
      setSaveState("loading");
      setStore((current) => {
        const nextStore = recipe(current);
        try {
          window.localStorage.setItem(FAMILY_OPEN_STORAGE_KEY, JSON.stringify(nextStore));
          setSaveState("saved");
          setLastSavedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
        } catch {
          setSaveState("error");
        }
        return nextStore;
      });
    },
    [],
  );

  const addChild = useCallback(
    (input: { name: string; classId: string; birthMonth: number; birthDay: number }) => {
      const name = input.name.trim();
      if (!name) {
        return { ok: false, message: "이름을 입력해 주세요." };
      }

      if (!isValidBirthMonthDay(input.birthMonth, input.birthDay)) {
        return { ok: false, message: "생일 월/일을 확인해 주세요." };
      }

      if (!store.classes.some((item) => item.id === input.classId)) {
        return { ok: false, message: "반을 선택해 주세요." };
      }

      const child: FamilyChild = {
        id: createId("child"),
        name,
        classId: input.classId,
        birthMonth: input.birthMonth,
        birthDay: input.birthDay,
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

  return useMemo(
    () => ({
      store,
      saveState,
      isReady,
      lastSavedAt,
      addChild,
      setAttendanceRecord,
      setAllAttendance,
      setSessionNote,
    }),
    [addChild, isReady, lastSavedAt, saveState, setAllAttendance, setAttendanceRecord, setSessionNote, store],
  );
}
