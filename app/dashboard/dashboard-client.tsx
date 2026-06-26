"use client";

import { UsersRound } from "lucide-react";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { useFamilyOpenStore } from "@/components/domain/use-family-open-store";
import { getTeacherName } from "@/lib/family/stats";

export function DashboardClient() {
  const { store } = useFamilyOpenStore();

  return (
    <main className="min-h-dvh bg-white pb-[calc(88px+var(--safe-bottom))]">
      <div className="mx-auto w-full max-w-[720px] px-4 py-5 sm:px-6">
        <section className="rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <p className="text-sm font-extrabold text-sky-blue-text">밴쿠버한인침례교회</p>
          <p className="font-heading-ko mt-1 text-2xl font-bold text-duo-green-dark">초등부</p>
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-heading-ko mt-4 text-3xl font-bold text-almost-black">반 선택</h1>
            <UsersRound aria-hidden="true" className="h-6 w-6 text-sky-blue-text" />
          </div>

          <div className="mt-4 grid gap-3">
            {store.classes.map((item) => (
              <a
                className="flex min-h-16 items-center justify-between gap-3 rounded-[12px] border-2 border-cloud-gray px-4 text-left transition hover:border-duo-green focus-visible:border-sky-blue"
                href={`/attendance?classId=${item.id}`}
                key={item.id}
              >
                <span className="font-bold text-almost-black">{item.name}</span>
                <span className="text-sm font-extrabold text-graphite">{getTeacherName(store, item.teacherId)}</span>
              </a>
            ))}
          </div>
        </section>
      </div>
      <BottomNavigation active="home" />
    </main>
  );
}
