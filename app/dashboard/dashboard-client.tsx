"use client";

import { UsersRound } from "lucide-react";
import Link from "next/link";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { useFamilyOpenStore } from "@/components/domain/use-family-open-store";
import { getTeacherName } from "@/lib/family/stats";
import { getMinistryGroupLabel } from '@/lib/family/ministry-group';

export function DashboardClient() {
  const { store, isReady, saveState, ministryGroup } = useFamilyOpenStore();
  const hasLoadError = isReady && saveState === "error" && store.classes.length === 0;

  return (
    <main className="min-h-dvh bg-white pb-[calc(88px+var(--safe-bottom))]">
      <div className="mx-auto w-full max-w-[720px] px-4 py-5 sm:px-6">
        <section className="rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <p className="text-sm font-extrabold text-sky-blue-text">밴쿠버한인침례교회</p>
          <p className="font-heading-ko mt-1 text-2xl font-bold text-duo-green-dark">
            {getMinistryGroupLabel(ministryGroup)}
          </p>
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
              <Link
                className="flex min-h-16 items-center justify-between gap-3 rounded-[12px] border-2 border-cloud-gray px-4 text-left transition hover:border-duo-green focus-visible:border-sky-blue"
                href={`/attendance?classId=${item.id}`}
                key={item.id}
              >
                <span className="font-bold text-almost-black">{item.name}</span>
                <span className="text-sm font-extrabold text-graphite">{getTeacherName(store, item.teacherId)}</span>
              </Link>
            )) : null}
          </div>
        </section>
      </div>
      <BottomNavigation active="home" />
    </main>
  );
}
