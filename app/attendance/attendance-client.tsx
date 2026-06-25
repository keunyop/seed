"use client";

import { Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { SaveStatus } from "@/components/domain/save-status";
import { useFamilyOpenStore } from "@/components/domain/use-family-open-store";
import { getNearestWeekdayDate } from "@/lib/dates/service-week";
import { getActiveChildren, getChildRecord, getSession } from "@/lib/family/stats";

type AttendanceClientProps = {
  initialClassId?: string;
};

function getLocalIsoDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function AttendanceClient({ initialClassId }: AttendanceClientProps) {
  const { store, saveState, lastSavedAt, setAllAttendance, setAttendanceRecord, setSessionNote } = useFamilyOpenStore();
  const [sessionDate, setSessionDate] = useState(() => getNearestWeekdayDate(getLocalIsoDate(), 0));
  const [classId, setClassId] = useState(initialClassId ?? store.classes[0]?.id ?? "");

  const selectedClassId = store.classes.some((item) => item.id === classId) ? classId : store.classes[0]?.id ?? "";
  const children = useMemo(() => getActiveChildren(store, selectedClassId), [selectedClassId, store]);
  const session = getSession(store, sessionDate);
  const presentCount = children.filter((child) => getChildRecord(session, child.id).status === "present").length;

  return (
    <main className="min-h-dvh bg-white pb-[calc(96px+var(--safe-bottom))]">
      <div className="mx-auto w-full max-w-[920px] px-4 py-5 sm:px-6">
        <header className="rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <p className="font-ui-latin text-xs font-bold uppercase tracking-[0.053em] text-sky-blue-text">
            Attendance
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-heading-ko text-3xl font-bold text-almost-black">출석 체크</h1>
              <p className="mt-1 text-sm font-medium text-graphite">
                출석과 큐티를 바꾸면 이 브라우저에 바로 저장됩니다.
              </p>
            </div>
            <SaveStatus lastSavedAt={lastSavedAt} state={saveState} />
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
                value={selectedClassId}
              >
                {store.classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
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
              <p className="mt-1 text-sm font-medium text-graphite">아이 이름 옆 버튼으로 빠르게 바꿉니다.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                className="min-h-12 rounded-[12px] border-2 border-duo-green bg-duo-green-light px-4 text-sm font-extrabold text-duo-green-dark"
                onClick={() => setAllAttendance(sessionDate, children.map((child) => child.id), "present")}
                type="button"
              >
                전체 출석
              </button>
              <button
                className="min-h-12 rounded-[12px] border-2 border-cloud-gray px-4 text-sm font-extrabold text-graphite"
                onClick={() => setAllAttendance(sessionDate, children.map((child) => child.id), "absent")}
                type="button"
              >
                전체 결석
              </button>
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
                const record = getChildRecord(session, child.id);
                return (
                  <article className="rounded-[12px] border-2 border-cloud-gray p-3" key={child.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-extrabold text-almost-black">{child.name}</h3>
                        <p className="text-sm font-bold text-graphite">
                          {child.birthMonth}월 {child.birthDay}일 생일
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          aria-pressed={record.status === "present"}
                          className="inline-flex min-h-12 items-center justify-center gap-1 rounded-[12px] border-2 border-duo-green px-3 text-sm font-extrabold text-duo-green-dark aria-pressed:bg-duo-green-light"
                          onClick={() => setAttendanceRecord(sessionDate, child.id, "present", record.qtCompleted)}
                          type="button"
                        >
                          <Check aria-hidden="true" className="h-4 w-4" />
                          출석
                        </button>
                        <button
                          aria-pressed={record.status === "absent"}
                          className="inline-flex min-h-12 items-center justify-center gap-1 rounded-[12px] border-2 border-cloud-gray px-3 text-sm font-extrabold text-graphite aria-pressed:bg-[#ffe8e6] aria-pressed:text-[#b3261e]"
                          onClick={() => setAttendanceRecord(sessionDate, child.id, "absent", record.qtCompleted)}
                          type="button"
                        >
                          <X aria-hidden="true" className="h-4 w-4" />
                          결석
                        </button>
                        <button
                          aria-pressed={record.qtCompleted}
                          className="min-h-12 rounded-[12px] border-2 border-sky-blue px-3 text-sm font-extrabold text-sky-blue-text aria-pressed:bg-[#e8f7ff]"
                          onClick={() =>
                            setAttendanceRecord(sessionDate, child.id, record.status, !record.qtCompleted)
                          }
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
          <label className="block">
            <span className="text-lg font-extrabold text-almost-black">이번 주 메모</span>
            <textarea
              className="mt-3 min-h-28 w-full resize-y rounded-[12px] border-2 border-cloud-gray p-3 text-base font-medium text-almost-black"
              maxLength={500}
              onChange={(event) => setSessionNote(sessionDate, event.target.value)}
              placeholder="공유해도 되는 짧은 메모만 적어 주세요."
              value={session.note}
            />
          </label>
        </section>
      </div>
      <BottomNavigation active="attendance" />
    </main>
  );
}
