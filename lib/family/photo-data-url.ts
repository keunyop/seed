export const PHOTO_DATA_URL_MAX_BYTES = 160_000;

const ORIGINAL_FILE_READ_THRESHOLD_BYTES = 120_000;
const INITIAL_MAX_IMAGE_EDGE = 640;
const MIN_IMAGE_EDGE = 240;
const IMAGE_DECODE_TIMEOUT_MS = 15_000;
const JPEG_QUALITY_STEPS = [0.82, 0.72, 0.62, 0.52, 0.44, 0.36, 0.3];

const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  jfif: "image/jpeg",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  tif: "image/tiff",
  tiff: "image/tiff",
  webp: "image/webp",
};

export type PhotoFileHandling = "direct" | "transcode" | "reject";

export type PreparedPhotoDataUrl =
  | { ok: true; dataUrl: string; wasCompressed: boolean }
  | { ok: false; message: string };

export type ImageSize = {
  width: number;
  height: number;
};

export function getDataUrlByteSize(dataUrl: string) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(dataUrl).byteLength;
  }

  return dataUrl.length;
}

export function getScaledImageSize(size: ImageSize, maxEdge: number): ImageSize {
  const width = Math.max(1, Math.round(size.width));
  const height = Math.max(1, Math.round(size.height));
  const largestEdge = Math.max(width, height);

  if (largestEdge <= maxEdge) {
    return { width, height };
  }

  const ratio = maxEdge / largestEdge;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export function getNextPhotoResizeEdge(currentEdge: number) {
  return Math.floor(currentEdge * 0.78);
}

function getFileExtension(fileName: string) {
  const extensionStart = fileName.lastIndexOf(".");
  return extensionStart >= 0 ? fileName.slice(extensionStart + 1).toLowerCase() : "";
}

function getImageMimeFromFileName(fileName: string) {
  return IMAGE_MIME_BY_EXTENSION[getFileExtension(fileName)];
}

function isUnknownMimeType(mimeType: string) {
  return mimeType === "" || mimeType === "application/octet-stream" || mimeType === "binary/octet-stream";
}

function isHeicOrHeifFile(file: Pick<File, "name" | "type">) {
  const mimeType = file.type.trim().toLowerCase();
  const extension = getFileExtension(file.name);
  return (
    extension === "heic" ||
    extension === "heif" ||
    mimeType === "image/heic" ||
    mimeType === "image/heif" ||
    mimeType === "image/heic-sequence" ||
    mimeType === "image/heif-sequence"
  );
}

export function getPhotoFileHandling(file: Pick<File, "name" | "type">): PhotoFileHandling {
  const mimeType = file.type.trim().toLowerCase();

  if (isUnknownMimeType(mimeType) || isHeicOrHeifFile(file)) {
    return "transcode";
  }

  return mimeType.startsWith("image/") ? "direct" : "reject";
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
}

function getImageDecodeBlob(file: File) {
  const mimeType = file.type.trim().toLowerCase();
  const inferredMimeType = getImageMimeFromFileName(file.name);

  if (isUnknownMimeType(mimeType) && inferredMimeType) {
    return new Blob([file], { type: inferredMimeType });
  }

  return file;
}

function loadImage(file: File) {
  return new Promise<{ image: HTMLImageElement; release: () => void }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(getImageDecodeBlob(file));
    const image = new Image();
    let isSettled = false;
    let isReleased = false;
    const timeoutId = globalThis.setTimeout(() => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      removeEventHandlers();
      release();
      reject(new Error("decode-timeout"));
    }, IMAGE_DECODE_TIMEOUT_MS);

    function removeEventHandlers() {
      globalThis.clearTimeout(timeoutId);
      image.onload = null;
      image.onerror = null;
    }

    function release() {
      if (isReleased) {
        return;
      }

      isReleased = true;
      URL.revokeObjectURL(objectUrl);
    }

    image.onload = () => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      removeEventHandlers();
      resolve({ image, release });
    };
    image.onerror = () => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      removeEventHandlers();
      release();
      reject(new Error("decode-failed"));
    };

    try {
      image.src = objectUrl;
    } catch {
      isSettled = true;
      removeEventHandlers();
      release();
      reject(new Error("decode-failed"));
    }
  });
}

function renderImageToJpegDataUrl(image: HTMLImageElement, maxEdge: number, quality: number) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) {
    throw new Error("empty-image");
  }

  const targetSize = getScaledImageSize({ width: sourceWidth, height: sourceHeight }, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = targetSize.width;
  canvas.height = targetSize.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("canvas-unavailable");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, targetSize.width, targetSize.height);
  context.drawImage(image, 0, 0, targetSize.width, targetSize.height);

  return canvas.toDataURL("image/jpeg", quality);
}

async function compressImageToDataUrl(file: File) {
  const { image, release } = await loadImage(file);

  try {
    const sourceEdge = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height);
    let maxEdge = Math.min(INITIAL_MAX_IMAGE_EDGE, sourceEdge || INITIAL_MAX_IMAGE_EDGE);

    while (maxEdge >= MIN_IMAGE_EDGE) {
      for (const quality of JPEG_QUALITY_STEPS) {
        const dataUrl = renderImageToJpegDataUrl(image, maxEdge, quality);
        if (getDataUrlByteSize(dataUrl) <= PHOTO_DATA_URL_MAX_BYTES) {
          return dataUrl;
        }
      }

      maxEdge = getNextPhotoResizeEdge(maxEdge);
    }

    return null;
  } finally {
    release();
  }
}

export async function preparePhotoDataUrl(file: File): Promise<PreparedPhotoDataUrl> {
  const fileHandling = getPhotoFileHandling(file);

  if (fileHandling === "reject") {
    return { ok: false, message: "이미지 파일만 선택해 주세요." };
  }

  if (fileHandling === "direct" && file.size <= ORIGINAL_FILE_READ_THRESHOLD_BYTES) {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (getDataUrlByteSize(dataUrl) <= PHOTO_DATA_URL_MAX_BYTES) {
        return { ok: true, dataUrl, wasCompressed: false };
      }
    } catch {
      return { ok: false, message: "사진을 읽지 못했습니다. 다른 파일을 선택해 주세요." };
    }
  }

  try {
    const compressedDataUrl = await compressImageToDataUrl(file);
    if (compressedDataUrl) {
      return { ok: true, dataUrl: compressedDataUrl, wasCompressed: true };
    }
  } catch (error) {
    const isDecodeFailure = error instanceof Error && error.message === "decode-failed";
    const hasKnownImageExtension = Boolean(getImageMimeFromFileName(file.name));
    if (
      isDecodeFailure &&
      fileHandling === "transcode" &&
      isUnknownMimeType(file.type.trim().toLowerCase()) &&
      !hasKnownImageExtension
    ) {
      return { ok: false, message: "이미지 파일만 선택해 주세요." };
    }

    return {
      ok: false,
      message: "사진을 읽거나 크기를 줄이지 못했습니다. JPG 또는 PNG 사진으로 다시 선택해 주세요.",
    };
  }

  return {
    ok: false,
    message: "사진을 160KB 이하로 줄이지 못했습니다. 더 작은 사진을 선택해 주세요.",
  };
}
