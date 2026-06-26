"use client";

import { Check, Info } from "lucide-react";
import { useMemo, useState } from "react";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { ChildDetailModal } from "@/components/domain/child-detail-modal";
import { SaveStatus } from "@/components/domain/save-status";
import { useFamilyOpenStore } from "@/components/domain/use-family-open-store";
import { PressableButton } from "@/components/ui/pressable-button";
import { getNearestWeekdayDate } from "@/lib/dates/service-week";
import { getActiveChildren, getChildRecord, getClassLabel, getSession } from "@/lib/family/stats";
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

const ALL_CLASSES_VALUE = "all";

function getLocalIsoDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function AttendanceClient({ initialClassId }: AttendanceClientProps) {
  const { store, saveState, isReady, saveAttendanceSession, updateChild, deleteChild } = useFamilyOpenStore();
  const [sessionDate, setSessionDate] = useState(() => getNearestWeekdayDate(getLocalIsoDate(), 0));
  const [classId, setClassId] = useState(initialClassId ?? ALL_CLASSES_VALUE);
  const [selectedChild, setSelectedChild] = useState<FamilyChild | null>(null);

  const selectedClassValue =
    classId === ALL_CLASSES_VALUE || store.classes.some((item) => item.id === classId) ? classId : ALL_CLASSES_VALUE;
  const selectedClassId = selectedClassValue === ALL_CLASSES_VALUE ? undefined : selectedClassValue;
  const children = useMemo(() => getActiveChildren(store, selectedClassId), [selectedClassId, store]);
  const session = getSession(store, sessionDate);
  const sessionKey = `${sessionDate}:${session.savedAt}`;
  const [draft, setDraft] = useState<AttendanceDraft>(() => ({
    sessionDate,
    sessionKey,
    records: session.records,
    note: session.note,
    shareWithPastor: session.shareWithPastor ?? false,
    isDirty: false,
  }));

  if (draft.sessionDate !== sessionDate || (!draft.isDirty && draft.sessionKey !== sessionKey)) {
    setDraft({
      sessionDate,
      sessionKey,
      records: session.records,
      note: session.note,
      shareWithPastor: session.shareWithPastor ?? false,
      isDirty: false,
    });
  }

  const activeDraft =
    draft.sessionDate === sessionDate
      ? draft
      : {
          sessionDate,
          sessionKey,
          records: session.records,
          note: session.note,
          shareWithPastor: session.shareWithPastor ?? false,
          isDirty: false,
        };
  const presentCount = children.filter((child) => (activeDraft.records[child.id] ?? { qtCompleted: false }).status === "present").length;
  const notPresentCount = children.length - presentCount;

  function updateDraftRecord(childId: string, recipe: (record: AttendanceRecord) => AttendanceRecord) {
    setDraft((current) => ({
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
    setDraft((current) => ({ ...current, isDirty: false }));
  }

  return (
    <main className="min-h-dvh bg-white pb-[calc(96px+var(--safe-bottom))]">
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

        <section className="mt-4 rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-almost-black">
                출석 {presentCount} / 전체 {children.length}
              </h2>
              <p className="mt-1 text-sm font-bold text-graphite">미출석 {notPresentCount}명</p>
            </div>
            {activeDraft.isDirty ? <p className="text-sm font-extrabold text-sky-blue-text">저장할 변경 있음</p> : null}
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
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-extrabold text-almost-black">{child.name}</h3>
                          <button
                            aria-label={`${child.name} 상세정보`}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border-2 border-cloud-gray text-sky-blue-text"
                            onClick={() => setSelectedChild(child)}
                            type="button"
                          >
                            <Info aria-hidden="true" className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          aria-pressed={record.status === "present"}
                          className="inline-flex min-h-12 items-center justify-center gap-1 rounded-[12px] border-2 border-duo-green px-3 text-sm font-extrabold text-duo-green-dark transition aria-pressed:bg-duo-green aria-pressed:text-almost-black aria-pressed:shadow-[0_3px_0_#3f8f01]"
                          onClick={() => toggleDraftPresent(child.id)}
                          type="button"
                        >
                          <Check aria-hidden="true" className="h-4 w-4" />
                          출석
                        </button>
                        <button
                          aria-pressed={record.qtCompleted}
                          className="min-h-12 rounded-[12px] border-2 border-sky-blue px-3 text-sm font-extrabold text-sky-blue-text transition aria-pressed:bg-sky-blue aria-pressed:text-white aria-pressed:shadow-[0_3px_0_#0b79b7]"
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
                  setDraft((current) => ({ ...current, shareWithPastor: event.target.checked, isDirty: true }))
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
                setDraft((current) => ({ ...current, note: event.target.value, isDirty: true }));
              }}
              value={activeDraft.note}
            />
          </label>
        </section>
        <PressableButton className="mt-4 w-full" disabled={!isReady || !activeDraft.isDirty} onClick={handleSaveAll}>
          저장
        </PressableButton>
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
