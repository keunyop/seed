"use client";

import { Check, LockKeyhole, RefreshCw, StickyNote } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { ChildDetailModal } from "@/components/domain/child-detail-modal";
import { ReportChartCard } from "@/components/domain/report-chart-card";
import { ReportDetailModal } from "@/components/domain/report-detail-modal";
import { useFamilyOpenStore } from "@/components/domain/use-family-open-store";
import { useTeacherAuth } from "@/components/domain/teacher-auth-provider";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import {
  formatChildBirthDate,
  getActiveChildrenWithoutBirthday,
  getAllAttendanceMemosLatestFirst,
  getClassNameOrAll,
  getMonthlyBirthdayBuckets,
  getMonthlyQtBuckets,
  getRecentWeeklyAttendanceBuckets,
  getTeacherNameOrUnknown,
  getWeeklyAttendanceBuckets,
} from "@/lib/family/stats";
import type { AttendanceMemo } from "@/lib/family/types";

type ActiveReport =
  | { type: "attendance"; key: string }
  | { type: "qt"; key: string }
  | { type: "birthday"; key: string }
  | { type: "missing-birthday"; key: "missing" };

const MEMOS_PER_PAGE = 5;
const RECENT_POINT_COUNT = 4;
const FULL_ATTENDANCE_START_SUNDAY = "2026-07-05";
const FULL_ATTENDANCE_WEEK_COUNT = 52;
const FULL_RANGE_START_YEAR = 2026;
const FULL_RANGE_START_MONTH = 7;
const FULL_RANGE_MONTH_COUNT = 12;
const QT_COMPLETION_THRESHOLD = 3;

function getLocalIsoDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function getRecentMonthStart(referenceDate: string) {
  const year = Number(referenceDate.slice(0, 4));
  const month = Number(referenceDate.slice(5, 7));
  const start = new Date(Date.UTC(year, month - RECENT_POINT_COUNT, 1));
  return { year: start.getUTCFullYear(), month: start.getUTCMonth() + 1 };
}

function formatShortMonthDay(isoDate: string) {
  const [, month, day] = isoDate.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function formatLongDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return `${Number(year)}년 ${Number(month)}월 ${Number(day)}일`;
}

function formatMemoSavedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "저장 시각 미상";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function ReportsClient() {
  const {
    store,
    isReady,
    saveState,
    updateChild,
    setAttendanceMemoAcknowledged,
  } = useFamilyOpenStore();
  const { currentTeacherId, isAdmin } = useTeacherAuth();
  const [referenceDate] = useState(getLocalIsoDate);
  const [activeReport, setActiveReport] = useState<ActiveReport | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [memoPage, setMemoPage] = useState(1);
  const [pendingMemoIds, setPendingMemoIds] = useState<Set<string>>(() => new Set());
  const [memoError, setMemoError] = useState("");
  const recentMonthStart = useMemo(() => getRecentMonthStart(referenceDate), [referenceDate]);
  const hasStoreData =
    store.teachers.length > 0 ||
    store.classes.length > 0 ||
    store.children.length > 0 ||
    Object.keys(store.attendanceByDate).length > 0 ||
    store.attendanceMemos.length > 0;
  const hasInitialLoadError = isReady && saveState === "error" && !hasStoreData;
  const closeActiveReport = useCallback(() => setActiveReport(null), []);

  const recentWeeklyBuckets = useMemo(
    () => getRecentWeeklyAttendanceBuckets(store, referenceDate, RECENT_POINT_COUNT),
    [referenceDate, store],
  );
  const fullWeeklyBuckets = useMemo(
    () => getWeeklyAttendanceBuckets(store, FULL_ATTENDANCE_START_SUNDAY, FULL_ATTENDANCE_WEEK_COUNT),
    [store],
  );
  const recentQtBuckets = useMemo(
    () =>
      getMonthlyQtBuckets(
        store,
        recentMonthStart.year,
        recentMonthStart.month,
        RECENT_POINT_COUNT,
        QT_COMPLETION_THRESHOLD,
      ),
    [recentMonthStart, store],
  );
  const fullQtBuckets = useMemo(
    () =>
      getMonthlyQtBuckets(
        store,
        FULL_RANGE_START_YEAR,
        FULL_RANGE_START_MONTH,
        FULL_RANGE_MONTH_COUNT,
        QT_COMPLETION_THRESHOLD,
      ),
    [store],
  );
  const recentBirthdayBuckets = useMemo(
    () =>
      getMonthlyBirthdayBuckets(
        store,
        recentMonthStart.year,
        recentMonthStart.month,
        RECENT_POINT_COUNT,
      ),
    [recentMonthStart, store],
  );
  const fullBirthdayBuckets = useMemo(
    () =>
      getMonthlyBirthdayBuckets(
        store,
        FULL_RANGE_START_YEAR,
        FULL_RANGE_START_MONTH,
        FULL_RANGE_MONTH_COUNT,
      ),
    [store],
  );
  const childrenWithoutBirthday = useMemo(() => getActiveChildrenWithoutBirthday(store), [store]);
  const allMemos = useMemo(() => getAllAttendanceMemosLatestFirst(store), [store]);
  const uncheckedMemoCount = allMemos.filter((memo) => !memo.acknowledgedAt).length;
  const memoPageCount = Math.max(1, Math.ceil(allMemos.length / MEMOS_PER_PAGE));
  const safeMemoPage = Math.min(memoPage, memoPageCount);
  const pagedMemos = allMemos.slice((safeMemoPage - 1) * MEMOS_PER_PAGE, safeMemoPage * MEMOS_PER_PAGE);
  const selectedChild = selectedChildId
    ? store.children.find((child) => child.id === selectedChildId && child.isActive)
    : undefined;

  const modalData = useMemo(() => {
    if (!activeReport) {
      return null;
    }

    if (activeReport.type === "attendance") {
      const bucket = recentWeeklyBuckets.find((item) => item.sessionDate === activeReport.key);
      if (!bucket) {
        return null;
      }

      const title = `${formatLongDate(bucket.sessionDate)} 출석자`;
      const items = bucket.attendees.map((item) => ({
        id: item.child.id,
        child: item.child,
        meta: item.className,
      }));

      return {
        title,
        summary: `${bucket.presentCount}명`,
        emptyMessage: "이 주에는 출석자가 없습니다.",
        items,
        copyText: [title, ...items.map((item) => `${item.child.name} - ${item.meta}`)].join("\n"),
        initialViewMode: "grid" as const,
      };
    }

    if (activeReport.type === "qt") {
      const bucket = recentQtBuckets.find(
        (item) => `${item.year}-${String(item.month).padStart(2, "0")}` === activeReport.key,
      );
      if (!bucket) {
        return null;
      }

      const title = `${bucket.year}년 ${bucket.month}월 큐티 완료자`;
      const items = bucket.participants.map((item) => ({
        id: item.child.id,
        child: item.child,
        meta: `${item.className} · ${item.completions}회 완료`,
      }));

      return {
        title,
        summary: `${bucket.participantCount}명 · 총 ${bucket.totalCompletions}회 완료`,
        emptyMessage: "이 달에는 큐티를 3회 이상 완료한 아이가 없습니다.",
        items,
        copyText: [title, ...items.map((item) => `${item.child.name} - ${item.meta}`)].join("\n"),
        initialViewMode: "grid" as const,
      };
    }

    if (activeReport.type === "missing-birthday") {
      const title = "생일 미입력 아이";
      const items = childrenWithoutBirthday.map((child) => ({
        id: child.id,
        child,
        meta: `${store.classes.find((item) => item.id === child.classId)?.name ?? "반 미지정"} · 생일 미입력`,
      }));

      return {
        title,
        summary: `${items.length}명`,
        emptyMessage: "생일이 입력되지 않은 아이가 없습니다.",
        items,
        copyText: [title, ...items.map((item) => `${item.child.name} - ${item.meta}`)].join("\n"),
        initialViewMode: "list" as const,
      };
    }

    const bucket = recentBirthdayBuckets.find(
      (item) => `${item.year}-${String(item.month).padStart(2, "0")}` === activeReport.key,
    );
    if (!bucket) {
      return null;
    }

    const title = `${bucket.month}월 생일자`;
    const items = bucket.children.map((child) => ({
      id: child.id,
      child,
      meta: `${store.classes.find((item) => item.id === child.classId)?.name ?? "반 미지정"} · ${formatChildBirthDate(child)}`,
    }));

    return {
      title,
      summary: `${bucket.birthdayCount}명`,
      emptyMessage: "이 달에는 생일자가 없습니다.",
      items,
      copyText: [title, ...items.map((item) => `${item.child.name} - ${item.meta}`)].join("\n"),
      initialViewMode: "grid" as const,
    };
  }, [activeReport, childrenWithoutBirthday, recentBirthdayBuckets, recentQtBuckets, recentWeeklyBuckets, store.classes]);

  const recentWeeklyChartData = recentWeeklyBuckets.map((bucket) => ({
    key: bucket.sessionDate,
    label: formatShortMonthDay(bucket.sessionDate),
    value: bucket.presentCount,
    ariaLabel: `${formatLongDate(bucket.sessionDate)} 출석자 ${bucket.presentCount}명, 상세 보기`,
  }));
  const fullWeeklyChartData = fullWeeklyBuckets.map((bucket) => ({
    key: bucket.sessionDate,
    label: formatShortMonthDay(bucket.sessionDate),
    value: bucket.presentCount,
    ariaLabel: `${formatLongDate(bucket.sessionDate)} 출석자 ${bucket.presentCount}명`,
  }));
  const recentQtChartData = recentQtBuckets.map((bucket) => ({
    key: `${bucket.year}-${String(bucket.month).padStart(2, "0")}`,
    label: `${bucket.month}월`,
    value: bucket.participantCount,
    ariaLabel: `${bucket.year}년 ${bucket.month}월 큐티 완료자 ${bucket.participantCount}명, 상세 보기`,
  }));
  const fullQtChartData = fullQtBuckets.map((bucket) => ({
    key: `${bucket.year}-${String(bucket.month).padStart(2, "0")}`,
    label: `${String(bucket.year).slice(2)}.${bucket.month}`,
    value: bucket.participantCount,
    ariaLabel: `${bucket.year}년 ${bucket.month}월 큐티 완료자 ${bucket.participantCount}명`,
  }));
  const recentBirthdayChartData = recentBirthdayBuckets.map((bucket) => ({
    key: `${bucket.year}-${String(bucket.month).padStart(2, "0")}`,
    label: `${bucket.month}월`,
    value: bucket.birthdayCount,
    ariaLabel: `${bucket.year}년 ${bucket.month}월 생일자 ${bucket.birthdayCount}명, 상세 보기`,
  }));
  const fullBirthdayChartData = fullBirthdayBuckets.map((bucket) => ({
    key: `${bucket.year}-${String(bucket.month).padStart(2, "0")}`,
    label: `${String(bucket.year).slice(2)}.${bucket.month}`,
    value: bucket.birthdayCount,
    ariaLabel: `${bucket.year}년 ${bucket.month}월 생일자 ${bucket.birthdayCount}명`,
  }));

  async function handleMemoAcknowledgement(memo: AttendanceMemo, checked: boolean) {
    if (!currentTeacherId) {
      setMemoError("로그인한 관리자 정보를 찾을 수 없습니다.");
      return;
    }

    if (pendingMemoIds.has(memo.id)) {
      return;
    }

    setPendingMemoIds((current) => new Set(current).add(memo.id));
    setMemoError("");
    const result = await setAttendanceMemoAcknowledged(memo.id, checked, currentTeacherId);
    setPendingMemoIds((current) => {
      const next = new Set(current);
      next.delete(memo.id);
      return next;
    });
    if (!result.ok) {
      setMemoError(result.message);
    }
  }

  return (
    <main className="min-h-dvh bg-white pb-[calc(88px+var(--safe-bottom))]">
      <div className="mx-auto w-full max-w-[920px] px-4 py-5 sm:px-6">
        <header className="rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <h1 className="font-heading-ko text-3xl font-bold text-almost-black">통계</h1>
        </header>

        {hasInitialLoadError ? (
          <div className="mt-4 flex flex-col gap-3 rounded-[12px] bg-[#ffe8e6] p-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
            <p className="text-sm font-bold text-[#b3261e]">
              통계 데이터를 모두 불러오지 못했습니다. 네트워크를 확인하고 다시 불러와 주세요.
            </p>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] border-2 border-[#ffc3bd] bg-white px-4 text-sm font-extrabold text-[#b3261e]"
              onClick={() => window.location.reload()}
              type="button"
            >
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              다시 불러오기
            </button>
          </div>
        ) : null}

        {!isReady ? (
          <div className="mt-4 rounded-[12px] bg-duo-green-light p-4 text-sm font-bold text-charcoal" role="status">
            통계를 불러오는 중입니다.
          </div>
        ) : (
          <>
            {store.children.every((child) => !child.isActive) ? (
              <div className="mt-4 rounded-[12px] bg-duo-green-light p-4 text-sm font-bold text-charcoal">
                등록된 활성 아이가 없어 그래프가 0명으로 표시됩니다.
              </div>
            ) : null}

            <div className="mt-4 grid gap-4">
              <ReportChartCard
                allData={fullWeeklyChartData}
                columns="weeks"
                onSelect={(key) => setActiveReport({ type: "attendance", key })}
                recentData={recentWeeklyChartData}
                title="주별 출석자"
                tone="attendance"
              />
              <ReportChartCard
                allData={fullQtChartData}
                columns="months"
                onSelect={(key) => setActiveReport({ type: "qt", key })}
                recentData={recentQtChartData}
                title="월별 큐티 완료자"
                tone="qt"
              />
              <ReportChartCard
                allData={fullBirthdayChartData}
                columns="months"
                footer={
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-[12px] border-2 border-cloud-gray px-4 text-sm font-extrabold text-sky-blue-text"
                    onClick={() => setActiveReport({ type: "missing-birthday", key: "missing" })}
                    type="button"
                  >
                    생일 미입력 {childrenWithoutBirthday.length}명
                  </button>
                }
                onSelect={(key) => setActiveReport({ type: "birthday", key })}
                recentData={recentBirthdayChartData}
                title="월별 생일자"
                tone="birthday"
              />
            </div>

            <section className="mt-4 rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6" aria-labelledby="integrated-memos-title">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl font-extrabold text-almost-black" id="integrated-memos-title">
                  <StickyNote aria-hidden="true" className="h-5 w-5 text-sky-blue-text" />
                  선생님 통합 메모
                </h2>
                <span className="rounded-full bg-duo-green-light px-3 py-1.5 text-sm font-extrabold text-duo-green-dark">
                  미확인 {uncheckedMemoCount}개
                </span>
              </div>

              {memoError ? (
                <p className="mt-3 rounded-[12px] bg-[#ffe8e6] p-3 text-sm font-bold text-[#b3261e]" role="alert">
                  {memoError}
                </p>
              ) : null}

              {allMemos.length === 0 ? (
                <p className="mt-4 rounded-[12px] bg-duo-green-light p-4 text-sm font-bold text-charcoal">
                  아직 작성된 메모가 없습니다.
                </p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {pagedMemos.map((memo) => {
                    const teacherName = memo.teacherId ? getTeacherNameOrUnknown(store, memo.teacherId) : "이전 메모";
                    const isAcknowledged = Boolean(memo.acknowledgedAt);
                    return (
                      <article className="rounded-[12px] border-2 border-cloud-gray p-4" key={memo.id}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="break-words text-base font-extrabold text-almost-black">{teacherName}</h3>
                            <p className="mt-1 break-words text-xs font-bold text-graphite">
                              {formatLongDate(memo.sessionDate)} · {getClassNameOrAll(store, memo.classId)} · {formatMemoSavedAt(memo.savedAt)}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                            {memo.isSecret ? (
                              <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-[#fff4f2] px-3 text-xs font-extrabold text-[#b3261e]">
                                <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />
                                비밀
                              </span>
                            ) : null}
                            {isAdmin ? (
                              <label className="relative inline-flex min-h-11 cursor-pointer items-center gap-2 overflow-hidden rounded-[12px] border-2 border-cloud-gray px-3 text-xs font-extrabold text-graphite">
                                <input
                                  aria-label={`${formatLongDate(memo.sessionDate)} ${getClassNameOrAll(store, memo.classId)} ${teacherName} 메모 확인`}
                                  checked={isAcknowledged}
                                  className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-wait"
                                  disabled={pendingMemoIds.has(memo.id)}
                                  onChange={(event) => void handleMemoAcknowledgement(memo, event.target.checked)}
                                  type="checkbox"
                                />
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded border-2 border-cloud-gray peer-checked:border-duo-green-dark peer-checked:bg-duo-green peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky-blue-text">
                                  {isAcknowledged ? <Check aria-hidden="true" className="h-4 w-4 text-almost-black" /> : null}
                                </span>
                                확인
                              </label>
                            ) : null}
                          </div>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap break-words text-sm font-bold text-charcoal">
                          {!memo.isSecret || isAdmin ? memo.note : "비밀 메모입니다."}
                        </p>
                      </article>
                    );
                  })}
                </div>
              )}

              {memoPageCount > 1 ? (
                <div className="mt-4 grid grid-cols-3 items-center gap-2">
                  <button
                    className="min-h-11 rounded-[12px] border-2 border-cloud-gray px-3 text-sm font-extrabold text-graphite disabled:opacity-50"
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
                    className="min-h-11 rounded-[12px] border-2 border-cloud-gray px-3 text-sm font-extrabold text-graphite disabled:opacity-50"
                    disabled={safeMemoPage >= memoPageCount}
                    onClick={() => setMemoPage((current) => Math.min(memoPageCount, current + 1))}
                    type="button"
                  >
                    다음
                  </button>
                </div>
              ) : null}
            </section>
          </>
        )}
      </div>

      {modalData && !selectedChild ? (
        <ReportDetailModal
          copyText={modalData.copyText}
          emptyMessage={modalData.emptyMessage}
          initialViewMode={modalData.initialViewMode}
          items={modalData.items}
          key={`${activeReport?.type ?? "report"}:${activeReport?.key ?? ""}`}
          onClose={closeActiveReport}
          onItemSelect={activeReport?.type === "missing-birthday" ? (item) => setSelectedChildId(item.child.id) : undefined}
          summary={modalData.summary}
          title={modalData.title}
        />
      ) : null}
      {selectedChild ? (
        <ChildDetailModal
          child={selectedChild}
          classes={store.classes}
          isReady={isReady}
          onClose={() => setSelectedChildId(null)}
          onSubmit={(input) => updateChild({ id: selectedChild.id, ...input })}
          submitLabel="수정 저장"
          title={`${selectedChild.name} 상세 정보`}
        />
      ) : null}
      <BottomNavigation active="reports" />
    </main>
  );
}
