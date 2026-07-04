import { describe, expect, it } from "vitest";
import {
  getDataUrlByteSize,
  getNextPhotoResizeEdge,
  getScaledImageSize,
  preparePhotoDataUrl,
  PHOTO_DATA_URL_MAX_BYTES,
} from "@/lib/family/photo-data-url";

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

  it("rejects non-image files before browser image processing", async () => {
    const result = await preparePhotoDataUrl(new File(["plain text"], "note.txt", { type: "text/plain" }));

    expect(result).toEqual({ ok: false, message: "이미지 파일만 선택해 주세요." });
  });
});
