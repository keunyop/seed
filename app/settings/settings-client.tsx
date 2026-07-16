"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Plus, Settings, Trash2, UsersRound, X } from "lucide-react";
import { useFamilyOpenStore } from "@/components/domain/use-family-open-store";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { PressableButton } from "@/components/ui/pressable-button";
import { getActiveTeachersByName, getTeacherName } from "@/lib/family/stats";
import type { FamilyClass, FamilyOpenStore } from "@/lib/family/types";

type ClassDetailModalProps = {
  store: FamilyOpenStore;
  isReady: boolean;
  familyClass: FamilyClass;
  onClose: () => void;
  onDelete?: () => { ok: boolean; message: string };
  onSubmit: (input: { name: string; teacherId: string }) => { ok: boolean; message: string };
};

function ClassDetailModal({ store, isReady, familyClass, onClose, onDelete, onSubmit }: ClassDetailModalProps) {
  const [name, setName] = useState(familyClass.name);
  const [teacherId, setTeacherId] = useState(familyClass.teacherId ?? "");
  const [error, setError] = useState("");
  const activeTeachers = useMemo(() => getActiveTeachersByName(store), [store]);
  const selectedTeacherId = store.teachers.some((teacher) => teacher.id === teacherId && teacher.isActive)
    ? teacherId
    : "";
  const title = `${familyClass.name} 수정`;

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = onSubmit({ name, teacherId: selectedTeacherId });
    setError(result.message);
    if (result.ok) {
      onClose();
    }
  }

  function handleDelete() {
    if (!onDelete) {
      return;
    }

    if (!window.confirm("반을 삭제할까요?")) {
      return;
    }

    const result = onDelete();
    setError(result.message);
    if (result.ok) {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-almost-black/40 sm:items-center sm:p-4">
      <section
        aria-labelledby="class-detail-title"
        aria-modal="true"
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[12px] bg-white p-4 sm:mx-auto sm:max-w-[520px] sm:rounded-[12px] sm:p-6"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading-ko text-2xl font-bold text-almost-black" id="class-detail-title">
            {title}
          </h2>
          <button
            aria-label={`${title} 닫기`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border-2 border-cloud-gray text-graphite"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-extrabold text-charcoal">반 이름</span>
            <input
              className="mt-2 min-h-12 w-full rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>
          <label className="block">
            <span className="text-sm font-extrabold text-charcoal">담임 선생님</span>
            <select
              className="mt-2 min-h-12 w-full rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
              onChange={(event) => setTeacherId(event.target.value)}
              value={selectedTeacherId}
            >
              <option value="">담임 미지정</option>
              {activeTeachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </label>
          {error ? (
            <p className="rounded-[12px] bg-[#ffe8e6] p-3 text-sm font-bold text-[#b3261e]" role="alert">
              {error}
            </p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              className="min-h-12 rounded-[12px] border-2 border-cloud-gray px-4 text-base font-extrabold text-graphite"
              onClick={onClose}
              type="button"
            >
              취소
            </button>
            <PressableButton disabled={!isReady} type="submit">
              반 저장
            </PressableButton>
          </div>

          {onDelete ? (
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] border-2 border-[#ffc3bd] bg-[#fff4f2] px-4 text-base font-extrabold text-[#b3261e]"
              disabled={!isReady}
              onClick={handleDelete}
              type="button"
            >
              <Trash2 aria-hidden="true" className="h-5 w-5" />
              반 삭제
            </button>
          ) : null}
        </form>
      </section>
    </div>
  );
}

export function SettingsClient() {
  const { store, isReady, addClass, updateClass, deleteClass } = useFamilyOpenStore();
  const [className, setClassName] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [selectedClass, setSelectedClass] = useState<FamilyClass | null>(null);
  const [error, setError] = useState("");
  const activeTeachers = useMemo(() => getActiveTeachersByName(store), [store]);
  const selectedTeacherId = store.teachers.some((teacher) => teacher.id === teacherId && teacher.isActive)
    ? teacherId
    : "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = addClass({ name: className, teacherId: selectedTeacherId });
    setError(result.message);
    if (result.ok) {
      setClassName("");
    }
  }

  return (
    <main className="min-h-dvh bg-white pb-[calc(88px+var(--safe-bottom))]">
      <div className="mx-auto w-full max-w-[720px] px-4 py-5 sm:px-6">
        <header className="rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-heading-ko text-3xl font-bold text-almost-black">설정</h1>
          </div>
        </header>

        <section className="mt-4 rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-almost-black">
            <Settings aria-hidden="true" className="h-5 w-5 text-sky-blue-text" />반 등록
          </h2>
          <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-extrabold text-charcoal">반 이름</span>
              <input
                className="mt-2 min-h-12 w-full rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
                onChange={(event) => setClassName(event.target.value)}
                value={className}
              />
            </label>
            <label className="block">
              <span className="text-sm font-extrabold text-charcoal">담임 선생님</span>
              <select
                className="mt-2 min-h-12 w-full rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
                onChange={(event) => setTeacherId(event.target.value)}
                value={selectedTeacherId}
              >
                <option value="">담임 미지정</option>
                {activeTeachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
            {error ? (
              <p className="rounded-[12px] bg-[#ffe8e6] p-3 text-sm font-bold text-[#b3261e]" role="alert">
                {error}
              </p>
            ) : null}
            <PressableButton disabled={!isReady} type="submit">
              <Plus aria-hidden="true" className="h-5 w-5" />반 등록
            </PressableButton>
          </form>
        </section>

        <section className="mt-4 rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-almost-black">
            <UsersRound aria-hidden="true" className="h-5 w-5 text-sky-blue-text" />
            등록된 반
          </h2>
          <div className="mt-4 grid gap-3">
            {!isReady ? (
              <div className="rounded-[12px] border-2 border-cloud-gray p-4" role="status">
                <p className="font-bold text-graphite">반 정보를 불러오는 중입니다.</p>
              </div>
            ) : store.classes.length === 0 ? (
              <div className="rounded-[12px] bg-duo-green-light p-4">
                <p className="font-bold text-almost-black">등록된 반이 없습니다.</p>
              </div>
            ) : store.classes.map((item) => (
              <button
                aria-label={`${item.name} 상세정보 열기`}
                className="rounded-[12px] border-2 border-cloud-gray p-4 text-left transition-colors hover:border-sky-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-blue-text disabled:opacity-60"
                disabled={!isReady}
                key={item.id}
                onClick={() => setSelectedClass(item)}
                type="button"
              >
                <h3 className="text-lg font-extrabold text-almost-black">{item.name}</h3>
                <p className="mt-1 text-sm font-bold text-graphite">{getTeacherName(store, item.teacherId)}</p>
              </button>
            ))}
          </div>
        </section>
      </div>

      {selectedClass ? (
        <ClassDetailModal
          familyClass={selectedClass}
          isReady={isReady}
          onClose={() => setSelectedClass(null)}
          onDelete={() => deleteClass(selectedClass.id)}
          onSubmit={(input) => updateClass({ ...input, id: selectedClass.id })}
          store={store}
        />
      ) : null}

      <BottomNavigation active="settings" />
    </main>
  );
}
