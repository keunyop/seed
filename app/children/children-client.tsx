"use client";

import { FormEvent, useState } from "react";
import { Baby, Plus } from "lucide-react";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { SaveStatus } from "@/components/domain/save-status";
import { useFamilyOpenStore } from "@/components/domain/use-family-open-store";
import { PressableButton } from "@/components/ui/pressable-button";

export function ChildrenClient() {
  const { store, saveState, isReady, lastSavedAt, addChild } = useFamilyOpenStore();
  const [name, setName] = useState("");
  const [classId, setClassId] = useState(store.classes[0]?.id ?? "");
  const [birthMonth, setBirthMonth] = useState(1);
  const [birthDay, setBirthDay] = useState(1);
  const [error, setError] = useState("");

  const selectedClassId = store.classes.some((item) => item.id === classId) ? classId : store.classes[0]?.id ?? "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = addChild({
      name: String(formData.get("name") ?? ""),
      classId: String(formData.get("classId") ?? selectedClassId),
      birthMonth: Number(formData.get("birthMonth") ?? birthMonth),
      birthDay: Number(formData.get("birthDay") ?? birthDay),
    });
    setError(result.message);
    if (result.ok) {
      setName("");
      setBirthMonth(1);
      setBirthDay(1);
    }
  }

  return (
    <main className="min-h-dvh bg-white pb-[calc(88px+var(--safe-bottom))]">
      <div className="mx-auto w-full max-w-[920px] px-4 py-5 sm:px-6">
        <header className="rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-ui-latin text-xs font-bold uppercase tracking-[0.053em] text-sky-blue-text">
                Children
              </p>
              <h1 className="font-heading-ko mt-2 text-3xl font-bold text-almost-black">아이들</h1>
              <p className="mt-1 text-sm font-medium text-graphite">이름, 반, 생일 월/일만 저장합니다.</p>
            </div>
            <SaveStatus lastSavedAt={lastSavedAt} state={saveState} />
          </div>
        </header>

        <section className="mt-4 rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-almost-black">
            <Plus aria-hidden="true" className="h-5 w-5 text-duo-green-dark" />
            아이 추가
          </h2>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
            <label className="block sm:col-span-2">
              <span className="text-sm font-extrabold text-charcoal">이름</span>
              <input
                className="mt-2 min-h-12 w-full rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
                name="name"
                onChange={(event) => setName(event.target.value)}
                placeholder="예: 하린"
                value={name}
              />
            </label>
            <label className="block">
              <span className="text-sm font-extrabold text-charcoal">반</span>
              <select
                className="mt-2 min-h-12 w-full rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
                name="classId"
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
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-extrabold text-charcoal">생일 월</span>
                <input
                  className="mt-2 min-h-12 w-full rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
                  max={12}
                  min={1}
                  name="birthMonth"
                  onChange={(event) => setBirthMonth(Number(event.target.value))}
                  type="number"
                  value={birthMonth}
                />
              </label>
              <label className="block">
                <span className="text-sm font-extrabold text-charcoal">생일 일</span>
                <input
                  className="mt-2 min-h-12 w-full rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
                  max={31}
                  min={1}
                  name="birthDay"
                  onChange={(event) => setBirthDay(Number(event.target.value))}
                  type="number"
                  value={birthDay}
                />
              </label>
            </div>
            {error ? (
              <p className="rounded-[12px] bg-[#ffe8e6] p-3 text-sm font-bold text-[#b3261e] sm:col-span-2" role="alert">
                {error}
              </p>
            ) : null}
            <PressableButton className="sm:col-span-2" disabled={!isReady} type="submit">
              아이 저장
            </PressableButton>
          </form>
        </section>

        <section className="mt-4 rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-almost-black">
            <Baby aria-hidden="true" className="h-5 w-5 text-sky-blue-text" />
            등록된 아이 {store.children.filter((child) => child.isActive).length}명
          </h2>
          <div className="mt-4 grid gap-3">
            {store.children
              .filter((child) => child.isActive)
              .map((child) => {
                const childClass = store.classes.find((item) => item.id === child.classId);
                return (
                  <article className="rounded-[12px] border-2 border-cloud-gray p-4" key={child.id}>
                    <h3 className="text-lg font-extrabold text-almost-black">{child.name}</h3>
                    <p className="mt-1 text-sm font-bold text-graphite">
                      {childClass?.name ?? "반 미지정"} · {child.birthMonth}월 {child.birthDay}일
                    </p>
                  </article>
                );
              })}
          </div>
        </section>
      </div>
      <BottomNavigation active="children" />
    </main>
  );
}
