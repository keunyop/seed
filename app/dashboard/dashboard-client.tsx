"use client";

import { CalendarCheck2, Cake, ClipboardCheck, Home, UsersRound } from "lucide-react";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { SeedlingIllustration } from "@/components/domain/seedling-illustration";
import { useFamilyOpenStore } from "@/components/domain/use-family-open-store";
import { StatCard } from "@/components/ui/stat-card";
import { getNearestWeekdayDate } from "@/lib/dates/service-week";
import { getDashboardSummary } from "@/lib/family/stats";

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function DashboardClient() {
  const { store } = useFamilyOpenStore();
  const sessionDate = getNearestWeekdayDate(getTodayIsoDate(), 0);
  const month = Number(sessionDate.slice(5, 7));
  const summary = getDashboardSummary(store, sessionDate, month);

  return (
    <main className="min-h-dvh bg-white pb-[calc(88px+var(--safe-bottom))]">
      <div className="mx-auto w-full max-w-[1140px] px-4 py-5 sm:px-6 lg:px-8">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div className="rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
            <p className="font-ui-latin text-xs font-bold uppercase tracking-[0.053em] text-sky-blue-text">
              Family open
            </p>
            <h1 className="font-heading-ko mt-2 text-3xl font-bold leading-tight text-almost-black sm:text-4xl">
              로그인 없이 바로 체크해요
            </h1>
            <p className="mt-3 max-w-[38rem] text-base font-medium text-graphite">
              이 MVP는 지금 브라우저에 저장됩니다. 같은 기기에서 새로고침해도 출석과 아이 목록이 유지됩니다.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <a
                className="pressable-shadow inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] bg-duo-green px-5 py-3 text-center text-base font-extrabold text-almost-black transition-[box-shadow,transform,background-color] hover:bg-[#61d80b]"
                href="/attendance"
              >
                <ClipboardCheck aria-hidden="true" className="h-5 w-5" />
                출석 체크 시작
              </a>
              <a
                className="inline-flex min-h-12 items-center justify-center rounded-[12px] border-2 border-cloud-gray px-5 text-center text-sm font-extrabold text-sky-blue-text transition hover:border-sky-blue"
                href="/children"
              >
                아이 추가
              </a>
            </div>
          </div>
          <div className="hidden lg:block">
            <SeedlingIllustration />
          </div>
        </section>

        <section aria-label="요약" className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatCard
            icon={CalendarCheck2}
            label="이번 주 출석"
            value={`${summary.weeklyPresentCount}명`}
            helper={`전체 ${summary.weeklyTotalCount}명`}
          />
          <StatCard
            icon={ClipboardCheck}
            label="이번 달 큐티"
            value={`${summary.monthlyQtParticipants}명`}
            helper={`총 ${summary.monthlyQtCompletions}회`}
          />
          <StatCard
            icon={Cake}
            label="이번 달 생일"
            value={`${summary.monthlyBirthdays.length}명`}
            helper={summary.monthlyBirthdays[0]?.name ?? "생일자가 없어요"}
          />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-almost-black">반 빠른 선택</h2>
              <UsersRound aria-hidden="true" className="h-5 w-5 text-sky-blue-text" />
            </div>
            <div className="mt-4 grid gap-3">
              {store.classes.map((item) => {
                const count = store.children.filter((child) => child.isActive && child.classId === item.id).length;

                return (
                  <a
                    className="flex min-h-14 items-center justify-between rounded-[12px] border-2 border-cloud-gray px-4 text-left transition hover:border-duo-green focus-visible:border-sky-blue"
                    href={`/attendance?classId=${item.id}`}
                    key={item.id}
                  >
                    <span className="font-bold text-almost-black">{item.name}</span>
                    <span className="text-sm font-extrabold text-graphite">{count}명</span>
                  </a>
                );
              })}
            </div>
          </div>

          <div className="rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-almost-black">저장 방식</h2>
              <Home aria-hidden="true" className="h-5 w-5 text-duo-green-dark" />
            </div>
            <div className="mt-4 rounded-[12px] bg-duo-green-light p-4">
              <p className="font-bold text-almost-black">이 브라우저에 저장 중</p>
              <p className="mt-1 text-sm font-medium text-charcoal">
                다른 기기와 자동 공유되지는 않습니다. 패밀리 오픈 검증 후 공유 저장 방식을 결정합니다.
              </p>
            </div>
          </div>
        </section>
      </div>
      <BottomNavigation active="home" />
    </main>
  );
}
