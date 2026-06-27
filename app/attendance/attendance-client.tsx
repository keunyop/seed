"use client";

import { Check, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { ChildAvatar } from "@/components/domain/child-avatar";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { ChildDetailModal } from "@/components/domain/child-detail-modal";
import { SaveStatus } from "@/components/domain/save-status";
import { useFamilyOpenStore } from "@/components/domain/use-family-open-store";
import { PressableButton } from "@/components/ui/pressable-button";
import { getNearestWeekdayDate } from "@/lib/dates/service-week";
import { getAttendanceRosterChildren, getChildRecord, getClassLabel, getSession } from "@/lib/family/stats";
import { cn } from "@/lib/utils";
import type { AttendanceRecord, FamilyChild } from "@/lib/family/types";

type AttendanceClientProps = {
  initialClassId?: string;
};

type AttendanceDraft = {
  sessionDate: string;
  sessionKey: string;
  records: Record<string, AttendanceRecord>;
  note: string;
  shareWithPastor: boolean;
  isDirty: boolean;
};

type AttendanceDraftState = {
  key: string;
  draft: AttendanceDraft;
};

const ALL_CLASSES_VALUE = "all";

function getLocalIsoDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function getToggleButtonClass(isPressed: boolean, tone: "present" | "qt") {
  const activeClass =
    tone === "present"
      ? "border-duo-green bg-duo-green text-almost-black shadow-[0_3px_0_#3f8f01]"
      : "border-sky-blue bg-sky-blue text-white shadow-[0_3px_0_#0b79b7]";
  const inactiveHoverClass =
    tone === "present"
      ? "hover:border-duo-green/60 hover:bg-duo-green-light/50"
      : "hover:border-sky-blue/60 hover:bg-sky-blue/10";

  return cn(
    "inline-flex min-h-12 items-center justify-center gap-1 rounded-[12px] border-2 px-3 text-sm font-extrabold transition-[background-color,border-color,box-shadow,transform,color] active:translate-y-[1px]",
    isPressed ? activeClass : "border-cloud-gray bg-[#f7f7f7] text-graphite",
    !isPressed && inactiveHoverClass,
  );
}

export function AttendanceClient({ initialClassId }: AttendanceClientProps) {
  const { store, saveState, isReady, saveAttendanceSession, updateChild, deleteChild } = useFamilyOpenStore();
  const [sessionDate, setSessionDate] = useState(() => getNearestWeekdayDate(getLocalIsoDate(), 0));
  const [classId, setClassId] = useState(initialClassId ?? ALL_CLASSES_VALUE);
  const [selectedChild, setSelectedChild] = useState<FamilyChild | null>(null);

  const selectedClassValue =
    classId === ALL_CLASSES_VALUE || store.classes.some((item) => item.id === classId) ? classId : ALL_CLASSES_VALUE;
  const selectedClassId = selectedClassValue === ALL_CLASSES_VALUE ? undefined : selectedClassValue;
  const children = useMemo(
    () => getAttendanceRosterChildren(store, selectedClassId),
    [selectedClassId, store],
  );
  const classNameById = useMemo(() => new Map(store.classes.map((item) => [item.id, item.name])), [store.classes]);
  const session = useMemo(() => getSession(store, sessionDate), [sessionDate, store]);
  const sessionKey = `${sessionDate}:${session.savedAt}`;
  const freshDraft = useMemo<AttendanceDraft>(() => ({
    sessionDate,
    sessionKey,
    records: session.records,
    note: session.note,
    shareWithPastor: session.shareWithPastor ?? false,
    isDirty: false,
  }), [session.records, session.note, session.shareWithPastor, sessionDate, sessionKey]);
  const [draftState, setDraftState] = useState<AttendanceDraftState>(() => ({ key: sessionKey, draft: freshDraft }));
  const activeDraft = draftState.key === sessionKey ? draftState.draft : freshDraft;

  function setActiveDraft(recipe: (current: AttendanceDraft) => AttendanceDraft) {
    setDraftState((current) => {
      const currentDraft = current.key === sessionKey ? current.draft : freshDraft;
      return { key: sessionKey, draft: recipe(currentDraft) };
    });
  }
  const presentCount = useMemo(
    () =>
      children.filter((child) => (activeDraft.records[child.id] ?? { qtCompleted: false }).status === "present")
        .length,
    [activeDraft.records, children],
  );
  const notPresentCount = children.length - presentCount;

  function updateDraftRecord(childId: string, recipe: (record: AttendanceRecord) => AttendanceRecord) {
    setActiveDraft((current) => ({
      ...current,
      records: {
        ...current.records,
        [childId]: recipe(current.records[childId] ?? { qtCompleted: false }),
      },
      isDirty: true,
    }));
  }

  function toggleDraftPresent(childId: string) {
    updateDraftRecord(childId, (record) => ({
      ...record,
      status: record.status === "present" ? undefined : "present",
    }));
  }

  function toggleDraftQt(childId: string) {
    updateDraftRecord(childId, (record) => ({
      ...record,
      qtCompleted: !record.qtCompleted,
    }));
  }

  function handleSaveAll() {
    saveAttendanceSession(sessionDate, activeDraft.records, activeDraft.note, activeDraft.shareWithPastor);
    setActiveDraft((current) => ({ ...current, isDirty: false }));
  }

  return (
    <main className="min-h-dvh bg-white pb-[calc(128px+var(--safe-bottom))]">
      <div className="mx-auto w-full max-w-[920px] px-4 py-5 sm:px-6">
        <header className="rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-heading-ko text-3xl font-bold text-almost-black">출석 체크</h1>
            </div>
            <SaveStatus state={saveState} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-extrabold text-charcoal">날짜</span>
              <input
                className="mt-2 min-h-12 w-full rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
                onChange={(event) => setSessionDate(event.target.value)}
                type="date"
                value={sessionDate}
              />
            </label>
            <label className="block">
              <span className="text-sm font-extrabold text-charcoal">반</span>
              <select
                className="mt-2 min-h-12 w-full rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
                onChange={(event) => setClassId(event.target.value)}
                value={selectedClassValue}
              >
                <option value={ALL_CLASSES_VALUE}>전체</option>
                {store.classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {getClassLabel(store, item.id)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        <div className="sticky bottom-[calc(76px+var(--safe-bottom))] z-10 mt-4 rounded-[12px] border-2 border-cloud-gray bg-white/95 p-2 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <div className="flex items-center gap-3">
            <p
              aria-live="polite"
              className={cn(
                "min-w-0 flex-1 text-sm font-extrabold",
                activeDraft.isDirty ? "text-sky-blue-text" : "text-graphite",
              )}
            >
              {activeDraft.isDirty ? "변경 있음" : "변경 없음"}
            </p>
            <PressableButton
              className="min-w-28 px-4 sm:min-w-36"
              disabled={!isReady || !activeDraft.isDirty}
              onClick={handleSaveAll}
            >
              저장
            </PressableButton>
          </div>
        </div>

        <section className="mt-4 rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-almost-black">
                출석 {presentCount} / 전체 {children.length}
              </h2>
              <p className="mt-1 text-sm font-bold text-graphite">미출석 {notPresentCount}명</p>
            </div>
          </div>

          {children.length === 0 ? (
            <div className="mt-4 rounded-[12px] bg-duo-green-light p-4">
              <p className="font-bold text-almost-black">이 반에는 아직 아이가 없습니다.</p>
              <a className="mt-2 inline-flex font-extrabold text-sky-blue-text underline" href="/children">
                아이 추가하기
              </a>
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {children.map((child) => {
                const record = activeDraft.records[child.id] ?? getChildRecord(session, child.id);
                return (
                  <article className="rounded-[12px] border-2 border-cloud-gray p-3" key={child.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <ChildAvatar gender={child.gender} name={child.name} photoDataUrl={child.photoDataUrl} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-lg font-extrabold text-almost-black">{child.name}</h3>
                            <button
                              aria-label={`${child.name} 상세정보`}
                              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border-2 border-cloud-gray text-sky-blue-text"
                              onClick={() => setSelectedChild(child)}
                              type="button"
                            >
                              <Info aria-hidden="true" className="h-4 w-4" />
                            </button>
                          </div>
                          {!selectedClassId ? (
                            <p className="mt-1 text-sm font-bold text-graphite">
                              {classNameById.get(child.classId) ?? "반 미지정"}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          aria-pressed={record.status === "present"}
                          className={getToggleButtonClass(record.status === "present", "present")}
                          onClick={() => toggleDraftPresent(child.id)}
                          type="button"
                        >
                          <Check aria-hidden="true" className="h-4 w-4" />
                          출석
                        </button>
                        <button
                          aria-pressed={record.qtCompleted}
                          className={getToggleButtonClass(record.qtCompleted, "qt")}
                          onClick={() => toggleDraftQt(child.id)}
                          type="button"
                        >
                          큐티
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-4 rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-extrabold text-almost-black">이번 주 메모</h2>
            <label className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-charcoal">
              <input
                checked={activeDraft.shareWithPastor}
                className="h-5 w-5 accent-duo-green"
                onChange={(event) =>
                  setActiveDraft((current) => ({ ...current, shareWithPastor: event.target.checked, isDirty: true }))
                }
                type="checkbox"
              />
              전도사님 공유
            </label>
          </div>
          <label className="mt-3 block">
            <span className="sr-only">이번 주 메모 내용</span>
            <textarea
              className="min-h-28 w-full resize-y rounded-[12px] border-2 border-cloud-gray p-3 text-base font-medium text-almost-black"
              maxLength={500}
              onChange={(event) => {
                setActiveDraft((current) => ({ ...current, note: event.target.value, isDirty: true }));
              }}
              value={activeDraft.note}
            />
          </label>
        </section>
      </div>
      {selectedChild ? (
        <ChildDetailModal
          child={selectedChild}
          classes={store.classes}
          isReady={isReady}
          onClose={() => setSelectedChild(null)}
          onDelete={() => deleteChild(selectedChild.id)}
          onSubmit={(input) => updateChild({ ...input, id: selectedChild.id })}
          submitLabel="수정 저장"
          title={`${selectedChild.name} 상세정보`}
        />
      ) : null}
      <BottomNavigation active="attendance" />
    </main>
  );
}
