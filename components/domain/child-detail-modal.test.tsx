import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { preparePhotoDataUrl } from "@/lib/family/photo-data-url";
import type { FamilyChild } from "@/lib/family/types";
import { ChildDetailModal } from "./child-detail-modal";

vi.mock("@/lib/family/photo-data-url", () => ({
  preparePhotoDataUrl: vi.fn(),
}));

const mockedPreparePhotoDataUrl = vi.mocked(preparePhotoDataUrl);
const photoDataUrl = "data:image/jpeg;base64,cGhvdG8=";
const child: FamilyChild = {
  id: "child-1",
  name: "김새싹",
  classId: "class-1",
  gender: "female",
  parents: [],
  registeredAt: "2026-07-01",
  isActive: true,
};
const classes = [{ id: "class-1", name: "새싹반" }];

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("ChildDetailModal photo autosave", () => {
  it("saves a prepared photo only, shows progress, and leaves other draft fields unsaved", async () => {
    mockedPreparePhotoDataUrl.mockResolvedValue({ ok: true, dataUrl: photoDataUrl, wasCompressed: false });
    const deferred = createDeferred<{ ok: boolean; message: string }>();
    const onPhotoAutoSave = vi.fn(() => deferred.promise);
    const onSubmit = vi.fn(() => ({ ok: true, message: "" }));
    render(
      <ChildDetailModal
        child={child}
        classes={classes}
        isReady
        onClose={vi.fn()}
        onPhotoAutoSave={onPhotoAutoSave}
        onSubmit={onSubmit}
        submitLabel="수정 저장"
        title="김새싹 상세정보"
      />,
    );

    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "저장 전 이름" } });
    fireEvent.change(screen.getByLabelText("사진 찍기"), {
      target: { files: [new File(["photo"], "camera.jpg", { type: "image/jpeg" })] },
    });

    expect(await screen.findByText("사진을 저장하는 중입니다.")).toBeInTheDocument();
    expect(onPhotoAutoSave).toHaveBeenCalledWith(photoDataUrl);
    expect(screen.getByLabelText("사진 찍기")).toBeDisabled();
    expect(screen.getByLabelText("앨범에서 선택")).toBeDisabled();
    expect(screen.getByRole("button", { name: "수정 저장" })).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();

    await act(async () => deferred.resolve({ ok: true, message: "" }));
    expect(await screen.findByText(/사진만 바로 저장되었습니다/)).toBeInTheDocument();
    expect(screen.getByLabelText("이름")).toHaveValue("저장 전 이름");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps the selected photo and draft after failure, then retries the same photo", async () => {
    mockedPreparePhotoDataUrl.mockResolvedValue({ ok: true, dataUrl: photoDataUrl, wasCompressed: false });
    const onPhotoAutoSave = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, message: "raw database error" })
      .mockResolvedValueOnce({ ok: true, message: "" });
    render(
      <ChildDetailModal
        child={child}
        classes={classes}
        isReady
        onClose={vi.fn()}
        onPhotoAutoSave={onPhotoAutoSave}
        onSubmit={vi.fn(() => ({ ok: true, message: "" }))}
        submitLabel="수정 저장"
        title="김새싹 상세정보"
      />,
    );

    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "수정 중 이름" } });
    fireEvent.change(screen.getByLabelText("앨범에서 선택"), {
      target: { files: [new File(["photo"], "album.jpg", { type: "image/jpeg" })] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("네트워크 연결을 확인한 뒤 다시 저장해 주세요.");
    expect(screen.getByRole("alert")).not.toHaveTextContent("raw database error");
    expect(screen.getByRole("button", { name: "수정 중 이름 사진 크게 보기" })).toBeInTheDocument();
    expect(screen.getByLabelText("이름")).toHaveValue("수정 중 이름");

    fireEvent.click(screen.getByRole("button", { name: "사진 다시 저장" }));
    expect(await screen.findByText(/사진만 바로 저장되었습니다/)).toBeInTheDocument();
    expect(onPhotoAutoSave).toHaveBeenCalledTimes(2);
    expect(onPhotoAutoSave).toHaveBeenNthCalledWith(2, photoDataUrl);
  });

  it("keeps new-child photos in the draft until the child is submitted", async () => {
    mockedPreparePhotoDataUrl.mockResolvedValue({ ok: true, dataUrl: photoDataUrl, wasCompressed: false });
    const onSubmit = vi.fn(() => ({ ok: false, message: "테스트에서 모달 유지" }));
    render(
      <ChildDetailModal
        classes={classes}
        isReady
        onClose={vi.fn()}
        onSubmit={onSubmit}
        submitLabel="아이 저장"
        title="아이 추가"
      />,
    );

    fireEvent.change(screen.getByLabelText("이름"), { target: { value: "새 아이" } });
    fireEvent.change(screen.getByLabelText("사진 찍기"), {
      target: { files: [new File(["photo"], "new.jpg", { type: "image/jpeg" })] },
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "새 아이 사진 크게 보기" })).toBeInTheDocument());
    expect(screen.queryByText(/사진만 바로 저장되었습니다/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "아이 저장" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: "새 아이", photoDataUrl }));
  });

  it("keeps photo deletion in the form-save flow instead of autosaving it", async () => {
    const onPhotoAutoSave = vi.fn();
    const onSubmit = vi.fn(() => ({ ok: false, message: "테스트에서 모달 유지" }));
    render(
      <ChildDetailModal
        child={{ ...child, photoDataUrl }}
        classes={classes}
        isReady
        onClose={vi.fn()}
        onPhotoAutoSave={onPhotoAutoSave}
        onSubmit={onSubmit}
        submitLabel="수정 저장"
        title="김새싹 상세정보"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "김새싹 사진 크게 보기" }));
    fireEvent.click(await screen.findByRole("button", { name: "사진 삭제" }));
    expect(onPhotoAutoSave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "수정 저장" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ photoDataUrl: "" }));
  });

  it("moves focus into the dialog, traps it, and restores the opener on close", async () => {
    const onClose = vi.fn();
    function Harness() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <div>
          <button onClick={() => setIsOpen(true)} type="button">
            상세 열기
          </button>
          {isOpen ? (
            <ChildDetailModal
              child={child}
              classes={classes}
              isReady
              onClose={() => {
                onClose();
                setIsOpen(false);
              }}
              onSubmit={vi.fn(() => ({ ok: true, message: "" }))}
              submitLabel="수정 저장"
              title="김새싹 상세정보"
            />
          ) : null}
        </div>
      );
    }

    render(<Harness />);
    const opener = screen.getByRole("button", { name: "상세 열기" });
    opener.focus();
    fireEvent.click(opener);

    const closeButton = screen.getByRole("button", { name: "김새싹 상세정보 닫기" });
    await waitFor(() => expect(closeButton).toHaveFocus());
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(screen.getByRole("button", { name: "수정 저장" })).toHaveFocus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(opener).toHaveFocus());
  });
});
