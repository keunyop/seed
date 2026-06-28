"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Pencil, Plus, Trash2, UserRoundCog, X } from "lucide-react";
import { SaveStatus } from "@/components/domain/save-status";
import { useFamilyOpenStore } from "@/components/domain/use-family-open-store";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { PressableButton } from "@/components/ui/pressable-button";
import { preparePhotoDataUrl } from "@/lib/family/photo-data-url";
import { formatTeacherBirthDate, getClassLabel, parseBirthDateParts } from "@/lib/family/stats";
import type { FamilyOpenStore, FamilyTeacher } from "@/lib/family/types";

type TeacherFormInput = {
  name: string;
  birthMonth: number;
  birthDay: number;
  classId: string;
  phone?: string;
  photoDataUrl?: string;
};

type TeacherDetailModalProps = {
  store: FamilyOpenStore;
  isReady: boolean;
  mode: "add" | "edit";
  teacher?: FamilyTeacher;
  onClose: () => void;
  onDelete?: () => { ok: boolean; message: string };
  onSubmit: (input: TeacherFormInput) => { ok: boolean; message: string };
};

const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1);

function getMonthDayLimit(month: number) {
  return new Date(Date.UTC(2024, month, 0)).getUTCDate();
}

function getTeacherClass(store: FamilyOpenStore, teacher: FamilyTeacher) {
  return store.classes.find((item) => item.teacherId === teacher.id);
}

function getTeacherBirthParts(teacher?: FamilyTeacher) {
  if (teacher?.birthMonth && teacher.birthDay) {
    return {
      birthMonth: teacher.birthMonth,
      birthDay: teacher.birthDay,
    };
  }

  if (teacher?.birthDate) {
    const parts = parseBirthDateParts(teacher.birthDate);
    if (parts) {
      return {
        birthMonth: parts.month,
        birthDay: parts.day,
      };
    }
  }

  return {
    birthMonth: 1,
    birthDay: 1,
  };
}

function TeacherDetailModal({ store, isReady, mode, teacher, onClose, onDelete, onSubmit }: TeacherDetailModalProps) {
  const teacherClass = teacher ? getTeacherClass(store, teacher) : undefined;
  const initialClassId = useMemo(() => teacherClass?.id ?? "", [teacherClass?.id]);
  const initialBirth = getTeacherBirthParts(teacher);
  const [photoDataUrl, setPhotoDataUrl] = useState(teacher?.photoDataUrl ?? "");
  const [name, setName] = useState(teacher?.name ?? "");
  const [birthMonth, setBirthMonth] = useState(initialBirth.birthMonth);
  const [birthDay, setBirthDay] = useState(initialBirth.birthDay);
  const [classId, setClassId] = useState(initialClassId);
  const [phone, setPhone] = useState(teacher?.phone ?? "");
  const [error, setError] = useState("");
  const [photoStatus, setPhotoStatus] = useState<"idle" | "processing">("idle");
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoRequestIdRef = useRef(0);
  const selectedClassId = store.classes.some((item) => item.id === classId) ? classId : "";
  const dayLimit = getMonthDayLimit(birthMonth);
  const dayOptions = Array.from({ length: dayLimit }, (_, index) => index + 1);
  const title = mode === "add" ? "선생님 등록" : `${teacher?.name ?? "선생님"} 수정`;
  const isPhotoProcessing = photoStatus === "processing";

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function handleBirthMonthChange(value: string) {
    const nextMonth = Number(value);
    const nextDayLimit = getMonthDayLimit(nextMonth);
    setBirthMonth(nextMonth);
    setBirthDay((current) => Math.min(current, nextDayLimit));
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    const requestId = photoRequestIdRef.current + 1;
    photoRequestIdRef.current = requestId;
    setError("");
    setPhotoStatus("idle");

    if (!file) {
      return;
    }

    setPhotoStatus("processing");
    const result = await preparePhotoDataUrl(file);
    if (photoRequestIdRef.current !== requestId) {
      return;
    }

    if (!result.ok) {
      setPhotoStatus("idle");
      setError(result.message);
      input.value = "";
      return;
    }

    setPhotoDataUrl(result.dataUrl);
    setPhotoStatus("idle");
    setIsPhotoMenuOpen(false);
  }

  function openPhotoPicker() {
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
      photoInputRef.current.click();
    }
  }

  function handlePhotoButtonClick() {
    if (photoDataUrl) {
      setIsPhotoMenuOpen((current) => !current);
      return;
    }

    openPhotoPicker();
  }

  function handleChangePhoto() {
    setIsPhotoMenuOpen(false);
    openPhotoPicker();
  }

  function handleRemovePhoto() {
    setPhotoDataUrl("");
    setPhotoStatus("idle");
    setError("");
    setIsPhotoMenuOpen(false);
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = onSubmit({
      name,
      birthMonth,
      birthDay,
      classId: selectedClassId,
      phone,
      photoDataUrl,
    });

    setError(result.message);
    if (result.ok) {
      onClose();
    }
  }

  function handleDelete() {
    if (!teacher || !onDelete) {
      return;
    }

    if (!window.confirm("선생님을 삭제할까요?")) {
      return;
    }

    const result = onDelete();
    setError(result.message);
    if (result.ok) {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-almost-black/40 sm:items-center sm:p-4">
      <section
        aria-labelledby="teacher-detail-title"
        aria-modal="true"
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[12px] bg-white p-4 sm:mx-auto sm:max-w-[640px] sm:rounded-[12px] sm:p-6"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading-ko text-2xl font-bold text-almost-black" id="teacher-detail-title">
            {title}
          </h2>
          <button
            aria-label={`${title} 닫기`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border-2 border-cloud-gray text-graphite"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
          <div className="block sm:col-span-2">
            <span className="text-sm font-extrabold text-charcoal">사진</span>
            <div className="mt-2 flex items-center gap-3">
              <div className="relative shrink-0">
                <button
                  aria-expanded={photoDataUrl ? isPhotoMenuOpen : undefined}
                  aria-label={photoDataUrl ? "사진 메뉴 열기" : "사진 선택"}
                  className="relative rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-blue-text"
                  onClick={handlePhotoButtonClick}
                  type="button"
                >
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-cloud-gray bg-duo-green-light">
                    {photoDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt="" className="h-full w-full object-cover" src={photoDataUrl} />
                    ) : (
                      <Camera aria-hidden="true" className="h-6 w-6 text-duo-green-dark" />
                    )}
                  </span>
                  <span className="absolute bottom-0 right-0 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-sky-blue text-white">
                    {photoDataUrl ? (
                      <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                    ) : (
                      <Camera aria-hidden="true" className="h-3.5 w-3.5" />
                    )}
                  </span>
                </button>
                {photoDataUrl && isPhotoMenuOpen ? (
                  <div className="absolute left-0 top-[calc(100%+8px)] z-10 w-32 overflow-hidden rounded-[12px] border-2 border-cloud-gray bg-white">
                    <button
                      className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-extrabold text-almost-black"
                      onClick={handleChangePhoto}
                      type="button"
                    >
                      <Pencil aria-hidden="true" className="h-4 w-4 text-sky-blue-text" />
                      수정
                    </button>
                    <button
                      className="flex min-h-11 w-full items-center gap-2 border-t-2 border-cloud-gray px-3 text-left text-sm font-extrabold text-[#b3261e]"
                      onClick={handleRemovePhoto}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                      삭제
                    </button>
                  </div>
                ) : null}
              </div>
              <input
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
                ref={photoInputRef}
                type="file"
              />
            </div>
            {isPhotoProcessing ? (
              <p className="mt-2 rounded-[12px] bg-[#e8f7ff] p-3 text-sm font-bold text-sky-blue-text" role="status">
                사진 크기를 줄이는 중입니다.
              </p>
            ) : null}
          </div>

          <label className="block">
            <span className="text-sm font-extrabold text-charcoal">이름</span>
            <input
              className="mt-2 min-h-12 w-full rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-extrabold text-charcoal">생일 월</span>
              <select
                className="mt-2 min-h-12 w-full rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
                onChange={(event) => handleBirthMonthChange(event.target.value)}
                value={birthMonth}
              >
                {monthOptions.map((month) => (
                  <option key={month} value={month}>
                    {month}월
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-extrabold text-charcoal">생일 일</span>
              <select
                className="mt-2 min-h-12 w-full rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
                onChange={(event) => setBirthDay(Number(event.target.value))}
                value={birthDay}
              >
                {dayOptions.map((day) => (
                  <option key={day} value={day}>
                    {day}일
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-extrabold text-charcoal">반</span>
            <select
              className="mt-2 min-h-12 w-full rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
              onChange={(event) => setClassId(event.target.value)}
              value={selectedClassId}
            >
              <option value="">반 미지정</option>
              {store.classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {getClassLabel(store, item.id)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-extrabold text-charcoal">전화번호</span>
            <input
              className="mt-2 min-h-12 w-full rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
              onChange={(event) => setPhone(event.target.value)}
              type="tel"
              value={phone}
            />
          </label>

          {error ? (
            <p className="rounded-[12px] bg-[#ffe8e6] p-3 text-sm font-bold text-[#b3261e] sm:col-span-2" role="alert">
              {error}
            </p>
          ) : null}

          <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
            <button
              className="min-h-12 rounded-[12px] border-2 border-cloud-gray px-4 text-base font-extrabold text-graphite"
              onClick={onClose}
              type="button"
            >
              취소
            </button>
            <PressableButton disabled={!isReady || isPhotoProcessing} type="submit">
              선생님 저장
            </PressableButton>
          </div>

          {teacher && onDelete ? (
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] border-2 border-[#ffc3bd] bg-[#fff4f2] px-4 text-base font-extrabold text-[#b3261e] sm:col-span-2"
              disabled={!isReady}
              onClick={handleDelete}
              type="button"
            >
              <Trash2 aria-hidden="true" className="h-5 w-5" />
              선생님 삭제
            </button>
          ) : null}
        </form>
      </section>
    </div>
  );
}

export function TeachersClient() {
  const { store, saveState, isReady, addTeacher, updateTeacher, deleteTeacher } = useFamilyOpenStore();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<FamilyTeacher | null>(null);
  const activeTeachers = store.teachers.filter((teacher) => teacher.isActive);

  return (
    <main className="min-h-dvh bg-white pb-[calc(88px+var(--safe-bottom))]">
      <div className="mx-auto w-full max-w-[720px] px-4 py-5 sm:px-6">
        <header className="rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-heading-ko text-3xl font-bold text-almost-black">선생님</h1>
            <SaveStatus state={saveState} />
          </div>
          <div className="mt-4">
            <PressableButton className="w-full sm:w-auto" disabled={!isReady} onClick={() => setIsAddOpen(true)}>
              <Plus aria-hidden="true" className="h-5 w-5" />
              선생님 등록
            </PressableButton>
          </div>
        </header>

        <section className="mt-4 rounded-[12px] border-2 border-cloud-gray p-4 sm:p-6">
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-almost-black">
            <UserRoundCog aria-hidden="true" className="h-5 w-5 text-sky-blue-text" />
            등록된 선생님 {activeTeachers.length}명
          </h2>
          <div className="mt-4 grid gap-3">
            {activeTeachers.map((teacher) => {
                const teacherClass = getTeacherClass(store, teacher);
                return (
                  <button
                    aria-label={`${teacher.name} 상세정보 열기`}
                    className="rounded-[12px] border-2 border-cloud-gray p-4 text-left transition-colors hover:border-sky-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-blue-text disabled:opacity-60"
                    disabled={!isReady}
                    key={teacher.id}
                    onClick={() => setSelectedTeacher(teacher)}
                    type="button"
                  >
                    <div className="flex gap-3">
                      {teacher.photoDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt={`${teacher.name} 사진`}
                          className="h-14 w-14 shrink-0 rounded-full border-2 border-cloud-gray object-cover"
                          src={teacher.photoDataUrl}
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-duo-green-light text-lg font-extrabold text-duo-green-dark">
                          {teacher.name.slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-lg font-extrabold text-almost-black">{teacher.name}</h3>
                        <p className="mt-1 text-sm font-bold text-graphite">
                          {teacherClass ? getClassLabel(store, teacherClass.id) : "반 미지정"}
                        </p>
                        <p className="mt-1 text-sm font-medium text-graphite">
                          {formatTeacherBirthDate(teacher)} · {teacher.phone ?? "전화번호 미입력"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </section>
      </div>

      {isAddOpen ? (
        <TeacherDetailModal
          isReady={isReady}
          mode="add"
          onClose={() => setIsAddOpen(false)}
          onSubmit={addTeacher}
          store={store}
        />
      ) : null}

      {selectedTeacher ? (
        <TeacherDetailModal
          isReady={isReady}
          mode="edit"
          onClose={() => setSelectedTeacher(null)}
          onDelete={() => deleteTeacher(selectedTeacher.id)}
          onSubmit={(input) => updateTeacher({ ...input, id: selectedTeacher.id })}
          store={store}
          teacher={selectedTeacher}
        />
      ) : null}

      <BottomNavigation active="teachers" />
    </main>
  );
}
