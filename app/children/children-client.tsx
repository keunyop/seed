"use client";

import { useMemo, useState } from "react";
import { Baby, Plus, Search } from "lucide-react";
import { ChildAvatar } from "@/components/domain/child-avatar";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { ChildDetailModal } from "@/components/domain/child-detail-modal";
import { SaveStatus } from "@/components/domain/save-status";
import { useFamilyOpenStore } from "@/components/domain/use-family-open-store";
import { PressableButton } from "@/components/ui/pressable-button";
import { formatChildBirthDate, getClassLabel, sortChildrenForRoster } from "@/lib/family/stats";
import type { ChildrenSortMode } from "@/lib/family/stats";
import type { ChildGender, FamilyChild } from "@/lib/family/types";

function getGenderLabel(gender?: ChildGender) {
  if (gender === "male") {
    return "남";
  }

  if (gender === "female") {
    return "여";
  }

  return "미입력";
}

function getParentNamesLabel(child: FamilyChild) {
  const parentNames = (child.parents ?? [])
    .map((parent) => parent.name.trim())
    .filter((name) => name.length > 0);

  if (parentNames.length === 0) {
    return "미입력";
  }

  return parentNames.join(", ");
}

export function ChildrenClient() {
  const { store, saveState, isReady, addChild, updateChild, deleteChild } = useFamilyOpenStore();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState<FamilyChild | null>(null);
  const [filterClassId, setFilterClassId] = useState("all");
  const [nameFilter, setNameFilter] = useState("");
  const [sortMode, setSortMode] = useState<ChildrenSortMode>("name");
  const normalizedNameFilter = nameFilter.trim().toLocaleLowerCase("ko-KR");
  const activeChildren = useMemo(() => store.children.filter((child) => child.isActive), [store.children]);
  const filteredChildren = useMemo(
    () => {
      const filtered = activeChildren.filter((child) => {
        const matchesClass = filterClassId === "all" || child.classId === filterClassId;
        const matchesName = !normalizedNameFilter || child.name.toLocaleLowerCase("ko-KR").includes(normalizedNameFilter);
        return matchesClass && matchesName;
      });

      return sortChildrenForRoster(filtered, store.classes, sortMode);
    },
    [activeChildren, filterClassId, normalizedNameFilter, sortMode, store.classes],
  );

  return (
    <main className="min-h-dvh bg-white pb-[calc(88px+var(--safe-bottom))]">
      <div className="mx-auto w-full max-w-[920px] px-4 py-5 sm:px-6">
        <header className="rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-heading-ko text-3xl font-bold text-almost-black">아이들</h1>
            </div>
            <SaveStatus state={saveState} />
          </div>
          <div className="mt-4">
            <PressableButton className="w-full sm:w-auto" disabled={!isReady} onClick={() => setIsAddOpen(true)}>
              <Plus aria-hidden="true" className="h-5 w-5" />
              아이 추가
            </PressableButton>
          </div>
        </header>

        <section className="mt-4 rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-extrabold text-charcoal">반 필터</span>
              <select
                className="mt-2 min-h-12 w-full rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
                onChange={(event) => setFilterClassId(event.target.value)}
                value={filterClassId}
              >
                <option value="all">전체 반</option>
                {store.classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {getClassLabel(store, item.id)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-extrabold text-charcoal">이름 필터</span>
              <span className="mt-2 flex min-h-12 items-center gap-2 rounded-[12px] border-2 border-cloud-gray px-3">
                <Search aria-hidden="true" className="h-4 w-4 text-sky-blue-text" />
                <input
                  className="min-h-10 w-full border-0 p-0 text-base font-bold text-almost-black outline-none"
                  onChange={(event) => setNameFilter(event.target.value)}
                  value={nameFilter}
                />
              </span>
            </label>
          </div>
          <div className="mt-3">
            <span className="text-sm font-extrabold text-charcoal">정렬</span>
            <div className="mt-2 grid grid-cols-2 gap-2 rounded-[12px] border-2 border-cloud-gray bg-[#f7f7f7] p-1">
              {[
                { id: "name", label: "가나다" },
                { id: "class", label: "반별" },
              ].map((item) => {
                const isActive = sortMode === item.id;
                return (
                  <button
                    aria-pressed={isActive}
                    className={`min-h-11 rounded-[10px] px-3 text-base font-extrabold transition ${
                      isActive ? "bg-white text-almost-black shadow-[0_2px_0_#e5e5e5]" : "text-graphite"
                    }`}
                    key={item.id}
                    onClick={() => setSortMode(item.id as ChildrenSortMode)}
                    type="button"
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-almost-black">
            <Baby aria-hidden="true" className="h-5 w-5 text-sky-blue-text" />
            등록된 아이 {filteredChildren.length}명
          </h2>
          {filteredChildren.length === 0 ? (
            <div className="mt-4 rounded-[12px] bg-duo-green-light p-4">
              <p className="font-bold text-almost-black">조건에 맞는 아이가 없습니다.</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {filteredChildren.map((child) => {
                const childClass = store.classes.find((item) => item.id === child.classId);
                return (
                  <button
                    className="flex gap-3 rounded-[12px] border-2 border-cloud-gray p-4 text-left transition hover:border-duo-green focus-visible:border-sky-blue"
                    key={child.id}
                    onClick={() => setSelectedChild(child)}
                    type="button"
                  >
                    <ChildAvatar gender={child.gender} name={child.name} photoDataUrl={child.photoDataUrl} />
                    <div className="min-w-0">
                      <h3 className="text-lg font-extrabold text-almost-black">{child.name}</h3>
                      <p className="mt-1 text-sm font-bold text-graphite">
                        {childClass?.name ?? "반 미지정"} · {formatChildBirthDate(child)} · {getGenderLabel(child.gender)}
                      </p>
                      <p className="mt-1 text-sm font-medium text-graphite">{getParentNamesLabel(child)}</p>
                      {child.notes ? <p className="mt-2 text-sm font-bold text-charcoal">{child.notes}</p> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {isAddOpen ? (
        <ChildDetailModal
          classes={store.classes}
          isReady={isReady}
          onClose={() => setIsAddOpen(false)}
          onSubmit={addChild}
          submitLabel="아이 저장"
          title="아이 추가"
        />
      ) : null}

      {selectedChild ? (
        <ChildDetailModal
          child={selectedChild}
          classes={store.classes}
          isReady={isReady}
          onClose={() => setSelectedChild(null)}
          onDelete={() => deleteChild(selectedChild.id)}
          onSubmit={(input) => updateChild({ ...input, id: selectedChild.id })}
          submitLabel="수정 저장"
          title={`${selectedChild.name} 상세정보`}
        />
      ) : null}

      <BottomNavigation active="children" />
    </main>
  );
}
