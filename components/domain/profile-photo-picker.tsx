"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Camera, Images, Trash2 } from "lucide-react";
import { preparePhotoDataUrl } from "@/lib/family/photo-data-url";

type ProfilePhotoPickerProps = {
  photoDataUrl?: string;
  preview: ReactNode;
  onPhotoDataUrlChange: (photoDataUrl: string) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
};

const pickerClassName =
  "relative flex min-h-12 min-w-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-[12px] border-2 border-cloud-gray px-3 text-center text-sm font-extrabold text-sky-blue-text focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-sky-blue-text";

export function ProfilePhotoPicker({
  photoDataUrl,
  preview,
  onPhotoDataUrlChange,
  onProcessingChange,
}: ProfilePhotoPickerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

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
    onPhotoDataUrlChange("");
  }

  return (
    <div>
      <span className="text-sm font-extrabold text-charcoal">사진</span>
      <div className="mt-2 flex min-w-0 items-start gap-3">
        <div className="shrink-0">{preview}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-graphite">
            {photoDataUrl ? "현재 사진 미리보기" : "등록된 사진 없음"}
          </p>
          <div className="mt-2 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
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
          {photoDataUrl ? (
            <button
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[12px] border-2 border-[#ffc3bd] bg-[#fff4f2] px-3 text-sm font-extrabold text-[#b3261e] disabled:opacity-60"
              disabled={isProcessing}
              onClick={handleRemovePhoto}
              type="button"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              사진 삭제
            </button>
          ) : null}
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
    </div>
  );
}
