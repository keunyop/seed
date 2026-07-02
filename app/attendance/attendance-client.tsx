"use client";

import { Check, Info, LockKeyhole } from "lucide-react";
import { useMemo, useState } from "react";
import { ChildAvatar } from "@/components/domain/child-avatar";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { ChildDetailModal } from "@/components/domain/child-detail-modal";
import { useTeacherAuth } from "@/components/domain/teacher-auth-provider";
import { useFamilyOpenStore } from "@/components/domain/use-family-open-store";
import { PressableButton } from "@/components/ui/pressable-button";
import { getNearestWeekdayDate } from "@/lib/dates/service-week";
import {
  canCreateSecretAttendanceMemo,
  canViewAttendanceMemo,
  getAttendanceMemosForView,
  getAttendanceRosterChildren,
  getChildRecord,
  getClassLabel,
  getClassNameOrAll,
  getSession,
  getTeacherNameOrUnknown,
} from "@/lib/family/stats";
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
  isMemoDirty: boolean;
};

type AttendanceDraftState = {
  key: string;
  draft: AttendanceDraft;
};

type RecordSaveState = "idle" | "saving" | "saved" | "error";
type MemoSaveFeedback = "idle" | "saved" | "error";

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
    "disabled:cursor-not-allowed disabled:opacity-60",
  );
}

function getRecordSaveMessage(state: RecordSaveState) {
  if (state === "saving") {
    return "저장 중";
  }

  if (state === "saved") {
    return "저장됨";
  }

  if (state === "error") {
    return "저장 실패";
  }

  return "";
}

function formatMemoSavedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function AttendanceClient({ initialClassId }: AttendanceClientProps) {
  const { store, isReady, saveAttendanceRecord, saveAttendanceMemo, updateChild, deleteChild } = useFamilyOpenStore();
  const { currentTeacherId, isAdmin, isAuthenticated } = useTeacherAuth();
  const [sessionDate, setSessionDate] = useState(() => getNearestWeekdayDate(getLocalIsoDate(), 0));
  const [classId, setClassId] = useState(initialClassId ?? ALL_CLASSES_VALUE);
  const [selectedChild, setSelectedChild] = useState<FamilyChild | null>(null);
  const [recordSaveStateByChildId, setRecordSaveStateByChildId] = useState<Record<string, RecordSaveState>>({});
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [memoFeedback, setMemoFeedback] = useState<MemoSaveFeedback>("idle");
  const [memoError, setMemoError] = useState("");
  const [memoPage, setMemoPage] = useState(1);

  const selectedClassValue =
    classId === ALL_CLASSES_VALUE || store.classes.some((item) => item.id === classId) ? classId : ALL_CLASSES_VALUE;
  const selectedClassId = selectedClassValue === ALL_CLASSES_VALUE ? undefined : selectedClassValue;
  const children = useMemo(
    () => getAttendanceRosterChildren(store, selectedClassId),
    [selectedClassId, store],
  );
  const classNameById = useMemo(() => new Map(store.classes.map((item) => [item.id, item.name])), [store.classes]);
  const session = useMemo(() => getSession(store, sessionDate), [sessionDate, store]);
  const sessionKey = `${sessionDate}:${isReady ? "ready" : "loading"}`;
  const freshDraft = useMemo<AttendanceDraft>(() => ({
    sessionDate,
    sessionKey,
    records: session.records,
    note: "",
    shareWithPastor: false,
    isMemoDirty: false,
  }), [session.records, sessionDate, sessionKey]);
  const [draftState, setDraftState] = useState<AttendanceDraftState>(() => ({ key: sessionKey, draft: freshDraft }));
  const activeDraft = draftState.key === sessionKey ? draftState.draft : freshDraft;
  const visibleMemos = useMemo(
    () => getAttendanceMemosForView(store, sessionDate, selectedClassId),
    [selectedClassId, sessionDate, store],
  );
  const memoPageCount = Math.max(1, Math.ceil(visibleMemos.length / 5));
  const safeMemoPage = Math.min(memoPage, memoPageCount);
  const pagedMemos = visibleMemos.slice((safeMemoPage - 1) * 5, safeMemoPage * 5);
  const isSavingAnyRecord = Object.values(recordSaveStateByChildId).some((state) => state === "saving");
  const isContextLocked = !isReady || !isAuthenticated || isSavingAnyRecord || isSavingMemo;

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

  function setRecordSaveState(childId: string, state: RecordSaveState) {
    setRecordSaveStateByChildId((current) => ({ ...current, [childId]: state }));
  }

  async function saveCurrentRecord(childId: string, record: AttendanceRecord) {
    setRecordSaveState(childId, "saving");
    const result = await saveAttendanceRecord(sessionDate, childId, record);
    setRecordSaveState(childId, result.ok ? "saved" : "error");
  }

  function updateDraftRecordAndSave(childId: string, recipe: (record: AttendanceRecord) => AttendanceRecord) {
    const currentRecord = activeDraft.records[childId] ?? { qtCompleted: false };
    const nextRecord = recipe(currentRecord);

    setActiveDraft((current) => ({
      ...current,
      records: {
        ...current.records,
        [childId]: nextRecord,
      },
    }));
    void saveCurrentRecord(childId, nextRecord);
  }

  function toggleDraftPresent(childId: string) {
    updateDraftRecordAndSave(childId, (record) => ({
      ...record,
      status: record.status === "present" ? undefined : "present",
    }));
  }

  function toggleDraftQt(childId: string) {
    updateDraftRecordAndSave(childId, (record) => ({
      ...record,
      qtCompleted: !record.qtCompleted,
    }));
  }

  function retryRecordSave(childId: string) {
    void saveCurrentRecord(childId, activeDraft.records[childId] ?? { qtCompleted: false });
  }

  async function handleSaveMemo() {
    if (isSavingMemo || !activeDraft.isMemoDirty) {
      return;
    }

    setMemoError("");
    if (!currentTeacherId) {
      setMemoFeedback("error");
      setMemoError("선생님 로그인 후 메모를 저장할 수 있습니다.");
      return;
    }

    if (activeDraft.shareWithPastor && !canCreateSecretAttendanceMemo(store, selectedClassId, currentTeacherId)) {
      setMemoFeedback("error");
      setMemoError("비밀 메모는 해당 반 담임 선생님만 작성할 수 있습니다.");
      return;
    }

    setIsSavingMemo(true);
    const result = await saveAttendanceMemo({
      sessionDate,
      classId: selectedClassId,
      teacherId: currentTeacherId,
      note: activeDraft.note,
      isSecret: activeDraft.shareWithPastor,
    });
    setIsSavingMemo(false);

    if (result.ok) {
      setActiveDraft((current) => ({ ...current, note: "", shareWithPastor: false, isMemoDirty: false }));
      setMemoPage(1);
      setMemoFeedback("saved");
      return;
    }

    setMemoError(result.message);
    setMemoFeedback("error");
  }

  const memoStatusMessage = !isReady
    ? "출석 데이터를 불러오는 중"
    : isSavingMemo
      ? "메모 저장 중"
      : memoFeedback === "error"
        ? memoError || "메모를 저장하지 못했습니다. 입력 내용은 남아 있습니다."
        : activeDraft.isMemoDirty
          ? "메모 변경 있음"
          : memoFeedback === "saved"
            ? "메모 저장됨"
            : "메모 변경 없음";

  return (
    <main className="min-h-dvh bg-white pb-[calc(128px+var(--safe-bottom))]">
      <div className="mx-auto w-full max-w-[920px] px-4 py-5 sm:px-6">
        <header className="rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-heading-ko text-3xl font-bold text-almost-black">출석 체크</h1>
            </div>
          </div>

          <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className="text-sm font-extrabold text-charcoal">날짜</span>
              <input
                className="mt-2 min-h-12 w-full max-w-full min-w-0 rounded-[12px] border-2 border-cloud-gray px-2 text-sm font-bold text-almost-black sm:px-3 sm:text-base"
                disabled={isContextLocked}
                onChange={(event) => {
                  setRecordSaveStateByChildId({});
                  setMemoFeedback("idle");
                  setMemoError("");
                  setMemoPage(1);
                  setSessionDate(event.target.value);
                }}
                type="date"
                value={sessionDate}
              />
            </label>
            <label className="block min-w-0">
              <span className="text-sm font-extrabold text-charcoal">반</span>
              <select
                className="mt-2 min-h-12 w-full max-w-full min-w-0 rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
                disabled={isContextLocked}
                onChange={(event) => {
                  setRecordSaveStateByChildId({});
                  setMemoFeedback("idle");
                  setMemoError("");
                  setMemoPage(1);
                  setClassId(event.target.value);
                }}
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
                const recordSaveState = recordSaveStateByChildId[child.id] ?? "idle";
                const isSavingRecord = recordSaveState === "saving";
                const recordSaveMessage = getRecordSaveMessage(recordSaveState);
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
                              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sky-blue-text transition-colors hover:bg-sky-blue/10"
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
                          aria-busy={isSavingRecord}
                          aria-pressed={record.status === "present"}
                          className={getToggleButtonClass(record.status === "present", "present")}
                          disabled={!isReady || isSavingRecord}
                          onClick={() => toggleDraftPresent(child.id)}
                          type="button"
                        >
                          <Check aria-hidden="true" className="h-4 w-4" />
                          출석
                        </button>
                        <button
                          aria-busy={isSavingRecord}
                          aria-pressed={record.qtCompleted}
                          className={getToggleButtonClass(record.qtCompleted, "qt")}
                          disabled={!isReady || isSavingRecord}
                          onClick={() => toggleDraftQt(child.id)}
                          type="button"
                        >
                          큐티
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex min-h-6 items-center justify-end gap-2">
                      <p
                        aria-live="polite"
                        className={cn(
                          "text-xs font-extrabold",
                          recordSaveState === "error"
                            ? "text-bubblegum-pink"
                            : recordSaveState === "saving"
                              ? "text-sky-blue-text"
                              : "text-graphite",
                        )}
                      >
                        {recordSaveMessage}
                      </p>
                      {recordSaveState === "error" ? (
                        <button
                          className="min-h-8 rounded-[10px] border-2 border-cloud-gray px-3 text-xs font-extrabold text-sky-blue-text"
                          disabled={!isReady || isSavingRecord}
                          onClick={() => retryRecordSave(child.id)}
                          type="button"
                        >
                          다시 저장
                        </button>
                      ) : null}
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
                disabled={!isReady || isSavingMemo}
                onChange={(event) => {
                  setMemoFeedback("idle");
                  setMemoError("");
                  setActiveDraft((current) => ({
                    ...current,
                    shareWithPastor: event.target.checked,
                    isMemoDirty: true,
                  }));
                }}
                type="checkbox"
              />
              비밀
            </label>
          </div>
          <label className="mt-3 block">
            <span className="sr-only">이번 주 메모 내용</span>
            <textarea
              className="min-h-28 w-full resize-y rounded-[12px] border-2 border-cloud-gray p-3 text-base font-medium text-almost-black"
              disabled={!isReady || isSavingMemo}
              maxLength={500}
              onChange={(event) => {
                setMemoFeedback("idle");
                setMemoError("");
                setActiveDraft((current) => ({ ...current, note: event.target.value, isMemoDirty: true }));
              }}
              value={activeDraft.note}
            />
          </label>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p
              aria-live="polite"
              className={cn(
                "min-w-0 text-sm font-extrabold",
                memoFeedback === "error"
                  ? "text-bubblegum-pink"
                  : activeDraft.isMemoDirty || isSavingMemo
                    ? "text-sky-blue-text"
                    : "text-graphite",
              )}
            >
              {memoStatusMessage}
            </p>
            <PressableButton
              aria-busy={isSavingMemo}
              className="w-full px-4 sm:w-auto sm:min-w-36"
              disabled={!isReady || !currentTeacherId || !activeDraft.isMemoDirty || isSavingMemo}
              onClick={handleSaveMemo}
            >
              {isSavingMemo ? "저장 중" : "저장"}
            </PressableButton>
          </div>
          <div className="mt-5 border-t-2 border-cloud-gray pt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-extrabold text-almost-black">
                메모 {visibleMemos.length}개
              </h3>
              <p className="text-xs font-extrabold text-graphite">
                {getClassNameOrAll(store, selectedClassId)}
              </p>
            </div>
            {visibleMemos.length === 0 ? (
              <div className="mt-3 rounded-[12px] bg-duo-green-light p-4 text-sm font-bold text-almost-black">
                아직 메모가 없습니다.
              </div>
            ) : (
              <div className="mt-3 grid gap-3">
                {pagedMemos.map((memo) => {
                  const canViewMemo = canViewAttendanceMemo(memo, currentTeacherId, isAdmin);
                  return (
                    <article className="rounded-[12px] border-2 border-cloud-gray p-3" key={memo.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-almost-black">
                            {getTeacherNameOrUnknown(store, memo.teacherId)}
                          </p>
                          <p className="mt-1 text-xs font-bold text-graphite">
                            {getClassNameOrAll(store, memo.classId)} · {formatMemoSavedAt(memo.savedAt)}
                          </p>
                        </div>
                        {memo.isSecret ? (
                          <span className="inline-flex min-h-8 items-center gap-1 rounded-[999px] bg-[#fff4f2] px-3 text-xs font-extrabold text-[#b3261e]">
                            <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
                            비밀
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm font-bold text-charcoal">
                        {canViewMemo ? memo.note : "비밀 메모입니다."}
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
            {memoPageCount > 1 ? (
              <div className="mt-3 grid grid-cols-3 items-center gap-2">
                <button
                  className="min-h-10 rounded-[12px] border-2 border-cloud-gray px-3 text-sm font-extrabold text-graphite disabled:opacity-50"
                  disabled={safeMemoPage <= 1}
                  onClick={() => setMemoPage((current) => Math.max(1, current - 1))}
                  type="button"
                >
                  이전
                </button>
                <p className="text-center text-sm font-extrabold text-graphite">
                  {safeMemoPage} / {memoPageCount}
                </p>
                <button
                  className="min-h-10 rounded-[12px] border-2 border-cloud-gray px-3 text-sm font-extrabold text-graphite disabled:opacity-50"
                  disabled={safeMemoPage >= memoPageCount}
                  onClick={() => setMemoPage((current) => Math.min(memoPageCount, current + 1))}
                  type="button"
                >
                  다음
                </button>
              </div>
            ) : null}
          </div>
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
