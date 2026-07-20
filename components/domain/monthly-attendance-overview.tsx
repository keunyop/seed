"use client";

import { Check, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { ChildAvatar } from "@/components/domain/child-avatar";
import { useFamilyOpenStore } from "@/components/domain/use-family-open-store";
import { getChildRecord, getMonthlyAttendanceOverview, getSession } from "@/lib/family/stats";
import { cn } from "@/lib/utils";
import type { AttendanceRecord } from "@/lib/family/types";

type MonthlyAttendanceOverviewProps = {
  classId?: string;
  isReady: boolean;
  monthValue: string;
  onOpenDate: (sessionDate: string) => void;
};

type RecordSaveState = "idle" | "saving" | "saved" | "error";

function getRecordKey(sessionDate: string, childId: string) {
  return `${sessionDate}:${childId}`;
}

function formatSundayLabel(sessionDate: string) {
  const [, month, day] = sessionDate.split("-").map(Number);
  return `${month}월 ${day}일`;
}

function getToggleButtonClass(isPressed: boolean, tone: "present" | "qt") {
  const activeClass =
    tone === "present"
      ? "border-duo-green bg-duo-green text-almost-black shadow-[0_3px_0_#3f8f01]"
      : "border-sky-blue bg-sky-blue text-almost-black shadow-[0_3px_0_#0b79b7]";

  return cn(
    "inline-flex min-h-12 min-w-0 items-center justify-center gap-1 rounded-[12px] border-2 px-2 text-sm font-extrabold transition-[background-color,border-color,box-shadow,transform,color] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60",
    isPressed ? activeClass : "border-cloud-gray bg-[#f7f7f7] text-graphite",
  );
}

export function MonthlyAttendanceOverview({
  classId,
  isReady,
  monthValue,
  onOpenDate,
}: MonthlyAttendanceOverviewProps) {
  const { store, saveAttendanceRecord } = useFamilyOpenStore();
  const overview = useMemo(
    () => getMonthlyAttendanceOverview(store, classId, monthValue),
    [classId, monthValue, store],
  );
  const [drafts, setDrafts] = useState<Record<string, AttendanceRecord>>({});
  const [saveStates, setSaveStates] = useState<Record<string, RecordSaveState>>({});

  function getRecord(sessionDate: string, childId: string) {
    const key = getRecordKey(sessionDate, childId);
    return drafts[key] ?? getChildRecord(getSession(store, sessionDate), childId);
  }

  async function saveRecord(sessionDate: string, childId: string, record: AttendanceRecord) {
    const key = getRecordKey(sessionDate, childId);
    setSaveStates((current) => ({ ...current, [key]: "saving" }));
    const result = await saveAttendanceRecord(sessionDate, childId, record);
    setSaveStates((current) => ({ ...current, [key]: result.ok ? "saved" : "error" }));
  }

  function updateRecord(
    sessionDate: string,
    childId: string,
    recipe: (record: AttendanceRecord) => AttendanceRecord,
  ) {
    const key = getRecordKey(sessionDate, childId);
    const nextRecord = recipe(getRecord(sessionDate, childId));
    setDrafts((current) => ({ ...current, [key]: nextRecord }));
    void saveRecord(sessionDate, childId, nextRecord);
  }

  if (!isReady) {
    return (
      <section className="mt-4 rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6" role="status">
        <p className="font-bold text-graphite">월간 출석 데이터를 불러오는 중입니다.</p>
      </section>
    );
  }

  if (overview.children.length === 0) {
    return (
      <section className="mt-4 rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
        <div className="rounded-[12px] bg-duo-green-light p-4">
          <p className="font-bold text-almost-black">이 반에는 확인할 아이가 없습니다.</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="mt-4 rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
        <div>
          <h2 className="text-xl font-extrabold text-almost-black">주일별 한눈에 보기</h2>
          <p className="mt-1 text-sm font-bold text-graphite">날짜를 누르면 그날의 일별 체크로 바로 이동합니다.</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {overview.dates.map((date) => (
            <button
              className="min-h-24 rounded-[12px] border-2 border-cloud-gray p-3 text-left transition-colors hover:border-sky-blue hover:bg-sky-blue/5"
              key={date.sessionDate}
              onClick={() => onOpenDate(date.sessionDate)}
              type="button"
            >
              <span className="block text-sm font-extrabold text-almost-black">
                {formatSundayLabel(date.sessionDate)}
              </span>
              {date.recordedCount === 0 ? (
                <span className="mt-2 block text-xs font-extrabold text-bubblegum-pink">기록 없음</span>
              ) : (
                <span className="mt-2 block text-xs font-bold leading-5 text-graphite">
                  출석 {date.presentCount}명<br />큐티 {date.qtCount}명
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
        <div>
          <h2 className="text-xl font-extrabold text-almost-black">아이별 월간 현황</h2>
          <p className="mt-1 text-sm font-bold text-graphite">
            아이 카드를 펼치면 지난 날짜의 출석과 큐티를 바로 보완할 수 있습니다.
          </p>
        </div>
        <div className="mt-4 grid gap-3">
          {overview.children.map(({ child, presentCount, qtCount }) => (
            <details className="group rounded-[12px] border-2 border-cloud-gray" key={child.id}>
              <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 p-3 marker:content-none">
                <ChildAvatar gender={child.gender} name={child.name} photoDataUrl={child.photoDataUrl} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-lg font-extrabold text-almost-black">{child.name}</h3>
                  <p className="mt-1 text-sm font-bold text-graphite">
                    출석 {presentCount}/{overview.dates.length} · 큐티 {qtCount}회
                  </p>
                </div>
                <ChevronDown
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-graphite transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="border-t-2 border-cloud-gray p-3">
                <div className="grid gap-3">
                  {overview.dates.map(({ sessionDate }) => {
                    const key = getRecordKey(sessionDate, child.id);
                    const record = getRecord(sessionDate, child.id);
                    const saveState = saveStates[key] ?? "idle";
                    const isSaving = saveState === "saving";

                    return (
                      <div className="rounded-[12px] bg-[#fafafa] p-2" key={sessionDate}>
                        <div className="grid min-w-0 grid-cols-[minmax(0,0.72fr)_repeat(2,minmax(0,1fr))] items-center gap-2">
                          <span className="text-sm font-extrabold text-charcoal">
                            {formatSundayLabel(sessionDate)}
                          </span>
                          <button
                            aria-busy={isSaving}
                            aria-label={`${child.name} ${formatSundayLabel(sessionDate)} 출석`}
                            aria-pressed={record.status === "present"}
                            className={getToggleButtonClass(record.status === "present", "present")}
                            disabled={isSaving}
                            onClick={() =>
                              updateRecord(sessionDate, child.id, (current) => ({
                                ...current,
                                status: current.status === "present" ? undefined : "present",
                              }))
                            }
                            type="button"
                          >
                            <Check aria-hidden="true" className="h-4 w-4" />
                            출석
                          </button>
                          <button
                            aria-busy={isSaving}
                            aria-label={`${child.name} ${formatSundayLabel(sessionDate)} 큐티`}
                            aria-pressed={record.qtCompleted}
                            className={getToggleButtonClass(record.qtCompleted, "qt")}
                            disabled={isSaving}
                            onClick={() =>
                              updateRecord(sessionDate, child.id, (current) => ({
                                ...current,
                                qtCompleted: !current.qtCompleted,
                              }))
                            }
                            type="button"
                          >
                            큐티
                          </button>
                        </div>
                        {saveState !== "idle" ? (
                          <div className="mt-2 flex min-h-11 items-center justify-end gap-2" aria-live="polite">
                            <span
                              className={cn(
                                "text-xs font-extrabold",
                                saveState === "error" ? "text-bubblegum-pink" : "text-graphite",
                              )}
                            >
                              {saveState === "saving" ? "저장 중" : saveState === "saved" ? "저장됨" : "저장 실패"}
                            </span>
                            {saveState === "error" ? (
                              <button
                                className="min-h-11 rounded-[10px] border-2 border-cloud-gray px-3 text-xs font-extrabold text-sky-blue-text"
                                onClick={() => void saveRecord(sessionDate, child.id, record)}
                                type="button"
                              >
                                다시 저장
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
