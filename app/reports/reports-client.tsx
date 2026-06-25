"use client";

import { BarChart3, Cake, ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { useFamilyOpenStore } from "@/components/domain/use-family-open-store";
import { StatCard } from "@/components/ui/stat-card";
import { getNearestWeekdayDate } from "@/lib/dates/service-week";
import { getDashboardSummary } from "@/lib/family/stats";

function getLocalIsoDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function ReportsClient() {
  const { store } = useFamilyOpenStore();
  const [sessionDate, setSessionDate] = useState(() => getNearestWeekdayDate(getLocalIsoDate(), 0));
  const [month, setMonth] = useState(() => Number(getLocalIsoDate().slice(5, 7)));
  const summary = getDashboardSummary(store, sessionDate, month);

  return (
    <main className="min-h-dvh bg-white pb-[calc(88px+var(--safe-bottom))]">
      <div className="mx-auto w-full max-w-[920px] px-4 py-5 sm:px-6">
        <header className="rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <p className="font-ui-latin text-xs font-bold uppercase tracking-[0.053em] text-sky-blue-text">
            Reports
          </p>
          <h1 className="font-heading-ko mt-2 text-3xl font-bold text-almost-black">통계</h1>
          <p className="mt-1 text-sm font-medium text-graphite">같은 브라우저에 저장된 출석 기록으로 계산합니다.</p>
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
          />
          <StatCard
            icon={ClipboardCheck}
            label="월간 큐티"
            value={`${summary.monthlyQtParticipants}명`}
            helper={`총 ${summary.monthlyQtCompletions}회`}
          />
          <StatCard
            icon={Cake}
            label="월간 생일"
            value={`${summary.monthlyBirthdays.length}명`}
            helper={`${month}월 기준`}
          />
        </section>

        <section className="mt-4 rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <h2 className="text-xl font-extrabold text-almost-black">{month}월 생일자</h2>
          {summary.monthlyBirthdays.length === 0 ? (
            <p className="mt-3 rounded-[12px] bg-duo-green-light p-4 text-sm font-bold text-charcoal">
              이번 달 생일자가 없습니다.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {summary.monthlyBirthdays.map((child) => {
                const childClass = store.classes.find((item) => item.id === child.classId);
                return (
                  <article className="rounded-[12px] border-2 border-cloud-gray p-4" key={child.id}>
                    <h3 className="text-lg font-extrabold text-almost-black">{child.name}</h3>
                    <p className="text-sm font-bold text-graphite">
                      {child.birthMonth}월 {child.birthDay}일 · {childClass?.name ?? "반 미지정"}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
      <BottomNavigation active="reports" />
    </main>
  );
}

