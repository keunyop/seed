"use client";

import { CheckCircle2, Copy, Grid3X3, List, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChildAvatar } from "@/components/domain/child-avatar";
import { cn } from "@/lib/utils";
import type { FamilyChild } from "@/lib/family/types";

export type ReportPersonItem = {
  id: string;
  child: FamilyChild;
  meta: string;
};

type ReportDetailModalProps = {
  title: string;
  emptyMessage: string;
  items: ReportPersonItem[];
  copyText: string;
  summary?: string;
  initialViewMode?: ViewMode;
  onItemSelect?: (item: ReportPersonItem) => void;
  onClose: () => void;
};

export type ViewMode = "grid" | "list";

export function ReportDetailModal({
  title,
  emptyMessage,
  items,
  copyText,
  summary,
  initialViewMode = "grid",
  onItemSelect,
  onClose,
}: ReportDetailModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      const first = focusable.at(0);
      const last = focusable.at(-1);
      if (!first || !last) {
        return;
      }

      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [onClose]);

  async function copyList() {
    try {
      await navigator.clipboard.writeText(copyText);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = copyText;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-almost-black/40 sm:items-center sm:p-4">
      <section
        aria-labelledby="report-detail-title"
        aria-modal="true"
        className="max-h-[88dvh] w-full overflow-y-auto rounded-t-[12px] bg-white p-4 pb-[calc(16px+var(--safe-bottom))] sm:mx-auto sm:max-w-[640px] sm:rounded-[12px] sm:p-6"
        ref={dialogRef}
        role="dialog"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading-ko text-2xl font-bold text-almost-black" id="report-detail-title">
            {title}
          </h2>
          <button
            aria-label="통계 상세 닫기"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border-2 border-cloud-gray text-graphite focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-blue-text"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        {summary ? <p className="mt-2 break-words text-sm font-extrabold text-graphite">{summary}</p> : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] border-2 border-cloud-gray px-4 text-sm font-extrabold text-sky-blue-text"
            onClick={copyList}
            type="button"
          >
            {copied ? (
              <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-duo-green-dark" />
            ) : (
              <Copy aria-hidden="true" className="h-4 w-4" />
            )}
            {copied ? "복사됨" : "명단 복사"}
          </button>

          <div aria-label="명단 보기 방식" className="grid grid-cols-2 rounded-[12px] bg-[#f2f2f2] p-1" role="group">
            <button
              aria-pressed={viewMode === "grid"}
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[9px] px-3 text-sm font-extrabold",
                viewMode === "grid" ? "bg-white text-almost-black" : "text-graphite",
              )}
              onClick={() => setViewMode("grid")}
              type="button"
            >
              <Grid3X3 aria-hidden="true" className="h-4 w-4" />
              아바타
            </button>
            <button
              aria-pressed={viewMode === "list"}
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[9px] px-3 text-sm font-extrabold",
                viewMode === "list" ? "bg-white text-almost-black" : "text-graphite",
              )}
              onClick={() => setViewMode("list")}
              type="button"
            >
              <List aria-hidden="true" className="h-4 w-4" />
              목록
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="mt-4 rounded-[12px] bg-duo-green-light p-4 text-sm font-bold text-charcoal">
            {emptyMessage}
          </p>
        ) : viewMode === "grid" ? (
          <div className="mt-4 grid grid-cols-4 place-items-center gap-4 sm:grid-cols-6">
            {items.map((item) => {
              return onItemSelect ? (
                <button
                  aria-label={`${item.child.name} 상세정보 보기`}
                  className="inline-flex h-16 w-16 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-blue-text"
                  key={item.id}
                  onClick={() => onItemSelect(item)}
                  type="button"
                >
                  <ChildAvatar
                    gender={item.child.gender}
                    name={item.child.name}
                    photoDataUrl={item.child.photoDataUrl}
                    size="lg"
                  />
                </button>
              ) : (
                <ChildAvatar
                  gender={item.child.gender}
                  key={item.id}
                  name={item.child.name}
                  photoDataUrl={item.child.photoDataUrl}
                  size="lg"
                />
              );
            })}
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {items.map((item) => {
              const content = (
                <>
                  <ChildAvatar
                    gender={item.child.gender}
                    name={item.child.name}
                    photoDataUrl={item.child.photoDataUrl}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-lg font-extrabold text-almost-black">{item.child.name}</span>
                    <span className="block break-words text-sm font-bold text-graphite">{item.meta}</span>
                  </span>
                </>
              );

              return onItemSelect ? (
                <button
                  className="flex min-w-0 items-center gap-3 rounded-[12px] border-2 border-cloud-gray p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-blue-text"
                  key={item.id}
                  onClick={() => onItemSelect(item)}
                  type="button"
                >
                  {content}
                </button>
              ) : (
                <article
                  className="flex min-w-0 items-center gap-3 rounded-[12px] border-2 border-cloud-gray p-3"
                  key={item.id}
                >
                  {content}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
