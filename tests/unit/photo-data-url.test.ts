import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDataUrlByteSize,
  getNextPhotoResizeEdge,
  getPhotoFileHandling,
  getScaledImageSize,
  preparePhotoDataUrl,
  PHOTO_DATA_URL_MAX_BYTES,
} from "@/lib/family/photo-data-url";

type ImageDecodeMockOptions = {
  shouldFail?: boolean;
  shouldHang?: boolean;
};

function installImageDecodeMock({ shouldFail = false, shouldHang = false }: ImageDecodeMockOptions = {}) {
  const createObjectURL = vi.fn((blob: Blob) => {
    void blob;
    return "blob:profile-photo";
  });
  const revokeObjectURL = vi.fn((objectUrl: string) => {
    void objectUrl;
  });
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

  class MockImage {
    naturalWidth = 400;
    naturalHeight = 300;
    width = 400;
    height = 300;
    onload: ((event: Event) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;

    set src(_value: string) {
      if (shouldHang) {
        return;
      }

      queueMicrotask(() => {
        if (shouldFail) {
          this.onerror?.(new Event("error"));
          return;
        }

        this.onload?.(new Event("load"));
      });
    }
  }

  vi.stubGlobal("Image", MockImage);
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage,
    fillRect: vi.fn(),
    fillStyle: "",
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,c21hbGw=");

  return { createObjectURL, drawImage, revokeObjectURL };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("photo data URL helpers", () => {
  it("measures data URL text size against the 160KB storage limit", () => {
    const dataUrl = `data:image/jpeg;base64,${"a".repeat(120)}`;

    expect(getDataUrlByteSize(dataUrl)).toBe(dataUrl.length);
    expect(PHOTO_DATA_URL_MAX_BYTES).toBe(160_000);
  });

  it("scales the longest image edge while preserving the aspect ratio", () => {
    expect(getScaledImageSize({ width: 4032, height: 3024 }, 1024)).toEqual({ width: 1024, height: 768 });
    expect(getScaledImageSize({ width: 800, height: 600 }, 1024)).toEqual({ width: 800, height: 600 });
    expect(getScaledImageSize({ width: 3000, height: 4000 }, 1000)).toEqual({ width: 750, height: 1000 });
  });

  it("reduces the retry edge predictably when a jpeg pass is still too large", () => {
    expect(getNextPhotoResizeEdge(1024)).toBe(798);
    expect(getNextPhotoResizeEdge(798)).toBe(622);
  });

  it("forces HEIC/HEIF and unknown MIME files through JPEG transcoding", () => {
    expect(getPhotoFileHandling(new File(["image"], "camera.HEIC", { type: "image/jpeg" }))).toBe("transcode");
    expect(getPhotoFileHandling(new File(["image"], "camera.heif", { type: "image/heif" }))).toBe("transcode");
    expect(getPhotoFileHandling(new File(["image"], "camera.jpg", { type: "" }))).toBe("transcode");
    expect(getPhotoFileHandling(new File(["image"], "camera.bin", { type: "application/octet-stream" }))).toBe(
      "transcode",
    );
    expect(getPhotoFileHandling(new File(["image"], "camera.jpg", { type: "image/jpeg" }))).toBe("direct");
  });

  it("decodes a small MIME-less mobile photo and returns a JPEG data URL", async () => {
    const { createObjectURL, drawImage, revokeObjectURL } = installImageDecodeMock();
    const result = await preparePhotoDataUrl(new File(["image"], "camera.JPG", { type: "" }));

    expect(result).toEqual({ ok: true, dataUrl: "data:image/jpeg;base64,c21hbGw=", wasCompressed: true });
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect((createObjectURL.mock.calls[0]?.[0] as Blob).type).toBe("image/jpeg");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:profile-photo");
    expect(drawImage.mock.invocationCallOrder[0]).toBeLessThan(revokeObjectURL.mock.invocationCallOrder[0] ?? 0);
  });

  it("accepts a MIME-less image with an unknown extension when the browser can decode it", async () => {
    const { createObjectURL, revokeObjectURL } = installImageDecodeMock();
    const result = await preparePhotoDataUrl(new File(["image"], "camera-upload.bin", { type: "" }));

    expect(result).toEqual({ ok: true, dataUrl: "data:image/jpeg;base64,c21hbGw=", wasCompressed: true });
    expect((createObjectURL.mock.calls[0]?.[0] as Blob).type).toBe("");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:profile-photo");
  });

  it("transcodes a small HEIC file instead of storing its original data URL", async () => {
    const { createObjectURL, revokeObjectURL } = installImageDecodeMock();
    const result = await preparePhotoDataUrl(new File(["image"], "camera.heic", { type: "image/heic" }));

    expect(result).toEqual({ ok: true, dataUrl: "data:image/jpeg;base64,c21hbGw=", wasCompressed: true });
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it("rejects a MIME-less non-image after decoding and revokes its object URL", async () => {
    const { revokeObjectURL } = installImageDecodeMock({ shouldFail: true });
    const result = await preparePhotoDataUrl(new File(["plain text"], "note.bin", { type: "" }));

    expect(result).toEqual({ ok: false, message: "이미지 파일만 선택해 주세요." });
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:profile-photo");
  });

  it("rejects non-image files before browser image processing", async () => {
    const result = await preparePhotoDataUrl(new File(["plain text"], "note.txt", { type: "text/plain" }));

    expect(result).toEqual({ ok: false, message: "이미지 파일만 선택해 주세요." });
  });

  it("times out a stalled mobile image decode and releases its object URL", async () => {
    vi.useFakeTimers();
    const { revokeObjectURL } = installImageDecodeMock({ shouldHang: true });
    const resultPromise = preparePhotoDataUrl(new File(["image"], "camera.heic", { type: "image/heic" }));

    await vi.advanceTimersByTimeAsync(20_000);

    await expect(resultPromise).resolves.toEqual({
      ok: false,
      message: "사진을 읽거나 크기를 줄이지 못했습니다. JPG 또는 PNG 사진으로 다시 선택해 주세요.",
    });
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:profile-photo");
  });
});
