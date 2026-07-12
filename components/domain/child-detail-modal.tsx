"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { ChildAvatar } from "@/components/domain/child-avatar";
import { ProfilePhotoPicker } from "@/components/domain/profile-photo-picker";
import { PressableButton } from "@/components/ui/pressable-button";
import type { ChildGender, FamilyChild, FamilyClass, ParentRelation } from "@/lib/family/types";

export type ChildDetailFormInput = {
  name: string;
  photoDataUrl?: string;
  gender: ChildGender;
  birthDate?: string;
  parents: Array<{ id?: string; relation: ParentRelation; name: string; phone: string }>;
  address?: string;
  email?: string;
  registeredAt?: string;
  classId: string;
  notes?: string;
};

type ParentForm = {
  id: string;
  relation: ParentRelation;
  name: string;
  phone: string;
};

type ChildDetailModalProps = {
  child?: FamilyChild;
  classes: FamilyClass[];
  isReady: boolean;
  title: string;
  submitLabel: string;
  onClose: () => void;
  onDelete?: () => { ok: boolean; message: string };
  onSubmit: (input: ChildDetailFormInput) => { ok: boolean; message: string };
};

function getLocalIsoDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function createDraftId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function createEmptyParent(): ParentForm {
  return { id: createDraftId("parent"), relation: "father", name: "", phone: "" };
}

function getInitialBirthDate(child?: FamilyChild) {
  if (!child) {
    return "";
  }

  if (child.birthDate) {
    return child.birthDate;
  }

  if (child.birthYear && child.birthMonth && child.birthDay) {
    return `${child.birthYear}-${String(child.birthMonth).padStart(2, "0")}-${String(child.birthDay).padStart(2, "0")}`;
  }

  return "";
}

export function ChildDetailModal({
  child,
  classes,
  isReady,
  title,
  submitLabel,
  onClose,
  onDelete,
  onSubmit,
}: ChildDetailModalProps) {
  const initialClassId = useMemo(() => child?.classId ?? "", [child?.classId]);
  const [name, setName] = useState(child?.name ?? "");
  const [photoDataUrl, setPhotoDataUrl] = useState(child?.photoDataUrl ?? "");
  const [gender, setGender] = useState<ChildGender>(child?.gender ?? "unspecified");
  const [birthDate, setBirthDate] = useState(getInitialBirthDate(child));
  const [parents, setParents] = useState<ParentForm[]>(() =>
    child?.parents?.length
      ? child.parents.map((parent) => ({
          id: parent.id,
          relation: parent.relation ?? "other",
          name: parent.name,
          phone: parent.phone,
        }))
      : [createEmptyParent()],
  );
  const [address, setAddress] = useState(child?.address ?? "");
  const [email, setEmail] = useState(child?.email ?? "");
  const [registeredAt, setRegisteredAt] = useState(child?.registeredAt ?? getLocalIsoDate());
  const [classId, setClassId] = useState(initialClassId);
  const [notes, setNotes] = useState(child?.notes ?? "");
  const [error, setError] = useState("");
  const [isPhotoProcessing, setIsPhotoProcessing] = useState(false);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);

  const selectedClassId = classes.some((item) => item.id === classId) ? classId : "";

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPhotoViewerOpen) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPhotoViewerOpen, onClose]);

  function updateParentField(parentId: string, field: "relation" | "name" | "phone", value: string) {
    setParents((current) =>
      current.map((parent) => {
        if (parent.id !== parentId) {
          return parent;
        }

        return field === "relation" ? { ...parent, relation: value as ParentRelation } : { ...parent, [field]: value };
      }),
    );
  }

  function removeParent(parentId: string) {
    setParents((current) => (current.length > 1 ? current.filter((parent) => parent.id !== parentId) : current));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = onSubmit({
      name,
      photoDataUrl,
      gender,
      birthDate,
      parents,
      address,
      email,
      registeredAt,
      classId: selectedClassId,
      notes,
    });

    setError(result.message);
    if (result.ok) {
      onClose();
    }
  }

  function handleDelete() {
    if (!child || !onDelete) {
      return;
    }

    if (!window.confirm("아이를 삭제할까요?")) {
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
        aria-hidden={isPhotoViewerOpen || undefined}
        aria-labelledby="child-detail-title"
        aria-modal="true"
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[12px] bg-white p-4 sm:mx-auto sm:max-w-[720px] sm:rounded-[12px] sm:p-6"
        inert={isPhotoViewerOpen}
        role="dialog"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading-ko text-2xl font-bold text-almost-black" id="child-detail-title">
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

        <form className="mt-4 grid grid-cols-2 gap-3" onSubmit={handleSubmit}>
          <div className="col-span-2 block">
            <ProfilePhotoPicker
              onPhotoDataUrlChange={setPhotoDataUrl}
              onProcessingChange={setIsPhotoProcessing}
              onViewerOpenChange={setIsPhotoViewerOpen}
              photoDataUrl={photoDataUrl}
              preview={<ChildAvatar gender={gender} name={name} photoDataUrl={photoDataUrl} size="lg" />}
              previewLabel={`${name.trim() || "아이"} 사진`}
            />
          </div>

          <label className="block min-w-0">
            <span className="text-sm font-extrabold text-charcoal">이름</span>
            <input
              className="mt-2 min-h-12 w-full min-w-0 rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>

          <label className="block min-w-0">
            <span className="text-sm font-extrabold text-charcoal">성별</span>
            <select
              className="mt-2 min-h-12 w-full min-w-0 rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
              onChange={(event) => setGender(event.target.value as ChildGender)}
              value={gender}
            >
              <option value="unspecified">미입력</option>
              <option value="female">여</option>
              <option value="male">남</option>
            </select>
          </label>

          <label className="block min-w-0">
            <span className="text-sm font-extrabold text-charcoal">생년월일</span>
            <input
              className="mt-2 min-h-12 w-full min-w-0 rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
              onChange={(event) => setBirthDate(event.target.value)}
              type="date"
              value={birthDate}
            />
          </label>

          <label className="block min-w-0">
            <span className="text-sm font-extrabold text-charcoal">등록일</span>
            <input
              className="mt-2 min-h-12 w-full min-w-0 rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
              onChange={(event) => setRegisteredAt(event.target.value)}
              type="date"
              value={registeredAt}
            />
          </label>

          <label className="col-span-2 block min-w-0">
            <span className="text-sm font-extrabold text-charcoal">반</span>
            <select
              className="mt-2 min-h-12 w-full min-w-0 rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
              onChange={(event) => setClassId(event.target.value)}
              value={selectedClassId}
            >
              <option value="">반 미지정</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="col-span-2 rounded-[12px] border-2 border-cloud-gray p-3">
            <legend className="px-1 text-sm font-extrabold text-charcoal">부모님</legend>
            <div className="grid gap-3">
              {parents.map((parent, index) => (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[128px_1fr_1fr_auto]" key={parent.id}>
                  <label className="block min-w-0">
                    <span className="text-sm font-extrabold text-charcoal">관계</span>
                    <select
                      className="mt-2 min-h-12 w-full min-w-0 rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
                      onChange={(event) =>
                        updateParentField(parent.id, "relation", event.target.value as ParentRelation)
                      }
                      value={parent.relation}
                    >
                      <option value="father">아빠</option>
                      <option value="mother">엄마</option>
                      <option value="other">기타</option>
                    </select>
                  </label>
                  <label className="block min-w-0">
                    <span className="text-sm font-extrabold text-charcoal">성함</span>
                    <input
                      className="mt-2 min-h-12 w-full min-w-0 rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
                      onChange={(event) => updateParentField(parent.id, "name", event.target.value)}
                      value={parent.name}
                    />
                  </label>
                  <label className="block min-w-0">
                    <span className="text-sm font-extrabold text-charcoal">전화번호</span>
                    <input
                      className="mt-2 min-h-12 w-full min-w-0 rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
                      onChange={(event) => updateParentField(parent.id, "phone", event.target.value)}
                      type="tel"
                      value={parent.phone}
                    />
                  </label>
                  <button
                    aria-label={`${index + 1}번째 부모님 삭제`}
                    className="mt-7 inline-flex min-h-12 items-center justify-center rounded-[12px] border-2 border-cloud-gray px-3 text-graphite disabled:opacity-40"
                    disabled={parents.length === 1}
                    onClick={() => removeParent(parent.id)}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] border-2 border-cloud-gray px-4 text-sm font-extrabold text-sky-blue-text"
              onClick={() => setParents((current) => [...current, createEmptyParent()])}
              type="button"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              부모님 추가
            </button>
          </fieldset>

          <label className="col-span-2 block min-w-0">
            <span className="text-sm font-extrabold text-charcoal">주소</span>
            <input
              className="mt-2 min-h-12 w-full min-w-0 rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
              onChange={(event) => setAddress(event.target.value)}
              value={address}
            />
          </label>

          <label className="col-span-2 block min-w-0">
            <span className="text-sm font-extrabold text-charcoal">이메일</span>
            <input
              className="mt-2 min-h-12 w-full min-w-0 rounded-[12px] border-2 border-cloud-gray px-3 text-base font-bold text-almost-black"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </label>

          <label className="col-span-2 block min-w-0">
            <span className="text-sm font-extrabold text-charcoal">특이사항</span>
            <textarea
              className="mt-2 min-h-24 w-full min-w-0 resize-y rounded-[12px] border-2 border-cloud-gray p-3 text-base font-medium text-almost-black"
              maxLength={500}
              onChange={(event) => setNotes(event.target.value)}
              value={notes}
            />
          </label>

          {error ? (
            <p className="col-span-2 rounded-[12px] bg-[#ffe8e6] p-3 text-sm font-bold text-[#b3261e]" role="alert">
              {error}
            </p>
          ) : null}

          <div className="col-span-2 grid grid-cols-2 gap-2">
            <button
              className="min-h-12 rounded-[12px] border-2 border-cloud-gray px-4 text-base font-extrabold text-graphite"
              onClick={onClose}
              type="button"
            >
              취소
            </button>
            <PressableButton disabled={!isReady || isPhotoProcessing} type="submit">
              {submitLabel}
            </PressableButton>
          </div>

          {child && onDelete ? (
            <button
              className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] border-2 border-[#ffc3bd] bg-[#fff4f2] px-4 text-base font-extrabold text-[#b3261e]"
              disabled={!isReady}
              onClick={handleDelete}
              type="button"
            >
              <Trash2 aria-hidden="true" className="h-5 w-5" />
              아이 삭제
            </button>
          ) : null}
        </form>
      </section>
    </div>
  );
}
