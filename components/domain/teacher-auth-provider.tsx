"use client";

import type { FormEvent, ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { LockKeyhole, UserRoundCheck } from "lucide-react";
import { useFamilyOpenStore } from "@/components/domain/use-family-open-store";
import { PressableButton } from "@/components/ui/pressable-button";
import { sortTeachersByName } from "@/lib/family/stats";
import type { FamilyTeacher } from "@/lib/family/types";
import { MINISTRY_GROUPS, getMinistryGroupLabel, type MinistryGroup } from '@/lib/family/ministry-group';

const TEACHER_AUTH_STORAGE_KEY = "seed-current-teacher-v1";

type TeacherAuthContextValue = {
  currentTeacher?: FamilyTeacher;
  currentTeacherId?: string;
  isAdmin: boolean;
  isAuthenticated: boolean;
  logout: () => void;
};

const TeacherAuthContext = createContext<TeacherAuthContextValue | null>(null);

function getTeacherAuthStorageKey(ministryGroup: MinistryGroup) {
  return `${TEACHER_AUTH_STORAGE_KEY}:${ministryGroup}`;
}

function readCachedTeacherId(ministryGroup: MinistryGroup) {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const scopedTeacherId = window.localStorage.getItem(getTeacherAuthStorageKey(ministryGroup));
    if (scopedTeacherId) {
      return scopedTeacherId;
    }

    return ministryGroup === 'elementary'
      ? window.localStorage.getItem(TEACHER_AUTH_STORAGE_KEY) ?? ''
      : '';
  } catch {
    return "";
  }
}

function writeCachedTeacherId(ministryGroup: MinistryGroup, teacherId: string) {
  try {
    window.localStorage.setItem(getTeacherAuthStorageKey(ministryGroup), teacherId);
    if (ministryGroup === 'elementary') {
      window.localStorage.removeItem(TEACHER_AUTH_STORAGE_KEY);
    }
    window.dispatchEvent(new Event("seed-teacher-auth-change"));
  } catch {
    // Login still works for the current tab when storage is unavailable.
  }
}

function removeCachedTeacherId(ministryGroup: MinistryGroup) {
  try {
    window.localStorage.removeItem(getTeacherAuthStorageKey(ministryGroup));
    if (ministryGroup === 'elementary') {
      window.localStorage.removeItem(TEACHER_AUTH_STORAGE_KEY);
    }
    window.dispatchEvent(new Event("seed-teacher-auth-change"));
  } catch {
    // Storage access can be blocked by browser settings.
  }
}

function subscribeTeacherAuth(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", callback);
  window.addEventListener("seed-teacher-auth-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("seed-teacher-auth-change", callback);
  };
}

function getEffectiveAdminState(teacher: FamilyTeacher | undefined, activeTeachers: FamilyTeacher[]) {
  if (!teacher) {
    return false;
  }

  if (teacher.isAdmin) {
    return true;
  }

  const hasActiveAdmin = activeTeachers.some((item) => item.isAdmin);
  return !hasActiveAdmin && activeTeachers[0]?.id === teacher.id;
}

function TeacherLoginModal({
  activeTeachers,
  isReady,
  ministryGroup,
  onLogin,
  onMinistryGroupChange,
}: {
  activeTeachers: FamilyTeacher[];
  isReady: boolean;
  ministryGroup: MinistryGroup;
  onLogin: (teacherId: string) => { ok: boolean; message: string };
  onMinistryGroupChange: (group: MinistryGroup) => void;
}) {
  const [teacherId, setTeacherId] = useState(activeTeachers[0]?.id ?? "");
  const [error, setError] = useState("");
  const selectedTeacherId = activeTeachers.some((teacher) => teacher.id === teacherId)
    ? teacherId
    : activeTeachers[0]?.id ?? "";

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = onLogin(selectedTeacherId);
    setError(result.message);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-almost-black/50 sm:items-center sm:p-4">
      <section
        aria-labelledby="teacher-login-title"
        aria-modal="true"
        className="w-full rounded-t-[12px] bg-white p-4 sm:mx-auto sm:max-w-[420px] sm:rounded-[12px] sm:p-6"
        role="dialog"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] bg-duo-green-light text-duo-green-dark">
            <LockKeyhole aria-hidden="true" className="h-6 w-6" />
          </span>
          <div>
            <h2 className="font-heading-ko text-2xl font-bold text-almost-black" id="teacher-login-title">
              선생님 로그인
            </h2>
            <p className="mt-1 text-sm font-bold text-graphite">부서와 선생님을 선택해 주세요.</p>
          </div>
        </div>

        <div
          aria-label="로그인 부서 선택"
          className="mt-5 grid grid-cols-2 rounded-[12px] bg-cloud-gray p-1"
          role="group"
        >
          {MINISTRY_GROUPS.map((group) => {
            const isSelected = ministryGroup === group;

            return (
              <button
                aria-pressed={isSelected}
                className={`min-h-11 rounded-[9px] px-3 text-sm font-extrabold transition-colors ${
                  isSelected
                    ? "bg-white text-duo-green-dark shadow-sm"
                    : "text-graphite hover:text-almost-black"
                }`}
                key={group}
                onClick={() => {
                  setError("");
                  onMinistryGroupChange(group);
                }}
                type="button"
              >
                {getMinistryGroupLabel(group)}
              </button>
            );
          })}
        </div>

        {!isReady ? (
          <div className="mt-4 rounded-[12px] border-2 border-cloud-gray p-4 text-sm font-extrabold text-graphite">
            선생님 목록을 불러오는 중입니다.
          </div>
        ) : null}

        {isReady && activeTeachers.length === 0 ? (
          <div className="mt-4 rounded-[12px] border-2 border-cloud-gray p-4 text-sm font-extrabold text-graphite">
            등록된 선생님이 없습니다.
          </div>
        ) : null}

        {activeTeachers.length > 0 ? (
          <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-extrabold text-charcoal">선생님</span>
              <select
                className="mt-2 min-h-12 w-full rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
                disabled={!isReady}
                onChange={(event) => {
                  setTeacherId(event.target.value);
                  setError("");
                }}
                value={selectedTeacherId}
              >
                {activeTeachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-extrabold text-charcoal">비밀번호</span>
              <input
                className="mt-2 min-h-12 w-full rounded-[12px] border-2 border-cloud-gray bg-[#f7f7f7] px-3 text-base font-bold text-graphite"
                disabled
                placeholder="비밀번호 없이 로그인"
                type="password"
                value=""
              />
            </label>
            {error ? (
              <p className="rounded-[12px] bg-[#ffe8e6] p-3 text-sm font-bold text-[#b3261e]" role="alert">
                {error}
              </p>
            ) : null}
            <PressableButton className="w-full" disabled={!isReady || !selectedTeacherId} type="submit">
              <UserRoundCheck aria-hidden="true" className="h-5 w-5" />
              로그인
            </PressableButton>
          </form>
        ) : null}
      </section>
    </div>
  );
}

export function TeacherAuthProvider({ children }: { children: ReactNode }) {
  const { store, isReady, ministryGroup, setMinistryGroup } = useFamilyOpenStore();
  const readCurrentGroupTeacherId = useCallback(
    () => readCachedTeacherId(ministryGroup),
    [ministryGroup],
  );
  const storedTeacherId = useSyncExternalStore(subscribeTeacherAuth, readCurrentGroupTeacherId, () => "");
  const [sessionTeacher, setSessionTeacher] = useState<{ ministryGroup: MinistryGroup; teacherId: string } | null>(null);
  const [loginFlowGroup, setLoginFlowGroup] = useState<MinistryGroup | null>(null);
  const sessionTeacherId = sessionTeacher?.ministryGroup === ministryGroup ? sessionTeacher.teacherId : '';
  const cachedTeacherId = sessionTeacherId || storedTeacherId;
  const activeTeachersByStoreOrder = useMemo(
    () => store.teachers.filter((teacher) => teacher.isActive),
    [store.teachers],
  );
  const activeTeachers = useMemo(() => sortTeachersByName(activeTeachersByStoreOrder), [activeTeachersByStoreOrder]);
  const currentTeacher = activeTeachersByStoreOrder.find((teacher) => teacher.id === cachedTeacherId);
  const isAdmin = getEffectiveAdminState(currentTeacher, activeTeachersByStoreOrder);
  const hasTeachers = activeTeachersByStoreOrder.length > 0;
  const isAuthenticated = !hasTeachers || !!currentTeacher;
  const shouldBlock = isReady && hasTeachers && !currentTeacher;
  const shouldShowLogin = shouldBlock || loginFlowGroup === ministryGroup;

  const value = useMemo<TeacherAuthContextValue>(
    () => ({
      currentTeacher,
      currentTeacherId: currentTeacher?.id,
      isAdmin,
      isAuthenticated,
      logout: () => {
        removeCachedTeacherId(ministryGroup);
        setSessionTeacher(null);
      },
    }),
    [currentTeacher, isAdmin, isAuthenticated, ministryGroup],
  );

  function handleLogin(teacherId: string) {
    if (!activeTeachers.some((teacher) => teacher.id === teacherId)) {
      return { ok: false, message: "선생님을 선택해 주세요." };
    }

    writeCachedTeacherId(ministryGroup, teacherId);
    setSessionTeacher({ ministryGroup, teacherId });
    setLoginFlowGroup(null);
    return { ok: true, message: "" };
  }

  function handleLoginMinistryGroupChange(group: MinistryGroup) {
    setLoginFlowGroup(group);
    setMinistryGroup(group);
  }

  return (
    <TeacherAuthContext.Provider value={value}>
      <div aria-hidden={shouldShowLogin} className={shouldShowLogin ? "pointer-events-none select-none blur-[1px]" : undefined}>
        {children}
      </div>
      {shouldShowLogin ? (
        <TeacherLoginModal
          activeTeachers={activeTeachers}
          isReady={isReady}
          ministryGroup={ministryGroup}
          onLogin={handleLogin}
          onMinistryGroupChange={handleLoginMinistryGroupChange}
        />
      ) : null}
    </TeacherAuthContext.Provider>
  );
}

export function useTeacherAuth() {
  const value = useContext(TeacherAuthContext);

  if (!value) {
    throw new Error("useTeacherAuth must be used inside TeacherAuthProvider");
  }

  return value;
}
