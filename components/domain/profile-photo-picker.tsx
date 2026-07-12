"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Images, Trash2, X } from "lucide-react";
import { preparePhotoDataUrl } from "@/lib/family/photo-data-url";

type ProfilePhotoPickerProps = {
  photoDataUrl?: string;
  preview: ReactNode;
  previewLabel?: string;
  onPhotoDataUrlChange: (photoDataUrl: string) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
  onViewerOpenChange?: (isOpen: boolean) => void;
};

const pickerClassName =
  "relative flex min-h-12 min-w-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-[12px] border-2 border-cloud-gray px-3 text-center text-sm font-extrabold text-sky-blue-text focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-sky-blue-text";

export function ProfilePhotoPicker({
  photoDataUrl,
  preview,
  previewLabel = "사진",
  onPhotoDataUrlChange,
  onProcessingChange,
  onViewerOpenChange,
}: ProfilePhotoPickerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [error, setError] = useState("");
  const viewerTitleId = useId();
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const viewerRef = useRef<HTMLElement>(null);
  const viewerCloseButtonRef = useRef<HTMLButtonElement>(null);
  const previewButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!isViewerOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    const returnFocusElement = previewButtonRef.current;
    document.body.style.overflow = "hidden";
    onViewerOpenChange?.(true);
    viewerCloseButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setIsViewerOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = Array.from(
        viewerRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      const first = focusable.at(0);
      const last = focusable.at(-1);
      if (!first || !last) {
        return;
      }

      if (event.shiftKey && (document.activeElement === first || !viewerRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !viewerRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown, true);
      onViewerOpenChange?.(false);
      window.requestAnimationFrame(() => returnFocusElement?.focus());
    };
  }, [isViewerOpen, onViewerOpenChange]);

  function updateProcessing(nextIsProcessing: boolean) {
    setIsProcessing(nextIsProcessing);
    onProcessingChange?.(nextIsProcessing);
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";

    if (!file) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setError("");
    updateProcessing(true);

    let result;
    try {
      result = await preparePhotoDataUrl(file);
    } catch {
      result = { ok: false as const, message: "사진을 처리하지 못했습니다. 다른 사진으로 다시 시도해 주세요." };
    }

    if (!isMountedRef.current || requestIdRef.current !== requestId) {
      return;
    }

    updateProcessing(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    onPhotoDataUrlChange(result.dataUrl);
  }

  function handleRemovePhoto() {
    requestIdRef.current += 1;
    setError("");
    updateProcessing(false);
    setIsViewerOpen(false);
    onPhotoDataUrlChange("");
  }

  return (
    <div>
      <div className="flex min-w-0 items-start gap-3">
        <div className="shrink-0">
          {photoDataUrl ? (
            <button
              aria-expanded={isViewerOpen}
              aria-haspopup="dialog"
              aria-label={`${previewLabel} 크게 보기`}
              className="block rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-blue-text disabled:opacity-60"
              disabled={isProcessing}
              onClick={() => setIsViewerOpen(true)}
              ref={previewButtonRef}
              type="button"
            >
              {preview}
            </button>
          ) : (
            preview
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
            <label className={`${pickerClassName} ${isProcessing ? "opacity-60" : ""}`}>
              <Camera aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="pointer-events-none">사진 찍기</span>
              <input
                accept="image/*"
                capture="environment"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                disabled={isProcessing}
                onChange={handlePhotoChange}
                type="file"
              />
            </label>
            <label className={`${pickerClassName} ${isProcessing ? "opacity-60" : ""}`}>
              <Images aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="pointer-events-none">앨범에서 선택</span>
              <input
                accept="image/*"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                disabled={isProcessing}
                onChange={handlePhotoChange}
                type="file"
              />
            </label>
          </div>
        </div>
      </div>
      {isProcessing ? (
        <p className="mt-2 rounded-[12px] bg-[#e8f7ff] p-3 text-sm font-bold text-sky-blue-text" role="status">
          사진을 처리하는 중입니다.
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 rounded-[12px] bg-[#ffe8e6] p-3 text-sm font-bold text-[#b3261e]" role="alert">
          {error}
        </p>
      ) : null}
      {isViewerOpen && photoDataUrl
        ? createPortal(
            <div className="fixed inset-0 z-[60] flex items-end bg-almost-black/70 sm:items-center sm:p-4">
              <section
                aria-labelledby={viewerTitleId}
                aria-modal="true"
                className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[12px] bg-white p-4 pb-[calc(16px+var(--safe-bottom))] sm:mx-auto sm:max-w-[720px] sm:rounded-[12px] sm:p-6"
                ref={viewerRef}
                role="dialog"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-heading-ko text-2xl font-bold text-almost-black" id={viewerTitleId}>
                    {previewLabel} 크게 보기
                  </h2>
                  <button
                    aria-label="사진 크게 보기 닫기"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border-2 border-cloud-gray text-graphite focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-blue-text"
                    onClick={() => setIsViewerOpen(false)}
                    ref={viewerCloseButtonRef}
                    type="button"
                  >
                    <X aria-hidden="true" className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-4 flex max-h-[68dvh] min-h-48 items-center justify-center overflow-hidden rounded-[12px] bg-[#f2f2f2] p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={previewLabel} className="max-h-[64dvh] max-w-full object-contain" src={photoDataUrl} />
                </div>

                <button
                  className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[12px] border-2 border-[#ffc3bd] bg-[#fff4f2] px-4 text-base font-extrabold text-[#b3261e]"
                  onClick={handleRemovePhoto}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="h-5 w-5" />
                  사진 삭제
                </button>
              </section>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
