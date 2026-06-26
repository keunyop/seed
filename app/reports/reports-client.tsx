"use client";

import { BarChart3, Cake, CheckCircle2, ClipboardCheck, Copy, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { useFamilyOpenStore } from "@/components/domain/use-family-open-store";
import { StatCard } from "@/components/ui/stat-card";
import { getNearestWeekdayDate } from "@/lib/dates/service-week";
import {
  formatChildBirthDate,
  getDashboardSummary,
  getMonthlyQtDetails,
  getWeeklyAttendanceDetails,
} from "@/lib/family/stats";

type ReportModalType = "weekly" | "qt" | "birthdays";

function getLocalIsoDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function getStatusLabel(status?: "present" | "absent") {
  if (!status) {
    return "미선택";
  }

  return status === "present" ? "출석" : "결석";
}

export function ReportsClient() {
  const { store } = useFamilyOpenStore();
  const [sessionDate, setSessionDate] = useState(() => getNearestWeekdayDate(getLocalIsoDate(), 0));
  const [month, setMonth] = useState(() => Number(getLocalIsoDate().slice(5, 7)));
  const [activeModal, setActiveModal] = useState<ReportModalType | null>(null);
  const [copied, setCopied] = useState(false);
  const summary = getDashboardSummary(store, sessionDate, month);
  const weeklyDetails = useMemo(() => getWeeklyAttendanceDetails(store, sessionDate), [sessionDate, store]);
  const monthlyQtDetails = useMemo(() => getMonthlyQtDetails(store, sessionDate, month), [month, sessionDate, store]);

  useEffect(() => {
    if (!activeModal) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveModal(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeModal]);

  const modalData = useMemo(() => {
    if (activeModal === "weekly") {
      const items = weeklyDetails.map((item) => ({
        id: item.child.id,
        title: item.child.name,
        meta: `${item.className} · ${getStatusLabel(item.status)}${item.qtCompleted ? " · 큐티" : ""}`,
      }));

      return {
        title: `주간 출석 ${sessionDate}`,
        empty: "출석 대상 아이가 없습니다.",
        items,
        copyText: [`주간 출석 ${sessionDate}`, ...items.map((item) => `${item.title} - ${item.meta}`)].join("\n"),
      };
    }

    if (activeModal === "qt") {
      const items = monthlyQtDetails.map((item) => ({
        id: item.child.id,
        title: item.child.name,
        meta: `${item.className} · ${item.completions}회`,
      }));

      return {
        title: `${month}월 큐티`,
        empty: "큐티 완료 기록이 없습니다.",
        items,
        copyText: [`${month}월 큐티`, ...items.map((item) => `${item.title} - ${item.meta}`)].join("\n"),
      };
    }

    if (activeModal === "birthdays") {
      const items = summary.monthlyBirthdays.map((child) => {
        const childClass = store.classes.find((item) => item.id === child.classId);
        return {
          id: child.id,
          title: child.name,
          meta: `${childClass?.name ?? "반 미지정"} · ${formatChildBirthDate(child)}`,
        };
      });

      return {
        title: `${month}월 생일`,
        empty: "이번 달 생일자가 없습니다.",
        items,
        copyText: [`${month}월 생일`, ...items.map((item) => `${item.title} - ${item.meta}`)].join("\n"),
      };
    }

    return null;
  }, [activeModal, month, monthlyQtDetails, sessionDate, store.classes, summary.monthlyBirthdays, weeklyDetails]);

  async function copyModalList() {
    if (!modalData) {
      return;
    }

    try {
      await navigator.clipboard.writeText(modalData.copyText);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = modalData.copyText;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main className="min-h-dvh bg-white pb-[calc(88px+var(--safe-bottom))]">
      <div className="mx-auto w-full max-w-[920px] px-4 py-5 sm:px-6">
        <header className="rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <h1 className="font-heading-ko text-3xl font-bold text-almost-black">통계</h1>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-extrabold text-charcoal">주간 출석 기준일</span>
              <input
                className="mt-2 min-h-12 w-full rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
                onChange={(event) => setSessionDate(event.target.value)}
                type="date"
                value={sessionDate}
              />
            </label>
            <label className="block">
              <span className="text-sm font-extrabold text-charcoal">생일/큐티 월</span>
              <select
                className="mt-2 min-h-12 w-full rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
                onChange={(event) => setMonth(Number(event.target.value))}
                value={month}
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => (
                  <option key={item} value={item}>
                    {item}월
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        <section aria-label="통계 요약" className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatCard
            icon={BarChart3}
            label="주간 출석"
            value={`${summary.weeklyPresentCount}명`}
            helper={`전체 ${summary.weeklyTotalCount}명`}
            onClick={() => setActiveModal("weekly")}
          />
          <StatCard
            icon={ClipboardCheck}
            label="월간 큐티"
            value={`${summary.monthlyQtParticipants}명`}
            helper={`총 ${summary.monthlyQtCompletions}회`}
            onClick={() => setActiveModal("qt")}
          />
          <StatCard
            icon={Cake}
            label="월간 생일"
            value={`${summary.monthlyBirthdays.length}명`}
            helper={`${month}월 기준`}
            onClick={() => setActiveModal("birthdays")}
          />
        </section>
      </div>

      {modalData ? (
        <div className="fixed inset-0 z-50 flex items-end bg-almost-black/40 sm:items-center sm:p-4">
          <section
            aria-labelledby="report-modal-title"
            aria-modal="true"
            className="max-h-[86dvh] w-full overflow-y-auto rounded-t-[12px] bg-white p-4 sm:mx-auto sm:max-w-[560px] sm:rounded-[12px] sm:p-6"
            role="dialog"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading-ko text-2xl font-bold text-almost-black" id="report-modal-title">
                {modalData.title}
              </h2>
              <button
                aria-label="통계 상세 닫기"
                className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border-2 border-cloud-gray text-graphite"
                onClick={() => setActiveModal(null)}
                type="button"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            <button
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] border-2 border-cloud-gray px-4 text-sm font-extrabold text-sky-blue-text"
              onClick={copyModalList}
              type="button"
            >
              {copied ? (
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-duo-green-dark" />
              ) : (
                <Copy aria-hidden="true" className="h-4 w-4" />
              )}
              {copied ? "복사됨" : "명단 복사"}
            </button>

            {modalData.items.length === 0 ? (
              <p className="mt-4 rounded-[12px] bg-duo-green-light p-4 text-sm font-bold text-charcoal">
                {modalData.empty}
              </p>
            ) : (
              <div className="mt-4 grid gap-3">
                {modalData.items.map((item) => (
                  <article className="rounded-[12px] border-2 border-cloud-gray p-4" key={item.id}>
                    <h3 className="text-lg font-extrabold text-almost-black">{item.title}</h3>
                    <p className="text-sm font-bold text-graphite">{item.meta}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
      <BottomNavigation active="reports" />
    </main>
  );
}
