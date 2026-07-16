import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { preparePhotoDataUrl } from "@/lib/family/photo-data-url";
import { ProfilePhotoPicker } from "./profile-photo-picker";

vi.mock("@/lib/family/photo-data-url", () => ({
  preparePhotoDataUrl: vi.fn(),
}));

const mockedPreparePhotoDataUrl = vi.mocked(preparePhotoDataUrl);

afterEach(() => {
  vi.clearAllMocks();
});

describe("ProfilePhotoPicker", () => {
  it("offers directly activatable camera and album file inputs", () => {
    render(
      <ProfilePhotoPicker
        onPhotoDataUrlChange={vi.fn()}
        preview={<span aria-label="사진 미리보기" role="img" />}
      />,
    );

    const cameraInput = screen.getByLabelText("사진 찍기");
    const albumInput = screen.getByLabelText("앨범에서 선택");

    expect(cameraInput).toHaveAttribute("type", "file");
    expect(cameraInput).toHaveAttribute("accept", "image/*");
    expect(cameraInput).toHaveAttribute("capture", "environment");
    expect(cameraInput).toHaveClass("opacity-0");
    expect(cameraInput).not.toHaveClass("hidden");
    expect(albumInput).toHaveAttribute("type", "file");
    expect(albumInput).toHaveAttribute("accept", "image/*");
    expect(albumInput).not.toHaveAttribute("capture");
    expect(screen.queryByText("사진", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText("등록된 사진 없음")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /사진 크게 보기/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "사진 삭제" })).not.toBeInTheDocument();
  });

  it("processes a selected photo and reports the resulting data URL", async () => {
    mockedPreparePhotoDataUrl.mockResolvedValue({
      ok: true,
      dataUrl: "data:image/jpeg;base64,cGhvdG8=",
      wasCompressed: true,
    });
    const onPhotoDataUrlChange = vi.fn();
    const onPhotoPrepared = vi.fn();
    const onProcessingChange = vi.fn();
    render(
      <ProfilePhotoPicker
        onPhotoDataUrlChange={onPhotoDataUrlChange}
        onPhotoPrepared={onPhotoPrepared}
        onProcessingChange={onProcessingChange}
        preview={<span aria-label="사진 미리보기" role="img" />}
      />,
    );

    const cameraInput = screen.getByLabelText("사진 찍기");
    const file = new File(["image"], "camera.heic", { type: "image/heic" });
    fireEvent.change(cameraInput, { target: { files: [file] } });

    expect(await screen.findByRole("status")).toHaveTextContent("사진을 처리하는 중입니다.");
    await waitFor(() => {
      expect(onPhotoDataUrlChange).toHaveBeenCalledWith("data:image/jpeg;base64,cGhvdG8=");
    });
    expect(onPhotoPrepared).toHaveBeenCalledTimes(1);
    expect(onPhotoPrepared).toHaveBeenCalledWith("data:image/jpeg;base64,cGhvdG8=");
    expect(mockedPreparePhotoDataUrl).toHaveBeenCalledWith(file);
    expect(onProcessingChange).toHaveBeenNthCalledWith(1, true);
    expect(onProcessingChange).toHaveBeenLastCalledWith(false);
  });

  it("disables camera, album, and the current-photo viewer while an external save is pending", () => {
    render(
      <ProfilePhotoPicker
        isDisabled
        onPhotoDataUrlChange={vi.fn()}
        photoDataUrl="data:image/jpeg;base64,cGhvdG8="
        preview={<span aria-label="현재 사진" role="img" />}
      />,
    );

    expect(screen.getByLabelText("사진 찍기")).toBeDisabled();
    expect(screen.getByLabelText("앨범에서 선택")).toBeDisabled();
    expect(screen.getByRole("button", { name: "사진 크게 보기" })).toBeDisabled();
  });

  it("opens the current photo in a focused viewer and only exposes delete inside it", async () => {
    const onPhotoDataUrlChange = vi.fn();
    const onViewerOpenChange = vi.fn();
    render(
      <ProfilePhotoPicker
        onPhotoDataUrlChange={onPhotoDataUrlChange}
        onViewerOpenChange={onViewerOpenChange}
        photoDataUrl="data:image/jpeg;base64,cGhvdG8="
        preview={<span aria-label="현재 사진" role="img" />}
        previewLabel="민준 사진"
      />,
    );

    expect(screen.getByRole("img", { name: "현재 사진" })).toBeInTheDocument();
    expect(screen.queryByText("현재 사진 미리보기")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "사진 삭제" })).not.toBeInTheDocument();

    const previewButton = screen.getByRole("button", { name: "민준 사진 크게 보기" });
    fireEvent.click(previewButton);

    const viewer = screen.getByRole("dialog", { name: "민준 사진 크게 보기" });
    expect(viewer).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "민준 사진" })).toHaveAttribute(
      "src",
      "data:image/jpeg;base64,cGhvdG8=",
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "사진 크게 보기 닫기" })).toHaveFocus();
      expect(onViewerOpenChange).toHaveBeenCalledWith(true);
    });

    fireEvent.click(screen.getByRole("button", { name: "사진 삭제" }));
    expect(onPhotoDataUrlChange).toHaveBeenCalledWith("");
    expect(screen.queryByRole("dialog", { name: "민준 사진 크게 보기" })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(onViewerOpenChange).toHaveBeenLastCalledWith(false);
      expect(previewButton).toHaveFocus();
    });
  });

  it("traps focus in the photo viewer and closes only the viewer with Escape", async () => {
    const onViewerOpenChange = vi.fn();
    render(
      <ProfilePhotoPicker
        onPhotoDataUrlChange={vi.fn()}
        onViewerOpenChange={onViewerOpenChange}
        photoDataUrl="data:image/jpeg;base64,cGhvdG8="
        preview={<span aria-label="현재 사진" role="img" />}
      />,
    );

    const previewButton = screen.getByRole("button", { name: "사진 크게 보기" });
    fireEvent.click(previewButton);

    const closeButton = screen.getByRole("button", { name: "사진 크게 보기 닫기" });
    const deleteButton = screen.getByRole("button", { name: "사진 삭제" });
    await waitFor(() => expect(closeButton).toHaveFocus());

    deleteButton.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(deleteButton).toHaveFocus();

    const outerEscapeHandler = vi.fn();
    window.addEventListener("keydown", outerEscapeHandler);
    fireEvent.keyDown(window, { key: "Escape" });
    window.removeEventListener("keydown", outerEscapeHandler);
    expect(outerEscapeHandler).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "사진 크게 보기" })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(onViewerOpenChange).toHaveBeenLastCalledWith(false);
      expect(previewButton).toHaveFocus();
    });
  });

  it("shows photo processing errors beside the picker", async () => {
    mockedPreparePhotoDataUrl.mockResolvedValue({ ok: false, message: "이미지 파일만 선택해 주세요." });
    render(
      <ProfilePhotoPicker
        onPhotoDataUrlChange={vi.fn()}
        preview={<span aria-label="사진 미리보기" role="img" />}
      />,
    );

    fireEvent.change(screen.getByLabelText("앨범에서 선택"), {
      target: { files: [new File(["text"], "note.txt", { type: "text/plain" })] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("이미지 파일만 선택해 주세요.");
  });
});
