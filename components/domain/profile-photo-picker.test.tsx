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
    expect(screen.getByText("등록된 사진 없음")).toBeInTheDocument();
  });

  it("processes a selected photo and reports the resulting data URL", async () => {
    mockedPreparePhotoDataUrl.mockResolvedValue({
      ok: true,
      dataUrl: "data:image/jpeg;base64,cGhvdG8=",
      wasCompressed: true,
    });
    const onPhotoDataUrlChange = vi.fn();
    const onProcessingChange = vi.fn();
    render(
      <ProfilePhotoPicker
        onPhotoDataUrlChange={onPhotoDataUrlChange}
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
    expect(mockedPreparePhotoDataUrl).toHaveBeenCalledWith(file);
    expect(onProcessingChange).toHaveBeenNthCalledWith(1, true);
    expect(onProcessingChange).toHaveBeenLastCalledWith(false);
  });

  it("keeps the preview and exposes an accessible photo delete action", () => {
    const onPhotoDataUrlChange = vi.fn();
    render(
      <ProfilePhotoPicker
        onPhotoDataUrlChange={onPhotoDataUrlChange}
        photoDataUrl="data:image/jpeg;base64,cGhvdG8="
        preview={<span aria-label="현재 사진" role="img" />}
      />,
    );

    expect(screen.getByRole("img", { name: "현재 사진" })).toBeInTheDocument();
    expect(screen.getByText("현재 사진 미리보기")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "사진 삭제" }));
    expect(onPhotoDataUrlChange).toHaveBeenCalledWith("");
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
