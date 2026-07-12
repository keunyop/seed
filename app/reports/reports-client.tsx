"use client";

import { LockKeyhole, RefreshCw, StickyNote } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { InteractiveBarChart } from "@/components/domain/interactive-bar-chart";
import { ReportDetailModal } from "@/components/domain/report-detail-modal";
import { useFamilyOpenStore } from "@/components/domain/use-family-open-store";
import { useTeacherAuth } from "@/components/domain/teacher-auth-provider";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import {
  canViewAttendanceMemo,
  formatChildBirthDate,
  getAllAttendanceMemosLatestFirst,
  getClassNameOrAll,
  getRecentWeeklyAttendanceBuckets,
  getTeacherNameOrUnknown,
  getYearlyBirthdayBuckets,
  getYearlyQtBuckets,
} from "@/lib/family/stats";

type ActiveReport =
  | { type: "attendance"; key: string }
  | { type: "qt"; key: string }
  | { type: "birthday"; key: string };

const MEMOS_PER_PAGE = 5;

function getLocalIsoDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
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
  const { store, isReady, saveState } = useFamilyOpenStore();
  const { currentTeacherId, isAdmin } = useTeacherAuth();
  const [referenceDate] = useState(getLocalIsoDate);
  const [activeReport, setActiveReport] = useState<ActiveReport | null>(null);
  const [memoPage, setMemoPage] = useState(1);
  const currentYear = Number(referenceDate.slice(0, 4));
  const hasStoreData =
    store.teachers.length > 0 ||
    store.classes.length > 0 ||
    store.children.length > 0 ||
    Object.keys(store.attendanceByDate).length > 0 ||
    store.attendanceMemos.length > 0;
  const hasInitialLoadError = isReady && saveState === "error" && !hasStoreData;
  const closeActiveReport = useCallback(() => setActiveReport(null), []);

  const weeklyBuckets = useMemo(
    () => getRecentWeeklyAttendanceBuckets(store, referenceDate, 8),
    [referenceDate, store],
  );
  const qtBuckets = useMemo(() => getYearlyQtBuckets(store, currentYear), [currentYear, store]);
  const birthdayBuckets = useMemo(() => getYearlyBirthdayBuckets(store, currentYear), [currentYear, store]);
  const allMemos = useMemo(() => getAllAttendanceMemosLatestFirst(store), [store]);
  const memoPageCount = Math.max(1, Math.ceil(allMemos.length / MEMOS_PER_PAGE));
  const safeMemoPage = Math.min(memoPage, memoPageCount);
  const pagedMemos = allMemos.slice((safeMemoPage - 1) * MEMOS_PER_PAGE, safeMemoPage * MEMOS_PER_PAGE);

  const modalData = useMemo(() => {
    if (!activeReport) {
      return null;
    }

    if (activeReport.type === "attendance") {
      const bucket = weeklyBuckets.find((item) => item.sessionDate === activeReport.key);
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
      };
    }

    if (activeReport.type === "qt") {
      const bucket = qtBuckets.find((item) => `${item.year}-${String(item.month).padStart(2, "0")}` === activeReport.key);
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
        emptyMessage: "이 달에는 큐티 완료자가 없습니다.",
        items,
        copyText: [title, ...items.map((item) => `${item.child.name} - ${item.meta}`)].join("\n"),
      };
    }

    const bucket = birthdayBuckets.find(
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
    };
  }, [activeReport, birthdayBuckets, qtBuckets, store, weeklyBuckets]);

  const weeklyChartData = weeklyBuckets.map((bucket) => ({
    key: bucket.sessionDate,
    label: formatShortMonthDay(bucket.sessionDate),
    value: bucket.presentCount,
    ariaLabel: `${formatLongDate(bucket.sessionDate)} 출석자 ${bucket.presentCount}명, 상세 보기`,
  }));
  const qtChartData = qtBuckets.map((bucket) => ({
    key: `${bucket.year}-${String(bucket.month).padStart(2, "0")}`,
    label: `${bucket.month}월`,
    value: bucket.participantCount,
    ariaLabel: `${bucket.year}년 ${bucket.month}월 큐티 완료자 ${bucket.participantCount}명, 상세 보기`,
  }));
  const birthdayChartData = birthdayBuckets.map((bucket) => ({
    key: `${bucket.year}-${String(bucket.month).padStart(2, "0")}`,
    label: `${bucket.month}월`,
    value: bucket.birthdayCount,
    ariaLabel: `${bucket.month}월 생일자 ${bucket.birthdayCount}명, 상세 보기`,
  }));

  return (
    <main className="min-h-dvh bg-white pb-[calc(88px+var(--safe-bottom))]">
      <div className="mx-auto w-full max-w-[920px] px-4 py-5 sm:px-6">
        <header className="rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <h1 className="font-heading-ko text-3xl font-bold text-almost-black">통계</h1>
          <p className="mt-2 text-sm font-bold text-graphite">
            최근 8주 출석과 {currentYear}년 월별 큐티·생일 현황입니다. 막대를 누르면 명단을 볼 수 있습니다.
          </p>
        </header>

        {hasInitialLoadError ? (
          <div className="mt-4 flex flex-col gap-3 rounded-[12px] bg-[#ffe8e6] p-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
            <p className="text-sm font-bold text-[#b3261e]">
              통계 데이터를 모두 불러오지 못했을 수 있습니다. 네트워크를 확인하고 다시 불러와 주세요.
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
              <InteractiveBarChart
                columns="weeks"
                data={weeklyChartData}
                description="현재 예배 주를 포함하며 기록이 없는 주도 0명으로 표시합니다."
                onSelect={(key) => setActiveReport({ type: "attendance", key })}
                title="주별 출석자"
                tone="attendance"
              />
              <InteractiveBarChart
                columns="months"
                data={qtChartData}
                description="한 달에 한 번 이상 큐티를 완료한 아동을 중복 없이 셉니다."
                onSelect={(key) => setActiveReport({ type: "qt", key })}
                title={`${currentYear}년 월별 큐티 완료자`}
                tone="qt"
              />
              <InteractiveBarChart
                columns="months"
                data={birthdayChartData}
                description="생일 월·일이 등록된 활성 아동을 월별로 보여줍니다."
                onSelect={(key) => setActiveReport({ type: "birthday", key })}
                title="월별 생일자"
                tone="birthday"
              />
            </div>

            <section className="mt-4 rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6" aria-labelledby="integrated-memos-title">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-extrabold text-almost-black" id="integrated-memos-title">
                    <StickyNote aria-hidden="true" className="h-5 w-5 text-sky-blue-text" />
                    선생님 통합 메모
                  </h2>
                  <p className="mt-1 text-sm font-bold text-graphite">모든 반의 메모를 최신 작성순으로 모았습니다.</p>
                </div>
                <span className="rounded-full bg-duo-green-light px-3 py-1.5 text-sm font-extrabold text-duo-green-dark">
                  {allMemos.length}개
                </span>
              </div>

              {allMemos.length === 0 ? (
                <p className="mt-4 rounded-[12px] bg-duo-green-light p-4 text-sm font-bold text-charcoal">
                  아직 작성된 메모가 없습니다.
                </p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {pagedMemos.map((memo) => {
                    const canViewMemo = canViewAttendanceMemo(memo, currentTeacherId, isAdmin);
                    return (
                      <article className="rounded-[12px] border-2 border-cloud-gray p-4" key={memo.id}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="break-words text-base font-extrabold text-almost-black">
                              {memo.teacherId ? getTeacherNameOrUnknown(store, memo.teacherId) : "이전 메모"}
                            </h3>
                            <p className="mt-1 break-words text-xs font-bold text-graphite">
                              {formatLongDate(memo.sessionDate)} · {getClassNameOrAll(store, memo.classId)} · {formatMemoSavedAt(memo.savedAt)}
                            </p>
                          </div>
                          {memo.isSecret ? (
                            <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-[#fff4f2] px-3 text-xs font-extrabold text-[#b3261e]">
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

      {modalData ? (
        <ReportDetailModal
          copyText={modalData.copyText}
          emptyMessage={modalData.emptyMessage}
          items={modalData.items}
          key={`${activeReport?.type ?? "report"}:${activeReport?.key ?? ""}`}
          onClose={closeActiveReport}
          summary={modalData.summary}
          title={modalData.title}
        />
      ) : null}
      <BottomNavigation active="reports" />
    </main>
  );
}
