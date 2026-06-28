"use client";

import { UsersRound } from "lucide-react";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { useFamilyOpenStore } from "@/components/domain/use-family-open-store";
import { getTeacherName } from "@/lib/family/stats";

export function DashboardClient() {
  const { store, isReady, saveState } = useFamilyOpenStore();
  const hasLoadError = isReady && saveState === "error" && store.classes.length === 0;

  return (
    <main className="min-h-dvh bg-white pb-[calc(88px+var(--safe-bottom))]">
      <div className="mx-auto w-full max-w-[720px] px-4 py-5 sm:px-6">
        <header className="mb-4 flex items-center gap-3">
          <span
            aria-hidden="true"
            className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] bg-duo-green-light"
          >
            <svg className="h-8 w-8 text-duo-green" fill="none" viewBox="0 0 32 32">
              <path
                d="M16 27V15"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="3"
              />
              <path
                d="M15.5 16.5C9 16.4 5.6 12.2 6.2 6.2c6-.6 10.2 2.8 10.3 9.3 0 .6-.4 1-1 1Z"
                fill="currentColor"
              />
              <path
                d="M17.5 19.5c6.1-.1 9.7-3.8 9.5-9.5-5.7-.2-9.4 3.4-9.5 9.5Z"
                fill="currentColor"
                opacity=".82"
              />
            </svg>
          </span>
          <div>
            <h1 className="font-ui-latin text-4xl font-bold text-almost-black">Seed</h1>
          </div>
        </header>
        <section className="rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <p className="text-sm font-extrabold text-sky-blue-text">밴쿠버한인침례교회</p>
          <p className="font-heading-ko mt-1 text-2xl font-bold text-duo-green-dark">초등부</p>
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-heading-ko mt-4 text-3xl font-bold text-almost-black">반 선택</h1>
            <UsersRound aria-hidden="true" className="h-6 w-6 text-sky-blue-text" />
          </div>

          <div className="mt-4 grid gap-3">
            {!isReady ? (
              <div className="rounded-[12px] border-2 border-cloud-gray px-4 py-5 text-sm font-extrabold text-graphite">
                반 정보를 불러오는 중입니다.
              </div>
            ) : null}
            {isReady && store.classes.length === 0 ? (
              <div className="rounded-[12px] border-2 border-cloud-gray px-4 py-5 text-sm font-extrabold text-graphite">
                {hasLoadError ? "반 정보를 불러오지 못했습니다." : "등록된 반이 없습니다."}
              </div>
            ) : null}
            {isReady ? store.classes.map((item) => (
              <a
                className="flex min-h-16 items-center justify-between gap-3 rounded-[12px] border-2 border-cloud-gray px-4 text-left transition hover:border-duo-green focus-visible:border-sky-blue"
                href={`/attendance?classId=${item.id}`}
                key={item.id}
              >
                <span className="font-bold text-almost-black">{item.name}</span>
                <span className="text-sm font-extrabold text-graphite">{getTeacherName(store, item.teacherId)}</span>
              </a>
            )) : null}
          </div>
        </section>
      </div>
      <BottomNavigation active="home" />
    </main>
  );
}
